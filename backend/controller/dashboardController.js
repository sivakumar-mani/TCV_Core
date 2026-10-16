const connection = require('../connection');
const { internetCustomerNumberSql } = require('./internetCustomerNumber');
const { ensureReminderLog } = require('./internetExpiryReminderLog');
const { internetExpiryDateSql } = require('./internetExpiryDate');

const complaintStatuses = ['OPEN', 'IN_PROGRESS', 'HOLD', 'PENDING', 'COMPLETED'];

const getDashboardSummary = async (_req, res) => {
  try {
    const db = connection.promise();
    const [workflowResult, catvResult, internetResult, faultResult, complaintResult] = await Promise.all([
      db.query(`SELECT
        (SELECT COUNT(*) FROM workflow_approvals WHERE workflow_status = 'PENDING') +
        (SELECT COUNT(*) FROM purchase_master WHERE approval_status = 'PENDING' AND purchase_status <> 'CANCELLED') +
        (SELECT COUNT(*) FROM cable_approval_groups WHERE approval_status = 'PENDING' AND group_type <> 'SUBSCRIPTION_UPDATE') AS waiting_count`),
      db.query(`SELECT
        SUM(status IN ('ACTIVE', 'FREE', 'LEASE_LINE')) AS active_count,
        SUM(status NOT IN ('ACTIVE', 'FREE', 'LEASE_LINE')) AS deactive_count
        FROM cable_tv_customers WHERE approval_status = 'APPROVED'`),
      db.query(`SELECT SUM(status = 'ACTIVE') AS active_count, SUM(status = 'INACTIVE') AS deactive_count
        FROM internet_customers WHERE approval_status = 'APPROVED'`),
      db.query(`SELECT COUNT(*) AS fault_in_service_count FROM cable_stb_master
        WHERE is_active = 1 AND stock_type IN ('FAULT', 'DAMAGED', 'BURNT')`),
      db.query('SELECT status, COUNT(*) AS count FROM cable_tv_complaints GROUP BY status')
    ]);

    const complaintCounts = Object.fromEntries(complaintStatuses.map(status => [status, 0]));
    complaintResult[0].forEach(row => {
      if (Object.prototype.hasOwnProperty.call(complaintCounts, row.status)) {
        complaintCounts[row.status] = Number(row.count) || 0;
      }
    });

    return res.json({
      workflow_waiting_count: Number(workflowResult[0][0]?.waiting_count) || 0,
      catv: { active: Number(catvResult[0][0]?.active_count) || 0, deactive: Number(catvResult[0][0]?.deactive_count) || 0 },
      internet: { active: Number(internetResult[0][0]?.active_count) || 0, deactive: Number(internetResult[0][0]?.deactive_count) || 0 },
      fault_boxes_in_service: Number(faultResult[0][0]?.fault_in_service_count) || 0,
      complaints: complaintCounts
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return res.status(500).json({ message: 'Dashboard summary could not be loaded' });
  }
};

const getUpcomingExpiries = async (req, res) => {
  const catv = req.query.type === 'CATV';
  try {
    const db = connection.promise();
    const customerTable = catv ? 'cable_tv_customers' : 'internet_customers';
    const subscriptionTable = catv ? 'cable_subscriptions' : 'internet_subscriptions';
    const customerId = catv ? 'cable_customer_id' : 'internet_customer_id';
    const expiryColumn = catv ? 'expiry_date' : 'end_date';
    const [rows] = await db.query(`SELECT c.${customerId} AS customer_id, ${catv ? 'c.customer_code' : internetCustomerNumberSql('c')} AS customer_code, c.full_name,
      DATE_FORMAT(latest.expiry_date, '%Y-%m-%d') AS expiry_date,
      DATEDIFF(latest.expiry_date, CURDATE()) AS days_remaining
      FROM ${customerTable} c
      JOIN (SELECT ${customerId}, MAX(${expiryColumn}) AS expiry_date FROM ${subscriptionTable}
        WHERE approval_status = 'APPROVED' GROUP BY ${customerId}) latest ON latest.${customerId} = c.${customerId}
      WHERE c.approval_status = 'APPROVED' AND c.status IN (${catv ? "'ACTIVE', 'FREE', 'LEASE_LINE'" : "'ACTIVE'"})
        AND latest.expiry_date >= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        AND latest.expiry_date < DATE_ADD(CURDATE(), INTERVAL 31 DAY)
      ORDER BY latest.expiry_date, c.customer_code`);
    return res.json(rows.map(row => ({ ...row, service: catv ? 'CATV' : 'NET' })));
  } catch (error) {
    return res.status(500).json({ message: 'Upcoming expiries could not be loaded' });
  }
};

const getUpcomingInternetExpiries = async (_req, res) => {
  try {
    const db = connection.promise();
    await ensureReminderLog(db);
    const [rows] = await db.query(`SELECT c.internet_customer_id AS customer_id,
      ${internetCustomerNumberSql('c')} AS customer_code, c.full_name, TRIM(c.email) AS email,
      DATE_FORMAT(latest.expiry_date, '%Y-%m-%d') AS expiry_date,
      DATEDIFF(latest.expiry_date, CURDATE()) AS days_remaining,
      (SELECT COUNT(*) FROM internet_expiry_reminder_log log WHERE log.internet_customer_id = c.internet_customer_id
        AND log.expiry_date = latest.expiry_date AND log.status = 'SENT') AS sent_count
      FROM internet_customers c
      JOIN (SELECT s.internet_customer_id, ${internetExpiryDateSql} AS expiry_date FROM internet_subscriptions s
        WHERE s.approval_status = 'APPROVED' GROUP BY s.internet_customer_id) latest
        ON latest.internet_customer_id = c.internet_customer_id
      WHERE c.approval_status = 'APPROVED' AND c.status = 'ACTIVE'
        AND latest.expiry_date >= DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        AND latest.expiry_date < DATE_ADD(CURDATE(), INTERVAL 11 DAY)
      ORDER BY latest.expiry_date, c.customer_code`);
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Upcoming Internet expiries could not be loaded' });
  }
};

module.exports = { getDashboardSummary, getUpcomingExpiries, getUpcomingInternetExpiries };
