const connection = require('../connection');

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

module.exports = { getDashboardSummary };
