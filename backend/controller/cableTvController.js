const connection = require('../connection');

const money = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const nullable = (value) => (value === '' || value === undefined ? null : value);
const intOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const isAdmin = (req) => String(req.res?.locals?.role || '').toUpperCase() === 'ADMIN';
const currentUserId = (req) => intOrNull(req.res?.locals?.userId || req.res?.locals?.user_id || req.res?.locals?.id);

const approvalStatusFor = (req, override) => {
  if (override) return override;
  return isAdmin(req) ? 'APPROVED' : 'PENDING';
};

const dateOnly = (value) => new Date(value).toISOString().slice(0, 10);
const daysInMonth = (month, year) => new Date(year, month, 0).getDate();
const inclusiveDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
};

const resolveSourceId = async (db, value) => {
  const id = intOrNull(value);
  if (id) return id;
  if (!value) return null;
  const sourceName = String(value).trim();
  await db.query('INSERT IGNORE INTO cable_connection_sources (source_name) VALUES (?)', [sourceName]);
  const [[source]] = await db.query('SELECT source_id FROM cable_connection_sources WHERE source_name = ?', [sourceName]);
  return source?.source_id || null;
};

const resolveEmployeeId = async (db, req, payloadEmployeeId) => {
  if (isAdmin(req)) return intOrNull(payloadEmployeeId);
  const username = req.res?.locals?.username || req.res?.locals?.userName;
  if (!username) return intOrNull(payloadEmployeeId);
  const [[employee]] = await db.query(
    `SELECT employee_id
     FROM employees
     WHERE employee_code = ? OR email = ? OR CONCAT_WS(' ', first_name, last_name) = ?
     LIMIT 1`,
    [username, username, username]
  );
  return employee?.employee_id || intOrNull(payloadEmployeeId);
};

const generateCustomerCode = async (db, networkId) => {
  const [networkRows] = await db.query(
    'SELECT network_code FROM cable_network_master WHERE network_id = ?',
    [networkId]
  );
  const networkCode = networkRows[0]?.network_code || 'CTV';
  const [rows] = await db.query(
    'SELECT COALESCE(MAX(cable_customer_id), 0) + 1 AS next_id FROM cable_tv_customers'
  );
  return `${networkCode}-${String(rows[0].next_id).padStart(6, '0')}`;
};

const getLookups = async (_req, res) => {
  try {
    const db = connection.promise();
    const [networks] = await db.query(
      'SELECT network_id, network_code, network_name FROM cable_network_master WHERE is_active = 1 ORDER BY network_name'
    );
    const [locations] = await db.query(
      'SELECT location_id, location_name, city, pincode FROM cable_locations WHERE is_active = 1 ORDER BY location_name'
    );
    const [areas] = await db.query(
      'SELECT area_id, location_id, area_name FROM cable_areas WHERE is_active = 1 ORDER BY area_name'
    );
    const [streets] = await db.query(
      'SELECT street_id, area_id, street_name FROM cable_streets WHERE is_active = 1 ORDER BY street_name'
    );
    const [sources] = await db.query(
      'SELECT source_id, source_name FROM cable_connection_sources WHERE is_active = 1 ORDER BY source_name'
    );
    const [msos] = await db.query(
      'SELECT mso_id, mso_name FROM cable_mso_master WHERE is_active = 1 ORDER BY mso_name'
    );
    const [packages] = await db.query(
      'SELECT package_id, package_name, package_type, price FROM cable_package_master WHERE is_active = 1 ORDER BY package_name'
    );
    const [employees] = await db.query(
      `SELECT employee_id, employee_code,
              CONCAT_WS(' ', first_name, last_name) AS employee_name
       FROM employees
       WHERE is_active = 1
       ORDER BY first_name, last_name`
    );
    const [products] = await db.query(
      `SELECT product_id, product_name, unit, selling_price
       FROM products
       WHERE is_active = 1
       ORDER BY product_name`
    );

    return res.json({ networks, locations, areas, streets, sources, msos, packages, employees, products });
  } catch (error) {
    return res.status(500).json({ message: 'Cable TV lookups failed', error: error.message });
  }
};

