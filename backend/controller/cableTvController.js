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
const textOrNull = (value) => {
  const text = String(value || '').trim();
  return text || null;
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

const installedStbTypes = ['NEW', 'SERVICED', 'RETURNED'];
const stbBoxTypes = ['HD', 'SD'];
const stbStockTypes = ['NEW', 'SERVICED', 'RETURNED', 'FAULT'];
const stbStatuses = ['AVAILABLE', 'NOT_AVAILABLE'];
const normalizePackageType = (value) => {
  const type = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (type === 'ALA_CARTE' || type === 'ALACARTE') return 'ALACARTE';
  if (type === 'BROADCAST' || type === 'BROADCASTER') return 'BROADCASTER';
  if (type === 'ADDON') return type;
  return 'ADDON';
};
const customerStatusForStbStatus = (status) => ({
  ACTIVE: 'ACTIVE',
  RETRIEVED: 'RETRIEVED',
  FAULT: 'FAULT',
  DISCONNECTED: 'DISCONNECTED',
  UPGRADE: 'UPGRADE',
  RETURNED: 'DISCONNECTED',
  FAULTY: 'FAULT',
  REPLACED: 'ACTIVE'
}[String(status || '').toUpperCase()] || 'DISCONNECTED');

const safeLookup = async (db, sql, values = []) => {
  try {
    const [rows] = await db.query(sql, values);
    return Array.isArray(rows) ? rows : [];
  } catch (_error) {
    return [];
  }
};

const ensureCableTvExtendedTables = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS cable_stb_master (
      stb_master_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      stb_number VARCHAR(100) NOT NULL,
      box_type ENUM('HD','SD') NOT NULL DEFAULT 'HD',
      stock_type ENUM('NEW','SERVICED','RETURNED','FAULT') NOT NULL DEFAULT 'NEW',
      mso_id INT NULL,
      stb_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      status ENUM('AVAILABLE','NOT_AVAILABLE') NOT NULL DEFAULT 'AVAILABLE',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_cable_stb_master_number (stb_number),
      INDEX idx_cable_stb_master_status (status),
      INDEX idx_cable_stb_master_stock_type (stock_type),
      CONSTRAINT fk_cable_stb_master_mso FOREIGN KEY (mso_id) REFERENCES cable_mso_master(mso_id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS cable_stb_issue_master (
      stb_issue_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      stb_master_id BIGINT NOT NULL,
      cable_customer_id BIGINT NOT NULL,
      customer_stb_id BIGINT NULL,
      issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      issued_by_employee_id INT NULL,
      issue_status ENUM('ISSUED','RETURNED','CANCELLED') NOT NULL DEFAULT 'ISSUED',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cable_stb_issue_customer (cable_customer_id),
      INDEX idx_cable_stb_issue_stb (stb_master_id),
      CONSTRAINT fk_cable_stb_issue_master FOREIGN KEY (stb_master_id) REFERENCES cable_stb_master(stb_master_id),
      CONSTRAINT fk_cable_stb_issue_customer FOREIGN KEY (cable_customer_id) REFERENCES cable_tv_customers(cable_customer_id),
      CONSTRAINT fk_cable_stb_issue_customer_stb FOREIGN KEY (customer_stb_id) REFERENCES cable_customer_stbs(customer_stb_id),
      CONSTRAINT fk_cable_stb_issue_employee FOREIGN KEY (issued_by_employee_id) REFERENCES employees(employee_id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS cable_customer_accounts (
      account_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      approval_group_id BIGINT NOT NULL,
      cable_customer_id BIGINT NOT NULL,
      stb_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      connection_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      labor_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      material_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
      material_discount DECIMAL(12,2) NOT NULL DEFAULT 0,
      subscription_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      sub_total DECIMAL(12,2) NOT NULL DEFAULT 0,
      discount DECIMAL(12,2) NOT NULL DEFAULT 0,
      overall_discount DECIMAL(12,2) NOT NULL DEFAULT 0,
      grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
      customer_paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      due_date DATE NULL,
      account_status ENUM('PENDING','RECEIVED') NOT NULL DEFAULT 'PENDING',
      received_by_user_id INT NULL,
      received_at TIMESTAMP NULL,
      approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
      created_by_user_id INT NULL,
      approved_by_user_id INT NULL,
      approved_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_cable_customer_accounts_customer (cable_customer_id),
      INDEX idx_cable_customer_accounts_status (account_status),
      CONSTRAINT fk_cable_accounts_approval_group FOREIGN KEY (approval_group_id) REFERENCES cable_approval_groups(approval_group_id),
      CONSTRAINT fk_cable_accounts_customer FOREIGN KEY (cable_customer_id) REFERENCES cable_tv_customers(cable_customer_id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS cable_customer_stb_accessories (
      stb_accessory_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      approval_group_id BIGINT NULL,
      cable_customer_id BIGINT NOT NULL,
      customer_stb_id BIGINT NOT NULL,
      product_id INT NOT NULL,
      accessory_name VARCHAR(200) NOT NULL,
      qty DECIMAL(10,2) NOT NULL DEFAULT 1,
      unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
      issued_by_employee_id INT NULL,
      issued_date DATE NULL,
      approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
      created_by_user_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_cable_stb_accessories_customer (cable_customer_id),
      INDEX idx_cable_stb_accessories_stb (customer_stb_id),
      INDEX idx_cable_stb_accessories_product (product_id),
      CONSTRAINT fk_cable_stb_accessories_group FOREIGN KEY (approval_group_id) REFERENCES cable_approval_groups(approval_group_id),
      CONSTRAINT fk_cable_stb_accessories_customer FOREIGN KEY (cable_customer_id) REFERENCES cable_tv_customers(cable_customer_id),
      CONSTRAINT fk_cable_stb_accessories_stb FOREIGN KEY (customer_stb_id) REFERENCES cable_customer_stbs(customer_stb_id) ON DELETE CASCADE,
      CONSTRAINT fk_cable_stb_accessories_product FOREIGN KEY (product_id) REFERENCES products(product_id),
      CONSTRAINT fk_cable_stb_accessories_employee FOREIGN KEY (issued_by_employee_id) REFERENCES employees(employee_id)
    )
  `);

  const [[stbMasterColumn]] = await db.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_customer_stbs' AND COLUMN_NAME = 'stb_master_id'`
  );
  if (!stbMasterColumn.count) {
    await db.query('ALTER TABLE cable_customer_stbs ADD COLUMN stb_master_id BIGINT NULL AFTER cable_customer_id');
    await db.query('ALTER TABLE cable_customer_stbs ADD INDEX idx_cable_stbs_master (stb_master_id)');
    await db.query('ALTER TABLE cable_customer_stbs ADD CONSTRAINT fk_cable_stbs_master FOREIGN KEY (stb_master_id) REFERENCES cable_stb_master(stb_master_id)');
  }

  const [[stbNoUniqueIndex]] = await db.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'cable_customer_stbs'
       AND INDEX_NAME = 'uk_cable_stb_no'
       AND NON_UNIQUE = 0`
  );
  if (stbNoUniqueIndex.count) {
    await db.query('ALTER TABLE cable_customer_stbs DROP INDEX uk_cable_stb_no');
  }

  try {
    await db.query("ALTER TABLE cable_tv_customers MODIFY status ENUM('ACTIVE','INACTIVE','DISCONNECTED','SHIFTED','TRANSFERRED','RETRIEVED','FAULT','UPGRADE') NOT NULL DEFAULT 'ACTIVE'");
    await db.query("ALTER TABLE cable_customer_stbs MODIFY stb_type ENUM('NEW','SERVICED','RETURNED','FAULT','DAMAGED','UPGRADE','REPLACED','EXCHANGE','CUSTOMER_OWNED') NOT NULL DEFAULT 'NEW'");
    await db.query("ALTER TABLE cable_customer_stbs MODIFY status ENUM('ACTIVE','RETRIEVED','FAULT','DISCONNECTED','UPGRADE','RETURNED','FAULTY','REPLACED') NOT NULL DEFAULT 'ACTIVE'");
    await db.query("ALTER TABLE cable_connections MODIFY connection_type ENUM('NEW','RECONNECTION','SHIFTED','TRANSFERRED') NOT NULL DEFAULT 'NEW'");
    await db.query("ALTER TABLE cable_subscriptions MODIFY billing_basis ENUM('DAY','MONTH','YEAR') NOT NULL DEFAULT 'MONTH'");
  } catch (_error) {
    // Existing installations may already have the expanded enum.
  }

  const [[connectionDiscountColumn]] = await db.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_connections' AND COLUMN_NAME = 'connection_discount'`
  );
  if (!connectionDiscountColumn.count) {
    await db.query('ALTER TABLE cable_connections ADD COLUMN connection_discount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER connection_charge');
  }

  const accountColumns = [
    ['overall_discount', 'ALTER TABLE cable_customer_accounts ADD COLUMN overall_discount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER discount'],
    ['material_discount', 'ALTER TABLE cable_customer_accounts ADD COLUMN material_discount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER material_cost'],
    ['customer_paid_amount', 'ALTER TABLE cable_customer_accounts ADD COLUMN customer_paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER grand_total'],
    ['balance_amount', 'ALTER TABLE cable_customer_accounts ADD COLUMN balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER customer_paid_amount'],
    ['due_date', 'ALTER TABLE cable_customer_accounts ADD COLUMN due_date DATE NULL AFTER balance_amount']
  ];
  for (const [columnName, alterSql] of accountColumns) {
    const [[column]] = await db.query(
      `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_customer_accounts' AND COLUMN_NAME = ?`,
      [columnName]
    );
    if (!column.count) await db.query(alterSql);
  }

  const [[networkTypeColumn]] = await db.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_tv_customers' AND COLUMN_NAME = 'network_type'`
  );
  if (!networkTypeColumn.count) {
    await db.query('ALTER TABLE cable_tv_customers ADD COLUMN network_type VARCHAR(20) NULL AFTER network_id');
    await db.query(`
      UPDATE cable_tv_customers c
      INNER JOIN cable_network_master n ON n.network_id = c.network_id
      SET c.network_type = n.network_code
      WHERE c.network_type IS NULL
    `);
  }

  const [prefixedCustomers] = await db.query(
    `SELECT cable_customer_id
     FROM cable_tv_customers
     WHERE customer_code IS NULL OR customer_code NOT REGEXP '^[0-9]+$'
     ORDER BY cable_customer_id`
  );
  if (prefixedCustomers.length) {
    const [[maxNumeric]] = await db.query(
      `SELECT COALESCE(MAX(CAST(customer_code AS UNSIGNED)), 1000) AS max_code
       FROM cable_tv_customers
       WHERE customer_code REGEXP '^[0-9]+$'`
    );
    let nextCode = Math.max(Number(maxNumeric.max_code) || 1000, 1000) + 1;
    for (const customer of prefixedCustomers) {
      await db.query(
        'UPDATE cable_tv_customers SET customer_code = ? WHERE cable_customer_id = ?',
        [String(nextCode++), customer.cable_customer_id]
      );
    }
  }

  const [[customerCodeColumn]] = await db.query(
    `SELECT DATA_TYPE AS data_type
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_tv_customers' AND COLUMN_NAME = 'customer_code'`
  );
  if (customerCodeColumn?.data_type !== 'int') {
    await db.query('ALTER TABLE cable_tv_customers MODIFY customer_code INT NOT NULL');
  }

  const entryColumns = [
    ['cable_connections', 'entered_by_employee_id', 'ALTER TABLE cable_connections ADD COLUMN entered_by_employee_id INT NULL AFTER connected_by_employee_id'],
    ['cable_customer_stbs', 'entered_by_employee_id', 'ALTER TABLE cable_customer_stbs ADD COLUMN entered_by_employee_id INT NULL AFTER installed_by_employee_id']
  ];
  for (const [tableName, columnName, alterSql] of entryColumns) {
    const [[column]] = await db.query(
      `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [tableName, columnName]
    );
    if (!column.count) await db.query(alterSql);
  }

  const stbHistoryColumns = [
    ['updated_date', 'ALTER TABLE cable_customer_stbs ADD COLUMN updated_date DATE NULL AFTER installed_date'],
    ['update_reason', 'ALTER TABLE cable_customer_stbs ADD COLUMN update_reason VARCHAR(50) NULL AFTER updated_date'],
    ['reason_remarks', 'ALTER TABLE cable_customer_stbs ADD COLUMN reason_remarks VARCHAR(500) NULL AFTER update_reason']
  ];
  for (const [columnName, alterSql] of stbHistoryColumns) {
    const [[column]] = await db.query(
      `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_customer_stbs' AND COLUMN_NAME = ?`,
      [columnName]
    );
    if (!column.count) await db.query(alterSql);
  }

  const materialColumns = [
    ['updated_by_employee_id', 'ALTER TABLE cable_connection_materials ADD COLUMN updated_by_employee_id INT NULL AFTER issued_by_employee_id'],
    ['updated_date', 'ALTER TABLE cable_connection_materials ADD COLUMN updated_date DATE NULL AFTER updated_by_employee_id']
  ];
  for (const [columnName, alterSql] of materialColumns) {
    const [[column]] = await db.query(
      `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_connection_materials' AND COLUMN_NAME = ?`,
      [columnName]
    );
    if (!column.count) await db.query(alterSql);
  }

  const packageColumns = [
    ['package_type', "ALTER TABLE cable_customer_packages ADD COLUMN package_type ENUM('ADDON','ALACARTE','BROADCASTER') NOT NULL DEFAULT 'ADDON' AFTER package_id"],
    ['updated_by_employee_id', 'ALTER TABLE cable_customer_packages ADD COLUMN updated_by_employee_id INT NULL AFTER is_active']
  ];
  for (const [columnName, alterSql] of packageColumns) {
    const [[column]] = await db.query(
      `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_customer_packages' AND COLUMN_NAME = ?`,
      [columnName]
    );
    if (!column.count) await db.query(alterSql);
  }
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

const generateCustomerCode = async (db) => {
  const [[row]] = await db.query(
    `SELECT COALESCE(MAX(customer_code), 1000) + 1 AS next_code
     FROM cable_tv_customers`
  );
  return Number(row.next_code || 1001);
};

const resolveNetworkType = async (db, networkId) => {
  const [[network]] = await db.query(
    `SELECT network_code
     FROM cable_network_master
     WHERE network_id = ? AND network_code IN ('TCV', 'SVN', 'PAMMAL', 'LO') AND is_active = 1
     LIMIT 1`,
    [networkId]
  );
  if (!network) return null;
  return String(network.network_code).toUpperCase() === 'PAMMAL' ? 'Pammal' : network.network_code;
};

const postStockMovement = async (db, {
  productId,
  transactionType = 'INSTALLATION',
  transactionId,
  referenceNo,
  qtyIn = 0,
  qtyOut = 0,
  unitCost = null,
  remarks = null,
  employeeId = null
}) => {
  const product = intOrNull(productId);
  if (!product) return;
  const inQty = money(qtyIn);
  const outQty = money(qtyOut);
  if (inQty <= 0 && outQty <= 0) return;

  await db.query(
    `INSERT INTO stock_master (product_id, available_qty, last_stock_check_date)
     VALUES (?, 0, CURDATE())
     ON DUPLICATE KEY UPDATE last_stock_check_date = CURDATE()`,
    [product]
  );
  const [stockRows] = await db.query(
    'SELECT available_qty FROM stock_master WHERE product_id = ? FOR UPDATE',
    [product]
  );
  const currentQty = money(stockRows[0]?.available_qty);
  const nextQty = currentQty + inQty - outQty;
  if (nextQty < 0) {
    throw new Error(`Stock cannot go negative for selected accessory product ${product}`);
  }
  await db.query(
    `UPDATE stock_master
     SET available_qty = ?, last_stock_check_date = CURDATE(), last_updated = NOW()
     WHERE product_id = ?`,
    [nextQty, product]
  );
  await db.query(
    `INSERT INTO stock_ledger (
      product_id, transaction_type, transaction_id, reference_no,
      qty_in, qty_out, balance_qty, unit_cost, remarks, recorded_by_employee_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [product, transactionType, transactionId || null, referenceNo || null, inQty, outQty, nextQty, unitCost, remarks, employeeId]
  );
};

const saveStbAccessories = async (db, req, {
  approvalGroupId,
  cableCustomerId,
  customerStbId,
  accessories = [],
  employeeId,
  issuedDate,
  approvalStatus,
  createdBy
}) => {
  const selected = Array.isArray(accessories)
    ? accessories.filter((item) => intOrNull(item.product_id) && (item.selected === undefined || item.selected))
    : [];

  for (const item of selected) {
    const productId = intOrNull(item.product_id);
    const qty = money(item.qty || 1) || 1;
    const [[product]] = await db.query(
      `SELECT p.product_id, p.product_name, p.unit, p.purchase_price
       FROM products p
       WHERE p.product_id = ? AND p.status = 'ACTIVE'
       LIMIT 1`,
      [productId]
    );
    if (!product) throw new Error(`Selected accessory product ${productId} is not active`);

    const [result] = await db.query(
      `INSERT INTO cable_customer_stb_accessories (
        approval_group_id, cable_customer_id, customer_stb_id, product_id, accessory_name,
        qty, unit, issued_by_employee_id, issued_date, approval_status, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        approvalGroupId, cableCustomerId, customerStbId, productId, product.product_name,
        qty, product.unit || item.unit || 'PCS', employeeId, issuedDate || new Date(), approvalStatus, createdBy
      ]
    );
    await postStockMovement(db, {
      productId,
      transactionId: result.insertId,
      referenceNo: `CTV-STB-${customerStbId}`,
      qtyOut: qty,
      unitCost: money(product.purchase_price),
      remarks: `CATV STB accessory issued to customer ${cableCustomerId}`,
      employeeId
    });
  }
};

const createApprovalGroup = async (db, req, groupType = 'CUSTOMER_UPDATE') => {
  const approvalStatus = approvalStatusFor(req);
  const createdBy = currentUserId(req);
  const approvalGroupNo = `CTV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const [approvalResult] = await db.query(
    `INSERT INTO cable_approval_groups
      (approval_group_no, group_type, approval_status, requested_by_user_id, approved_by_user_id, approved_at)
     VALUES (?, ?, ?, ?, ?, ${approvalStatus === 'APPROVED' ? 'NOW()' : 'NULL'})`,
    [approvalGroupNo, groupType, approvalStatus, createdBy, approvalStatus === 'APPROVED' ? createdBy : null]
  );
  return { approvalGroupId: approvalResult.insertId, approvalStatus, createdBy };
};

const addPendingAccount = async (db, req, data) => {
  const stbAmount = money(data.stb_amount);
  const connectionAmount = money(data.connection_amount);
  const laborAmount = money(data.labor_amount);
  const materialCost = money(data.material_cost);
  const materialDiscount = money(data.material_discount);
  const subscriptionAmount = money(data.subscription_amount);
  const discount = money(data.discount) + materialDiscount;
  const overallDiscount = money(data.overall_discount);
  const subTotal = money(data.sub_total || (stbAmount + connectionAmount + laborAmount + materialCost + subscriptionAmount));
  const grandTotal = Math.max(money(data.grand_total || (subTotal - discount - overallDiscount)), 0);
  const paidAmount = money(data.customer_paid_amount);
  const balanceAmount = Math.max(grandTotal - paidAmount, 0);
  const accountStatus = balanceAmount <= 0 && grandTotal > 0 && paidAmount >= grandTotal && isAdmin(req) ? 'RECEIVED' : 'PENDING';
  await db.query(
    `INSERT INTO cable_customer_accounts (
      approval_group_id, cable_customer_id, stb_amount, connection_amount, labor_amount,
      material_cost, material_discount, subscription_amount, sub_total, discount, overall_discount, grand_total,
      customer_paid_amount, balance_amount, due_date, account_status, received_by_user_id,
      received_at, approval_status, created_by_user_id, approved_by_user_id, approved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${accountStatus === 'RECEIVED' ? 'NOW()' : 'NULL'}, ?, ?, ?, ${data.approval_status === 'APPROVED' ? 'NOW()' : 'NULL'})`,
    [
      data.approval_group_id, data.cable_customer_id, stbAmount, connectionAmount, laborAmount,
      materialCost, materialDiscount, subscriptionAmount, subTotal, discount, overallDiscount, grandTotal,
      paidAmount, balanceAmount, balanceAmount > 0 ? nullable(data.due_date) : null, accountStatus,
      accountStatus === 'RECEIVED' ? currentUserId(req) : null, data.approval_status, data.created_by_user_id,
      data.approval_status === 'APPROVED' ? data.created_by_user_id : null
    ]
  );
};

const getLookups = async (_req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const networks = await safeLookup(db,
      `SELECT network_id, network_code, network_name
       FROM cable_network_master
       WHERE is_active = 1 AND network_code IN ('TCV', 'SVN', 'PAMMAL', 'LO')
       ORDER BY FIELD(network_code, 'TCV', 'SVN', 'PAMMAL', 'LO')`
    );
    const locations = await safeLookup(db,
      `SELECT location_id, location_name, post_short_code, city, pincode
       FROM cable_locations
       WHERE is_active = 1 AND location_name IN ('Chromepet', 'Pammal')
       ORDER BY FIELD(location_name, 'Chromepet', 'Pammal')`
    );
    const areas = await safeLookup(db,
      'SELECT area_id, network_id, location_id, area_name FROM cable_areas WHERE is_active = 1 ORDER BY area_name'
    );
    const streets = await safeLookup(db,
      'SELECT street_id, area_id, street_name FROM cable_streets WHERE is_active = 1 ORDER BY street_name'
    );
    const sources = await safeLookup(db,
      'SELECT source_id, source_name FROM cable_connection_sources WHERE is_active = 1 ORDER BY source_name'
    );
    const msos = await safeLookup(db,
      'SELECT mso_id, mso_name FROM cable_mso_master WHERE is_active = 1 ORDER BY mso_name'
    );
    const packages = await safeLookup(db,
      'SELECT package_id, package_name, package_type, price FROM cable_package_master WHERE is_active = 1 ORDER BY package_name'
    );
    const employees = await safeLookup(db,
      `SELECT employee_id, employee_code,
              CONCAT_WS(' ', first_name, last_name) AS employee_name
       FROM employees
       WHERE is_active = 1
       ORDER BY first_name, last_name`
    );
    const products = await safeLookup(db,
      `SELECT product_id, product_name, unit, selling_price
       FROM products
       WHERE status = 'ACTIVE'
       ORDER BY product_name`
    );
    const stbAccessories = await safeLookup(db,
      `SELECT p.product_id, p.product_name, p.unit, p.selling_price,
              COALESCE(sm.available_qty, 0) AS available_qty
       FROM products p
       LEFT JOIN categories c ON c.category_id = p.category_id
       LEFT JOIN categories parent ON parent.category_id = c.parent_id
       LEFT JOIN categories root ON root.category_id = parent.parent_id
       LEFT JOIN stock_master sm ON sm.product_id = p.product_id
       WHERE p.status = 'ACTIVE'
         AND (
           (LOWER(c.category_name) = 'accessories' AND LOWER(parent.category_name) = 'catv')
           OR (LOWER(parent.category_name) = 'accessories' AND LOWER(root.category_name) = 'catv')
           OR LOWER(c.category_name) = 'stb accessories'
           OR LOWER(parent.category_name) = 'stb accessories'
           OR LOWER(root.category_name) = 'stb accessories'
           OR LOWER(p.product_name) LIKE '%stb accessories%'
           OR LOWER(p.product_name) IN ('hdmi', 'remote', '3pin av card', 'single pin av card', 'adaptor 12v 1amps')
         )
       ORDER BY p.product_name`
    );
    const stbMasters = await safeLookup(db,
      `SELECT sm.stb_master_id, sm.stb_number, sm.box_type, sm.stock_type, sm.mso_id,
              sm.stb_amount, sm.status, m.mso_name
       FROM cable_stb_master sm
       LEFT JOIN cable_mso_master m ON m.mso_id = sm.mso_id
       WHERE sm.is_active = 1
         AND sm.status = 'AVAILABLE'
         AND sm.stock_type <> 'FAULT'
       ORDER BY sm.stb_number`
    );
    const staticSources = [
      { source_id: 'Customer Approach Office', source_name: 'Customer Approach Office' },
      { source_id: 'Customer Approach Engineer', source_name: 'Customer Approach Engineer' }
    ];
    const staticMsos = ['VK', 'DM', 'ARISTO', 'JAK', 'SCV', 'TCCL'].map((name) => ({
      mso_id: name,
      mso_name: name
    }));

    return res.json({
      networks,
      locations,
      areas,
      streets,
      sources: sources.length ? sources : staticSources,
      msos: msos.length ? msos : staticMsos,
      installedMsos: (msos.length ? msos : staticMsos).filter((item) => ['VK', 'DM'].includes(String(item.mso_name).toUpperCase())),
      packages,
      employees,
      products,
      stbAccessories,
      stbMasters
    });
  } catch (error) {
    return res.status(500).json({ message: 'Cable TV lookups failed', error: error.message });
  }
};

const getMasters = async (_req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const [locations] = await db.query(
      `SELECT *
       FROM cable_locations
       WHERE location_name IN ('Chromepet', 'Pammal')
       ORDER BY FIELD(location_name, 'Chromepet', 'Pammal')`
    );
    const [networks] = await db.query(
      `SELECT network_id, network_code, network_name
       FROM cable_network_master
       WHERE is_active = 1 AND network_code IN ('TCV', 'SVN', 'PAMMAL', 'LO')
       ORDER BY FIELD(network_code, 'TCV', 'SVN', 'PAMMAL', 'LO')`
    );
    const [areas] = await db.query(
      `SELECT a.*, n.network_code, n.network_name, l.location_name, l.post_short_code, l.pincode
       FROM cable_areas a
       LEFT JOIN cable_network_master n ON n.network_id = a.network_id
       INNER JOIN cable_locations l ON l.location_id = a.location_id
       WHERE a.is_active = 1
       ORDER BY n.network_name, l.location_name, a.area_name`
    );
    const [streets] = await db.query(
      `SELECT s.*, a.network_id, n.network_code, n.network_name, a.area_name, l.location_name, l.post_short_code, l.pincode
       FROM cable_streets s
       INNER JOIN cable_areas a ON a.area_id = s.area_id
       LEFT JOIN cable_network_master n ON n.network_id = a.network_id
       INNER JOIN cable_locations l ON l.location_id = a.location_id
       WHERE a.is_active = 1 AND s.is_active = 1
       ORDER BY n.network_name, l.location_name, a.area_name, s.street_name`
    );
    const [locationInfos] = await db.query(
      `SELECT ROW_NUMBER() OVER (ORDER BY n.network_name, l.location_name, a.area_name, s.street_name) AS serial_no,
              s.street_id, a.area_id, a.network_id, n.network_code, n.network_name,
              l.location_id, l.location_name, l.post_short_code,
              l.pincode, a.area_name, s.street_name
       FROM cable_streets s
       INNER JOIN cable_areas a ON a.area_id = s.area_id
       LEFT JOIN cable_network_master n ON n.network_id = a.network_id
       INNER JOIN cable_locations l ON l.location_id = a.location_id
       WHERE l.location_name IN ('Chromepet', 'Pammal') AND a.is_active = 1 AND s.is_active = 1
       ORDER BY n.network_name, l.location_name, a.area_name, s.street_name`
    );
    const [packages] = await db.query('SELECT * FROM cable_package_master ORDER BY package_name, package_type');
    const [stbMasters] = await db.query(
      `SELECT sm.*, m.mso_name
       FROM cable_stb_master sm
       LEFT JOIN cable_mso_master m ON m.mso_id = sm.mso_id
       WHERE sm.is_active = 1
       ORDER BY sm.stb_number`
    );
    return res.json({ networks, locations, areas, streets, locationInfos, packages, stbMasters });
  } catch (error) {
    return res.status(500).json({ message: 'Cable TV masters failed', error: error.message });
  }
};

const validatePostalArea = async (db, locationId) => {
  const [[postalArea]] = await db.query(
    `SELECT location_id, location_name
     FROM cable_locations
     WHERE location_id = ? AND location_name IN ('Chromepet', 'Pammal') AND is_active = 1
     LIMIT 1`,
    [locationId]
  );
  return postalArea || null;
};

const validateCableNetwork = async (db, networkId) => {
  const [[network]] = await db.query(
    `SELECT network_id, network_code, network_name
     FROM cable_network_master
     WHERE network_id = ? AND network_code IN ('TCV', 'SVN', 'PAMMAL', 'LO') AND is_active = 1
     LIMIT 1`,
    [networkId]
  );
  return network || null;
};

const assertLocationInfoValid = async (db, payload, current = {}) => {
  const networkId = intOrNull(payload.network_id);
  const locationId = intOrNull(payload.location_id);
  const postShortCode = textOrNull(payload.post_short_code);
  const pincode = textOrNull(payload.pincode);
  const areaName = textOrNull(payload.area_name);
  const streetName = textOrNull(payload.street_name);

  if (!networkId || !locationId || !postShortCode || !pincode || !areaName || !streetName) {
    return { error: 'Network, postal area, post short code, pincode, local area and street are required' };
  }

  const network = await validateCableNetwork(db, networkId);
  if (!network) return { error: 'Select a valid network' };

  const postalArea = await validatePostalArea(db, locationId);
  if (!postalArea) return { error: 'Select a valid postal area' };

  const [[shortCodeDuplicate]] = await db.query(
    'SELECT location_id FROM cable_locations WHERE post_short_code = ? AND location_id <> ? LIMIT 1',
    [postShortCode, locationId]
  );
  if (shortCodeDuplicate) return { error: 'Post short code already exists' };

  const [[pincodeDuplicate]] = await db.query(
    'SELECT location_id FROM cable_locations WHERE pincode = ? AND location_id <> ? LIMIT 1',
    [pincode, locationId]
  );
  if (pincodeDuplicate) return { error: 'Pincode already exists' };

  const [[matchingArea]] = await db.query(
    'SELECT area_id FROM cable_areas WHERE network_id = ? AND location_id = ? AND area_name = ? AND is_active = 1 LIMIT 1',
    [networkId, locationId, areaName]
  );
  const targetAreaId = matchingArea?.area_id || intOrNull(current.area_id) || null;

  if (targetAreaId) {
    const [[streetDuplicate]] = await db.query(
      'SELECT street_id FROM cable_streets WHERE area_id = ? AND street_name = ? AND street_id <> ? LIMIT 1',
      [targetAreaId, streetName, intOrNull(current.street_id) || 0]
    );
    if (streetDuplicate) return { error: 'Street already exists for selected local area' };
  }

  return { networkId, locationId, postShortCode, pincode, areaName, streetName, targetAreaId };
};

const addLocationInfo = async (req, res) => {
  const db = connection.promise();
  await db.beginTransaction();
  try {
    const validated = await assertLocationInfoValid(db, req.body);
    if (validated.error) {
      await db.rollback();
      return res.status(400).json({ message: validated.error });
    }

    await db.query(
      'UPDATE cable_locations SET post_short_code = ?, pincode = ?, city = location_name WHERE location_id = ?',
      [validated.postShortCode, validated.pincode, validated.locationId]
    );
    let areaId = validated.targetAreaId;
    if (!areaId) {
      const [areaResult] = await db.query(
        'INSERT INTO cable_areas (network_id, location_id, area_name) VALUES (?, ?, ?)',
        [validated.networkId, validated.locationId, validated.areaName]
      );
      areaId = areaResult.insertId;
    }
    await db.query(
      'INSERT INTO cable_streets (area_id, street_name) VALUES (?, ?)',
      [areaId, validated.streetName]
    );

    await db.commit();
    return res.status(201).json({ message: 'Location info saved successfully' });
  } catch (error) {
    await db.rollback();
    return res.status(500).json({ message: 'Location info save failed', error: error.message });
  }
};

const updateLocationInfo = async (req, res) => {
  const db = connection.promise();
  await db.beginTransaction();
  try {
    const streetId = intOrNull(req.params.streetId);
    if (!streetId) {
      await db.rollback();
      return res.status(400).json({ message: 'street_id is required' });
    }

    const [[current]] = await db.query(
      `SELECT s.street_id, s.area_id, a.location_id
       FROM cable_streets s
       INNER JOIN cable_areas a ON a.area_id = s.area_id
       WHERE s.street_id = ?
       LIMIT 1`,
      [streetId]
    );
    if (!current) {
      await db.rollback();
      return res.status(404).json({ message: 'Location info not found' });
    }

    const validated = await assertLocationInfoValid(db, req.body, current);
    if (validated.error) {
      await db.rollback();
      return res.status(400).json({ message: validated.error });
    }

    await db.query(
      'UPDATE cable_locations SET post_short_code = ?, pincode = ?, city = location_name WHERE location_id = ?',
      [validated.postShortCode, validated.pincode, validated.locationId]
    );
    let targetAreaId = validated.targetAreaId;
    if (!targetAreaId) {
      const [areaResult] = await db.query(
        'INSERT INTO cable_areas (network_id, location_id, area_name) VALUES (?, ?, ?)',
        [validated.networkId, validated.locationId, validated.areaName]
      );
      targetAreaId = areaResult.insertId;
    } else if (targetAreaId === current.area_id) {
      await db.query(
        'UPDATE cable_areas SET network_id = ?, location_id = ?, area_name = ? WHERE area_id = ?',
        [validated.networkId, validated.locationId, validated.areaName, current.area_id]
      );
    }
    await db.query(
      'UPDATE cable_streets SET area_id = ?, street_name = ? WHERE street_id = ?',
      [targetAreaId, validated.streetName, streetId]
    );
    await db.query(
      'UPDATE cable_tv_customers SET network_id = ?, location_id = ?, area_id = ? WHERE street_id = ?',
      [validated.networkId, validated.locationId, targetAreaId, streetId]
    );
    const [[remainingStreet]] = await db.query(
      'SELECT street_id FROM cable_streets WHERE area_id = ? LIMIT 1',
      [current.area_id]
    );
    if (!remainingStreet) await db.query('DELETE FROM cable_areas WHERE area_id = ?', [current.area_id]);

    await db.commit();
    return res.json({ message: 'Location info updated successfully' });
  } catch (error) {
    await db.rollback();
    return res.status(500).json({ message: 'Location info update failed', error: error.message });
  }
};

const deleteLocationInfo = async (req, res) => {
  const db = connection.promise();
  await db.beginTransaction();
  try {
    const streetId = intOrNull(req.params.streetId);
    if (!streetId) {
      await db.rollback();
      return res.status(400).json({ message: 'street_id is required' });
    }

    const [[current]] = await db.query(
      'SELECT area_id FROM cable_streets WHERE street_id = ? LIMIT 1',
      [streetId]
    );
    if (!current) {
      await db.rollback();
      return res.status(404).json({ message: 'Location info not found' });
    }

    const [[customer]] = await db.query(
      'SELECT cable_customer_id FROM cable_tv_customers WHERE street_id = ? LIMIT 1',
      [streetId]
    );
    if (customer) {
      await db.rollback();
      return res.status(409).json({ message: 'Street is used by a customer and cannot be deleted' });
    }

    await db.query('DELETE FROM cable_streets WHERE street_id = ?', [streetId]);
    const [[remainingStreet]] = await db.query(
      'SELECT street_id FROM cable_streets WHERE area_id = ? LIMIT 1',
      [current.area_id]
    );
    if (!remainingStreet) {
      const [[areaCustomer]] = await db.query(
        'SELECT cable_customer_id FROM cable_tv_customers WHERE area_id = ? LIMIT 1',
        [current.area_id]
      );
      if (!areaCustomer) await db.query('DELETE FROM cable_areas WHERE area_id = ?', [current.area_id]);
    }

    await db.commit();
    return res.json({ message: 'Location info deleted successfully' });
  } catch (error) {
    await db.rollback();
    return res.status(500).json({ message: 'Location info delete failed', error: error.message });
  }
};

const addLocation = async (req, res) => {
  try {
    const { location_name, city, pincode } = req.body;
    if (!location_name || !city) return res.status(400).json({ message: 'Postal area and city are required' });
    const db = connection.promise();
    const [[existing]] = await db.query(
      'SELECT location_id FROM cable_locations WHERE location_name = ? AND city = ? LIMIT 1',
      [location_name.trim(), city.trim()]
    );
    if (existing) return res.status(409).json({ message: 'Postal area already exists' });
    await db.query(
      'INSERT IGNORE INTO cable_locations (location_name, city, pincode) VALUES (?, ?, ?)',
      [location_name.trim(), city.trim(), nullable(pincode)]
    );
    return res.status(201).json({ message: 'Postal area saved successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Cable TV postal area save failed', error: error.message });
  }
};

const addArea = async (req, res) => {
  try {
    const locationId = intOrNull(req.body.location_id);
    const areaName = String(req.body.area_name || '').trim();
    if (!locationId || !areaName) return res.status(400).json({ message: 'Postal area and location are required' });
    const db = connection.promise();
    const [[existing]] = await db.query(
      'SELECT area_id FROM cable_areas WHERE location_id = ? AND area_name = ? LIMIT 1',
      [locationId, areaName]
    );
    if (existing) return res.status(409).json({ message: 'Location already exists for selected postal area' });
    await db.query(
      'INSERT IGNORE INTO cable_areas (location_id, area_name) VALUES (?, ?)',
      [locationId, areaName]
    );
    return res.status(201).json({ message: 'Location saved successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Cable TV location save failed', error: error.message });
  }
};

const addStreet = async (req, res) => {
  try {
    const areaId = intOrNull(req.body.area_id);
    const streetName = String(req.body.street_name || '').trim();
    if (!areaId || !streetName) return res.status(400).json({ message: 'Location and street are required' });
    const db = connection.promise();
    const [[existing]] = await db.query(
      'SELECT street_id FROM cable_streets WHERE area_id = ? AND street_name = ? LIMIT 1',
      [areaId, streetName]
    );
    if (existing) return res.status(409).json({ message: 'Street already exists for selected location' });
    await db.query(
      'INSERT IGNORE INTO cable_streets (area_id, street_name) VALUES (?, ?)',
      [areaId, streetName]
    );
    return res.status(201).json({ message: 'Street saved successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Cable TV street save failed', error: error.message });
  }
};

const addPackage = async (req, res) => {
  try {
    const packageName = String(req.body.package_name || '').trim();
    const packageType = req.body.package_type || 'MSO_PACKAGE';
    if (!packageName) return res.status(400).json({ message: 'Package name is required' });
    const db = connection.promise();
    const [[existing]] = await db.query(
      'SELECT package_id FROM cable_package_master WHERE package_name = ? AND package_type = ? LIMIT 1',
      [packageName, packageType]
    );
    if (existing) return res.status(409).json({ message: 'Package already exists for selected type' });
    await db.query(
      `INSERT INTO cable_package_master (package_name, package_type, price, description)
       VALUES (?, ?, ?, ?)`,
      [packageName, packageType, money(req.body.price), nullable(req.body.description)]
    );
    return res.status(201).json({ message: 'Package saved successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Cable TV package save failed', error: error.message });
  }
};

const addStbMaster = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const payload = req.body || {};
    const stbNumber = textOrNull(payload.stb_number);
    const boxType = String(payload.box_type || 'HD').toUpperCase();
    const stockType = String(payload.stock_type || 'NEW').toUpperCase();
    const status = String(payload.status || 'AVAILABLE').toUpperCase();

    if (!stbNumber) return res.status(400).json({ message: 'STB number is required' });
    if (!stbBoxTypes.includes(boxType)) return res.status(400).json({ message: 'STB signal type must be HD or SD' });
    if (!stbStockTypes.includes(stockType)) return res.status(400).json({ message: 'STB stock type is invalid' });
    if (!stbStatuses.includes(status)) return res.status(400).json({ message: 'STB status is invalid' });

    const [[duplicate]] = await db.query(
      'SELECT stb_master_id FROM cable_stb_master WHERE LOWER(stb_number) = LOWER(?) AND is_active = 1 LIMIT 1',
      [stbNumber]
    );
    if (duplicate) return res.status(409).json({ message: 'STB number already exists' });

    await db.query(
      `INSERT INTO cable_stb_master (stb_number, box_type, stock_type, mso_id, stb_amount, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [stbNumber, boxType, stockType, intOrNull(payload.mso_id), money(payload.stb_amount), status]
    );

    return res.status(201).json({ message: 'STB saved successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'STB save failed', error: error.message });
  }
};

const getPendingAccounts = async (_req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const [rows] = await db.query(
      `SELECT ca.*, c.customer_code, c.full_name, c.mobile_no, n.network_name,
              l.location_name, a.area_name, s.street_name
       FROM cable_customer_accounts ca
       INNER JOIN cable_tv_customers c ON c.cable_customer_id = ca.cable_customer_id
       LEFT JOIN cable_network_master n ON n.network_id = c.network_id
       LEFT JOIN cable_locations l ON l.location_id = c.location_id
       LEFT JOIN cable_areas a ON a.area_id = c.area_id
       LEFT JOIN cable_streets s ON s.street_id = c.street_id
       WHERE ca.account_status = 'PENDING'
       ORDER BY ca.account_id DESC`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Pending account list failed', error: error.message });
  }
};

const receiveAccount = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const accountId = Number(req.params.accountId);
    if (!accountId) return res.status(400).json({ message: 'account_id is required' });

    await db.query(
      `UPDATE cable_customer_accounts
       SET account_status = 'RECEIVED',
           customer_paid_amount = grand_total,
           balance_amount = 0,
           due_date = NULL,
           received_by_user_id = ?,
           received_at = NOW(),
           updated_at = NOW()
       WHERE account_id = ?`,
      [currentUserId(req), accountId]
    );

    return res.json({ message: 'Account amount marked as received' });
  } catch (error) {
    return res.status(500).json({ message: 'Account receive failed', error: error.message });
  }
};

const getCableCustomers = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const status = req.query.approval_status || 'APPROVED';
    const values = [];
    let where = 'WHERE 1 = 1';

    if (status !== 'ALL') {
      where += ' AND c.approval_status = ?';
      values.push(status);
    }

    const [rows] = await db.query(
      `SELECT c.cable_customer_id, c.customer_code, c.legacy_customer_no, c.full_name,
               c.door_no, c.city, c.pincode, c.mobile_no, c.aadhaar_no, c.alternate_mobile_no,
               c.status, c.approval_status, c.created_at,
               c.network_id, c.location_id, c.area_id, c.street_id,
               c.network_type, n.network_name, l.location_name, a.area_name, s.street_name, src.source_name,
               CONCAT_WS(' ', e.first_name, e.last_name) AS installed_by_name,
               COALESCE(NULLIF(stb.stb_no, ''), sm.stb_number) AS stb_no,
               stb.installed_date, CONCAT_WS(' ', stb_emp.first_name, stb_emp.last_name) AS stb_installed_by_name,
               stb.stb_amount, stb.stb_discount, conn.connection_charge,
               conn.connection_discount, conn.labour_service_charge,
               COALESCE(NULLIF(cp.package_price, 0), pkg.price, acc.subscription_amount) AS package_price,
               pkg.package_name, pkg.package_type, pkg.price AS master_package_price,
               acc.subscription_amount, acc.overall_discount, acc.grand_total, acc.customer_paid_amount,
               acc.balance_amount, acc.due_date, acc.account_status
       FROM cable_tv_customers c
       INNER JOIN cable_network_master n ON n.network_id = c.network_id
       INNER JOIN cable_locations l ON l.location_id = c.location_id
       INNER JOIN cable_areas a ON a.area_id = c.area_id
       INNER JOIN cable_streets s ON s.street_id = c.street_id
       LEFT JOIN cable_connection_sources src ON src.source_id = c.source_id
       LEFT JOIN employees e ON e.employee_id = c.installed_by_employee_id
       LEFT JOIN cable_customer_stbs stb ON stb.customer_stb_id = (
         SELECT latest_stb.customer_stb_id
         FROM cable_customer_stbs latest_stb
         WHERE latest_stb.cable_customer_id = c.cable_customer_id
         ORDER BY COALESCE(latest_stb.updated_date, latest_stb.installed_date) DESC,
                  latest_stb.updated_at DESC,
                  latest_stb.customer_stb_id DESC
         LIMIT 1
       )
       LEFT JOIN cable_stb_master sm ON sm.stb_master_id = stb.stb_master_id
       LEFT JOIN employees stb_emp ON stb_emp.employee_id = stb.installed_by_employee_id
       LEFT JOIN cable_connections conn ON conn.connection_id = (
         SELECT MAX(connection_id) FROM cable_connections WHERE cable_customer_id = c.cable_customer_id
       )
       LEFT JOIN cable_customer_packages cp ON cp.customer_package_id = (
         SELECT MAX(customer_package_id) FROM cable_customer_packages WHERE cable_customer_id = c.cable_customer_id
       )
       LEFT JOIN cable_package_master pkg ON pkg.package_id = cp.package_id
       LEFT JOIN cable_customer_accounts acc ON acc.account_id = (
         SELECT MAX(account_id) FROM cable_customer_accounts WHERE cable_customer_id = c.cable_customer_id
       )
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
    await ensureCableTvExtendedTables(db);
    const { id } = req.params;
    const [[customer]] = await db.query('SELECT * FROM cable_tv_customers WHERE cable_customer_id = ?', [id]);

    if (!customer) {
      return res.status(404).json({ message: 'Cable TV customer not found' });
    }

    const [stbs] = await db.query(
      `SELECT stb.*, CONCAT_WS(' ', installed.first_name, installed.last_name) AS installed_by_name,
              CONCAT_WS(' ', entered.first_name, entered.last_name) AS entered_by_name
       FROM cable_customer_stbs stb
       LEFT JOIN employees installed ON installed.employee_id = stb.installed_by_employee_id
       LEFT JOIN employees entered ON entered.employee_id = stb.entered_by_employee_id
       WHERE stb.cable_customer_id = ?
       ORDER BY COALESCE(stb.updated_date, stb.installed_date) DESC,
                stb.updated_at DESC,
                stb.customer_stb_id DESC`,
      [id]
    );
    const [connections] = await db.query(
      `SELECT conn.*, CONCAT_WS(' ', installed.first_name, installed.last_name) AS installed_by_name,
              CONCAT_WS(' ', entered.first_name, entered.last_name) AS entered_by_name
       FROM cable_connections conn
       LEFT JOIN employees installed ON installed.employee_id = conn.connected_by_employee_id
       LEFT JOIN employees entered ON entered.employee_id = conn.entered_by_employee_id
       WHERE conn.cable_customer_id = ?
       ORDER BY conn.connection_id DESC`,
      [id]
    );
    const stbIds = stbs.map((item) => item.customer_stb_id);
    const [stbAccessories] = stbIds.length
      ? await db.query(
        `SELECT acc.*, p.product_name, p.unit
         FROM cable_customer_stb_accessories acc
         LEFT JOIN products p ON p.product_id = acc.product_id
         WHERE acc.customer_stb_id IN (?)
         ORDER BY acc.stb_accessory_id`,
        [stbIds]
      )
      : [[]];
    const connectionIds = connections.map((item) => item.connection_id);
    const [materials] = connectionIds.length
      ? await db.query('SELECT * FROM cable_connection_materials WHERE connection_id IN (?) ORDER BY connection_material_id', [connectionIds])
      : [[]];
    const [customerPackages] = await db.query(
      `SELECT cp.*, sub.subscription_month, sub.subscription_year, sub.days_in_month,
              sub.billing_basis, sub.number_of_days_or_months, sub.amount, sub.paid_amount,
              sub.balance_amount, sub.payment_status, pkg.package_name,
              pkg.package_type AS master_package_type,
              CONCAT_WS(' ', updated.first_name, updated.last_name) AS updated_by_name
       FROM cable_customer_packages cp
       LEFT JOIN cable_package_master pkg ON pkg.package_id = cp.package_id
       LEFT JOIN employees updated ON updated.employee_id = cp.updated_by_employee_id
       LEFT JOIN cable_subscriptions sub ON sub.customer_package_id = cp.customer_package_id
       WHERE cp.cable_customer_id = ?
       ORDER BY cp.customer_package_id DESC`,
      [id]
    );
    const [subscriptions] = await db.query('SELECT * FROM cable_subscriptions WHERE cable_customer_id = ? ORDER BY subscription_year DESC, subscription_month DESC', [id]);
    const [accounts] = await db.query('SELECT * FROM cable_customer_accounts WHERE cable_customer_id = ? ORDER BY account_id DESC', [id]);

    return res.json({ customer, stbs, stbAccessories, connections, materials, customerPackages, subscriptions, accounts });
  } catch (error) {
    return res.status(500).json({ message: 'Cable TV customer details failed', error: error.message });
  }
};

const addCableCustomer = async (req, res) => {
  const db = connection.promise();

  try {
    await ensureCableTvExtendedTables(db);
    await db.beginTransaction();
    const payload = req.body;
    const approvalStatus = approvalStatusFor(req, payload.approval_status);
    const createdBy = currentUserId(req);
    const networkId = Number(payload.network_id);

    if (!networkId || !payload.full_name || !payload.door_no || !payload.mobile_no || !payload.location_id || !payload.area_id || !payload.street_id) {
      await db.rollback();
      return res.status(400).json({ message: 'Network, customer name, door no, mobile, location, area and street are required' });
    }

    const networkType = await resolveNetworkType(db, networkId);
    if (!networkType) {
      await db.rollback();
      return res.status(400).json({ message: 'Selected network must be TCV, SVN, Pammal or LO' });
    }

    const customerCode = await generateCustomerCode(db);
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
    const stbStatus = String(payload.stb?.status || payload.status || 'ACTIVE').toUpperCase();
    const installedDate = payload.stb?.installed_date || payload.connection?.connection_date || new Date();
    const sourceId = await resolveSourceId(db, payload.source_id || payload.source_name);
    const [customerResult] = await db.query(
      `INSERT INTO cable_tv_customers (
        approval_group_id, network_id, network_type, legacy_customer_no, customer_code, full_name, door_no,
        location_id, area_id, street_id, city, pincode, mobile_no, aadhaar_no, alternate_mobile_no,
        source_id, installed_by_employee_id, labour_service_charge, status, approval_status,
        created_by_user_id, approved_by_user_id, approved_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${approvalStatus === 'APPROVED' ? 'NOW()' : 'NULL'})`,
      [
        approvalGroupId, networkId, networkType, nullable(payload.legacy_customer_no), customerCode, payload.full_name, payload.door_no,
        Number(payload.location_id), Number(payload.area_id), Number(payload.street_id), payload.city || '', nullable(payload.pincode),
        payload.mobile_no, nullable(payload.aadhaar_no), nullable(payload.alternate_mobile_no), sourceId,
        employeeId, money(payload.labour_service_charge), stbStatus, approvalStatus, createdBy,
        approvalStatus === 'APPROVED' ? createdBy : null
      ]
    );
    const cableCustomerId = customerResult.insertId;

    let customerStbId = null;
    if (payload.stb?.stb_master_id || payload.stb?.stb_no) {
      let selectedStb = null;
      if (payload.stb?.stb_master_id) {
        const [[stbRow]] = await db.query(
          `SELECT sm.*
           FROM cable_stb_master sm
           WHERE sm.stb_master_id = ? AND sm.is_active = 1
           FOR UPDATE`,
          [Number(payload.stb.stb_master_id)]
        );
        if (!stbRow) {
          await db.rollback();
          return res.status(400).json({ message: 'Selected STB was not found in STB master' });
        }
        if (stbRow.status !== 'AVAILABLE' || stbRow.stock_type === 'FAULT') {
          await db.rollback();
          return res.status(400).json({ message: 'Selected STB is not available for installation' });
        }
        selectedStb = stbRow;
      }

      const installedStbType = String(payload.stb.stb_type || selectedStb?.stock_type || 'NEW').toUpperCase();
      if (!installedStbTypes.includes(installedStbType)) {
        await db.rollback();
        return res.status(400).json({ message: 'Installed STB type must be New, Serviced or Returned' });
      }

      const [stbResult] = await db.query(
        `INSERT INTO cable_customer_stbs (
          approval_group_id, cable_customer_id, stb_master_id, stb_type, installed_mso_id, exchange_original_mso_id,
          stb_no, stb_amount, stb_discount, labour_service_charge, installed_by_employee_id,
          entered_by_employee_id, installed_date, status, approval_status, created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          approvalGroupId, cableCustomerId, intOrNull(payload.stb.stb_master_id), installedStbType,
          intOrNull(payload.stb.installed_mso_id || selectedStb?.mso_id),
          intOrNull(payload.stb.exchange_original_mso_id),
          selectedStb?.stb_number || payload.stb.stb_no,
          money(payload.stb.stb_amount ?? selectedStb?.stb_amount),
          money(payload.stb.stb_discount), 0, employeeId, employeeId,
          installedDate, stbStatus, approvalStatus, createdBy
        ]
      );
      customerStbId = stbResult.insertId;
      await saveStbAccessories(db, req, {
        approvalGroupId,
        cableCustomerId,
        customerStbId,
        accessories: payload.stb.accessories || payload.stb_accessories,
        employeeId,
        issuedDate: installedDate,
        approvalStatus,
        createdBy
      });

      if (selectedStb) {
        await db.query(
          "UPDATE cable_stb_master SET status = 'NOT_AVAILABLE', updated_at = NOW() WHERE stb_master_id = ?",
          [selectedStb.stb_master_id]
        );
        await db.query(
          `INSERT INTO cable_stb_issue_master (
            stb_master_id, cable_customer_id, customer_stb_id, issued_by_employee_id, issue_status
          ) VALUES (?, ?, ?, ?, 'ISSUED')`,
          [selectedStb.stb_master_id, cableCustomerId, customerStbId, employeeId]
        );
      }
    }

    let connectionId = null;
    if (payload.connection || payload.stb?.installed_date) {
      const [connectionResult] = await db.query(
        `INSERT INTO cable_connections (
          approval_group_id, cable_customer_id, connection_date, disconnection_date, connection_type,
          connected_by_employee_id, connection_charge, connection_discount, labour_service_charge, status, approval_status,
          remarks, created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          approvalGroupId, cableCustomerId, installedDate,
          nullable(payload.connection?.disconnection_date), payload.connection?.connection_type || 'NEW',
          employeeId, money(payload.connection?.connection_charge), money(payload.connection?.connection_discount),
          money(payload.connection?.labour_service_charge),
          stbStatus === 'DISCONNECTED' ? 'DISCONNECTED' : 'ACTIVE', approvalStatus, nullable(payload.connection?.remarks), createdBy
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
            issued_by_employee_id, updated_by_employee_id, updated_date, approval_status, created_by_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            approvalGroupId, connectionId, intOrNull(item.product_id), item.item_name || 'Material',
            qty, item.unit || 'PCS', unitRate, money(item.amount || qty * unitRate), employeeId,
            employeeId, installedDate, approvalStatus, createdBy
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
      const billingBasis = String(packageItem.billing_basis || packageItem.payment_type || payload.subscription?.payment_type || 'DAY').toUpperCase();
      const periodCount = money(packageItem.number_of_days_or_months || inclusiveDays(startDate, endDate));
      const amount = money(packageItem.amount || (
        billingBasis === 'YEAR'
          ? packagePrice * 12 * periodCount
          : billingBasis === 'MONTH'
            ? packagePrice * periodCount
            : (packagePrice / monthDays) * periodCount
      ));
      const paymentStatus = String(packageItem.payment_status || payload.subscription?.payment_status || 'PENDING').toUpperCase();
      const paidAmount = paymentStatus === 'PAID' ? amount : money(packageItem.paid_amount);
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
          billingBasis, periodCount,
          amount, paidAmount, balanceAmount, nullable(payload.subscription?.collect_date),
          dateOnly(startDate), dateOnly(endDate), employeeId,
          nullable(payload.subscription?.payment_mode), paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
          approvalStatus, nullable(payload.subscription?.remarks), createdBy
        ]
      );
    }

    const accountPayload = payload.account || {};
    const materialCost = Array.isArray(payload.materials)
      ? payload.materials.reduce((sum, item) => sum + money(item.amount), 0)
      : money(accountPayload.material_cost);
    const subscriptionAmount = Math.round(packageRowsPayload.reduce((sum, item) => sum + money(item.amount), 0));
    const accountStbAmount = money(accountPayload.stb_amount ?? payload.stb?.stb_amount);
    const connectionAmount = money(payload.connection?.connection_charge ?? accountPayload.connection_amount);
    const laborAmount = money(payload.connection?.labour_service_charge ?? accountPayload.labor_amount);
    const materialDiscount = money(accountPayload.material_discount);
    const overallDiscount = money(accountPayload.overall_discount);
    const discount = money(payload.stb?.stb_discount) + money(payload.connection?.connection_discount) + materialDiscount + overallDiscount;
    const subTotal = money(accountPayload.sub_total || (accountStbAmount + connectionAmount + laborAmount + materialCost + subscriptionAmount));
    const grandTotal = money(accountPayload.grand_total || (subTotal - discount));
    const normalizedGrandTotal = Math.max(grandTotal, 0);
    const customerPaidAmount = money(accountPayload.customer_paid_amount);
    const balanceAmount = Math.max(normalizedGrandTotal - customerPaidAmount, 0);
    const dueDate = balanceAmount > 0 ? nullable(accountPayload.due_date) : null;
    const accountStatus = String(accountPayload.account_status || 'PENDING').toUpperCase() === 'RECEIVED' && isAdmin(req)
      ? 'RECEIVED'
      : 'PENDING';
    await db.query(
      `INSERT INTO cable_customer_accounts (
        approval_group_id, cable_customer_id, stb_amount, connection_amount, labor_amount,
        material_cost, material_discount, subscription_amount, sub_total, discount, overall_discount, grand_total, customer_paid_amount,
        balance_amount, due_date, account_status,
        received_by_user_id, received_at, approval_status, created_by_user_id, approved_by_user_id, approved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${accountStatus === 'RECEIVED' ? 'NOW()' : 'NULL'}, ?, ?, ?, ${approvalStatus === 'APPROVED' ? 'NOW()' : 'NULL'})`,
      [
        approvalGroupId, cableCustomerId, accountStbAmount, connectionAmount, laborAmount,
        materialCost, materialDiscount, subscriptionAmount, subTotal, discount, overallDiscount, normalizedGrandTotal, customerPaidAmount,
        balanceAmount, dueDate, accountStatus,
        accountStatus === 'RECEIVED' ? createdBy : null, approvalStatus, createdBy,
        approvalStatus === 'APPROVED' ? createdBy : null
      ]
    );

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
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const networkId = Number(payload.network_id);
    const networkType = await resolveNetworkType(db, networkId);
    if (!networkType) return res.status(400).json({ message: 'Selected network must be TCV, SVN, Pammal or LO' });
    const sourceId = await resolveSourceId(db, payload.source_id || payload.source_name);
    const employeeId = await resolveEmployeeId(db, req, payload.installed_by_employee_id);
    await db.query(
      `UPDATE cable_tv_customers SET
        network_id = ?, network_type = ?, legacy_customer_no = ?, full_name = ?, door_no = ?, location_id = ?,
        area_id = ?, street_id = ?, city = ?, pincode = ?, mobile_no = ?, aadhaar_no = ?,
        alternate_mobile_no = ?, source_id = ?, installed_by_employee_id = ?,
        labour_service_charge = ?, status = ?, updated_at = NOW()
       WHERE cable_customer_id = ?`,
      [
        networkId, networkType, nullable(payload.legacy_customer_no), payload.full_name, payload.door_no,
        Number(payload.location_id), Number(payload.area_id), Number(payload.street_id), payload.city || '',
        nullable(payload.pincode), payload.mobile_no, nullable(payload.aadhaar_no), nullable(payload.alternate_mobile_no),
        sourceId, employeeId, money(payload.labour_service_charge),
        payload.status || 'ACTIVE', id
      ]
    );

    return res.json({ message: 'Cable TV customer updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Cable TV customer update failed', error: error.message });
  }
};

const addCustomerConnection = async (req, res) => {
  const db = connection.promise();
  try {
    await ensureCableTvExtendedTables(db);
    await db.beginTransaction();
    const cableCustomerId = Number(req.params.id);
    const payload = req.body || {};
    const { approvalGroupId, approvalStatus, createdBy } = await createApprovalGroup(db, req, 'CONNECTION_UPDATE');
    const employeeId = await resolveEmployeeId(db, req, payload.installed_by_employee_id || payload.entered_by_employee_id);
    const [result] = await db.query(
      `INSERT INTO cable_connections (
        approval_group_id, cable_customer_id, connection_date, disconnection_date, connection_type,
        connected_by_employee_id, entered_by_employee_id, connection_charge, connection_discount, labour_service_charge,
        status, approval_status, remarks, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        approvalGroupId, cableCustomerId, payload.connection_date || new Date(),
        nullable(payload.disconnection_date), payload.connection_type || 'RECONNECTION',
        employeeId, employeeId, money(payload.connection_charge), money(payload.connection_discount),
        money(payload.labour_service_charge), 'ACTIVE', approvalStatus,
        nullable(payload.remarks), createdBy
      ]
    );
    const materials = Array.isArray(payload.materials) ? payload.materials : [];
    let materialCost = 0;
    for (const item of materials.filter((row) => row.item_name || row.product_id)) {
      const qty = money(item.qty || 1);
      const unitRate = money(item.unit_rate);
      const amount = money(item.amount || qty * unitRate);
      materialCost += amount;
      await db.query(
        `INSERT INTO cable_connection_materials (
          approval_group_id, connection_id, product_id, item_name, qty, unit, unit_rate, amount,
          issued_by_employee_id, updated_by_employee_id, updated_date, approval_status, created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          approvalGroupId, result.insertId, intOrNull(item.product_id), item.item_name || 'Material',
          qty, item.unit || 'PCS', unitRate, amount, employeeId, employeeId,
          payload.connection_date || new Date(), approvalStatus, createdBy
        ]
      );
    }
    await addPendingAccount(db, req, {
      approval_group_id: approvalGroupId,
      cable_customer_id: cableCustomerId,
      connection_amount: payload.connection_charge,
      labor_amount: payload.labour_service_charge,
      material_cost: materialCost,
      discount: payload.connection_discount,
      overall_discount: payload.overall_discount,
      customer_paid_amount: payload.customer_paid_amount,
      due_date: payload.due_date,
      approval_status: approvalStatus,
      created_by_user_id: createdBy
    });
    await db.query('UPDATE cable_tv_customers SET status = ? WHERE cable_customer_id = ?', ['ACTIVE', cableCustomerId]);
    await db.commit();
    return res.status(201).json({ message: 'Connection details saved successfully' });
  } catch (error) {
    await db.rollback();
    console.error('Connection save failed:', error);
    return res.status(500).json({ message: 'Connection save failed', error: error.message });
  }
};

const updateCustomerConnection = async (req, res) => {
  try {
    const db = connection.promise();
    await db.query(
      `UPDATE cable_connections
       SET connection_date = ?, disconnection_date = ?, connection_type = ?, connected_by_employee_id = ?,
           connection_charge = ?, connection_discount = ?, labour_service_charge = ?, status = ?, remarks = ?, updated_at = NOW()
       WHERE connection_id = ? AND cable_customer_id = ?`,
      [
        req.body.connection_date || new Date(), nullable(req.body.disconnection_date), req.body.connection_type || 'RECONNECTION',
        intOrNull(req.body.installed_by_employee_id), money(req.body.connection_charge), money(req.body.connection_discount),
        money(req.body.labour_service_charge), req.body.status || 'ACTIVE', nullable(req.body.remarks),
        Number(req.params.connectionId), Number(req.params.id)
      ]
    );
    return res.json({ message: 'Connection details updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Connection update failed', error: error.message });
  }
};

const deleteCustomerConnection = async (req, res) => {
  try {
    await connection.promise().query(
      'DELETE FROM cable_connections WHERE connection_id = ? AND cable_customer_id = ?',
      [Number(req.params.connectionId), Number(req.params.id)]
    );
    return res.json({ message: 'Connection details deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Connection delete failed', error: error.message });
  }
};

const addCustomerStb = async (req, res) => {
  const db = connection.promise();
  try {
    await ensureCableTvExtendedTables(db);
    await db.beginTransaction();
    const cableCustomerId = Number(req.params.id);
    const payload = req.body || {};
    const { approvalGroupId, approvalStatus, createdBy } = await createApprovalGroup(db, req, 'STB_UPDATE');
    const employeeId = await resolveEmployeeId(db, req, payload.installed_by_employee_id || payload.entered_by_employee_id);
    const updateReason = String(payload.reason || payload.update_reason || 'DISCONNECT').toUpperCase();
    const remarks = textOrNull(payload.remarks || payload.reason_remarks);
    const updatedDate = payload.updated_date || payload.installed_date || new Date();
    const isReplacement = updateReason === 'REPLACED';
    const selectedStbStatus = String(payload.status || (updateReason === 'REACTIVATE' ? 'ACTIVE' : isReplacement ? 'ACTIVE' : 'DISCONNECTED')).toUpperCase();
    const customerStatus = customerStatusForStbStatus(selectedStbStatus);

    const [activeStbs] = await db.query(
      `SELECT customer_stb_id, stb_master_id, stb_type, installed_mso_id, exchange_original_mso_id,
              stb_no, stb_image_path, installed_by_employee_id, installed_date
       FROM cable_customer_stbs
       WHERE cable_customer_id = ? AND status = 'ACTIVE'
       ORDER BY COALESCE(updated_date, installed_date) DESC,
                updated_at DESC,
                customer_stb_id DESC
       LIMIT 1`,
      [cableCustomerId]
    );

    if (!isReplacement) {
      let targetStbs = activeStbs;
      if (!targetStbs.length) {
        const [latestStbs] = await db.query(
          `SELECT customer_stb_id, stb_master_id, stb_type, installed_mso_id, exchange_original_mso_id,
                  stb_no, stb_image_path, installed_by_employee_id, installed_date
           FROM cable_customer_stbs
           WHERE cable_customer_id = ?
           ORDER BY COALESCE(updated_date, installed_date) DESC,
                    updated_at DESC,
                    customer_stb_id DESC
           LIMIT 1`,
          [cableCustomerId]
        );
        targetStbs = latestStbs;
      }
      if (!targetStbs.length) {
        await db.rollback();
        return res.status(400).json({ message: 'No STB history found for this customer' });
      }
      const targetStb = targetStbs[0];
      await db.query(
        `INSERT INTO cable_customer_stbs (
          approval_group_id, cable_customer_id, stb_master_id, stb_type, installed_mso_id, exchange_original_mso_id,
          stb_no, stb_image_path, stb_amount, stb_discount, labour_service_charge,
          installed_by_employee_id, entered_by_employee_id, installed_date, updated_date,
          update_reason, reason_remarks, status, approval_status, created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          approvalGroupId, cableCustomerId, targetStb.stb_master_id, targetStb.stb_type || 'NEW',
          targetStb.installed_mso_id, targetStb.exchange_original_mso_id,
          targetStb.stb_no, targetStb.stb_image_path, employeeId || targetStb.installed_by_employee_id,
          employeeId, targetStb.installed_date || updatedDate, updatedDate, updateReason, remarks,
          selectedStbStatus, approvalStatus, createdBy
        ]
      );
      await db.query('UPDATE cable_tv_customers SET status = ? WHERE cable_customer_id = ?', [customerStatus, cableCustomerId]);
      await db.commit();
      return res.status(201).json({ message: 'STB status details saved successfully' });
    }

    const stbMasterId = intOrNull(payload.stb_master_id);
    let selectedStb = null;
    if (stbMasterId) {
      const [[stbRow]] = await db.query(
        `SELECT sm.stb_master_id, sm.stb_number, sm.stock_type, sm.mso_id, sm.stb_amount, sm.status
         FROM cable_stb_master sm
         WHERE sm.stb_master_id = ? AND sm.is_active = 1
         LIMIT 1`,
        [stbMasterId]
      );
      if (!stbRow) {
        await db.rollback();
        return res.status(400).json({ message: 'Selected STB was not found in STB master' });
      }
      if (stbRow.status !== 'AVAILABLE' || stbRow.stock_type === 'FAULT') {
        await db.rollback();
        return res.status(400).json({ message: 'Selected STB is not available for installation' });
      }
      if (String(stbRow.stock_type || '').toUpperCase() !== String(payload.stb_type || 'NEW').toUpperCase()) {
        await db.rollback();
        return res.status(400).json({ message: 'Selected STB number does not match the selected STB type' });
      }
      selectedStb = stbRow;
    }

    const stbNo = selectedStb?.stb_number || textOrNull(payload.stb_no);
    if (!stbNo) {
      await db.rollback();
      return res.status(400).json({ message: 'STB number is required' });
    }

    if (activeStbs.length) {
      const activeIds = activeStbs.map((item) => item.customer_stb_id);
      await db.query(
        `UPDATE cable_customer_stbs
         SET status = 'REPLACED', updated_date = ?, update_reason = ?, reason_remarks = ?, updated_at = NOW()
         WHERE customer_stb_id IN (?)`,
        [updatedDate, updateReason, remarks, activeIds]
      );
      const oldMasterIds = activeStbs.map((item) => item.stb_master_id).filter(Boolean);
      if (oldMasterIds.length) {
        await db.query(
          `UPDATE cable_stb_master
           SET status = 'AVAILABLE', updated_at = NOW()
           WHERE stb_master_id IN (?)`,
          [oldMasterIds]
        );
        await db.query(
          `UPDATE cable_stb_issue_master
           SET issue_status = 'RETURNED'
           WHERE customer_stb_id IN (?) AND issue_status = 'ISSUED'`,
          [activeIds]
        );
      }
    }

    const [stbResult] = await db.query(
      `INSERT INTO cable_customer_stbs (
        approval_group_id, cable_customer_id, stb_master_id, stb_type, installed_mso_id, exchange_original_mso_id,
        stb_no, stb_amount, stb_discount, labour_service_charge, installed_by_employee_id, entered_by_employee_id,
        installed_date, updated_date, update_reason, reason_remarks, status, approval_status, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        approvalGroupId, cableCustomerId, stbMasterId, payload.stb_type || selectedStb?.stock_type || 'NEW',
        intOrNull(payload.installed_mso_id || selectedStb?.mso_id), intOrNull(payload.exchange_original_mso_id), stbNo,
        money(payload.stb_amount ?? selectedStb?.stb_amount), money(payload.stb_discount), money(payload.labour_service_charge),
        employeeId, employeeId, updatedDate, updatedDate, updateReason, remarks, selectedStbStatus, approvalStatus, createdBy
      ]
    );
    await saveStbAccessories(db, req, {
      approvalGroupId,
      cableCustomerId,
      customerStbId: stbResult.insertId,
      accessories: payload.accessories || payload.stb_accessories,
      employeeId,
      issuedDate: payload.installed_date || new Date(),
      approvalStatus,
      createdBy
    });
    if (selectedStb) {
      await db.query(
        "UPDATE cable_stb_master SET status = 'NOT_AVAILABLE', updated_at = NOW() WHERE stb_master_id = ?",
        [selectedStb.stb_master_id]
      );
      await db.query(
        `INSERT INTO cable_stb_issue_master (
          stb_master_id, cable_customer_id, customer_stb_id, issued_by_employee_id, issue_status
        ) VALUES (?, ?, ?, ?, 'ISSUED')`,
        [selectedStb.stb_master_id, cableCustomerId, stbResult.insertId, employeeId]
      );
    }
    const pendingTotal = money(payload.stb_amount ?? selectedStb?.stb_amount)
      + money(payload.labour_service_charge)
      - money(payload.stb_discount)
      - money(payload.overall_discount);
    if (pendingTotal > 0 || money(payload.customer_paid_amount) > 0) {
      await addPendingAccount(db, req, {
        approval_group_id: approvalGroupId,
        cable_customer_id: cableCustomerId,
        stb_amount: payload.stb_amount ?? selectedStb?.stb_amount,
        labor_amount: payload.labour_service_charge,
        discount: payload.stb_discount,
        overall_discount: payload.overall_discount,
        customer_paid_amount: payload.customer_paid_amount,
        due_date: payload.due_date,
        approval_status: approvalStatus,
        created_by_user_id: createdBy
      });
    }
    await db.query('UPDATE cable_tv_customers SET status = ? WHERE cable_customer_id = ?', [customerStatus, cableCustomerId]);
    await db.commit();
    return res.status(201).json({ message: 'STB details saved successfully' });
  } catch (error) {
    await db.rollback();
    return res.status(500).json({ message: 'STB save failed', error: error.message });
  }
};

const updateCustomerStb = async (req, res) => {
  try {
    await ensureCableTvExtendedTables(connection.promise());
    const db = connection.promise();
    const stbStatus = String(req.body.status || 'ACTIVE').toUpperCase();
    await db.query(
      `UPDATE cable_customer_stbs
       SET stb_type = ?, stb_no = ?, stb_amount = ?, stb_discount = ?, labour_service_charge = ?,
           installed_date = ?, updated_date = ?, update_reason = ?, reason_remarks = ?,
           installed_by_employee_id = ?, status = ?, updated_at = NOW()
       WHERE customer_stb_id = ? AND cable_customer_id = ?`,
      [
        req.body.stb_type || 'NEW', req.body.stb_no, money(req.body.stb_amount), money(req.body.stb_discount),
        money(req.body.labour_service_charge), req.body.installed_date || req.body.updated_date || new Date(),
        req.body.updated_date || req.body.installed_date || new Date(), req.body.reason || req.body.update_reason || null,
        nullable(req.body.remarks || req.body.reason_remarks), intOrNull(req.body.installed_by_employee_id), stbStatus,
        Number(req.params.stbId), Number(req.params.id)
      ]
    );
    await db.query(
      'UPDATE cable_tv_customers SET status = ? WHERE cable_customer_id = ?',
      [customerStatusForStbStatus(stbStatus), Number(req.params.id)]
    );
    return res.json({ message: 'STB details updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'STB update failed', error: error.message });
  }
};

const deleteCustomerStb = async (req, res) => {
  try {
    await connection.promise().query(
      'DELETE FROM cable_customer_stbs WHERE customer_stb_id = ? AND cable_customer_id = ?',
      [Number(req.params.stbId), Number(req.params.id)]
    );
    return res.json({ message: 'STB details deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'STB delete failed', error: error.message });
  }
};

const addCustomerPackage = async (req, res) => {
  const db = connection.promise();
  try {
    await ensureCableTvExtendedTables(db);
    await db.beginTransaction();
    const cableCustomerId = Number(req.params.id);
    const payload = req.body || {};
    const { approvalGroupId, approvalStatus, createdBy } = await createApprovalGroup(db, req, 'PACKAGE_UPDATE');
    const packageType = normalizePackageType(payload.package_type);
    const employeeId = await resolveEmployeeId(db, req, payload.updated_by_employee_id);
    const [[activeSameType]] = await db.query(
      `SELECT customer_package_id
       FROM cable_customer_packages
       WHERE cable_customer_id = ? AND package_type = ? AND is_active = 1
       LIMIT 1`,
      [cableCustomerId, packageType]
    );
    if (activeSameType) {
      await db.rollback();
      return res.status(400).json({ message: `Previous active ${packageType} package exists. Please deactivate previous package before adding another.` });
    }
    const [[pkg]] = await db.query('SELECT price FROM cable_package_master WHERE package_id = ?', [payload.package_id]);
    const packagePrice = money(payload.package_price ?? pkg?.price);
    await db.query(
      `INSERT INTO cable_customer_packages (
        approval_group_id, cable_customer_id, package_id, package_type, package_price, start_date, end_date,
        is_active, updated_by_employee_id, approval_status, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        approvalGroupId, cableCustomerId, Number(payload.package_id), packageType, packagePrice,
        payload.start_date || new Date(), nullable(payload.end_date), 1, employeeId, approvalStatus, createdBy
      ]
    );
    await db.commit();
    return res.status(201).json({ message: 'Package details saved successfully' });
  } catch (error) {
    await db.rollback();
    return res.status(500).json({ message: 'Package save failed', error: error.message });
  }
};

