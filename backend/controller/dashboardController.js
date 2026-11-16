const { dashboardAccess } = require('./dashboardWidgets');
const connection = require('../connection');
const { internetCustomerNumberSql } = require('./internetCustomerNumber');
const { ensureReminderLog } = require('./internetExpiryReminderLog');
const { internetExpiryDateSql } = require('./internetExpiryDate');

const complaintStatuses = ['OPEN', 'IN_PROGRESS', 'HOLD', 'PENDING', 'COMPLETED'];

const getDashboardSummary = async (_req, res) => {
  try {
    const db = connection.promise();
    const access = await dashboardAccess(db, res.locals?.role);
    const widgetQuery = (key, sql) => access[key] ? db.query(sql) : Promise.resolve([[]]);
    const [workflowResult, catvResult, internetResult, faultResult, complaintResult] = await Promise.all([
      widgetQuery('workflow', `SELECT
        (SELECT COUNT(*) FROM workflow_approvals wa
         LEFT JOIN work_orders wo ON wo.work_order_id = wa.reference_id
         LEFT JOIN customers work_customer ON work_customer.customer_id = wo.customer_id
         WHERE wa.workflow_status = 'PENDING' AND (
           wa.module_name = 'QUOTATION'
           OR (wa.module_name = 'WORK_ORDER' AND work_customer.customer_id IS NOT NULL)
           OR (wa.module_name = 'MATERIAL_ISSUE' AND work_customer.customer_id IS NOT NULL
               AND EXISTS (SELECT 1 FROM work_order_material_issues mi
                 WHERE mi.work_order_id = wo.work_order_id AND mi.approval_status = 'PENDING'))
           OR (wa.module_name = 'CCTV_CUSTOMER' AND EXISTS
               (SELECT 1 FROM customers c WHERE c.customer_id = wa.reference_id))
           OR (wa.module_name IN ('INTERNET_CUSTOMER', 'INTERNET_CUSTOMER_UPDATE') AND EXISTS
               (SELECT 1 FROM internet_customers ic WHERE ic.internet_customer_id = wa.reference_id))
         )) +
        (SELECT COUNT(*) FROM purchase_master pm
         JOIN suppliers s ON s.supplier_id = pm.supplier_id
         WHERE pm.approval_status = 'PENDING' AND pm.purchase_status <> 'CANCELLED') +
        (SELECT COUNT(*) FROM cable_approval_groups cag
         JOIN (
           SELECT approval_group_id, MAX(cable_customer_id) AS cable_customer_id
           FROM (
             SELECT approval_group_id, cable_customer_id FROM cable_tv_customers WHERE approval_group_id IS NOT NULL
             UNION ALL SELECT approval_group_id, cable_customer_id FROM cable_connections WHERE approval_group_id IS NOT NULL
             UNION ALL SELECT approval_group_id, cable_customer_id FROM cable_customer_stbs WHERE approval_group_id IS NOT NULL
             UNION ALL SELECT approval_group_id, cable_customer_id FROM cable_customer_packages WHERE approval_group_id IS NOT NULL
             UNION ALL SELECT approval_group_id, cable_customer_id FROM cable_subscriptions WHERE approval_group_id IS NOT NULL
             UNION ALL SELECT approval_group_id, cable_customer_id FROM cable_customer_accounts WHERE approval_group_id IS NOT NULL
           ) cable_group_references GROUP BY approval_group_id
         ) cgr ON cgr.approval_group_id = cag.approval_group_id
         JOIN cable_tv_customers c ON c.cable_customer_id = cgr.cable_customer_id
         WHERE cag.approval_status = 'PENDING' AND cag.group_type <> 'SUBSCRIPTION_UPDATE') AS waiting_count`),
      widgetQuery('catv', `SELECT
        SUM(status IN ('ACTIVE', 'FREE', 'LEASE_LINE')) AS active_count,
        SUM(status NOT IN ('ACTIVE', 'FREE', 'LEASE_LINE')) AS deactive_count
        FROM cable_tv_customers WHERE approval_status = 'APPROVED'`),
      widgetQuery('internet', `SELECT SUM(status = 'ACTIVE') AS active_count, SUM(status = 'INACTIVE') AS deactive_count
        FROM internet_customers WHERE approval_status = 'APPROVED'`),
      widgetQuery('fault', `SELECT COUNT(*) AS fault_in_service_count FROM cable_stb_master
        WHERE is_active = 1 AND stock_type IN ('FAULT', 'DAMAGED', 'BURNT')`),
      widgetQuery('complaints', 'SELECT status, COUNT(*) AS count FROM cable_tv_complaints GROUP BY status')
    ]);

    const complaintCounts = Object.fromEntries(complaintStatuses.map(status => [status, 0]));
    complaintResult[0].forEach(row => {
      if (Object.prototype.hasOwnProperty.call(complaintCounts, row.status)) {
        complaintCounts[row.status] = Number(row.count) || 0;
      }
    });

    return res.json({
      widgets: access,
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
      ${internetCustomerNumberSql('c')} AS customer_code, c.full_name, c.net_id, TRIM(c.email) AS email,
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
