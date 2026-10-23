const connection = require('../connection');

const statuses = ['ACTIVE', 'INACTIVE', 'DISCONNECTED', 'SHIFTED', 'TRANSFERRED', 'RETRIEVED', 'FAULT', 'UPGRADE', 'FREE', 'LEASE_LINE'];
const getCatvCustomerPackageReport = async (req, res) => {
  try {
    const filters = ["c.approval_status = 'APPROVED'"], values = [];
    for (const [key, column] of [['network_id', 'c.network_id'], ['package_id', 'cp.package_id']]) {
      const value = req.query[key];
      if (value != null && value !== '') {
        const id = Number(value);
        if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ message: 'Select a valid network or package' });
        filters.push(`${column} = ?`); values.push(id);
      }
    }
    const status = String(req.query.status || '').trim().toUpperCase();
    if (status && !statuses.includes(status)) return res.status(400).json({ message: 'Select a valid customer status' });
    if (status) { filters.push('UPPER(c.status) = ?'); values.push(status); }
    const db = connection.promise();
    const [rows] = await db.query(`SELECT c.cable_customer_id, c.customer_code, c.legacy_customer_no,
      c.full_name, c.status, n.network_name, cp.customer_package_id,
      p.package_name, cp.package_price,
      COALESCE(NULLIF(stb.stb_no, ''), sm.stb_number, '') AS stb_no
      FROM cable_tv_customers c
      LEFT JOIN cable_network_master n ON n.network_id = c.network_id
      LEFT JOIN cable_customer_packages cp ON cp.cable_customer_id = c.cable_customer_id
        AND cp.approval_status = 'APPROVED' AND cp.is_active = 1
      LEFT JOIN cable_package_master p ON p.package_id = cp.package_id
      LEFT JOIN cable_customer_stbs stb ON stb.customer_stb_id = (
        SELECT s.customer_stb_id FROM cable_customer_stbs s
        WHERE s.cable_customer_id = c.cable_customer_id AND s.approval_status = 'APPROVED'
        ORDER BY s.customer_stb_id DESC LIMIT 1)
      LEFT JOIN cable_stb_master sm ON sm.stb_master_id = stb.stb_master_id
      WHERE ${filters.join(' AND ')}
      ORDER BY c.customer_code, c.cable_customer_id, cp.customer_package_id`, values);
    const [networks] = await db.query('SELECT network_id, network_name FROM cable_network_master ORDER BY network_name');
    // Include inactive masters so previously assigned packages remain filterable.
    const [packages] = await db.query("SELECT package_id, package_name, package_type FROM cable_package_master WHERE service_category = 'CATV' ORDER BY package_name, package_type");
    return res.json({ rows, networks, packages, total_records: rows.length,
      total_customers: new Set(rows.map(row => row.cable_customer_id)).size });
  } catch (error) {
    return res.status(500).json({ message: 'CATV customer package report failed' });
  }
};
module.exports = { getCatvCustomerPackageReport };
