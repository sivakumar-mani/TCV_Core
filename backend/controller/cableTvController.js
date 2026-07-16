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

const existingColumns = async (db, tableName, columnNames) => {
  if (!columnNames.length) return new Set();
  try {
    const [rows] = await db.query(
      `SELECT COLUMN_NAME AS column_name
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME IN (?)`,
      [tableName, columnNames]
    );
    return new Set(rows.map((row) => row.column_name));
  } catch (_error) {
    return new Set();
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
      office_received_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      office_balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      due_date DATE NULL,
      account_status ENUM('PENDING','PARTIAL','PAID','RECEIVED') NOT NULL DEFAULT 'PENDING',
      received_by_user_id INT NULL,
      received_by_employee_id INT NULL,
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
      movement_type ENUM('ISSUE','RETURN') NOT NULL DEFAULT 'ISSUE',
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
  try {
    await db.query("ALTER TABLE cable_subscriptions MODIFY payment_mode ENUM('CASH','ONLINE','OFFICE','UPI','CARD','BANK','CHEQUE') NULL");
  } catch (_error) {
    // Older installations may not need this alteration or may be mid-migration.
  }

  const [[connectionDiscountColumn]] = await db.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_connections' AND COLUMN_NAME = 'connection_discount'`
  );
  if (!connectionDiscountColumn.count) {
    await db.query('ALTER TABLE cable_connections ADD COLUMN connection_discount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER connection_charge');
  }
  const connectionAddressColumns = [
    ['old_door_no', 'ALTER TABLE cable_connections ADD COLUMN old_door_no VARCHAR(50) NULL AFTER connection_type'],
    ['new_door_no', 'ALTER TABLE cable_connections ADD COLUMN new_door_no VARCHAR(50) NULL AFTER old_door_no'],
    ['old_location_id', 'ALTER TABLE cable_connections ADD COLUMN old_location_id INT NULL AFTER connection_type'],
    ['old_area_id', 'ALTER TABLE cable_connections ADD COLUMN old_area_id INT NULL AFTER old_location_id'],
    ['old_street_id', 'ALTER TABLE cable_connections ADD COLUMN old_street_id INT NULL AFTER old_area_id'],
    ['new_location_id', 'ALTER TABLE cable_connections ADD COLUMN new_location_id INT NULL AFTER old_street_id'],
    ['new_area_id', 'ALTER TABLE cable_connections ADD COLUMN new_area_id INT NULL AFTER new_location_id'],
    ['new_street_id', 'ALTER TABLE cable_connections ADD COLUMN new_street_id INT NULL AFTER new_area_id'],
    ['old_address', 'ALTER TABLE cable_connections ADD COLUMN old_address VARCHAR(500) NULL AFTER new_street_id'],
    ['new_address', 'ALTER TABLE cable_connections ADD COLUMN new_address VARCHAR(500) NULL AFTER old_address']
  ];
  for (const [columnName, alterSql] of connectionAddressColumns) {
    const [[column]] = await db.query(
      `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_connections' AND COLUMN_NAME = ?`,
      [columnName]
    );
    if (!column.count) await db.query(alterSql);
  }

  const accountColumns = [
    ['overall_discount', 'ALTER TABLE cable_customer_accounts ADD COLUMN overall_discount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER discount'],
    ['material_discount', 'ALTER TABLE cable_customer_accounts ADD COLUMN material_discount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER material_cost'],
    ['customer_paid_amount', 'ALTER TABLE cable_customer_accounts ADD COLUMN customer_paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER grand_total'],
    ['balance_amount', 'ALTER TABLE cable_customer_accounts ADD COLUMN balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER customer_paid_amount'],
    ['due_date', 'ALTER TABLE cable_customer_accounts ADD COLUMN due_date DATE NULL AFTER balance_amount'],
    ['office_received_amount', 'ALTER TABLE cable_customer_accounts ADD COLUMN office_received_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER customer_paid_amount'],
    ['office_balance_amount', 'ALTER TABLE cable_customer_accounts ADD COLUMN office_balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER office_received_amount'],
    ['received_by_employee_id', 'ALTER TABLE cable_customer_accounts ADD COLUMN received_by_employee_id INT NULL AFTER received_by_user_id']
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

  const [[accountStatusColumn]] = await db.query(
    `SELECT COLUMN_TYPE AS column_type
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_customer_accounts' AND COLUMN_NAME = 'account_status'`
  );
  if (!String(accountStatusColumn?.column_type || '').includes("'PARTIAL'")) {
    await db.query("ALTER TABLE cable_customer_accounts MODIFY account_status ENUM('PENDING','PARTIAL','PAID','RECEIVED') NOT NULL DEFAULT 'PENDING'");
    await db.query("UPDATE cable_customer_accounts SET account_status = 'PAID' WHERE account_status = 'RECEIVED'");
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS cable_customer_account_payments (
      payment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      account_id BIGINT NOT NULL,
      cash_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      online_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      received_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      paid_date DATE NOT NULL,
      received_date DATE NOT NULL,
      due_date DATE NULL,
      balance_after_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
      payment_status ENUM('PARTIAL','PAID') NOT NULL,
      received_by_user_id INT NOT NULL,
      received_by_employee_id INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cable_account_payments_account (account_id),
      INDEX idx_cable_account_payments_paid_date (paid_date),
      CONSTRAINT fk_cable_account_payments_account FOREIGN KEY (account_id)
        REFERENCES cable_customer_accounts(account_id) ON DELETE CASCADE
    )
  `);
  const paymentColumns = await existingColumns(db, 'cable_customer_account_payments', ['received_by_employee_id']);
  if (!paymentColumns.has('received_by_employee_id')) {
    await db.query('ALTER TABLE cable_customer_account_payments ADD COLUMN received_by_employee_id INT NULL AFTER received_by_user_id');
  }
  await db.query(
    `UPDATE cable_customer_accounts ca
     LEFT JOIN (
       SELECT account_id, COALESCE(SUM(received_amount), 0) AS received_amount
       FROM cable_customer_account_payments GROUP BY account_id
     ) paid ON paid.account_id = ca.account_id
     SET ca.office_balance_amount = ca.customer_paid_amount
     WHERE ca.customer_paid_amount > 0 AND ca.office_received_amount = 0
       AND ca.office_balance_amount = 0 AND COALESCE(paid.received_amount, 0) = 0
       AND ca.account_status = 'PENDING'`
  );

  const stbHistoryColumns = [
    ['updated_date', 'ALTER TABLE cable_customer_stbs ADD COLUMN updated_date DATE NULL AFTER installed_date'],
    ['update_reason', 'ALTER TABLE cable_customer_stbs ADD COLUMN update_reason VARCHAR(50) NULL AFTER updated_date'],
    ['reason_remarks', 'ALTER TABLE cable_customer_stbs ADD COLUMN reason_remarks VARCHAR(500) NULL AFTER update_reason'],
    ['issue_mode', "ALTER TABLE cable_customer_stbs ADD COLUMN issue_mode ENUM('FULL_SET','BOX_ONLY') NOT NULL DEFAULT 'BOX_ONLY' AFTER stb_type"]
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

  const accessoryColumns = await existingColumns(db, 'cable_customer_stb_accessories', ['movement_type']);
  if (!accessoryColumns.has('movement_type')) {
    await db.query("ALTER TABLE cable_customer_stb_accessories ADD COLUMN movement_type ENUM('ISSUE','RETURN') NOT NULL DEFAULT 'ISSUE' AFTER product_id");
  }

  const [[fullSetColumn]] = await db.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_stb_master' AND COLUMN_NAME = 'full_set_amount'`
  );
  if (!fullSetColumn.count) {
    await db.query('ALTER TABLE cable_stb_master ADD COLUMN full_set_amount DECIMAL(12,2) NOT NULL DEFAULT 800 AFTER stb_amount');
  }
  const [[assignedEmployeeColumn]] = await db.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_stb_master' AND COLUMN_NAME = 'assigned_employee_id'`
  );
  if (!assignedEmployeeColumn.count) {
    await db.query('ALTER TABLE cable_stb_master ADD COLUMN assigned_employee_id INT NULL AFTER full_set_amount');
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

  const subscriptionColumns = [
    ['payment_reference', 'ALTER TABLE cable_subscriptions ADD COLUMN payment_reference VARCHAR(150) NULL AFTER payment_mode'],
    ['received_count', 'ALTER TABLE cable_subscriptions ADD COLUMN received_count DECIMAL(8,2) NOT NULL DEFAULT 1 AFTER number_of_days_or_months']
  ];
  for (const [columnName, alterSql] of subscriptionColumns) {
    try {
      const [[column]] = await db.query(
        `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_subscriptions' AND COLUMN_NAME = ?`,
        [columnName]
      );
      if (!column.count) await db.query(alterSql);
    } catch (_error) {
      // Keep older installations usable even if optional subscription columns cannot be added immediately.
    }
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
  const tokenEmployeeId = intOrNull(req.res?.locals?.employee_id);
  if (tokenEmployeeId) return tokenEmployeeId;
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
  productName = null,
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
    const error = new Error(
      `Insufficient stock for ${productName || `accessory product ${product}`}. Available: ${currentQty}, required: ${outQty}`
    );
    error.statusCode = 409;
    throw error;
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

const ensureUsedAccessoryProduct = async (db, sourceProductId) => {
  const [[source]] = await db.query(
    `SELECT product_id, product_name, product_code, brand_id, description, product_type,
            purchase_price, selling_price, gst_percent, hsn_code, unit, reorder_level
     FROM products WHERE product_id = ? LIMIT 1`,
    [sourceProductId]
  );
  if (!source) throw new Error(`Returned accessory product ${sourceProductId} was not found`);

  const [[catv]] = await db.query(
    "SELECT category_id, level FROM categories WHERE LOWER(category_name) = 'catv' AND is_active = 1 LIMIT 1"
  );
  if (!catv) throw new Error('CATV category was not found for returned accessory stock');

  let [[usedCategory]] = await db.query(
    `SELECT category_id FROM categories
     WHERE parent_id = ? AND LOWER(category_name) = 'used accessories' LIMIT 1`,
    [catv.category_id]
  );
  if (!usedCategory) {
    const [categoryResult] = await db.query(
      `INSERT INTO categories (category_name, parent_id, level, slug, description, is_active)
       VALUES ('Used Accessories', ?, ?, 'catv-used-accessories', 'Returned CATV accessories available as used stock', 1)`,
      [catv.category_id, Number(catv.level || 1) + 1]
    );
    usedCategory = { category_id: categoryResult.insertId };
  }

  const usedName = `Used ${String(source.product_name || '').replace(/\s*STB\s+Accessories\s*/i, ' ').replace(/\s+/g, ' ').trim()}`;
  const usedCode = `USED-${source.product_code || source.product_id}`.slice(0, 100);
  let [[usedProduct]] = await db.query(
    `SELECT product_id FROM products
     WHERE category_id = ? AND (product_code = ? OR LOWER(product_name) = LOWER(?)) LIMIT 1`,
    [usedCategory.category_id, usedCode, usedName]
  );
  if (!usedProduct) {
    const [productResult] = await db.query(
      `INSERT INTO products (
        product_name, product_code, brand_id, category_id, description, product_type,
        purchase_price, selling_price, gst_percent, hsn_code, unit, reorder_level, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [
        usedName, usedCode, source.brand_id, usedCategory.category_id,
        `Returned used stock for ${source.product_name}`, source.product_type || 'MATERIAL',
        money(source.purchase_price), money(source.selling_price), money(source.gst_percent),
        source.hsn_code, source.unit || 'PCS', money(source.reorder_level)
      ]
    );
    usedProduct = { product_id: productResult.insertId };
  }
  return { ...source, used_product_id: usedProduct.product_id, used_product_name: usedName };
};

const saveStbAccessories = async (db, req, {
  approvalGroupId,
  cableCustomerId,
  customerStbId,
  accessories = [],
  employeeId,
  issuedDate,
  approvalStatus,
  createdBy,
  movementType = 'ISSUE'
}) => {
  const stockMovement = String(movementType || 'ISSUE').toUpperCase() === 'RETURN' ? 'RETURN' : 'ISSUE';
  const selected = Array.isArray(accessories)
    ? accessories.filter((item) => intOrNull(item.product_id) && (item.selected === undefined || item.selected))
    : [];

  for (const item of selected) {
    const productId = intOrNull(item.product_id);
    const qty = stockMovement === 'RETURN' ? 1 : (money(item.qty || 1) || 1);
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
        approval_group_id, cable_customer_id, customer_stb_id, product_id, movement_type, accessory_name,
        qty, unit, issued_by_employee_id, issued_date, approval_status, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        approvalGroupId, cableCustomerId, customerStbId, productId, stockMovement, product.product_name,
        qty, product.unit || item.unit || 'PCS', employeeId, issuedDate || new Date(), approvalStatus, createdBy
      ]
    );
    // Pending requests reserve the accessory record only. Stock is deducted
    // atomically when an administrator approves the workflow request.
    if (approvalStatus === 'APPROVED') {
      const returnedProduct = stockMovement === 'RETURN' ? await ensureUsedAccessoryProduct(db, productId) : null;
      await postStockMovement(db, {
        productId: returnedProduct?.used_product_id || productId,
        productName: returnedProduct?.used_product_name || product.product_name,
        transactionType: stockMovement === 'RETURN' ? 'RETURN' : 'INSTALLATION',
        transactionId: result.insertId,
        referenceNo: `CTV-STB-${customerStbId}`,
        qtyIn: stockMovement === 'RETURN' ? qty : 0,
        qtyOut: stockMovement === 'ISSUE' ? qty : 0,
        unitCost: money(product.purchase_price),
        remarks: stockMovement === 'RETURN'
          ? `CATV accessory returned by customer ${cableCustomerId} to used stock`
          : `CATV STB accessory issued to customer ${cableCustomerId}`,
        employeeId
      });
    }
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
  const accountStatus = 'PENDING';
  await db.query(
    `INSERT INTO cable_customer_accounts (
      approval_group_id, cable_customer_id, stb_amount, connection_amount, labor_amount,
      material_cost, material_discount, subscription_amount, sub_total, discount, overall_discount, grand_total,
      customer_paid_amount, office_received_amount, office_balance_amount, balance_amount, due_date, account_status, received_by_user_id,
      received_at, approval_status, created_by_user_id, approved_by_user_id, approved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ${data.approval_status === 'APPROVED' ? 'NOW()' : 'NULL'})`,
    [
      data.approval_group_id, data.cable_customer_id, stbAmount, connectionAmount, laborAmount,
      materialCost, materialDiscount, subscriptionAmount, subTotal, discount, overallDiscount, grandTotal,
      paidAmount, 0, paidAmount, balanceAmount, null, accountStatus,
      null, data.approval_status, data.created_by_user_id,
      data.approval_status === 'APPROVED' ? data.created_by_user_id : null
    ]
  );
};

const getLookups = async (req, res) => {
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
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', first_name, last_name)), ''), employee_code) AS employee_name
       FROM employees
       WHERE is_active = 1
       ORDER BY first_name, last_name`
    );
    const products = await safeLookup(db,
      `SELECT p.product_id, p.product_name, p.unit, p.selling_price,
              COALESCE(sm.available_qty, 0) AS available_qty
       FROM products p
       LEFT JOIN stock_master sm ON sm.product_id = p.product_id
       WHERE p.status = 'ACTIVE'
       ORDER BY p.product_name`
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
         AND LOWER(c.category_name) <> 'used accessories'
         AND (
           (LOWER(c.category_name) = 'accessories' AND LOWER(parent.category_name) = 'catv')
           OR (LOWER(parent.category_name) = 'accessories' AND LOWER(root.category_name) = 'catv')
           OR LOWER(c.category_name) = 'stb accessories'
           OR LOWER(parent.category_name) = 'stb accessories'
           OR LOWER(root.category_name) = 'stb accessories'
           OR LOWER(p.product_name) LIKE '%stb accessories%'
           OR LOWER(p.product_name) LIKE '%hdmi%'
           OR (LOWER(p.product_name) LIKE '%av%' AND LOWER(p.product_name) LIKE '%card%')
           OR LOWER(p.product_name) LIKE '%adaptor 12v%'
           OR LOWER(p.product_name) LIKE '%adapter 12v%'
           OR LOWER(p.product_name) LIKE '%battery%'
           OR LOWER(p.product_name) LIKE '%remote%'
           OR LOWER(p.product_name) IN ('hdmi', 'remote', '3pin av card', 'single pin av card', 'adaptor 12v 1amps')
         )
       ORDER BY p.product_name`
    );
    const loggedInEmployeeId = isAdmin(req) ? null : await resolveEmployeeId(db, req, null);
    const stbMasters = await safeLookup(db,
      `SELECT sm.stb_master_id, sm.stb_number, sm.box_type, sm.stock_type, sm.mso_id,
               sm.stb_amount, sm.full_set_amount, sm.assigned_employee_id, sm.status, m.mso_name,
               COALESCE(NULLIF(TRIM(CONCAT_WS(' ', assigned.first_name, assigned.last_name)), ''), assigned.employee_code) AS assigned_employee_name
       FROM cable_stb_master sm
       LEFT JOIN cable_mso_master m ON m.mso_id = sm.mso_id
       LEFT JOIN employees assigned ON assigned.employee_id = sm.assigned_employee_id
       WHERE sm.is_active = 1
          AND sm.status = 'AVAILABLE'
          AND sm.stock_type <> 'FAULT'
          ${isAdmin(req) ? '' : 'AND sm.assigned_employee_id = ?'}
       ORDER BY sm.stb_number`,
      isAdmin(req) ? [] : [loggedInEmployeeId || 0]
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
      `SELECT sm.*, m.mso_name,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', assigned.first_name, assigned.last_name)), ''), assigned.employee_code) AS assigned_employee_name
       FROM cable_stb_master sm
       LEFT JOIN cable_mso_master m ON m.mso_id = sm.mso_id
       LEFT JOIN employees assigned ON assigned.employee_id = sm.assigned_employee_id
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

const validateCustomerAddressMapping = async (db, payload) => {
  const [[mapping]] = await db.query(
    `SELECT l.city, l.pincode
     FROM cable_areas a
     INNER JOIN cable_locations l ON l.location_id = a.location_id AND l.is_active = 1
     INNER JOIN cable_streets s ON s.area_id = a.area_id AND s.is_active = 1
     WHERE a.network_id = ? AND a.location_id = ? AND a.area_id = ? AND s.street_id = ?
       AND a.is_active = 1
     LIMIT 1`,
    [Number(payload.network_id), Number(payload.location_id), Number(payload.area_id), Number(payload.street_id)]
  );
  return mapping || null;
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
      "UPDATE cable_locations SET post_short_code = ?, pincode = ?, city = 'Chennai' WHERE location_id = ?",
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
      "UPDATE cable_locations SET post_short_code = ?, pincode = ?, city = 'Chennai' WHERE location_id = ?",
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
    const { location_name, pincode } = req.body;
    if (!location_name) return res.status(400).json({ message: 'Postal area is required' });
    const db = connection.promise();
    const [[existing]] = await db.query(
      'SELECT location_id FROM cable_locations WHERE location_name = ? AND city = ? LIMIT 1',
      [location_name.trim(), 'Chennai']
    );
    if (existing) return res.status(409).json({ message: 'Postal area already exists' });
    await db.query(
      'INSERT IGNORE INTO cable_locations (location_name, city, pincode) VALUES (?, ?, ?)',
      [location_name.trim(), 'Chennai', nullable(pincode)]
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
    const assignedEmployeeId = intOrNull(payload.assigned_employee_id);

    if (!stbNumber) return res.status(400).json({ message: 'STB number is required' });
    if (!stbBoxTypes.includes(boxType)) return res.status(400).json({ message: 'STB signal type must be HD or SD' });
    if (!stbStockTypes.includes(stockType)) return res.status(400).json({ message: 'STB stock type is invalid' });
    if (!stbStatuses.includes(status)) return res.status(400).json({ message: 'STB status is invalid' });
    if (!assignedEmployeeId) return res.status(400).json({ message: 'Assigned employee is required' });

    const [[duplicate]] = await db.query(
      'SELECT stb_master_id FROM cable_stb_master WHERE LOWER(stb_number) = LOWER(?) AND is_active = 1 LIMIT 1',
      [stbNumber]
    );
    if (duplicate) return res.status(409).json({ message: 'STB number already exists' });

    await db.query(
      `INSERT INTO cable_stb_master (stb_number, box_type, stock_type, mso_id, stb_amount, full_set_amount, assigned_employee_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [stbNumber, boxType, stockType, intOrNull(payload.mso_id), money(payload.stb_amount || 500), money(payload.full_set_amount || 800), assignedEmployeeId, status]
    );

    return res.status(201).json({ message: 'STB saved successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'STB save failed', error: error.message });
  }
};

const getPendingAccounts = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const status = String(req.query.status || 'PENDING').toUpperCase();
    const name = String(req.query.name || '').trim();
    const installedByEmployeeId = intOrNull(req.query.installed_by_employee_id);
    const startDate = textOrNull(req.query.start_date);
    const endDate = textOrNull(req.query.end_date);
    const filters = [];
    const values = [];
    if (['PENDING', 'PARTIAL', 'PAID', 'RECEIVED'].includes(status)) {
      filters.push('ca.account_status = ?');
      values.push(status === 'RECEIVED' ? 'PAID' : status);
    }
    if (name) {
      filters.push('(c.full_name LIKE ? OR c.customer_code LIKE ? OR c.mobile_no LIKE ?)');
      const search = `%${name}%`;
      values.push(search, search, search);
    }
    if (installedByEmployeeId) {
      filters.push('c.installed_by_employee_id = ?');
      values.push(installedByEmployeeId);
    }
    if (startDate) {
      filters.push('DATE(ca.created_at) >= ?');
      values.push(startDate);
    }
    if (endDate) {
      filters.push('DATE(ca.created_at) <= ?');
      values.push(endDate);
    }
    const [rows] = await db.query(
      `SELECT ca.*, c.customer_code, c.full_name, c.mobile_no, n.network_name,
              l.location_name, a.area_name, s.street_name,
              DATE(ca.created_at) AS account_date,
              (SELECT conn.connection_type
               FROM cable_connections conn
               WHERE conn.approval_group_id = ca.approval_group_id
               ORDER BY conn.connection_id DESC LIMIT 1) AS connection_type,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', installed.first_name, installed.last_name)), ''), installed.employee_code) AS installed_by_name,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', receiver.first_name, receiver.last_name)), ''), received_user.username) AS received_by_name,
              COALESCE(payment_totals.cash_amount, 0) AS cash_received,
              COALESCE(payment_totals.online_amount, 0) AS online_received
       FROM cable_customer_accounts ca
       INNER JOIN cable_tv_customers c ON c.cable_customer_id = ca.cable_customer_id
       LEFT JOIN cable_network_master n ON n.network_id = c.network_id
       LEFT JOIN cable_locations l ON l.location_id = c.location_id
       LEFT JOIN cable_areas a ON a.area_id = c.area_id
       LEFT JOIN cable_streets s ON s.street_id = c.street_id
       LEFT JOIN employees installed ON installed.employee_id = c.installed_by_employee_id
       LEFT JOIN users received_user ON received_user.user_id = ca.received_by_user_id
       LEFT JOIN employees receiver ON receiver.employee_id = COALESCE(ca.received_by_employee_id, received_user.employee_id)
       LEFT JOIN (
         SELECT account_id, SUM(cash_amount) AS cash_amount, SUM(online_amount) AS online_amount
         FROM cable_customer_account_payments
         GROUP BY account_id
       ) payment_totals ON payment_totals.account_id = ca.account_id
       ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
       ORDER BY ca.created_at DESC, ca.account_id DESC`,
      values
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Pending account list failed', error: error.message });
  }
};

const getAccountPayments = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const accountId = Number(req.params.accountId);
    if (!accountId) return res.status(400).json({ message: 'account_id is required' });
    const [rows] = await db.query(
      `SELECT p.payment_id, p.cash_amount, p.online_amount, p.received_amount,
              p.paid_date, p.received_date, p.due_date, p.balance_after_payment,
              p.payment_status, p.created_at,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', selected_employee.first_name, selected_employee.last_name)), ''),
                       NULLIF(TRIM(CONCAT_WS(' ', user_employee.first_name, user_employee.last_name)), ''), u.username) AS received_by_name
       FROM cable_customer_account_payments p
       LEFT JOIN users u ON u.user_id = p.received_by_user_id
       LEFT JOIN employees user_employee ON user_employee.employee_id = u.employee_id
       LEFT JOIN employees selected_employee ON selected_employee.employee_id = p.received_by_employee_id
       WHERE p.account_id = ?
       ORDER BY p.payment_id DESC`,
      [accountId]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Account payment history failed', error: error.message });
  }
};

const receiveAccount = async (req, res) => {
  const db = connection.promise();
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Administrator permission is required' });
    await ensureCableTvExtendedTables(db);
    const accountId = Number(req.params.accountId);
    if (!accountId) return res.status(400).json({ message: 'account_id is required' });

    await db.beginTransaction();
    const [[account]] = await db.query(
      `SELECT account_id, approval_group_id, cable_customer_id, account_status,
              grand_total, customer_paid_amount, office_received_amount, office_balance_amount, balance_amount
       FROM cable_customer_accounts
       WHERE account_id = ?
       FOR UPDATE`,
      [accountId]
    );
    if (!account) {
      await db.rollback();
      return res.status(404).json({ message: 'Pending account was not found' });
    }
    if (!['PENDING', 'PARTIAL'].includes(account.account_status)) {
      await db.rollback();
      return res.status(409).json({ message: 'This account is already fully paid' });
    }

    const cashAmount = money(req.body.cash_amount);
    const onlineAmount = money(req.body.online_amount);
    const receivedAmount = Number((cashAmount + onlineAmount).toFixed(2));
    const currentBalance = money(account.office_balance_amount);
    const paidDate = textOrNull(req.body.paid_date) || dateOnly(new Date());
    const receivedDate = textOrNull(req.body.received_date) || dateOnly(new Date());
    if (cashAmount < 0 || onlineAmount < 0 || receivedAmount <= 0) {
      await db.rollback();
      return res.status(400).json({ message: 'Enter a cash or online received amount greater than zero' });
    }
    if (receivedAmount > currentBalance) {
      await db.rollback();
      return res.status(400).json({ message: `Cash + Online cannot exceed the amount collected from the customer: ${currentBalance.toFixed(2)}` });
    }
    const receiverEmployeeId = intOrNull(req.body.received_by_employee_id || req.res?.locals?.employee_id);
    if (receiverEmployeeId) {
      const [[receiverEmployee]] = await db.query(
        'SELECT employee_id FROM employees WHERE employee_id = ? AND is_active = 1 LIMIT 1',
        [receiverEmployeeId]
      );
      if (!receiverEmployee) {
        await db.rollback();
        return res.status(400).json({ message: 'Selected Received By employee is not active' });
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidDate) || !/^\d{4}-\d{2}-\d{2}$/.test(receivedDate)) {
      await db.rollback();
      return res.status(400).json({ message: 'Valid paid date and received date are required' });
    }

    const newOfficeReceivedAmount = Number((money(account.office_received_amount) + receivedAmount).toFixed(2));
    const newBalance = Number(Math.max(currentBalance - receivedAmount, 0).toFixed(2));
    const paymentStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';
    const dueDate = paymentStatus === 'PARTIAL' ? textOrNull(req.body.due_date) : null;
    if (paymentStatus === 'PARTIAL' && !dueDate) {
      await db.rollback();
      return res.status(400).json({ message: 'Due date is required for a partial payment' });
    }

    await db.query(
      `INSERT INTO cable_customer_account_payments (
        account_id, cash_amount, online_amount, received_amount, paid_date,
        received_date, due_date, balance_after_payment, payment_status, received_by_user_id,
        received_by_employee_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [accountId, cashAmount, onlineAmount, receivedAmount, paidDate, receivedDate,
        dueDate, newBalance, paymentStatus, currentUserId(req), receiverEmployeeId]
    );

    if (paymentStatus === 'PAID') {
      const [pendingAccessories] = await db.query(
        `SELECT acc.stb_accessory_id, acc.customer_stb_id, acc.product_id, acc.accessory_name,
                acc.qty, acc.issued_by_employee_id, p.purchase_price
         FROM cable_customer_stb_accessories acc
         JOIN products p ON p.product_id = acc.product_id
         WHERE acc.approval_group_id = ? AND acc.approval_status = 'PENDING'
         FOR UPDATE`,
        [account.approval_group_id]
      );
      for (const accessory of pendingAccessories) {
        await postStockMovement(db, {
          productId: accessory.product_id,
          productName: accessory.accessory_name,
          transactionId: accessory.stb_accessory_id,
          referenceNo: `CTV-STB-${accessory.customer_stb_id}`,
          qtyOut: accessory.qty,
          unitCost: money(accessory.purchase_price),
          remarks: 'CATV STB accessory issued after account receipt',
          employeeId: accessory.issued_by_employee_id || currentUserId(req)
        });
      }

      for (const table of [
        'cable_connections', 'cable_connection_materials', 'cable_customer_stbs',
        'cable_customer_packages', 'cable_subscriptions', 'cable_customer_stb_accessories'
      ]) {
        await db.query(
          `UPDATE ${table}
           SET approval_status = 'APPROVED'
           WHERE approval_group_id = ? AND approval_status = 'PENDING'`,
          [account.approval_group_id]
        );
      }
      await db.query(
        `UPDATE cable_subscriptions SET payment_status = 'PAID' WHERE approval_group_id = ?`,
        [account.approval_group_id]
      );
    }

    await db.query(
      `UPDATE cable_customer_accounts
       SET office_received_amount = ?,
            office_balance_amount = ?,
            due_date = ?,
            account_status = ?,
            received_by_user_id = ?,
            received_by_employee_id = ?,
            received_at = TIMESTAMP(?, CURRENT_TIME()),
            updated_at = NOW()
        WHERE account_id = ?`,
      [newOfficeReceivedAmount, newBalance, dueDate, paymentStatus, currentUserId(req), receiverEmployeeId, receivedDate, accountId]
    );

    await db.commit();
    return res.json({
      message: paymentStatus === 'PAID' ? 'Payment received in full' : 'Partial payment recorded',
      payment_status: paymentStatus,
      received_amount: receivedAmount,
      balance_amount: newBalance
    });
  } catch (error) {
    await db.rollback();
    return res.status(error.statusCode || 500).json({ message: error.message || 'Account receive failed' });
  }
};

const revertAccountToPending = async (req, res) => {
  const db = connection.promise();
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Administrator permission is required' });
    await ensureCableTvExtendedTables(db);
    const accountId = Number(req.params.accountId);
    if (!accountId) return res.status(400).json({ message: 'account_id is required' });

    await db.beginTransaction();
    const [[account]] = await db.query(
      `SELECT account_id, approval_group_id, account_status, customer_paid_amount
       FROM cable_customer_accounts WHERE account_id = ? FOR UPDATE`,
      [accountId]
    );
    if (!account) {
      await db.rollback();
      return res.status(404).json({ message: 'Account was not found' });
    }
    if (!['PAID', 'RECEIVED'].includes(account.account_status)) {
      await db.rollback();
      return res.status(409).json({ message: 'Only a paid account can be reverted to pending' });
    }

    const [stockReversals] = await db.query(
      `SELECT acc.stb_accessory_id, acc.customer_stb_id, acc.product_id, acc.accessory_name,
              acc.issued_by_employee_id, p.purchase_price,
              GREATEST(
                SUM(CASE WHEN sl.remarks = 'CATV STB accessory issued after account receipt' THEN sl.qty_out ELSE 0 END)
                - SUM(CASE WHEN sl.remarks = 'CATV account receipt reverted to pending' THEN sl.qty_in ELSE 0 END),
                0
              ) AS qty_to_restore
       FROM cable_customer_stb_accessories acc
       JOIN products p ON p.product_id = acc.product_id
       LEFT JOIN stock_ledger sl
         ON sl.product_id = acc.product_id
        AND sl.transaction_id = acc.stb_accessory_id
        AND sl.reference_no = CONCAT('CTV-STB-', acc.customer_stb_id)
       WHERE acc.approval_group_id = ?
       GROUP BY acc.stb_accessory_id, acc.customer_stb_id, acc.product_id, acc.accessory_name,
                acc.issued_by_employee_id, p.purchase_price
       HAVING qty_to_restore > 0`,
      [account.approval_group_id]
    );
    for (const accessory of stockReversals) {
      await postStockMovement(db, {
        productId: accessory.product_id,
        productName: accessory.accessory_name,
        transactionType: 'RETURN',
        transactionId: accessory.stb_accessory_id,
        referenceNo: `CTV-STB-${accessory.customer_stb_id}`,
        qtyIn: accessory.qty_to_restore,
        unitCost: money(accessory.purchase_price),
        remarks: 'CATV account receipt reverted to pending',
        employeeId: currentUserId(req)
      });
    }

    for (const table of [
      'cable_connections', 'cable_connection_materials', 'cable_customer_stbs',
      'cable_customer_packages', 'cable_subscriptions', 'cable_customer_stb_accessories'
    ]) {
      await db.query(
        `UPDATE ${table} SET approval_status = 'PENDING'
         WHERE approval_group_id = ? AND approval_status = 'APPROVED'`,
        [account.approval_group_id]
      );
    }
    await db.query(
      `UPDATE cable_subscriptions SET payment_status = 'PENDING'
       WHERE approval_group_id = ?`,
      [account.approval_group_id]
    );
    await db.query('DELETE FROM cable_customer_account_payments WHERE account_id = ?', [accountId]);
    await db.query(
      `UPDATE cable_customer_accounts
       SET account_status = 'PENDING', office_received_amount = 0, office_balance_amount = ?, due_date = NULL,
           received_by_user_id = NULL, received_by_employee_id = NULL, received_at = NULL, updated_at = NOW()
       WHERE account_id = ?`,
      [money(account.customer_paid_amount), accountId]
    );
    await db.commit();
    return res.json({ message: 'Account status reverted to pending successfully' });
  } catch (error) {
    await db.rollback();
    return res.status(error.statusCode || 500).json({ message: error.message || 'Account revert failed' });
  }
};

const getCableCustomers = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const status = req.query.approval_status || 'ALL';
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
    const [[customer]] = await db.query(
      `SELECT c.*, n.network_name, l.location_name, a.area_name, s.street_name,
              src.source_name,
              CONCAT_WS(' ', installed.first_name, installed.last_name) AS installed_by_name
       FROM cable_tv_customers c
       LEFT JOIN cable_network_master n ON n.network_id = c.network_id
       LEFT JOIN cable_locations l ON l.location_id = c.location_id
       LEFT JOIN cable_areas a ON a.area_id = c.area_id
       LEFT JOIN cable_streets s ON s.street_id = c.street_id
       LEFT JOIN cable_connection_sources src ON src.source_id = c.source_id
       LEFT JOIN employees installed ON installed.employee_id = c.installed_by_employee_id
       WHERE c.cable_customer_id = ?`,
      [id]
    );

    if (!customer) {
      return res.status(404).json({ message: 'Cable TV customer not found' });
    }

    const [stbs] = await db.query(
      `SELECT stb.*, CONCAT_WS(' ', installed.first_name, installed.last_name) AS installed_by_name,
              CONCAT_WS(' ', entered.first_name, entered.last_name) AS entered_by_name,
              installed_mso.mso_name AS installed_mso_name,
              exchange_mso.mso_name AS exchange_original_mso_name
       FROM cable_customer_stbs stb
       LEFT JOIN employees installed ON installed.employee_id = stb.installed_by_employee_id
       LEFT JOIN employees entered ON entered.employee_id = stb.entered_by_employee_id
       LEFT JOIN cable_mso_master installed_mso ON installed_mso.mso_id = stb.installed_mso_id
       LEFT JOIN cable_mso_master exchange_mso ON exchange_mso.mso_id = stb.exchange_original_mso_id
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
    const [subscriptions] = await db.query(
      `SELECT sub.*, cp.package_price, pkg.package_name, pkg.package_type,
              NULLIF(TRIM(CONCAT_WS(' ', collected.first_name, collected.last_name)), '') AS collected_by_name,
              collected.employee_code AS collected_by_code,
              COALESCE(
                NULLIF(TRIM(CONCAT_WS(' ', collected.first_name, collected.last_name)), ''),
                collected.employee_code,
                CAST(sub.collected_by_employee_id AS CHAR)
              ) AS collected_by_display
       FROM cable_subscriptions sub
       LEFT JOIN cable_customer_packages cp ON cp.customer_package_id = sub.customer_package_id
       LEFT JOIN cable_package_master pkg ON pkg.package_id = cp.package_id
       LEFT JOIN employees collected ON collected.employee_id = sub.collected_by_employee_id
       WHERE sub.cable_customer_id = ?
       ORDER BY sub.subscription_year DESC, sub.subscription_month DESC, sub.subscription_id DESC`,
      [id]
    );
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
    const addressMapping = await validateCustomerAddressMapping(db, payload);
    if (!addressMapping) {
      await db.rollback();
      return res.status(400).json({ message: 'Selected Network, Postal Area, Location and Street mapping is invalid' });
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
        Number(payload.location_id), Number(payload.area_id), Number(payload.street_id), 'Chennai', nullable(addressMapping.pincode),
        payload.mobile_no, nullable(payload.aadhaar_no), nullable(payload.alternate_mobile_no), sourceId,
        employeeId, money(payload.labour_service_charge), stbStatus, approvalStatus, createdBy,
        approvalStatus === 'APPROVED' ? createdBy : null
      ]
    );
    const cableCustomerId = customerResult.insertId;

    let customerStbId = null;
    let issuedStbAmount = 0;
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
        if (!isAdmin(req) && Number(stbRow.assigned_employee_id) !== Number(employeeId)) {
          await db.rollback();
          return res.status(403).json({ message: 'This STB is assigned to another employee' });
        }
        selectedStb = stbRow;
      }

      const installedStbType = String(payload.stb.stb_type || selectedStb?.stock_type || 'NEW').toUpperCase();
      if (!installedStbTypes.includes(installedStbType)) {
        await db.rollback();
        return res.status(400).json({ message: 'Installed STB type must be New, Serviced or Returned' });
      }
      const issueMode = String(payload.stb.issue_mode || 'FULL_SET').toUpperCase() === 'BOX_ONLY' ? 'BOX_ONLY' : 'FULL_SET';
      issuedStbAmount = money(issueMode === 'BOX_ONLY' ? (selectedStb?.stb_amount || 500) : (selectedStb?.full_set_amount || 800));

      const [stbResult] = await db.query(
        `INSERT INTO cable_customer_stbs (
          approval_group_id, cable_customer_id, stb_master_id, stb_type, issue_mode, installed_mso_id, exchange_original_mso_id,
          stb_no, stb_amount, stb_discount, labour_service_charge, installed_by_employee_id,
          entered_by_employee_id, installed_date, status, approval_status, created_by_user_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          approvalGroupId, cableCustomerId, intOrNull(payload.stb.stb_master_id), installedStbType, issueMode,
          intOrNull(payload.stb.installed_mso_id || selectedStb?.mso_id),
          intOrNull(payload.stb.exchange_original_mso_id),
          selectedStb?.stb_number || payload.stb.stb_no,
          issuedStbAmount,
          money(payload.stb.stb_discount), 0, employeeId, employeeId,
          installedDate, stbStatus, approvalStatus, createdBy
        ]
      );
      customerStbId = stbResult.insertId;
      await saveStbAccessories(db, req, {
        approvalGroupId,
        cableCustomerId,
        customerStbId,
        accessories: issueMode === 'FULL_SET' ? (payload.stb.accessories || payload.stb_accessories) : [],
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
      const paymentStatus = 'PENDING';
      const paidAmount = 0;
      const balanceAmount = amount;
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
          amount, paidAmount, balanceAmount, null,
          dateOnly(startDate), dateOnly(endDate), employeeId,
          null, paymentStatus,
          approvalStatus, nullable(payload.subscription?.remarks), createdBy
        ]
      );
    }

    const accountPayload = payload.account || {};
    const materialCost = Array.isArray(payload.materials)
      ? payload.materials.reduce((sum, item) => sum + money(item.amount), 0)
      : money(accountPayload.material_cost);
    const subscriptionAmount = Math.round(packageRowsPayload.reduce((sum, item) => sum + money(item.amount), 0));
    const accountStbAmount = issuedStbAmount || money(accountPayload.stb_amount ?? payload.stb?.stb_amount);
    const connectionAmount = money(payload.connection?.connection_charge ?? accountPayload.connection_amount);
    const laborAmount = money(payload.connection?.labour_service_charge ?? accountPayload.labor_amount);
    const materialDiscount = money(accountPayload.material_discount);
    const overallDiscount = money(accountPayload.overall_discount);
    const discount = money(payload.stb?.stb_discount) + money(payload.connection?.connection_discount) + materialDiscount + overallDiscount;
    const subTotal = money(accountPayload.sub_total || (accountStbAmount + connectionAmount + materialCost + subscriptionAmount));
    const grandTotal = money(accountPayload.grand_total || (subTotal - discount));
    const normalizedGrandTotal = Math.max(grandTotal, 0);
    const customerPaidAmount = money(accountPayload.customer_paid_amount);
    const balanceAmount = Math.max(normalizedGrandTotal - customerPaidAmount, 0);
    const dueDate = null;
    const accountStatus = 'PENDING';
    await db.query(
      `INSERT INTO cable_customer_accounts (
        approval_group_id, cable_customer_id, stb_amount, connection_amount, labor_amount,
        material_cost, material_discount, subscription_amount, sub_total, discount, overall_discount, grand_total, customer_paid_amount,
        office_received_amount, office_balance_amount, balance_amount, due_date, account_status,
        received_by_user_id, received_at, approval_status, created_by_user_id, approved_by_user_id, approved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ${approvalStatus === 'APPROVED' ? 'NOW()' : 'NULL'})`,
      [
        approvalGroupId, cableCustomerId, accountStbAmount, connectionAmount, laborAmount,
        materialCost, materialDiscount, subscriptionAmount, subTotal, discount, overallDiscount, normalizedGrandTotal, customerPaidAmount,
        0, customerPaidAmount, balanceAmount, dueDate, accountStatus,
        null, approvalStatus, createdBy,
        approvalStatus === 'APPROVED' ? createdBy : null
      ]
    );

    await db.commit();
    return res.status(201).json({ message: 'Cable TV customer saved successfully', cable_customer_id: cableCustomerId, approval_group_id: approvalGroupId });
  } catch (error) {
    await db.rollback();
    console.error('Cable TV customer save failed:', error);
    return res.status(error.statusCode || 500).json({ message: error.message || 'Cable TV customer save failed' });
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
    const addressMapping = await validateCustomerAddressMapping(db, payload);
    if (!addressMapping) return res.status(400).json({ message: 'Selected Network, Postal Area, Location and Street mapping is invalid' });
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
        Number(payload.location_id), Number(payload.area_id), Number(payload.street_id), 'Chennai',
        nullable(addressMapping.pincode), payload.mobile_no, nullable(payload.aadhaar_no), nullable(payload.alternate_mobile_no),
        sourceId, employeeId, money(payload.labour_service_charge),
        payload.status || 'ACTIVE', id
      ]
    );

    return res.json({ message: 'Cable TV customer updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Cable TV customer update failed', error: error.message });
  }
};

