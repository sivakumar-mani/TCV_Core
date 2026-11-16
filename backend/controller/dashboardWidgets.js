const widgetKeys = {
  complaints: 'DASHBOARD_COMPLAINTS', workflow: 'DASHBOARD_WORKFLOW', fault: 'DASHBOARD_FAULT_BOXES',
  catv: 'DASHBOARD_CATV_CUSTOMERS', internet: 'DASHBOARD_INTERNET_CUSTOMERS',
  expiries: 'DASHBOARD_INTERNET_EXPIRIES', catvUnpaid: 'DASHBOARD_CATV_UNPAID', internetUnpaid: 'DASHBOARD_INTERNET_UNPAID'
};

async function dashboardAccess(db, role) {
  if (String(role).toUpperCase() === 'ADMIN') return Object.fromEntries(Object.keys(widgetKeys).map(key => [key, true]));
  const [rows] = await db.query('SELECT permission_key FROM role_permissions WHERE role = ? AND can_view = 1', [String(role || '').toUpperCase()]);
  const grants = new Set(rows.map(row => row.permission_key));
  return Object.fromEntries(Object.entries(widgetKeys).map(([name, key]) => [name, grants.has(key)]));
}

function unpaidSql(type) {
  const catv = type === 'CATV';
  const id = catv ? 'cable_customer_id' : 'internet_customer_id';
  // Count customers once, using their oldest approved, outstanding billing month.
  // Month serials handle year boundaries; the reporting month is in India time.
  return `SELECT
    COALESCE(SUM(age_months = 0), 0) AS current_month,
    COALESCE(SUM(age_months = 1), 0) AS two_months,
    COALESCE(SUM(age_months >= 2), 0) AS three_plus_months
    FROM (
      SELECT s.${id},
        YEAR(UTC_TIMESTAMP() + INTERVAL 330 MINUTE) * 12 + MONTH(UTC_TIMESTAMP() + INTERVAL 330 MINUTE)
          - MIN(s.subscription_year * 12 + s.subscription_month) AS age_months
      FROM ${catv ? 'cable_subscriptions' : 'internet_subscriptions'} s
      JOIN ${catv ? 'cable_tv_customers' : 'internet_customers'} c ON c.${id} = s.${id}
      WHERE c.approval_status = 'APPROVED' AND s.approval_status = 'APPROVED'
        ${catv ? "AND c.customer_type NOT IN ('FREE', 'LEASE_LINE')" : ''}
        AND s.payment_status IN ('PENDING', 'PARTIAL')
        AND COALESCE(s.amount, 0) > COALESCE(s.paid_amount, 0)
        AND s.subscription_month BETWEEN 1 AND 12 AND s.subscription_year >= 2000
        AND s.subscription_year * 12 + s.subscription_month <=
          YEAR(UTC_TIMESTAMP() + INTERVAL 330 MINUTE) * 12 + MONTH(UTC_TIMESTAMP() + INTERVAL 330 MINUTE)
      GROUP BY s.${id}
    ) unpaid_customers`;
}

function createUnpaidHandler(connection) {
  return async (req, res) => {
    const type = String(req.query.type || '').toUpperCase();
    if (!['CATV', 'NET'].includes(type)) return res.status(400).json({ message: 'Select CATV or NET' });
    try {
      const db = connection.promise();
      const access = await dashboardAccess(db, res.locals?.role);
      if (!access[type === 'CATV' ? 'catvUnpaid' : 'internetUnpaid']) return res.status(403).json({ message: 'Dashboard widget permission is required' });
      const [[row]] = await db.query(unpaidSql(type));
      return res.json({ current_month: Number(row?.current_month) || 0, two_months: Number(row?.two_months) || 0, three_plus_months: Number(row?.three_plus_months) || 0 });
    } catch {
      return res.status(500).json({ message: 'Unpaid subscription counts could not be loaded' });
    }
  };
}

module.exports = { widgetKeys, dashboardAccess, unpaidSql, createUnpaidHandler };