const updateCustomerPackage = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const cableCustomerId = Number(req.params.id);
    const customerPackageId = Number(req.params.packageId);
    const packageType = normalizePackageType(req.body.package_type);
    const isActive = Number(req.body.is_active ?? 1) === 1 ? 1 : 0;
    const employeeId = await resolveEmployeeId(db, req, req.body.updated_by_employee_id);
    if (isActive) {
      const [[activeSameType]] = await db.query(
        `SELECT customer_package_id
         FROM cable_customer_packages
         WHERE cable_customer_id = ? AND package_type = ? AND is_active = 1 AND customer_package_id <> ?
         LIMIT 1`,
        [cableCustomerId, packageType, customerPackageId]
      );
      if (activeSameType) {
        return res.status(400).json({ message: `Previous active ${packageType} package exists. Please deactivate previous package before adding another.` });
      }
    }
    const [[pkg]] = await db.query('SELECT price FROM cable_package_master WHERE package_id = ?', [req.body.package_id]);
    const endDate = isActive ? nullable(req.body.end_date) : dateOnly(new Date());
    const packagePrice = isActive ? money(req.body.package_price || pkg?.price) : 0;
    await db.query(
      `UPDATE cable_customer_packages
       SET package_id = ?, package_type = ?, package_price = ?, start_date = ?, end_date = ?,
           is_active = ?, updated_by_employee_id = ?, updated_at = NOW()
       WHERE customer_package_id = ? AND cable_customer_id = ?`,
      [
        Number(req.body.package_id), packageType, packagePrice, req.body.start_date || new Date(),
        endDate, isActive, employeeId, customerPackageId, cableCustomerId
      ]
    );
    return res.json({ message: 'Package details updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Package update failed', error: error.message });
  }
};