const assignStbMaster = async (req, res) => {
  try {
    const stbMasterId = Number(req.params.stbMasterId);
    const assignedEmployeeId = intOrNull(req.body.assigned_employee_id);
    if (!stbMasterId || !assignedEmployeeId) return res.status(400).json({ message: 'STB and employee are required' });
    const [result] = await connection.promise().query(
      `UPDATE cable_stb_master SET assigned_employee_id = ?, updated_at = NOW()
       WHERE stb_master_id = ? AND is_active = 1 AND status = 'AVAILABLE'`,
      [assignedEmployeeId, stbMasterId]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Available STB not found' });
    return res.json({ message: 'STB assigned successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'STB assignment failed', error: error.message });
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
    const connectionType = String(payload.connection_type || 'RECONNECTION').toUpperCase() === 'LOCATION_CHANGE'
      ? 'SHIFTED'
      : String(payload.connection_type || 'RECONNECTION').toUpperCase();
    const [[currentCustomer]] = await db.query(
      `SELECT c.network_id, c.door_no, c.location_id, c.area_id, c.street_id, c.city, c.pincode,
              l.location_name, a.area_name, s.street_name
       FROM cable_tv_customers c
       LEFT JOIN cable_locations l ON l.location_id = c.location_id
       LEFT JOIN cable_areas a ON a.area_id = c.area_id
       LEFT JOIN cable_streets s ON s.street_id = c.street_id
       WHERE c.cable_customer_id = ? FOR UPDATE`,
      [cableCustomerId]
    );
    if (!currentCustomer) {
      await db.rollback();
      return res.status(404).json({ message: 'Cable TV customer was not found' });
    }
    let newLocationId = null;
    let newAreaId = null;
    let newStreetId = null;
    let oldAddress = null;
    let newAddress = null;
    let newMapping = null;
    let newDoorNo = null;
    if (connectionType === 'SHIFTED') {
      newDoorNo = textOrNull(payload.new_door_no);
      newLocationId = intOrNull(payload.new_location_id || payload.location_id);
      newAreaId = intOrNull(payload.new_area_id || payload.area_id);
      newStreetId = intOrNull(payload.new_street_id || payload.street_id);
      newMapping = await validateCustomerAddressMapping(db, {
        network_id: currentCustomer.network_id,
        location_id: newLocationId,
        area_id: newAreaId,
        street_id: newStreetId
      });
      if (!newDoorNo || !newLocationId || !newAreaId || !newStreetId || !newMapping) {
        await db.rollback();
        return res.status(400).json({ message: 'Enter Door No and select a valid Postal Area, Location and Street for Location Change' });
      }
      const [[newAddressRow]] = await db.query(
        `SELECT l.location_name, a.area_name, s.street_name
         FROM cable_locations l
         JOIN cable_areas a ON a.location_id = l.location_id
         JOIN cable_streets s ON s.area_id = a.area_id
         WHERE l.location_id = ? AND a.area_id = ? AND s.street_id = ? LIMIT 1`,
        [newLocationId, newAreaId, newStreetId]
      );
      oldAddress = [currentCustomer.door_no, currentCustomer.street_name, currentCustomer.area_name,
        currentCustomer.location_name, currentCustomer.city, currentCustomer.pincode].filter(Boolean).join(', ');
      newAddress = [newDoorNo, newAddressRow?.street_name, newAddressRow?.area_name,
        newAddressRow?.location_name, newMapping.city || 'Chennai', newMapping.pincode].filter(Boolean).join(', ');
    }
    const [result] = await db.query(
      `INSERT INTO cable_connections (
        approval_group_id, cable_customer_id, connection_date, disconnection_date, connection_type,
        old_door_no, new_door_no, old_location_id, old_area_id, old_street_id, new_location_id, new_area_id, new_street_id, old_address, new_address,
        connected_by_employee_id, entered_by_employee_id, connection_charge, connection_discount, labour_service_charge,
        status, approval_status, remarks, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        approvalGroupId, cableCustomerId, payload.connection_date || new Date(),
        nullable(payload.disconnection_date), connectionType,
        connectionType === 'SHIFTED' ? currentCustomer.door_no : null, newDoorNo,
        connectionType === 'SHIFTED' ? currentCustomer.location_id : null,
        connectionType === 'SHIFTED' ? currentCustomer.area_id : null,
        connectionType === 'SHIFTED' ? currentCustomer.street_id : null,
        newLocationId, newAreaId, newStreetId, oldAddress, newAddress,
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
      sub_total: money(payload.connection_charge) + materialCost,
      discount: payload.connection_discount,
      overall_discount: payload.overall_discount,
      customer_paid_amount: payload.customer_paid_amount,
      due_date: payload.due_date,
      approval_status: approvalStatus,
      created_by_user_id: createdBy
    });
    if (connectionType === 'SHIFTED') {
      await db.query(
        `UPDATE cable_tv_customers
         SET door_no = ?, location_id = ?, area_id = ?, street_id = ?, city = ?, pincode = ?, status = 'ACTIVE', updated_at = NOW()
         WHERE cable_customer_id = ?`,
        [newDoorNo, newLocationId, newAreaId, newStreetId, newMapping.city || 'Chennai', newMapping.pincode, cableCustomerId]
      );
    } else {
      await db.query('UPDATE cable_tv_customers SET status = ? WHERE cable_customer_id = ?', ['ACTIVE', cableCustomerId]);
    }
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
    const isReturn = updateReason === 'RETURNED';
    const selectedStbStatus = String(isReturn
      ? 'RETRIEVED'
      : (payload.status || (updateReason === 'REACTIVATE' ? 'ACTIVE' : isReplacement ? 'ACTIVE' : 'DISCONNECTED'))
    ).toUpperCase();
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
      const [statusResult] = await db.query(
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
      if (isReturn) {
        await saveStbAccessories(db, req, {
          approvalGroupId,
          cableCustomerId,
          customerStbId: statusResult.insertId,
          accessories: payload.accessories || payload.stb_accessories,
          employeeId,
          issuedDate: updatedDate,
          approvalStatus,
          createdBy,
          movementType: 'RETURN'
        });
      }
      if (approvalStatus === 'APPROVED') {
        await db.query(
          `UPDATE cable_customer_stbs SET status = ?, updated_at = NOW()
           WHERE customer_stb_id = ?`,
          [selectedStbStatus, targetStb.customer_stb_id]
        );
        if (isReturn && targetStb.stb_master_id) {
          await db.query(
            "UPDATE cable_stb_master SET status = 'AVAILABLE', assigned_employee_id = NULL, updated_at = NOW() WHERE stb_master_id = ?",
            [targetStb.stb_master_id]
          );
          await db.query(
            `UPDATE cable_stb_issue_master SET issue_status = 'RETURNED'
             WHERE stb_master_id = ? AND cable_customer_id = ? AND issue_status = 'ISSUED'`,
            [targetStb.stb_master_id, cableCustomerId]
          );
        }
        await db.query('UPDATE cable_tv_customers SET status = ? WHERE cable_customer_id = ?', [customerStatus, cableCustomerId]);
      }
      await db.commit();
      return res.status(201).json({
        message: approvalStatus === 'PENDING'
          ? 'STB status submitted for administrator approval'
          : 'STB status details saved successfully'
      });
    }

    const stbMasterId = intOrNull(payload.stb_master_id);
    let selectedStb = null;
    if (stbMasterId) {
      const [[stbRow]] = await db.query(
          `SELECT sm.stb_master_id, sm.stb_number, sm.stock_type, sm.mso_id, sm.stb_amount, sm.full_set_amount,
                  sm.assigned_employee_id, sm.status
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
      if (!isAdmin(req) && Number(stbRow.assigned_employee_id) !== Number(employeeId)) {
        await db.rollback();
        return res.status(403).json({ message: 'This STB is assigned to another employee' });
      }
      selectedStb = stbRow;
    }

    const stbNo = selectedStb?.stb_number || textOrNull(payload.stb_no);
    if (!stbNo) {
      await db.rollback();
      return res.status(400).json({ message: 'STB number is required' });
    }

    if (activeStbs.length && approvalStatus === 'APPROVED') {
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

    const issueMode = String(payload.issue_mode || 'BOX_ONLY').toUpperCase() === 'FULL_SET' ? 'FULL_SET' : 'BOX_ONLY';
    const chargedStbAmount = money(issueMode === 'FULL_SET' ? (selectedStb?.full_set_amount || 800) : (selectedStb?.stb_amount || 500));
    const [stbResult] = await db.query(
      `INSERT INTO cable_customer_stbs (
        approval_group_id, cable_customer_id, stb_master_id, stb_type, issue_mode, installed_mso_id, exchange_original_mso_id,
        stb_no, stb_amount, stb_discount, labour_service_charge, installed_by_employee_id, entered_by_employee_id,
        installed_date, updated_date, update_reason, reason_remarks, status, approval_status, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        approvalGroupId, cableCustomerId, stbMasterId, payload.stb_type || selectedStb?.stock_type || 'NEW',
        issueMode,
        intOrNull(payload.installed_mso_id || selectedStb?.mso_id), intOrNull(payload.exchange_original_mso_id), stbNo,
        chargedStbAmount, money(payload.stb_discount), money(payload.labour_service_charge),
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
    const pendingTotal = chargedStbAmount
      + money(payload.labour_service_charge)
      - money(payload.stb_discount)
      - money(payload.overall_discount);
    if (pendingTotal > 0 || money(payload.customer_paid_amount) > 0) {
      await addPendingAccount(db, req, {
        approval_group_id: approvalGroupId,
        cable_customer_id: cableCustomerId,
        stb_amount: chargedStbAmount,
        labor_amount: payload.labour_service_charge,
        discount: payload.stb_discount,
        overall_discount: payload.overall_discount,
        customer_paid_amount: payload.customer_paid_amount,
        due_date: payload.due_date,
        approval_status: approvalStatus,
        created_by_user_id: createdBy
      });
    }
    if (approvalStatus === 'APPROVED') {
      await db.query('UPDATE cable_tv_customers SET status = ? WHERE cable_customer_id = ?', [customerStatus, cableCustomerId]);
    }
    await db.commit();
    return res.status(201).json({
      message: approvalStatus === 'PENDING'
        ? 'STB change submitted for administrator approval'
        : 'STB details saved successfully'
    });
  } catch (error) {
    await db.rollback();
    return res.status(500).json({ message: 'STB save failed', error: error.message });
  }
};

const updateCustomerStb = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ message: 'Use Add STB to submit a status change for administrator approval' });
    }
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
    await ensureCableTvExtendedTables(db);
    await db.beginTransaction();
    const cableCustomerId = Number(req.params.id);
    const payload = req.body || {};
    const { approvalGroupId, approvalStatus, createdBy } = await createApprovalGroup(db, req, 'SUBSCRIPTION_UPDATE');
    const startDate = payload.start_date || new Date();
    const start = new Date(startDate);
    const subscriptionMonth = Number(payload.subscription_month) || start.getMonth() + 1;
    const subscriptionYear = Number(payload.subscription_year) || start.getFullYear();
    const [[duplicateSubscription]] = await db.query(
      `SELECT subscription_id
       FROM cable_subscriptions
       WHERE cable_customer_id = ? AND subscription_month = ? AND subscription_year = ?
       LIMIT 1`,
      [cableCustomerId, subscriptionMonth, subscriptionYear]
    );
    if (duplicateSubscription) {
      await db.rollback();
      return res.status(400).json({ message: 'Subscription already exists for selected month and year' });
    }
    const monthDays = Number(payload.days_in_month) || daysInMonth(subscriptionMonth, subscriptionYear);
    const expiryDate = payload.expiry_date || `${subscriptionYear}-${String(subscriptionMonth).padStart(2, '0')}-${monthDays}`;
    const numberOfDays = money(payload.number_of_days_or_months || inclusiveDays(startDate, expiryDate));
    const receivedCount = money(payload.received_count || (String(payload.billing_basis || '').toUpperCase() === 'YEAR'
      ? numberOfDays * 12
      : String(payload.billing_basis || '').toUpperCase() === 'DAY'
        ? numberOfDays / monthDays
        : numberOfDays));
    const [[customerPackage]] = await db.query(
      `SELECT cp.package_price, pkg.price AS master_price
       FROM cable_customer_packages cp
       LEFT JOIN cable_package_master pkg ON pkg.package_id = cp.package_id
       WHERE cp.customer_package_id = ? AND cp.cable_customer_id = ?
       LIMIT 1`,
      [payload.customer_package_id, cableCustomerId]
    );
    const packageAmount = money(payload.package_amount ?? customerPackage?.package_price ?? customerPackage?.master_price);
    const amount = money(payload.amount || packageAmount);
    const paidAmount = money(payload.paid_amount);
    const balanceAmount = money(payload.balance_amount ?? amount - paidAmount);
    const paymentStatus = String(payload.payment_status || 'PENDING').toUpperCase() === 'PAID' ? 'PAID' : 'PENDING';
    if ((balanceAmount === 0 && paymentStatus !== 'PAID') || (balanceAmount !== 0 && paymentStatus !== 'PENDING')) {
      await db.rollback();
      return res.status(400).json({ message: 'Status can be Paid only when balance is exactly 0. Keep status Unpaid when balance is not 0.' });
    }
    const employeeId = await resolveEmployeeId(db, req, payload.collected_by_employee_id);
    if (!employeeId) {
      await db.rollback();
      return res.status(400).json({ message: 'Collected By employee name is required' });
    }
    const paymentMode = isAdmin(req) ? nullable(payload.payment_mode || 'CASH') : 'CASH';
    const collectDate = isAdmin(req) ? nullable(payload.collect_date) : dateOnly(new Date());
    const optionalColumns = await existingColumns(db, 'cable_subscriptions', ['payment_reference', 'received_count']);
    const subscriptionColumns = [
      'approval_group_id', 'cable_customer_id', 'customer_package_id', 'subscription_month', 'subscription_year',
      'days_in_month', 'billing_basis', 'number_of_days_or_months'
    ];
    const subscriptionValues = [
      approvalGroupId, cableCustomerId, Number(payload.customer_package_id), subscriptionMonth, subscriptionYear,
      monthDays, payload.billing_basis || 'MONTH', numberOfDays
    ];
    if (optionalColumns.has('received_count')) {
      subscriptionColumns.push('received_count');
      subscriptionValues.push(receivedCount);
    }
    subscriptionColumns.push(
      'amount', 'paid_amount', 'balance_amount', 'collect_date', 'start_date', 'expiry_date',
      'collected_by_employee_id', 'payment_mode'
    );
    subscriptionValues.push(
      amount, paidAmount, balanceAmount, collectDate, dateOnly(startDate), dateOnly(expiryDate),
      employeeId, paymentMode
    );
    if (optionalColumns.has('payment_reference')) {
      subscriptionColumns.push('payment_reference');
      subscriptionValues.push(nullable(payload.payment_reference || payload.received_id || payload.received_name));
    }
    subscriptionColumns.push('payment_status', 'approval_status', 'remarks', 'created_by_user_id');
    subscriptionValues.push(
      paymentStatus,
      approvalStatus, nullable(payload.remarks), createdBy
    );
    await db.query(
      `INSERT INTO cable_subscriptions (${subscriptionColumns.join(', ')})
       VALUES (${subscriptionColumns.map(() => '?').join(', ')})`,
      subscriptionValues
    );
    await addPendingAccount(db, req, {
      approval_group_id: approvalGroupId,
      cable_customer_id: cableCustomerId,
      subscription_amount: amount,
      customer_paid_amount: paidAmount,
      due_date: null,
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
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const subscriptionMonth = Number(req.body.subscription_month);
    const subscriptionYear = Number(req.body.subscription_year);
    const subscriptionId = Number(req.params.subscriptionId);
    const cableCustomerId = Number(req.params.id);
    const [[existingSubscription]] = await db.query(
      `SELECT subscription_id
       FROM cable_subscriptions
       WHERE cable_customer_id = ? AND subscription_id = ?
       LIMIT 1`,
      [cableCustomerId, subscriptionId]
    );
    if (!existingSubscription) {
      return res.status(404).json({ message: 'Subscription record not found for update' });
    }
    const [[duplicateSubscription]] = await db.query(
      `SELECT subscription_id
       FROM cable_subscriptions
       WHERE cable_customer_id = ? AND subscription_month = ? AND subscription_year = ? AND subscription_id <> ?
       LIMIT 1`,
      [cableCustomerId, subscriptionMonth, subscriptionYear, subscriptionId]
    );
    if (duplicateSubscription) {
      return res.status(400).json({ message: 'Subscription already exists for selected month and year' });
    }
    const amount = money(req.body.amount);
    const paidAmount = money(req.body.paid_amount);
    const balanceAmount = money(req.body.balance_amount ?? amount - paidAmount);
    const paymentStatus = String(req.body.payment_status || 'PENDING').toUpperCase() === 'PAID' ? 'PAID' : 'PENDING';
    if ((balanceAmount === 0 && paymentStatus !== 'PAID') || (balanceAmount !== 0 && paymentStatus !== 'PENDING')) {
      return res.status(400).json({ message: 'Status can be Paid only when balance is exactly 0. Keep status Unpaid when balance is not 0.' });
    }
    const receivedCount = money(req.body.received_count || 1);
    const employeeId = await resolveEmployeeId(db, req, req.body.collected_by_employee_id);
    if (!employeeId) {
      return res.status(400).json({ message: 'Collected By employee name is required' });
    }
    const paymentMode = isAdmin(req) ? nullable(req.body.payment_mode || 'CASH') : 'CASH';
    const collectDate = isAdmin(req) ? nullable(req.body.collect_date) : dateOnly(new Date());
    const optionalColumns = await existingColumns(db, 'cable_subscriptions', ['payment_reference', 'received_count']);
    const setClauses = [
      'subscription_month = ?', 'subscription_year = ?', 'amount = ?', 'paid_amount = ?',
      'balance_amount = ?', 'collect_date = ?', 'start_date = ?', 'expiry_date = ?',
      'days_in_month = ?', 'billing_basis = ?', 'number_of_days_or_months = ?', 'collected_by_employee_id = ?'
    ];
    const values = [
      subscriptionMonth, subscriptionYear, amount,
      paidAmount, balanceAmount, collectDate,
      nullable(req.body.start_date), nullable(req.body.expiry_date),
      Number(req.body.days_in_month) || daysInMonth(subscriptionMonth, subscriptionYear),
      req.body.billing_basis || 'MONTH', money(req.body.number_of_days_or_months || 1), employeeId
    ];
    if (optionalColumns.has('received_count')) {
      setClauses.push('received_count = ?');
      values.push(receivedCount);
    }
    setClauses.push('payment_mode = ?');
    values.push(paymentMode);
    if (optionalColumns.has('payment_reference')) {
      setClauses.push('payment_reference = ?');
      values.push(nullable(req.body.payment_reference || req.body.received_id || req.body.received_name));
    }
    setClauses.push('payment_status = ?', 'remarks = ?', 'updated_at = NOW()');
    values.push(
      paymentStatus,
      nullable(req.body.remarks),
      subscriptionId,
      cableCustomerId
    );
    const [updateResult] = await db.query(
      `UPDATE cable_subscriptions
       SET ${setClauses.join(', ')}
       WHERE subscription_id = ? AND cable_customer_id = ?`,
      values
    );
    if (!updateResult.affectedRows) {
      return res.status(404).json({ message: 'Subscription record not found for update' });
    }
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
  assignStbMaster,
  getPendingAccounts,
  getAccountPayments,
  receiveAccount,
  revertAccountToPending,
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