const getCableCustomers = async (req, res) => {
  try {
    const status = req.query.approval_status || 'APPROVED';
    const values = [];
    let where = 'WHERE 1 = 1';

    if (status !== 'ALL') {
      where += ' AND c.approval_status = ?';
      values.push(status);
    }

    const [rows] = await connection.promise().query(
      `SELECT c.cable_customer_id, c.customer_code, c.legacy_customer_no, c.full_name,
              c.door_no, c.city, c.pincode, c.mobile_no, c.aadhaar_no, c.alternate_mobile_no,
              c.status, c.approval_status, c.created_at,
              n.network_name, l.location_name, a.area_name, s.street_name, src.source_name,
              CONCAT_WS(' ', e.first_name, e.last_name) AS installed_by_name
       FROM cable_tv_customers c
       INNER JOIN cable_network_master n ON n.network_id = c.network_id
       INNER JOIN cable_locations l ON l.location_id = c.location_id
       INNER JOIN cable_areas a ON a.area_id = c.area_id
       INNER JOIN cable_streets s ON s.street_id = c.street_id
       LEFT JOIN cable_connection_sources src ON src.source_id = c.source_id
       LEFT JOIN employees e ON e.employee_id = c.installed_by_employee_id
       ${where}
       ORDER BY c.cable_customer_id DESC`,
      values
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Cable TV customers failed', error: error.message });
  }
};

const getCableCustomerById = async (req, res) => {
  try {
    const db = connection.promise();
    const { id } = req.params;
    const [[customer]] = await db.query('SELECT * FROM cable_tv_customers WHERE cable_customer_id = ?', [id]);

    if (!customer) {
      return res.status(404).json({ message: 'Cable TV customer not found' });
    }

    const [stbs] = await db.query('SELECT * FROM cable_customer_stbs WHERE cable_customer_id = ? ORDER BY customer_stb_id DESC', [id]);
    const [connections] = await db.query('SELECT * FROM cable_connections WHERE cable_customer_id = ? ORDER BY connection_id DESC', [id]);
    const connectionIds = connections.map((item) => item.connection_id);
    const [materials] = connectionIds.length
      ? await db.query('SELECT * FROM cable_connection_materials WHERE connection_id IN (?) ORDER BY connection_material_id', [connectionIds])
      : [[]];
    const [customerPackages] = await db.query(
      `SELECT cp.*, sub.subscription_month, sub.subscription_year, sub.days_in_month,
              sub.number_of_days_or_months, sub.amount, sub.paid_amount, sub.balance_amount
       FROM cable_customer_packages cp
       LEFT JOIN cable_subscriptions sub ON sub.customer_package_id = cp.customer_package_id
       WHERE cp.cable_customer_id = ?
       ORDER BY cp.customer_package_id DESC`,
      [id]
    );
    const [subscriptions] = await db.query('SELECT * FROM cable_subscriptions WHERE cable_customer_id = ? ORDER BY subscription_year DESC, subscription_month DESC', [id]);

    return res.json({ customer, stbs, connections, materials, customerPackages, subscriptions });
  } catch (error) {
    return res.status(500).json({ message: 'Cable TV customer details failed', error: error.message });
  }
};

const addCableCustomer = async (req, res) => {
  const db = connection.promise();
  await db.beginTransaction();

  try {
    const payload = req.body;
    const approvalStatus = approvalStatusFor(req, payload.approval_status);
    const createdBy = currentUserId(req);
    const networkId = Number(payload.network_id);

    if (!networkId || !payload.full_name || !payload.door_no || !payload.mobile_no || !payload.location_id || !payload.area_id || !payload.street_id) {
      await db.rollback();
      return res.status(400).json({ message: 'Network, customer name, door no, mobile, location, area and street are required' });
    }

    const customerCode = payload.customer_code || await generateCustomerCode(db, networkId);
    const approvalGroupNo = `CTV-${Date.now()}`;
    const [approvalResult] = await db.query(
      `INSERT INTO cable_approval_groups
        (approval_group_no, group_type, approval_status, requested_by_user_id, approved_by_user_id, approved_at)
       VALUES (?, 'NEW_CUSTOMER_ONBOARDING', ?, ?, ?, ${approvalStatus === 'APPROVED' ? 'NOW()' : 'NULL'})`,
      [approvalGroupNo, approvalStatus, createdBy, approvalStatus === 'APPROVED' ? createdBy : null]
    );
    const approvalGroupId = approvalResult.insertId;

    const employeeId = await resolveEmployeeId(
      db,
      req,
      payload.installed_by_employee_id || payload.connected_by_employee_id || payload.collected_by_employee_id
    );
    const sourceId = await resolveSourceId(db, payload.source_id || payload.source_name);
    const [customerResult] = await db.query(
      `INSERT INTO cable_tv_customers (
        approval_group_id, network_id, legacy_customer_no, customer_code, full_name, door_no,
        location_id, area_id, street_id, city, pincode, mobile_no, aadhaar_no, alternate_mobile_no,
        source_id, installed_by_employee_id, labour_service_charge, status, approval_status,
        created_by_user_id, approved_by_user_id, approved_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${approvalStatus === 'APPROVED' ? 'NOW()' : 'NULL'})`,
      [
        approvalGroupId, networkId, nullable(payload.legacy_customer_no), customerCode, payload.full_name, payload.door_no,
        Number(payload.location_id), Number(payload.area_id), Number(payload.street_id), payload.city || '', nullable(payload.pincode),
        payload.mobile_no, nullable(payload.aadhaar_no), nullable(payload.alternate_mobile_no), sourceId,
        employeeId, money(payload.labour_service_charge), payload.status || 'ACTIVE', approvalStatus, createdBy,
        approvalStatus === 'APPROVED' ? createdBy : null
      ]
    );
    const cableCustomerId = customerResult.insertId;

    if (payload.stb?.stb_no) {
      await db.query(
        `INSERT INTO cable_customer_stbs (
          approval_group_id, cable_customer_id, stb_type, installed_mso_id, exchange_original_mso_id,
          stb_no, stb_amount, stb_discount, labour_service_charge, installed_by_employee_id,
          installed_date, approval_status, created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          approvalGroupId, cableCustomerId, payload.stb.stb_type || 'NEW', intOrNull(payload.stb.installed_mso_id),
          intOrNull(payload.stb.exchange_original_mso_id), payload.stb.stb_no, money(payload.stb.stb_amount),
          money(payload.stb.stb_discount), money(payload.stb.labour_service_charge), employeeId,
          payload.stb.installed_date || new Date(), approvalStatus, createdBy
        ]
      );
    }

    let connectionId = null;
    if (payload.connection?.connection_date) {
      const [connectionResult] = await db.query(
        `INSERT INTO cable_connections (
          approval_group_id, cable_customer_id, connection_date, disconnection_date, connection_type,
          connected_by_employee_id, connection_charge, labour_service_charge, status, approval_status,
          remarks, created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          approvalGroupId, cableCustomerId, payload.connection.connection_date,
          nullable(payload.connection.disconnection_date), payload.connection.connection_type || 'NEW',
          employeeId, money(payload.connection.connection_charge), money(payload.connection.labour_service_charge),
          payload.connection.status || 'ACTIVE', approvalStatus, nullable(payload.connection.remarks), createdBy
        ]
      );
      connectionId = connectionResult.insertId;
    }

    if (connectionId && Array.isArray(payload.materials)) {
      for (const item of payload.materials.filter((row) => row.item_name || row.product_id)) {
        const qty = money(item.qty || 1);
        const unitRate = money(item.unit_rate);
        await db.query(
          `INSERT INTO cable_connection_materials (
            approval_group_id, connection_id, product_id, item_name, qty, unit, unit_rate, amount,
            issued_by_employee_id, approval_status, created_by_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            approvalGroupId, connectionId, intOrNull(item.product_id), item.item_name || 'Material',
            qty, item.unit || 'PCS', unitRate, money(item.amount || qty * unitRate), employeeId,
            approvalStatus, createdBy
          ]
        );
      }
    }

    const packageRowsPayload = Array.isArray(payload.packages)
      ? payload.packages
      : payload.package?.package_id
        ? [payload.package]
        : [];

    for (const packageItem of packageRowsPayload.filter((item) => item.package_id)) {
      const [packageRows] = await db.query('SELECT price FROM cable_package_master WHERE package_id = ?', [packageItem.package_id]);
      const packagePrice = money(packageItem.package_price ?? packageRows[0]?.price);
      const startDate = packageItem.start_date || new Date();
      const start = new Date(startDate);
      const subscriptionMonth = Number(packageItem.subscription_month) || start.getMonth() + 1;
      const subscriptionYear = Number(packageItem.subscription_year) || start.getFullYear();
      const monthDays = Number(packageItem.days_in_month) || daysInMonth(subscriptionMonth, subscriptionYear);
      const endDate = packageItem.end_date || `${subscriptionYear}-${String(subscriptionMonth).padStart(2, '0')}-${monthDays}`;
      const numberOfDays = money(packageItem.number_of_days_or_months || inclusiveDays(startDate, endDate));
      const amount = money(packageItem.amount || (packagePrice / monthDays) * numberOfDays);
      const paidAmount = money(packageItem.paid_amount || amount);
      const balanceAmount = money(packageItem.balance_amount ?? amount - paidAmount);
      const [packageResult] = await db.query(
        `INSERT INTO cable_customer_packages (
          approval_group_id, cable_customer_id, package_id, package_price, start_date, end_date,
          is_active, approval_status, created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          approvalGroupId, cableCustomerId, Number(packageItem.package_id), packagePrice,
          startDate, nullable(endDate),
          packageItem.is_active ?? 1, approvalStatus, createdBy
        ]
      );
      const customerPackageId = packageResult.insertId;
      await db.query(
        `INSERT INTO cable_subscriptions (
          approval_group_id, cable_customer_id, customer_package_id, subscription_month, subscription_year,
          days_in_month, billing_basis, number_of_days_or_months, amount, paid_amount, balance_amount,
          collect_date, start_date, expiry_date, collected_by_employee_id, payment_mode, payment_status,
          approval_status, remarks, created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          approvalGroupId, cableCustomerId, customerPackageId, subscriptionMonth,
          subscriptionYear, monthDays,
          'DAY', numberOfDays,
          amount, paidAmount, balanceAmount, nullable(payload.subscription?.collect_date),
          dateOnly(startDate), dateOnly(endDate), employeeId,
          nullable(payload.subscription?.payment_mode), packageItem.payment_status || (balanceAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING'),
          approvalStatus, nullable(payload.subscription?.remarks), createdBy
        ]
      );
    }

    await db.commit();
    return res.status(201).json({ message: 'Cable TV customer saved successfully', cable_customer_id: cableCustomerId, approval_group_id: approvalGroupId });
  } catch (error) {
    await db.rollback();
    return res.status(500).json({ message: 'Cable TV customer save failed', error: error.message });
  }
};

const updateCableCustomer = async (req, res) => {
  try {
    const id = req.params.id || req.body.cable_customer_id;
    if (!id) return res.status(400).json({ message: 'cable_customer_id is required' });

    const payload = req.body;
    await connection.promise().query(
      `UPDATE cable_tv_customers SET
        network_id = ?, legacy_customer_no = ?, full_name = ?, door_no = ?, location_id = ?,
        area_id = ?, street_id = ?, city = ?, pincode = ?, mobile_no = ?, aadhaar_no = ?,
        alternate_mobile_no = ?, source_id = ?, installed_by_employee_id = ?,
        labour_service_charge = ?, status = ?, updated_at = NOW()
       WHERE cable_customer_id = ?`,
      [
        Number(payload.network_id), nullable(payload.legacy_customer_no), payload.full_name, payload.door_no,
        Number(payload.location_id), Number(payload.area_id), Number(payload.street_id), payload.city || '',
        nullable(payload.pincode), payload.mobile_no, nullable(payload.aadhaar_no), nullable(payload.alternate_mobile_no),
        intOrNull(payload.source_id), intOrNull(payload.installed_by_employee_id), money(payload.labour_service_charge),
        payload.status || 'ACTIVE', id
      ]
    );

    return res.json({ message: 'Cable TV customer updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Cable TV customer update failed', error: error.message });
  }
};

module.exports = {
  getLookups,
  getCableCustomers,
  getCableCustomerById,
  addCableCustomer,
  updateCableCustomer
};