const deleteCustomerPackage = async (req, res) => {
  try {
    await connection.promise().query(
      'DELETE FROM cable_customer_packages WHERE customer_package_id = ? AND cable_customer_id = ?',
      [Number(req.params.packageId), Number(req.params.id)]
    );
    return res.json({ message: 'Package details deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Package delete failed', error: error.message });
  }
};

const addCustomerSubscription = async (req, res) => {
  const db = connection.promise();
  try {
    await db.beginTransaction();
    const cableCustomerId = Number(req.params.id);
    const payload = req.body || {};
    const { approvalGroupId, approvalStatus, createdBy } = await createApprovalGroup(db, req, 'SUBSCRIPTION_UPDATE');
    const startDate = payload.start_date || new Date();
    const start = new Date(startDate);
    const subscriptionMonth = Number(payload.subscription_month) || start.getMonth() + 1;
    const subscriptionYear = Number(payload.subscription_year) || start.getFullYear();
    const monthDays = Number(payload.days_in_month) || daysInMonth(subscriptionMonth, subscriptionYear);
    const expiryDate = payload.expiry_date || `${subscriptionYear}-${String(subscriptionMonth).padStart(2, '0')}-${monthDays}`;
    const numberOfDays = money(payload.number_of_days_or_months || inclusiveDays(startDate, expiryDate));
    const amount = money(payload.amount);
    const paidAmount = money(payload.paid_amount);
    const balanceAmount = money(payload.balance_amount ?? amount - paidAmount);
    const employeeId = await resolveEmployeeId(db, req, payload.collected_by_employee_id);
    await db.query(
      `INSERT INTO cable_subscriptions (
        approval_group_id, cable_customer_id, customer_package_id, subscription_month, subscription_year,
        days_in_month, billing_basis, number_of_days_or_months, amount, paid_amount, balance_amount,
        collect_date, start_date, expiry_date, collected_by_employee_id, payment_mode, payment_status,
        approval_status, remarks, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        approvalGroupId, cableCustomerId, Number(payload.customer_package_id), subscriptionMonth, subscriptionYear,
        monthDays, payload.billing_basis || 'DAY', numberOfDays, amount, paidAmount, balanceAmount,
        nullable(payload.collect_date), dateOnly(startDate), dateOnly(expiryDate), employeeId,
        nullable(payload.payment_mode), balanceAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING',
        approvalStatus, nullable(payload.remarks), createdBy
      ]
    );
    await addPendingAccount(db, req, {
      approval_group_id: approvalGroupId,
      cable_customer_id: cableCustomerId,
      subscription_amount: amount,
      customer_paid_amount: paidAmount,
      due_date: payload.due_date,
      approval_status: approvalStatus,
      created_by_user_id: createdBy
    });
    await db.commit();
    return res.status(201).json({ message: 'Subscription details saved successfully' });
  } catch (error) {
    await db.rollback();
    return res.status(500).json({ message: 'Subscription save failed', error: error.message });
  }
};

const updateCustomerSubscription = async (req, res) => {
  try {
    await connection.promise().query(
      `UPDATE cable_subscriptions
       SET subscription_month = ?, subscription_year = ?, amount = ?, paid_amount = ?,
           balance_amount = ?, collect_date = ?, start_date = ?, expiry_date = ?,
           payment_mode = ?, payment_status = ?, remarks = ?, updated_at = NOW()
       WHERE subscription_id = ? AND cable_customer_id = ?`,
      [
        Number(req.body.subscription_month), Number(req.body.subscription_year), money(req.body.amount),
        money(req.body.paid_amount), money(req.body.balance_amount), nullable(req.body.collect_date),
        nullable(req.body.start_date), nullable(req.body.expiry_date), nullable(req.body.payment_mode),
        req.body.payment_status || 'PENDING', nullable(req.body.remarks),
        Number(req.params.subscriptionId), Number(req.params.id)
      ]
    );
    return res.json({ message: 'Subscription details updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Subscription update failed', error: error.message });
  }
};

const deleteCustomerSubscription = async (req, res) => {
  try {
    await connection.promise().query(
      'DELETE FROM cable_subscriptions WHERE subscription_id = ? AND cable_customer_id = ?',
      [Number(req.params.subscriptionId), Number(req.params.id)]
    );
    return res.json({ message: 'Subscription details deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Subscription delete failed', error: error.message });
  }
};

module.exports = {
  getLookups,
  getMasters,
  addLocation,
  addArea,
  addStreet,
  addLocationInfo,
  updateLocationInfo,
  deleteLocationInfo,
  addPackage,
  addStbMaster,
  getPendingAccounts,
  receiveAccount,
  getCableCustomers,
  getCableCustomerById,
  addCableCustomer,
  updateCableCustomer,
  addCustomerConnection,
  updateCustomerConnection,
  deleteCustomerConnection,
  addCustomerStb,
  updateCustomerStb,
  deleteCustomerStb,
  addCustomerPackage,
  updateCustomerPackage,
  deleteCustomerPackage,
  addCustomerSubscription,
  updateCustomerSubscription,
  deleteCustomerSubscription
};
