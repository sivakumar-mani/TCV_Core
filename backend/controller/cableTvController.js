const connection = require('../connection');
const { ensureTransactionTable } = require('./transactionController');
const {
  synchronizeLatestCustomerStbStatus,
  applyApprovedLocationChange,
  reconcileApprovedLocationChanges
} = require('../utils/cableTvStatus');
const {
  ensureMaterialSalesTables,
  getMaterialSalePayments,
  receiveMaterialSale
} = require('./materialSalesController');

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
const stbStockTypes = ['NEW', 'SERVICED', 'RETURNED', 'FAULT', 'DAMAGED', 'BURNT', 'NOT_SERVICEABLE'];
const faultStbStockTypes = ['FAULT', 'DAMAGED', 'BURNT'];
const stbStatuses = ['AVAILABLE', 'IN_SERVICE', 'NOT_SERVICEABLE', 'NOT_AVAILABLE'];
const normalizePackageType = (value) => {
  const type = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (type === 'ALA_CARTE' || type === 'ALACARTE') return 'ALACARTE';
  if (type === 'BROADCAST' || type === 'BROADCASTER') return 'BROADCASTER';
  if (type === 'ADDON') return type;
  return 'ADDON';
};
const subscriptionBillingDays = (startDate) => {
  const start = new Date(`${dateOnly(startDate)}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 0;
  const day = start.getDate();
  if (day <= 5) return daysInMonth(start.getMonth() + 1, start.getFullYear());
  if (day <= 10) return 25;
  if (day <= 15) return 20;
  if (day <= 20) return 15;
  if (day <= 25) return 10;
  return 5;
};
const customerStatusForStbStatus = (value) => {
  const status = String(value || '').trim().toUpperCase();
  if (['FAULT', 'FAULTY', 'DAMAGED', 'BROKEN', 'BURNT'].includes(status)) return 'FAULT';
  if (['RETRIEVED', 'RETURNED'].includes(status)) return 'RETRIEVED';
  if (['DISCONNECTED', 'VACATED', 'STB_LOST', 'OUTSTATION'].includes(status)) return 'DISCONNECTED';
  if (status === 'UPGRADE') return 'UPGRADE';
  return 'ACTIVE';
};

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
  await ensureTransactionTable(db);
  const [[packageCategoryColumn]] = await db.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_package_master' AND COLUMN_NAME = 'service_category'`
  );
  if (!packageCategoryColumn.count) {
    await db.query("ALTER TABLE cable_package_master ADD COLUMN service_category ENUM('CATV','INTERNET') NOT NULL DEFAULT 'CATV' AFTER package_type");
  }
  for (const [column, definition] of [
    ['gst_percent', 'DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER price'],
    ['price_including_gst', 'DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER gst_percent'],
    ['internet_network_type', "ENUM('KRISHI','RAILWIRE') NULL AFTER service_category"]
  ]) {
    const [[existing]] = await db.query(
      `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_package_master' AND COLUMN_NAME = ?`,
      [column]
    );
    if (!existing.count) await db.query(`ALTER TABLE cable_package_master ADD COLUMN ${column} ${definition}`);
  }
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
      INDEX idx_cable_stb_master_number (stb_number),
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
      account_status ENUM('PENDING','PARTIAL','PAID','RECEIVED','NA') NOT NULL DEFAULT 'PENDING',
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
  const [stbNumberIndexes] = await db.query(
    `SELECT INDEX_NAME, NON_UNIQUE
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'cable_stb_master'
       AND INDEX_NAME IN ('uk_cable_stb_master_number', 'idx_cable_stb_master_number')`
  );
  const uniqueStbNumberIndex = stbNumberIndexes.find(
    (index) => index.INDEX_NAME === 'uk_cable_stb_master_number' && Number(index.NON_UNIQUE) === 0
  );
  if (uniqueStbNumberIndex) {
    await db.query('ALTER TABLE cable_stb_master DROP INDEX uk_cable_stb_master_number');
  }
  if (!stbNumberIndexes.some((index) => index.INDEX_NAME === 'idx_cable_stb_master_number')) {
    await db.query('ALTER TABLE cable_stb_master ADD INDEX idx_cable_stb_master_number (stb_number)');
  }
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

  const packageRemovalColumns = [
    ['removal_status', "ALTER TABLE cable_customer_packages ADD COLUMN removal_status ENUM('NONE','PENDING','APPROVED') NOT NULL DEFAULT 'NONE' AFTER approval_status"],
    ['removal_requested_at', 'ALTER TABLE cable_customer_packages ADD COLUMN removal_requested_at DATETIME NULL AFTER removal_status']
  ];
  for (const [columnName, alterSql] of packageRemovalColumns) {
    const [[column]] = await db.query(
      `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_customer_packages' AND COLUMN_NAME = ?`,
      [columnName]
    );
    if (!column.count) await db.query(alterSql);
  }

  try {
    await db.query("ALTER TABLE cable_tv_customers MODIFY status ENUM('ACTIVE','INACTIVE','DISCONNECTED','SHIFTED','TRANSFERRED','RETRIEVED','FAULT','UPGRADE') NOT NULL DEFAULT 'ACTIVE'");
    await db.query("ALTER TABLE cable_customer_stbs MODIFY stb_type ENUM('NEW','SERVICED','RETURNED','FAULT','DAMAGED','UPGRADE','REPLACED','EXCHANGE','CUSTOMER_OWNED') NOT NULL DEFAULT 'NEW'");
    await db.query("ALTER TABLE cable_customer_stbs MODIFY status ENUM('ACTIVE','RETRIEVED','FAULT','DISCONNECTED','UPGRADE','RETURNED','FAULTY','REPLACED') NOT NULL DEFAULT 'ACTIVE'");
    await db.query("ALTER TABLE cable_stb_master MODIFY status ENUM('AVAILABLE','IN_SERVICE','NOT_SERVICEABLE','NOT_AVAILABLE') NOT NULL DEFAULT 'AVAILABLE'");
    await db.query("ALTER TABLE cable_stb_master MODIFY stock_type ENUM('NEW','SERVICED','RETURNED','FAULT','DAMAGED','BURNT','NOT_SERVICEABLE') NOT NULL DEFAULT 'NEW'");
    await db.query("ALTER TABLE cable_connections MODIFY connection_type ENUM('NEW','RECONNECTION','SHIFTED','TRANSFERRED') NOT NULL DEFAULT 'NEW'");
    await db.query("ALTER TABLE cable_subscriptions MODIFY billing_basis ENUM('DAY','MONTH','YEAR') NOT NULL DEFAULT 'MONTH'");
  } catch (_error) {
    // Existing installations may already have the expanded enum.
  }
  try {
    await db.query("ALTER TABLE cable_stb_master MODIFY stock_type ENUM('NEW','SERVICED','RETURNED','FAULT','DAMAGED','BURNT','NOT_SERVICEABLE') NOT NULL DEFAULT 'NEW'");
  } catch (_error) {
    // Keep startup compatible with installations where the STB master is not available yet.
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
    ['old_network_id', 'ALTER TABLE cable_connections ADD COLUMN old_network_id INT NULL AFTER connection_type'],
    ['new_network_id', 'ALTER TABLE cable_connections ADD COLUMN new_network_id INT NULL AFTER old_network_id'],
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

  const [[customerTypeColumn]] = await db.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_tv_customers' AND COLUMN_NAME = 'customer_type'`
  );
  if (!customerTypeColumn.count) {
    await db.query("ALTER TABLE cable_tv_customers ADD COLUMN customer_type ENUM('REGULAR','BUSINESS','FREE','LEASE_LINE') NOT NULL DEFAULT 'REGULAR' AFTER network_type");
  }
  await db.query("ALTER TABLE cable_tv_customers MODIFY customer_type ENUM('REGULAR','BUSINESS','FREE','LEASE_LINE') NOT NULL DEFAULT 'REGULAR'");
  const specialColumns = [
    ['network_customer_no', "ALTER TABLE cable_tv_customers ADD COLUMN network_customer_no VARCHAR(30) NULL AFTER legacy_customer_no"],
    ['topup_base_amount', "ALTER TABLE cable_tv_customers ADD COLUMN topup_base_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER customer_type"],
    ['topup_gst_percent', "ALTER TABLE cable_tv_customers ADD COLUMN topup_gst_percent DECIMAL(5,2) NOT NULL DEFAULT 18 AFTER topup_base_amount"],
    ['recharge_amount', "ALTER TABLE cable_tv_customers ADD COLUMN recharge_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER topup_gst_percent"]
  ];
  for (const [columnName, alterSql] of specialColumns) {
    const [[column]] = await db.query(`SELECT COUNT(*) count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cable_tv_customers' AND COLUMN_NAME=?`, [columnName]);
    if (!column.count) await db.query(alterSql);
  }
  await db.query("ALTER TABLE cable_tv_customers MODIFY status ENUM('ACTIVE','INACTIVE','DISCONNECTED','SHIFTED','TRANSFERRED','RETRIEVED','FAULT','UPGRADE','FREE','LEASE_LINE') NOT NULL DEFAULT 'ACTIVE'");
  const [numberlessCustomers] = await db.query("SELECT cable_customer_id,UPPER(COALESCE(network_type,'TCV')) network_type FROM cable_tv_customers WHERE network_customer_no IS NULL OR network_customer_no='' ORDER BY cable_customer_id");
  for (const customer of numberlessCustomers) {
    const prefix = customer.network_type === 'PAMMAL' ? 'PAMMAL' : customer.network_type;
    const [[last]] = await db.query("SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(network_customer_no,'-',-1) AS UNSIGNED)),0)+1 next_no FROM cable_tv_customers WHERE UPPER(network_type)=?", [customer.network_type]);
    await db.query('UPDATE cable_tv_customers SET network_customer_no=? WHERE cable_customer_id=?', [`${prefix}-${String(last.next_no).padStart(6,'0')}`,customer.cable_customer_id]);
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
  if (!String(accountStatusColumn?.column_type || '').includes("'NA'")) {
    await db.query("ALTER TABLE cable_customer_accounts MODIFY account_status ENUM('PENDING','PARTIAL','PAID','RECEIVED','NA') NOT NULL DEFAULT 'PENDING'");
    await db.query("UPDATE cable_customer_accounts SET account_status = 'PAID' WHERE account_status = 'RECEIVED'");
    await db.query("UPDATE cable_customer_accounts SET account_status = 'NA' WHERE grand_total <= 0 AND office_received_amount <= 0");
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
  await db.query(`
    CREATE TABLE IF NOT EXISTS cable_subscription_payments (
      subscription_payment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      subscription_id BIGINT NOT NULL,
      cable_customer_id BIGINT NOT NULL,
      received_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      collected_date DATE NOT NULL,
      payment_mode VARCHAR(30) NULL,
      payment_reference VARCHAR(150) NULL,
      received_by_employee_id INT NULL,
      comments VARCHAR(500) NULL,
      balance_after_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
      payment_status ENUM('PARTIAL','PAID') NOT NULL,
      created_by_user_id INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cable_subscription_payment_subscription (subscription_id),
      INDEX idx_cable_subscription_payment_customer (cable_customer_id),
      INDEX idx_cable_subscription_payment_date (collected_date),
      CONSTRAINT fk_cable_subscription_payment_subscription FOREIGN KEY (subscription_id)
        REFERENCES cable_subscriptions(subscription_id) ON DELETE CASCADE,
      CONSTRAINT fk_cable_subscription_payment_customer FOREIGN KEY (cable_customer_id)
        REFERENCES cable_tv_customers(cable_customer_id) ON DELETE CASCADE
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
    ['issue_mode', "ALTER TABLE cable_customer_stbs ADD COLUMN issue_mode ENUM('FULL_SET','BOX_ONLY') NOT NULL DEFAULT 'BOX_ONLY' AFTER stb_type"],
    ['refund_amount', "ALTER TABLE cable_customer_stbs ADD COLUMN refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER labour_service_charge"],
    ['refund_payment_mode', "ALTER TABLE cable_customer_stbs ADD COLUMN refund_payment_mode ENUM('CASH','ONLINE','BANK','UPI','OTHER') NOT NULL DEFAULT 'CASH' AFTER refund_amount"]
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

  const stbMasterColumns = await existingColumns(db, 'cable_stb_master', ['updated_date']);
  if (!stbMasterColumns.has('updated_date')) {
    await db.query('ALTER TABLE cable_stb_master ADD COLUMN updated_date DATE NULL AFTER status');
    await db.query('UPDATE cable_stb_master SET updated_date = DATE(updated_at) WHERE updated_date IS NULL');
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
    ['payment_mapped_employee_id', 'ALTER TABLE cable_subscriptions ADD COLUMN payment_mapped_employee_id INT NULL AFTER collected_by_employee_id'],
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
  try {
    await db.query(
      `UPDATE cable_subscriptions
       SET payment_mapped_employee_id = collected_by_employee_id
       WHERE UPPER(COALESCE(payment_mode, 'CASH')) IN ('ONLINE', 'OFFICE')
         AND payment_mapped_employee_id IS NULL`
    );
  } catch (_error) {
    // The optional mapping column may be unavailable on restricted legacy databases.
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

const generateNetworkCustomerNo = async (db, networkType) => {
  const normalized=String(networkType||'TCV').toUpperCase(),prefix=normalized==='PAMMAL'?'PAMMAL':normalized;
  const [[row]]=await db.query("SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(network_customer_no,'-',-1) AS UNSIGNED)),0)+1 next_no FROM cable_tv_customers WHERE UPPER(network_type)=?",[normalized]);
  return `${prefix}-${String(row.next_no).padStart(6,'0')}`;
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
  const subTotal = money(data.sub_total || (stbAmount + connectionAmount + materialCost + subscriptionAmount));
  const grandTotal = Math.max(money(data.grand_total || (subTotal - discount - overallDiscount)), 0);
  const paidAmount = money(data.customer_paid_amount);
  const balanceAmount = Math.max(grandTotal - paidAmount, 0);
  const accountStatus = grandTotal <= 0 ? 'NA' : 'PENDING';
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

const recalculateLinkedPendingAccount = async (db, approvalGroupId) => {
  if (!approvalGroupId) return;
  const [[account]] = await db.query(
    `SELECT ca.account_id, ca.customer_paid_amount, ca.office_received_amount,
            ca.material_discount, ca.overall_discount,
            COALESCE((SELECT SUM(stb.stb_amount) FROM cable_customer_stbs stb
                      WHERE stb.approval_group_id = ca.approval_group_id), 0) AS stb_amount,
            COALESCE((SELECT SUM(stb.stb_discount) FROM cable_customer_stbs stb
                      WHERE stb.approval_group_id = ca.approval_group_id), 0) AS stb_discount,
            COALESCE((SELECT SUM(stb.labour_service_charge) FROM cable_customer_stbs stb
                      WHERE stb.approval_group_id = ca.approval_group_id), 0) AS stb_labor,
            COALESCE((SELECT SUM(conn.connection_charge) FROM cable_connections conn
                      WHERE conn.approval_group_id = ca.approval_group_id), 0) AS connection_amount,
            COALESCE((SELECT SUM(conn.connection_discount) FROM cable_connections conn
                      WHERE conn.approval_group_id = ca.approval_group_id), 0) AS connection_discount,
            COALESCE((SELECT SUM(conn.labour_service_charge) FROM cable_connections conn
                      WHERE conn.approval_group_id = ca.approval_group_id), 0) AS connection_labor,
            COALESCE((SELECT SUM(mat.amount) FROM cable_connection_materials mat
                      WHERE mat.approval_group_id = ca.approval_group_id), 0) AS material_cost,
            COALESCE((SELECT SUM(sub.amount) FROM cable_subscriptions sub
                      WHERE sub.approval_group_id = ca.approval_group_id), 0) AS subscription_amount
     FROM cable_customer_accounts ca
     WHERE ca.approval_group_id = ?
     ORDER BY ca.account_id DESC LIMIT 1`,
    [approvalGroupId]
  );
  if (!account) return;
  const stbAmount = money(account.stb_amount);
  const connectionAmount = money(account.connection_amount);
  const laborAmount = money(account.stb_labor) + money(account.connection_labor);
  const materialCost = money(account.material_cost);
  const subscriptionAmount = money(account.subscription_amount);
  const discount = money(account.stb_discount) + money(account.connection_discount)
    + money(account.material_discount) + money(account.overall_discount);
  const subTotal = money(stbAmount + connectionAmount + materialCost + subscriptionAmount);
  const grandTotal = Math.max(money(subTotal - discount), 0);
  const customerPaid = money(account.customer_paid_amount);
  const officeReceived = money(account.office_received_amount);
  const accountStatus = grandTotal <= 0
    ? 'NA'
    : officeReceived >= grandTotal
      ? 'PAID'
      : officeReceived > 0 ? 'PARTIAL' : 'PENDING';
  await db.query(
    `UPDATE cable_customer_accounts
     SET stb_amount = ?, connection_amount = ?, labor_amount = ?, material_cost = ?,
         subscription_amount = ?, sub_total = ?, discount = ?, grand_total = ?,
         balance_amount = ?, office_balance_amount = ?, account_status = ?, updated_at = NOW()
     WHERE account_id = ?`,
    [
      stbAmount, connectionAmount, laborAmount, materialCost, subscriptionAmount,
      subTotal, discount, grandTotal, Math.max(grandTotal - customerPaid, 0),
      Math.max(grandTotal - officeReceived, 0), accountStatus, account.account_id
    ]
  );
};

const reconcileMissingStbAmounts = async (db, cableCustomerId) => {
  const customerId = Number(cableCustomerId);
  const customerFilter = customerId ? 'AND stb.cable_customer_id = ?' : '';
  const [rows] = await db.query(
    `SELECT stb.customer_stb_id, stb.cable_customer_id, stb.approval_group_id, stb.issue_mode,
            sm.stb_amount AS master_stb_amount, sm.full_set_amount AS master_full_set_amount
     FROM cable_customer_stbs stb
     LEFT JOIN cable_stb_master sm ON sm.stb_master_id = stb.stb_master_id
     WHERE 1 = 1 ${customerFilter}
       AND (
         UPPER(COALESCE(stb.update_reason, '')) = 'REPLACED'
         OR (COALESCE(stb.update_reason, '') = '' AND UPPER(COALESCE(stb.stb_type, '')) = 'NEW')
       )
       AND stb.approval_status = 'APPROVED'
       AND COALESCE(stb.stb_amount, 0) <= 0
       AND stb.approval_group_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM cable_customer_accounts ca
         WHERE ca.approval_group_id = stb.approval_group_id
       )`,
    customerId ? [customerId] : []
  );
  for (const row of rows) {
    const fullSet = String(row.issue_mode || 'BOX_ONLY').toUpperCase() === 'FULL_SET';
    const restoredAmount = money(fullSet ? row.master_full_set_amount : row.master_stb_amount)
      || (fullSet ? 800 : 500);
    await db.query(
      `UPDATE cable_customer_stbs
       SET stb_amount = ?, updated_at = NOW()
       WHERE customer_stb_id = ? AND cable_customer_id = ? AND COALESCE(stb_amount, 0) <= 0`,
      [restoredAmount, row.customer_stb_id, row.cable_customer_id]
    );
    await recalculateLinkedPendingAccount(db, row.approval_group_id);
  }
};

const upsertFaultStbMaster = async (db, data = {}) => {
  const reason = String(data.reason || 'FAULT').toUpperCase();
  const stockType = reason === 'BROKEN' ? 'DAMAGED' : ['FAULT', 'DAMAGED', 'BURNT'].includes(reason) ? reason : 'FAULT';
  const stbNo = textOrNull(data.stb_no);
  let stbMasterId = intOrNull(data.stb_master_id);
  if (!stbMasterId && stbNo) {
    const [[matchingMaster]] = await db.query(
      `SELECT stb_master_id FROM cable_stb_master
       WHERE LOWER(stb_number) = LOWER(?) AND is_active = 1
       ORDER BY stb_master_id DESC LIMIT 1`,
      [stbNo]
    );
    stbMasterId = intOrNull(matchingMaster?.stb_master_id);
  }
  if (stbMasterId) {
    await db.query(
      `UPDATE cable_stb_master
       SET stock_type = ?, status = 'IN_SERVICE', assigned_employee_id = NULL,
           updated_date = ?, updated_at = NOW()
       WHERE stb_master_id = ?`,
      [stockType, dateOnly(data.updated_date || new Date()), stbMasterId]
    );
    return stbMasterId;
  }
  if (!stbNo) return null;
  const [createdMaster] = await db.query(
    `INSERT INTO cable_stb_master (
       stb_number, box_type, stock_type, mso_id, stb_amount, full_set_amount,
       assigned_employee_id, status, updated_date
     ) VALUES (?, 'HD', ?, ?, ?, 800, NULL, 'IN_SERVICE', ?)`,
    [stbNo, stockType, intOrNull(data.mso_id), money(data.stb_amount || 500), dateOnly(data.updated_date || new Date())]
  );
  return createdMaster.insertId;
};

const upsertReturnedStbMaster = async (db, data = {}) => {
  const stbNo = textOrNull(data.stb_no);
  if (!stbNo) return null;
  let stbMasterId = intOrNull(data.stb_master_id);
  if (!stbMasterId) {
    const [[matchingMaster]] = await db.query(
      `SELECT stb_master_id FROM cable_stb_master
       WHERE LOWER(TRIM(stb_number)) = LOWER(TRIM(?)) AND is_active = 1
       ORDER BY stb_master_id DESC LIMIT 1`,
      [stbNo]
    );
    stbMasterId = intOrNull(matchingMaster?.stb_master_id);
  }
  if (stbMasterId) {
    await db.query(
      `UPDATE cable_stb_master
       SET stock_type = 'RETURNED', status = 'AVAILABLE', assigned_employee_id = NULL,
           mso_id = COALESCE(mso_id, ?), updated_date = ?, updated_at = NOW()
       WHERE stb_master_id = ?`,
      [intOrNull(data.mso_id), dateOnly(data.updated_date || new Date()), stbMasterId]
    );
    return stbMasterId;
  }
  const [createdMaster] = await db.query(
    `INSERT INTO cable_stb_master (
       stb_number, box_type, stock_type, mso_id, stb_amount, full_set_amount,
       assigned_employee_id, status, updated_date
     ) VALUES (?, 'HD', 'RETURNED', ?, ?, 800, NULL, 'AVAILABLE', ?)`,
    [stbNo, intOrNull(data.mso_id), money(data.stb_amount || 500), dateOnly(data.updated_date || new Date())]
  );
  return createdMaster.insertId;
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
      "SELECT package_id, package_name, package_type, price FROM cable_package_master WHERE is_active = 1 AND service_category = 'CATV' ORDER BY package_name"
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
      `SELECT sm.stb_master_id, sm.stb_number, sm.box_type,
              CASE
                WHEN latest.updated_at >= sm.updated_at AND latest.update_reason = 'BROKEN' THEN 'DAMAGED'
                WHEN latest.updated_at >= sm.updated_at AND latest.update_reason IN ('FAULT','DAMAGED','BURNT') THEN latest.update_reason
                WHEN latest.updated_at >= sm.updated_at AND latest.update_reason = 'RETURNED' THEN 'RETURNED'
                WHEN latest.updated_at >= sm.updated_at AND (latest.stb_type = 'SERVICED' OR latest.update_reason = 'REACTIVATE') THEN 'SERVICED'
                ELSE sm.stock_type
              END AS stock_type,
              sm.mso_id, sm.stb_amount, sm.full_set_amount,
              CASE
                WHEN latest.updated_at >= sm.updated_at AND latest.update_reason IN ('FAULT','DAMAGED','BROKEN','BURNT') THEN NULL
                ELSE sm.assigned_employee_id
              END AS assigned_employee_id,
              CASE
                WHEN sm.status = 'NOT_SERVICEABLE' THEN 'NOT_AVAILABLE'
                WHEN sm.stock_type = 'NOT_SERVICEABLE' THEN 'NOT_AVAILABLE'
                WHEN latest.updated_at >= sm.updated_at AND latest.update_reason IN ('FAULT','DAMAGED','BROKEN','BURNT') THEN 'IN_SERVICE'
                WHEN latest.updated_at >= sm.updated_at AND latest.update_reason = 'RETURNED' THEN 'AVAILABLE'
                WHEN sm.stock_type IN ('FAULT','DAMAGED','BURNT') THEN 'IN_SERVICE'
                ELSE sm.status
              END AS status,
              sm.is_active, sm.created_at, sm.updated_at,
              CASE WHEN latest.updated_at >= sm.updated_at
                THEN COALESCE(latest.updated_date, sm.updated_date)
                ELSE sm.updated_date
              END AS updated_date,
              m.mso_name,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', assigned.first_name, assigned.last_name)), ''), assigned.employee_code) AS assigned_employee_name
       FROM cable_stb_master sm
       LEFT JOIN (
         SELECT ranked.*
         FROM (
           SELECT cs.stb_master_id, cs.stb_no, cs.stb_type, cs.update_reason, cs.updated_date, cs.updated_at,
                  ROW_NUMBER() OVER (
                    PARTITION BY LOWER(CONVERT(cs.stb_no USING utf8mb4)) COLLATE utf8mb4_unicode_ci
                    ORDER BY COALESCE(cs.updated_date, cs.installed_date) DESC,
                             cs.customer_stb_id DESC
                  ) AS row_rank
           FROM cable_customer_stbs cs
           WHERE cs.approval_status = 'APPROVED'
         ) ranked
         WHERE ranked.row_rank = 1
       ) latest ON latest.stb_master_id = sm.stb_master_id
                    OR (
                      LOWER(CONVERT(latest.stb_no USING utf8mb4)) COLLATE utf8mb4_unicode_ci
                          = LOWER(CONVERT(sm.stb_number USING utf8mb4)) COLLATE utf8mb4_unicode_ci
                    )
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
    const serviceCategory = String(req.body.service_category || 'CATV').toUpperCase() === 'INTERNET' ? 'INTERNET' : 'CATV';
    const internetNetworkType = String(req.body.internet_network_type || '').toUpperCase();
    const basePrice = money(req.body.price);
    const gstPercent = serviceCategory === 'INTERNET' ? 18 : 0;
    const priceIncludingGst = serviceCategory === 'INTERNET'
      ? money(basePrice + (basePrice * gstPercent / 100))
      : 0;
    if (!packageName) return res.status(400).json({ message: 'Package name is required' });
    if (serviceCategory === 'INTERNET' && !['KRISHI', 'RAILWIRE'].includes(internetNetworkType)) return res.status(400).json({ message: 'Internet package type is required' });
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const [[existing]] = await db.query(
      'SELECT package_id FROM cable_package_master WHERE package_name = ? AND package_type = ? AND service_category = ? LIMIT 1',
      [packageName, packageType, serviceCategory]
    );
    if (existing) return res.status(409).json({ message: 'Package already exists for selected type' });
    await db.query(
      `INSERT INTO cable_package_master (package_name, package_type, service_category, internet_network_type, price, gst_percent, price_including_gst, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [packageName, packageType, serviceCategory, serviceCategory === 'INTERNET' ? internetNetworkType : null, basePrice, gstPercent, priceIncludingGst, nullable(req.body.description)]
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
    const requestedStatus = String(payload.status || 'AVAILABLE').toUpperCase();
    const status = stockType === 'NOT_SERVICEABLE' || requestedStatus === 'NOT_SERVICEABLE'
      ? 'NOT_AVAILABLE'
      : faultStbStockTypes.includes(stockType) ? 'IN_SERVICE'
      : stockType === 'SERVICED' ? 'AVAILABLE' : requestedStatus;
    const assignedEmployeeId = intOrNull(payload.assigned_employee_id);
    const updatedDateValue = new Date(payload.updated_date);

    if (!stbNumber) return res.status(400).json({ message: 'STB number is required' });
    if (!stbBoxTypes.includes(boxType)) return res.status(400).json({ message: 'STB signal type must be HD or SD' });
    if (!stbStockTypes.includes(stockType)) return res.status(400).json({ message: 'STB stock type is invalid' });
    if (!stbStatuses.includes(status)) return res.status(400).json({ message: 'STB status is invalid' });
    if (status === 'IN_SERVICE' && stockType !== 'SERVICED' && !faultStbStockTypes.includes(stockType)) {
      return res.status(400).json({ message: 'In Service is valid only for Fault or Serviced STBs' });
    }
    if (!payload.updated_date || Number.isNaN(updatedDateValue.getTime())) {
      return res.status(400).json({ message: 'Updated date is required' });
    }

    const [duplicates] = await db.query(
      `SELECT stb_master_id, stock_type
       FROM cable_stb_master
       WHERE LOWER(stb_number) = LOWER(?) AND is_active = 1
       ORDER BY COALESCE(updated_date, DATE(updated_at)) DESC, stb_master_id DESC`,
      [stbNumber]
    );
    const latestStockType = String(duplicates[0]?.stock_type || '').toUpperCase();
    const validRepeatTransition = duplicates.length > 0 && (
      (faultStbStockTypes.includes(latestStockType) && ['SERVICED', 'NOT_SERVICEABLE'].includes(stockType))
      || (latestStockType === 'SERVICED' && faultStbStockTypes.includes(stockType))
    );
    if (duplicates.length > 0 && !validRepeatTransition) {
      return res.status(409).json({
        message: 'A Fault/Damaged/Burnt STB can be changed only to Serviced or Not Serviceable.'
      });
    }

    await db.query(
      `INSERT INTO cable_stb_master (stb_number, box_type, stock_type, mso_id, stb_amount, full_set_amount, assigned_employee_id, status, updated_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [stbNumber, boxType, stockType, intOrNull(payload.mso_id), money(payload.stb_amount || 500), money(payload.full_set_amount || 800), (faultStbStockTypes.includes(stockType) || stockType === 'NOT_SERVICEABLE') ? null : assignedEmployeeId, status, dateOnly(payload.updated_date)]
    );

    return res.status(201).json({ message: 'STB saved successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'STB save failed', error: error.message });
  }
};

const updateStbMaster = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const stbMasterId = intOrNull(req.params.stbMasterId);
    const payload = req.body || {};
    const stbNumber = textOrNull(payload.stb_number);
    const boxType = String(payload.box_type || 'HD').toUpperCase();
    const stockType = String(payload.stock_type || 'NEW').toUpperCase();
    const requestedStatus = String(payload.status || 'AVAILABLE').toUpperCase();
    const status = stockType === 'NOT_SERVICEABLE' || requestedStatus === 'NOT_SERVICEABLE'
      ? 'NOT_AVAILABLE'
      : faultStbStockTypes.includes(stockType) ? 'IN_SERVICE'
      : stockType === 'SERVICED' ? 'AVAILABLE' : requestedStatus;
    const assignedEmployeeId = intOrNull(payload.assigned_employee_id);
    const updatedDateValue = new Date(payload.updated_date);

    if (!stbMasterId) return res.status(400).json({ message: 'Valid STB is required' });
    if (!stbNumber) return res.status(400).json({ message: 'STB number is required' });
    if (!stbBoxTypes.includes(boxType)) return res.status(400).json({ message: 'STB signal type must be HD or SD' });
    if (!stbStockTypes.includes(stockType)) return res.status(400).json({ message: 'STB stock type is invalid' });
    if (!stbStatuses.includes(status)) return res.status(400).json({ message: 'STB status is invalid' });
    if (status === 'IN_SERVICE' && stockType !== 'SERVICED' && !faultStbStockTypes.includes(stockType)) {
      return res.status(400).json({ message: 'In Service is valid only for Fault or Serviced STBs' });
    }
    if (!payload.updated_date || Number.isNaN(updatedDateValue.getTime())) {
      return res.status(400).json({ message: 'Updated date is required' });
    }

    const [[currentStb]] = await db.query(
      'SELECT stock_type FROM cable_stb_master WHERE stb_master_id = ? AND is_active = 1 LIMIT 1',
      [stbMasterId]
    );
    if (!currentStb) return res.status(404).json({ message: 'STB record not found' });
    const currentStockType = String(currentStb.stock_type || '').toUpperCase();
    if (currentStockType === 'NOT_SERVICEABLE' && stockType !== 'NOT_SERVICEABLE') {
      return res.status(409).json({ message: 'A Not Serviceable STB cannot be reused or changed to another stock type' });
    }
    if (faultStbStockTypes.includes(currentStockType)
        && ![...faultStbStockTypes, 'SERVICED', 'NOT_SERVICEABLE'].includes(stockType)) {
      return res.status(409).json({ message: 'A Fault STB can only be changed to Serviced or Not Serviceable' });
    }

    const [duplicates] = await db.query(
      `SELECT stb_master_id, stock_type FROM cable_stb_master
       WHERE LOWER(stb_number) = LOWER(?) AND stb_master_id <> ? AND is_active = 1
       ORDER BY COALESCE(updated_date, DATE(updated_at)) DESC, stb_master_id DESC`,
      [stbNumber, stbMasterId]
    );
    const latestStockType = String(duplicates[0]?.stock_type || '').toUpperCase();
    const validRepeatTransition = duplicates.length > 0 && (
      (faultStbStockTypes.includes(latestStockType) && ['SERVICED', 'NOT_SERVICEABLE'].includes(stockType))
      || (latestStockType === 'SERVICED' && faultStbStockTypes.includes(stockType))
    );
    if (duplicates.length > 0 && !validRepeatTransition) {
      return res.status(409).json({
        message: 'A Fault/Damaged/Burnt STB can be changed only to Serviced or Not Serviceable.'
      });
    }

    const [result] = await db.query(
      `UPDATE cable_stb_master
       SET stb_number = ?, box_type = ?, stock_type = ?, mso_id = ?, stb_amount = ?,
           full_set_amount = ?, assigned_employee_id = ?, status = ?, updated_date = ?, updated_at = NOW()
       WHERE stb_master_id = ? AND is_active = 1`,
      [
        stbNumber, boxType, stockType, intOrNull(payload.mso_id), money(payload.stb_amount),
        money(payload.full_set_amount), (faultStbStockTypes.includes(stockType) || stockType === 'NOT_SERVICEABLE') ? null : assignedEmployeeId, status, dateOnly(payload.updated_date), stbMasterId
      ]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'STB record not found' });
    return res.json({ message: 'STB updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'STB update failed', error: error.message });
  }
};

const deleteStbMaster = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const stbMasterId = intOrNull(req.params.stbMasterId);
    if (!stbMasterId) return res.status(400).json({ message: 'Valid STB is required' });

    const [[usage]] = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM cable_customer_stbs WHERE stb_master_id = ?) +
         (SELECT COUNT(*) FROM cable_stb_issue_master WHERE stb_master_id = ?) AS reference_count`,
      [stbMasterId, stbMasterId]
    );
    if (Number(usage.reference_count) > 0) {
      return res.status(409).json({ message: 'STB cannot be deleted because it is used in customer or issue records' });
    }

    const [result] = await db.query(
      'DELETE FROM cable_stb_master WHERE stb_master_id = ?',
      [stbMasterId]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'STB record not found' });
    return res.json({ message: 'STB deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'STB delete failed', error: error.message });
  }
};

const getPendingAccounts = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    await reconcileMissingStbAmounts(db);
    const status = String(req.query.status || 'PENDING').toUpperCase();
    const name = String(req.query.name || '').trim();
    const installedByEmployeeId = isAdmin(req)
      ? intOrNull(req.query.installed_by_employee_id)
      : await resolveEmployeeId(db, req);
    const startDate = textOrNull(req.query.start_date);
    const endDate = textOrNull(req.query.end_date);
    const filters = [];
    const values = [];
    const outstandingSql = 'GREATEST(ca.grand_total - COALESCE(ca.office_received_amount, 0), 0)';
    const receivedSql = 'COALESCE(ca.office_received_amount, 0)';
    const effectiveInstalledBySql = `COALESCE((
        SELECT stb.installed_by_employee_id
        FROM cable_customer_stbs stb
        WHERE stb.approval_group_id = ca.approval_group_id
          AND stb.installed_by_employee_id IS NOT NULL
        ORDER BY stb.customer_stb_id DESC LIMIT 1
      ), (
        SELECT conn.connected_by_employee_id
        FROM cable_connections conn
        WHERE conn.approval_group_id = ca.approval_group_id
          AND conn.connected_by_employee_id IS NOT NULL
        ORDER BY conn.connection_id DESC LIMIT 1
      ), c.installed_by_employee_id)`;
    const installUpdateDateSql = `COALESCE((
        SELECT COALESCE(stb.updated_date, stb.installed_date)
        FROM cable_customer_stbs stb
        WHERE stb.approval_group_id = ca.approval_group_id
        ORDER BY stb.customer_stb_id DESC LIMIT 1
      ), (
        SELECT conn.connection_date
        FROM cable_connections conn
        WHERE conn.approval_group_id = ca.approval_group_id
        ORDER BY conn.connection_id DESC LIMIT 1
      ), DATE(ca.created_at))`;
    if (status === 'PENDING') {
      filters.push(`${outstandingSql} > 0 AND ${receivedSql} <= 0 AND ca.account_status <> 'NA'`);
    } else if (status === 'PARTIAL') {
      filters.push(`${outstandingSql} > 0 AND ${receivedSql} > 0`);
    } else if (['PAID', 'RECEIVED'].includes(status)) {
      filters.push(`${outstandingSql} <= 0 AND ca.account_status <> 'NA'`);
    }
    if (name) {
      filters.push('(c.full_name LIKE ? OR c.customer_code LIKE ? OR c.legacy_customer_no LIKE ? OR c.mobile_no LIKE ?)');
      const search = `%${name}%`;
      values.push(search, search, search, search);
    }
    if (installedByEmployeeId) {
      if (isAdmin(req)) {
        filters.push(`${effectiveInstalledBySql} = ?`);
        values.push(installedByEmployeeId);
      } else {
        filters.push(`(${effectiveInstalledBySql} = ? OR ca.created_by_user_id = ?)`);
        values.push(installedByEmployeeId, currentUserId(req) || 0);
      }
    } else if (!isAdmin(req)) {
      filters.push('1 = 0');
    }
    if (startDate) {
      filters.push(`${installUpdateDateSql} >= ?`);
      values.push(startDate);
    }
    if (endDate) {
      filters.push(`${installUpdateDateSql} <= ?`);
      values.push(endDate);
    }
    const [rows] = await db.query(
      `SELECT ca.*,
              COALESCE((
                SELECT SUM(stb.stb_discount)
                FROM cable_customer_stbs stb
                WHERE stb.approval_group_id = ca.approval_group_id
              ), 0) AS stb_discount,
              ${outstandingSql} AS calculated_balance_amount,
              CASE
                WHEN ca.account_status = 'NA' OR ca.grand_total <= 0 THEN 'NA'
                WHEN ${outstandingSql} <= 0 THEN 'PAID'
                WHEN ${receivedSql} > 0 THEN 'PARTIAL'
                ELSE 'PENDING'
              END AS calculated_account_status,
              c.customer_code, c.legacy_customer_no, c.full_name, c.mobile_no, n.network_name,
              l.location_name, a.area_name, s.street_name,
              ${installUpdateDateSql} AS install_update_date,
              ${installUpdateDateSql} AS account_date,
              CASE
                WHEN approval_group.group_type = 'STB_UPDATE' THEN 'STB_UPDATE'
                WHEN approval_group.group_type = 'NEW_CUSTOMER_ONBOARDING' THEN 'NEW'
                ELSE COALESCE((
                  SELECT conn.connection_type
                  FROM cable_connections conn
                  WHERE conn.approval_group_id = ca.approval_group_id
                  ORDER BY conn.connection_id DESC LIMIT 1
                ), approval_group.group_type)
              END AS connection_type,
              COALESCE(
                NULLIF(TRIM(CONCAT_WS(' ', effective_installed.first_name, effective_installed.last_name)), ''),
                effective_installed.employee_code
              ) AS installed_by_name,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', receiver.first_name, receiver.last_name)), ''), received_user.username) AS received_by_name,
              COALESCE(payment_totals.cash_amount, 0) AS cash_received,
              COALESCE(payment_totals.online_amount, 0) AS online_received
       FROM cable_customer_accounts ca
       INNER JOIN cable_tv_customers c ON c.cable_customer_id = ca.cable_customer_id
       LEFT JOIN cable_approval_groups approval_group ON approval_group.approval_group_id = ca.approval_group_id
       LEFT JOIN cable_network_master n ON n.network_id = c.network_id
       LEFT JOIN cable_locations l ON l.location_id = c.location_id
       LEFT JOIN cable_areas a ON a.area_id = c.area_id
       LEFT JOIN cable_streets s ON s.street_id = c.street_id
       LEFT JOIN employees effective_installed ON effective_installed.employee_id = ${effectiveInstalledBySql}
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
    await ensureMaterialSalesTables(db);
    const materialFilters = ["m.movement_type = 'SALE'"];
    const materialValues = [];
    const materialPaymentStatus = status === 'RECEIVED' ? 'PAID' : status;
    if (['PENDING', 'PARTIAL', 'PAID'].includes(materialPaymentStatus)) {
      materialFilters.push('m.payment_status = ?');
      materialValues.push(materialPaymentStatus);
    }
    if (name) {
      const search = `%${name}%`;
      materialFilters.push(`(m.movement_no LIKE ? OR CAST(catv.customer_code AS CHAR) LIKE ?
        OR CAST(service.customer_id AS CHAR) LIKE ? OR catv.legacy_customer_no LIKE ?
        OR catv.full_name LIKE ? OR service.customer_name LIKE ? OR m.anonymous_name LIKE ?
        OR catv.mobile_no LIKE ? OR service.phone LIKE ? OR m.anonymous_mobile LIKE ?)`);
      materialValues.push(search, search, search, search, search, search, search, search, search, search);
    }
    if (installedByEmployeeId) {
      materialFilters.push('m.employee_id = ?');
      materialValues.push(installedByEmployeeId);
    } else if (!isAdmin(req)) {
      materialFilters.push('1 = 0');
    }
    if (startDate) { materialFilters.push('DATE(m.movement_date) >= ?'); materialValues.push(startDate); }
    if (endDate) { materialFilters.push('DATE(m.movement_date) <= ?'); materialValues.push(endDate); }
    const [materialRows] = await db.query(
      `SELECT -m.material_movement_id AS account_id, NULL AS approval_group_id, m.cable_customer_id,
              COALESCE(CAST(catv.customer_code AS CHAR), CAST(service.customer_id AS CHAR), m.movement_no) AS customer_code,
              catv.legacy_customer_no AS legacy_customer_no,
              COALESCE(catv.full_name, service.customer_name, m.anonymous_name, 'Anonymous Customer') AS full_name,
              COALESCE(catv.mobile_no, service.phone, m.anonymous_mobile) AS mobile_no,
              m.customer_type AS network_name, NULL AS location_name, NULL AS area_name, NULL AS street_name,
              DATE(m.movement_date) AS install_update_date, DATE(m.movement_date) AS account_date,
              'MATERIAL SALE' AS connection_type,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', e.first_name, e.last_name)), ''), e.employee_code) AS installed_by_name,
              NULL AS received_by_name, 0 AS stb_amount, 0 AS stb_discount, 0 AS connection_amount, 0 AS labor_amount,
              m.total_amount AS material_cost, 0 AS material_discount, 0 AS subscription_amount,
              m.total_amount AS sub_total, 0 AS discount, 0 AS overall_discount,
              m.total_amount AS grand_total, 0 AS customer_paid_amount,
              m.paid_amount AS office_received_amount, m.balance_amount AS office_balance_amount,
              m.balance_amount, m.payment_status AS account_status,
              COALESCE(payments.cash_amount, 0) AS cash_received,
              COALESCE(payments.online_amount, 0) AS online_received,
              m.movement_date AS created_at,
              CONCAT(p.product_name, ' x ', m.qty, ' ', p.unit) AS material_sale_detail
       FROM technician_material_movements m
       JOIN products p ON p.product_id = m.product_id
       JOIN employees e ON e.employee_id = m.employee_id
       LEFT JOIN cable_tv_customers catv ON catv.cable_customer_id = m.cable_customer_id
       LEFT JOIN customers service ON service.customer_id = m.service_customer_id
       LEFT JOIN (
         SELECT material_movement_id, SUM(cash_amount) AS cash_amount, SUM(online_amount) AS online_amount
         FROM technician_material_sale_payments GROUP BY material_movement_id
       ) payments ON payments.material_movement_id = m.material_movement_id
       WHERE ${materialFilters.join(' AND ')}`,
      materialValues
    );
    const internetFilters = ["COALESCE(ia.account_source,'LEGACY') NOT IN ('SUBSCRIPTION','PACKAGE')"];
    const internetValues = [];
    if(installedByEmployeeId){internetFilters.push('ic.installed_by_employee_id=?');internetValues.push(installedByEmployeeId);}
    else if(!isAdmin(req))internetFilters.push('1=0');
    const internetOutstandingSql = 'GREATEST(ia.grand_total-COALESCE(ia.office_received_amount,0),0)';
    const internetReceivedSql = 'COALESCE(ia.office_received_amount,0)';
    if(status==='PENDING')internetFilters.push(`${internetOutstandingSql}>0 AND ${internetReceivedSql}<=0`);
    else if(status==='PARTIAL')internetFilters.push(`${internetOutstandingSql}>0 AND ${internetReceivedSql}>0`);
    else if(['PAID','RECEIVED'].includes(status))internetFilters.push(`${internetOutstandingSql}<=0`);
    if(name){const search=`%${name}%`;internetFilters.push('(ic.full_name LIKE ? OR CAST(ic.customer_code AS CHAR) LIKE ? OR ic.legacy_customer_no LIKE ? OR ic.mobile_no LIKE ?)');internetValues.push(search,search,search,search);}
    if(startDate){internetFilters.push('COALESCE(ic.installed_date, DATE(ia.created_at))>=?');internetValues.push(startDate);}
    if(endDate){internetFilters.push('COALESCE(ic.installed_date, DATE(ia.created_at))<=?');internetValues.push(endDate);}
    const [internetSourceRows] = await db.query(
      `SELECT -(1000000000 + ia.internet_account_id) AS account_id, NULL approval_group_id,
              ic.internet_customer_id AS cable_customer_id, ic.customer_code, ic.legacy_customer_no, ic.full_name, ic.mobile_no,
              ic.network_type AS network_name, NULL location_name, NULL area_name, NULL street_name,
              COALESCE(ic.installed_date, DATE(ia.created_at)) install_update_date,
              COALESCE(ic.installed_date, DATE(ia.created_at)) account_date, 'INTERNET' connection_type,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', e.first_name, e.last_name)), ''), e.employee_code) installed_by_name,
              NULL received_by_name, ia.router_amount AS stb_amount, ia.router_discount AS stb_discount,
              ia.connection_amount, ia.labor_amount, ia.material_cost, ia.material_discount,
              ia.subscription_amount, ia.grand_total AS sub_total, 0 discount, ia.overall_discount,
              ia.grand_total, ia.customer_paid_amount, ia.office_received_amount, ia.office_balance_amount,
              GREATEST(ia.grand_total-ia.office_received_amount,0) balance_amount, ia.account_status,
              COALESCE(pay.cash_received,0) cash_received, COALESCE(pay.online_received,0) online_received,
              ia.created_at, NULL material_sale_detail, ia.due_date
       FROM internet_customer_accounts ia
       JOIN internet_customers ic ON ic.internet_customer_id=ia.internet_customer_id
       LEFT JOIN employees e ON e.employee_id=ic.installed_by_employee_id
       LEFT JOIN (SELECT internet_account_id,SUM(cash_amount) cash_received,SUM(online_amount) online_received
                  FROM internet_customer_account_payments GROUP BY internet_account_id) pay ON pay.internet_account_id=ia.internet_account_id
       WHERE ${internetFilters.join(' AND ')}`,
      internetValues
    );
    const internetRows = internetSourceRows.map(item => {
      for (const key of ['stb_amount','stb_discount','connection_amount','labor_amount','material_cost','material_discount','subscription_amount','sub_total','overall_discount','grand_total','customer_paid_amount','office_received_amount','office_balance_amount','balance_amount','cash_received','online_received']) {
        item[key] = Math.round(money(item[key]));
      }
      return item;
    });
    return res.json([...rows, ...materialRows, ...internetRows].sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    ));
  } catch (error) {
    return res.status(500).json({ message: 'Pending account list failed', error: error.message });
  }
};

const getLoAccounts = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || 'ALL').trim().toUpperCase();
    const pendingWorkflowSql = `EXISTS (
      SELECT 1 FROM cable_approval_groups pending_group
      WHERE pending_group.approval_status = 'PENDING' AND (
        pending_group.approval_group_id = c.approval_group_id
        OR EXISTS (SELECT 1 FROM cable_customer_stbs pending_stb WHERE pending_stb.cable_customer_id = c.cable_customer_id AND pending_stb.approval_group_id = pending_group.approval_group_id)
        OR EXISTS (SELECT 1 FROM cable_connections pending_connection WHERE pending_connection.cable_customer_id = c.cable_customer_id AND pending_connection.approval_group_id = pending_group.approval_group_id)
        OR EXISTS (SELECT 1 FROM cable_customer_packages pending_package WHERE pending_package.cable_customer_id = c.cable_customer_id AND pending_package.approval_group_id = pending_group.approval_group_id)
        OR EXISTS (SELECT 1 FROM cable_subscriptions pending_subscription WHERE pending_subscription.cable_customer_id = c.cable_customer_id AND pending_subscription.approval_group_id = pending_group.approval_group_id)
        OR EXISTS (SELECT 1 FROM cable_customer_accounts pending_account WHERE pending_account.cable_customer_id = c.cable_customer_id AND pending_account.approval_group_id = pending_group.approval_group_id)
      )
    )`;
    const filters = ["UPPER(COALESCE(c.network_type, '')) = 'LO'", "UPPER(COALESCE(c.customer_type, '')) = 'LEASE_LINE'"];
    const values = [];
    if (search) {
      filters.push('(c.full_name LIKE ? OR c.customer_code LIKE ? OR stb.stb_no LIKE ?)');
      const term = `%${search}%`;
      values.push(term, term, term);
    }
    if (status === 'ACTIVE') {
      filters.push("UPPER(COALESCE(c.status, '')) IN ('ACTIVE', 'LEASE_LINE')");
      filters.push(`NOT ${pendingWorkflowSql}`);
    } else if (status === 'WAITING_APPROVAL') {
      filters.push(pendingWorkflowSql);
    } else if (status !== 'ALL') {
      filters.push('UPPER(c.status) = ?');
      values.push(status);
    }
    const [rows] = await db.query(
      `SELECT c.cable_customer_id, c.customer_code, c.full_name, stb.stb_no,
              CASE WHEN ${pendingWorkflowSql} THEN 'WAITING_APPROVAL' ELSE c.status END AS status,
              c.topup_base_amount, c.topup_gst_percent, c.recharge_amount,
              COALESCE(NULLIF(cp.package_price, 0), pkg.price, 0) AS package_amount,
              CASE WHEN UPPER(COALESCE(c.status, '')) IN ('ACTIVE', 'LEASE_LINE')
                THEN COALESCE(c.recharge_amount, 0) ELSE 0 END AS pending_amount,
              n.network_name, l.location_name, a.area_name, s.street_name
       FROM cable_tv_customers c
       LEFT JOIN cable_network_master n ON n.network_id = c.network_id
       LEFT JOIN cable_locations l ON l.location_id = c.location_id
       LEFT JOIN cable_areas a ON a.area_id = c.area_id
       LEFT JOIN cable_streets s ON s.street_id = c.street_id
       LEFT JOIN cable_customer_stbs stb ON stb.customer_stb_id = (
         SELECT MAX(stb2.customer_stb_id) FROM cable_customer_stbs stb2 WHERE stb2.cable_customer_id = c.cable_customer_id
       )
       LEFT JOIN cable_customer_packages cp ON cp.customer_package_id = (
         SELECT MAX(cp2.customer_package_id) FROM cable_customer_packages cp2
         WHERE cp2.cable_customer_id = c.cable_customer_id AND cp2.is_active = 1 AND cp2.approval_status = 'APPROVED'
       )
       LEFT JOIN cable_package_master pkg ON pkg.package_id = cp.package_id
       WHERE ${filters.join(' AND ')}
       ORDER BY CASE WHEN UPPER(COALESCE(c.status, '')) IN ('ACTIVE', 'LEASE_LINE') THEN 0 ELSE 1 END,
                CAST(c.customer_code AS UNSIGNED), c.full_name`,
      values
    );
    return res.json({
      rows,
      total_records: rows.length,
      active_records: rows.filter(row => ['ACTIVE', 'LEASE_LINE'].includes(String(row.status).toUpperCase())).length,
      total_pending_amount: money(rows.reduce((sum, row) => sum + money(row.pending_amount), 0).toFixed(2))
    });
  } catch (error) {
    return res.status(500).json({ message: 'LO account list failed', error: error.message });
  }
};

const getPendingSubscriptions = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const customerNo = String(req.query.customer_no || '').trim();
    const oldCustomerNo = String(req.query.old_customer_no || '').trim();
    const customerName = String(req.query.customer_name || '').trim();
    const areaId = intOrNull(req.query.area_id);
    const streetId = intOrNull(req.query.street_id);
    const filters = [
      "sub.approval_status IN ('PENDING','APPROVED')",
      "sub.payment_status IN ('PENDING','PARTIAL')",
      "COALESCE(approval_group.group_type, '') <> 'NEW_CUSTOMER_ONBOARDING'",
      'GREATEST(COALESCE(sub.balance_amount, sub.amount - sub.paid_amount), 0) > 0'
    ];
    const values = [];
    if (customerNo) {
      filters.push('CAST(c.customer_code AS CHAR) LIKE ?');
      values.push(`%${customerNo}%`);
    }
    if (oldCustomerNo) {
      filters.push("COALESCE(c.legacy_customer_no, '') LIKE ?");
      values.push(`%${oldCustomerNo}%`);
    }
    if (customerName) {
      filters.push('c.full_name LIKE ?');
      values.push(`%${customerName}%`);
    }
    if (areaId) {
      filters.push('c.area_id = ?');
      values.push(areaId);
    }
    if (streetId) {
      filters.push('c.street_id = ?');
      values.push(streetId);
    }

    const [rows] = await db.query(
      `SELECT sub.subscription_id, sub.cable_customer_id, sub.subscription_month, sub.subscription_year,
              sub.days_in_month, sub.billing_basis, sub.number_of_days_or_months, sub.amount,
              sub.paid_amount, sub.balance_amount, sub.start_date, sub.expiry_date,
              sub.collect_date, sub.payment_mode, sub.payment_status, sub.remarks,
              c.customer_code, c.legacy_customer_no, c.full_name, c.door_no, c.city, c.pincode, c.status AS customer_status,
              c.area_id, c.street_id, a.area_name, s.street_name,
              cp.package_price, pkg.package_name,
              (SELECT COALESCE(SUM(COALESCE(NULLIF(active_cp.package_price, 0), active_pkg.price, 0)), 0)
               FROM cable_customer_packages active_cp
               LEFT JOIN cable_package_master active_pkg ON active_pkg.package_id = active_cp.package_id
               WHERE active_cp.cable_customer_id = c.cable_customer_id
                 AND active_cp.is_active = 1 AND active_cp.approval_status = 'APPROVED') AS current_package_amount,
              COALESCE(NULLIF(latest_stb.stb_no, ''), sm.stb_number) AS stb_no,
              latest_stb.installed_date,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', collector.first_name, collector.last_name)), ''), collector.employee_code) AS collected_by_name
       FROM cable_subscriptions sub
       JOIN cable_tv_customers c ON c.cable_customer_id = sub.cable_customer_id
       LEFT JOIN cable_approval_groups approval_group ON approval_group.approval_group_id = sub.approval_group_id
       LEFT JOIN cable_areas a ON a.area_id = c.area_id
       LEFT JOIN cable_streets s ON s.street_id = c.street_id
       LEFT JOIN cable_customer_packages cp ON cp.customer_package_id = sub.customer_package_id
       LEFT JOIN cable_package_master pkg ON pkg.package_id = cp.package_id
       LEFT JOIN cable_customer_stbs latest_stb ON latest_stb.customer_stb_id = (
         SELECT stb.customer_stb_id FROM cable_customer_stbs stb
         WHERE stb.cable_customer_id = c.cable_customer_id AND stb.approval_status = 'APPROVED'
         ORDER BY stb.customer_stb_id DESC LIMIT 1
       )
       LEFT JOIN cable_stb_master sm ON sm.stb_master_id = latest_stb.stb_master_id
       LEFT JOIN employees collector ON collector.employee_id = sub.collected_by_employee_id
       WHERE ${filters.join(' AND ')}
       ORDER BY c.customer_code, sub.subscription_year, sub.subscription_month`,
      values
    );

    const customers = [];
    const byCustomer = new Map();
    for (const row of rows) {
      const customerId = Number(row.cable_customer_id);
      let customer = byCustomer.get(customerId);
      if (!customer) {
        customer = {
          cable_customer_id: customerId,
          customer_code: row.customer_code,
          legacy_customer_no: row.legacy_customer_no,
          full_name: row.full_name,
          stb_no: row.stb_no,
          door_no: row.door_no,
          area_id: row.area_id,
          area_name: row.area_name,
          street_id: row.street_id,
          street_name: row.street_name,
          city: row.city,
          pincode: row.pincode,
          customer_status: row.customer_status,
          installed_date: row.installed_date,
          package_amount: row.current_package_amount || row.package_price || row.amount,
          pending_months: []
        };
        byCustomer.set(customerId, customer);
        customers.push(customer);
      }
      customer.pending_months.push({
        subscription_id: row.subscription_id,
        subscription_month: row.subscription_month,
        subscription_year: row.subscription_year,
        days_in_month: row.days_in_month,
        billing_basis: row.billing_basis,
        number_of_days_or_months: row.number_of_days_or_months,
        amount: row.amount,
        paid_amount: row.paid_amount,
        balance_amount: row.balance_amount,
        start_date: row.start_date,
        expiry_date: row.expiry_date,
        collect_date: row.collect_date,
        payment_mode: row.payment_mode,
        payment_status: row.payment_status,
        remarks: row.remarks,
        package_name: row.package_name,
        collected_by_name: row.collected_by_name
      });
    }
    return res.json({ total_customers: customers.length, customers });
  } catch (error) {
    return res.status(500).json({ message: 'Pending subscription customers failed', error: error.message });
  }
};

const subscriptionGenerationPeriod = (monthValue, yearValue) => {
  const month = Number(monthValue);
  const year = Number(yearValue);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2200) {
    return null;
  }
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = dateOnly(new Date(year, month, 0));
  return { month, year, startDate, endDate, days: new Date(year, month, 0).getDate() };
};

const subscriptionGenerationRows = async (db, period, customerIds = []) => {
  const filters = [
    "c.approval_status = 'APPROVED'",
    "UPPER(COALESCE(c.status, '')) = 'ACTIVE'",
    "UPPER(COALESCE(c.customer_type,'REGULAR')) NOT IN ('FREE','LEASE_LINE')",
    `NOT EXISTS (
      SELECT 1 FROM cable_subscriptions existing
      WHERE existing.cable_customer_id = c.cable_customer_id
        AND existing.subscription_month = ? AND existing.subscription_year = ?
        AND existing.approval_status <> 'REJECTED'
    )`,
    '(last_sub.expiry_date IS NULL OR last_sub.expiry_date < ?)'
  ];
  const values = [period.month, period.year, period.startDate];
  if (customerIds.length) {
    filters.push(`c.cable_customer_id IN (${customerIds.map(() => '?').join(', ')})`);
    values.push(...customerIds);
  }
  const [rows] = await db.query(
    `SELECT c.cable_customer_id, c.customer_code, c.full_name, c.customer_type,
            c.status AS customer_status, c.door_no, c.city, c.pincode,
            a.area_name, s.street_name,
            cp.customer_package_id, cp.package_id, cp.package_price,
            pkg.package_name,
            last_sub.subscription_id AS last_subscription_id,
            last_sub.subscription_month AS last_subscription_month,
            last_sub.subscription_year AS last_subscription_year,
            last_sub.expiry_date AS previous_end_date,
            ? AS start_date, ? AS expiry_date, ? AS days_in_month,
            ROUND(COALESCE(cp.package_price, pkg.price, 0), 2) AS amount
     FROM cable_tv_customers c
     INNER JOIN cable_customer_packages cp ON cp.customer_package_id = (
       SELECT cp2.customer_package_id
       FROM cable_customer_packages cp2
       WHERE cp2.cable_customer_id = c.cable_customer_id
         AND cp2.is_active = 1 AND cp2.approval_status = 'APPROVED'
       ORDER BY cp2.customer_package_id DESC LIMIT 1
     )
     LEFT JOIN cable_package_master pkg ON pkg.package_id = cp.package_id
     LEFT JOIN cable_areas a ON a.area_id = c.area_id
     LEFT JOIN cable_streets s ON s.street_id = c.street_id
     LEFT JOIN cable_subscriptions last_sub ON last_sub.subscription_id = (
       SELECT sub2.subscription_id
       FROM cable_subscriptions sub2
       WHERE sub2.cable_customer_id = c.cable_customer_id
         AND sub2.approval_status = 'APPROVED'
       ORDER BY sub2.subscription_year DESC, sub2.subscription_month DESC, sub2.subscription_id DESC
       LIMIT 1
     )
     WHERE ${filters.join(' AND ')}
     ORDER BY c.customer_code`,
    [period.startDate, period.endDate, period.days, ...values]
  );
  return rows;
};

const previewSubscriptionGeneration = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const period = subscriptionGenerationPeriod(req.query.subscription_month, req.query.subscription_year);
    if (!period) return res.status(400).json({ message: 'Valid subscription month and year are required' });
    const rows = await subscriptionGenerationRows(db, period);
    return res.json({ period, total_customers: rows.length, total_amount: rows.reduce((sum, row) => sum + money(row.amount), 0), rows });
  } catch (error) {
    return res.status(500).json({ message: 'Subscription generation preview failed', error: error.message });
  }
};

const generateMonthlySubscriptions = async (req, res) => {
  const db = connection.promise();
  try {
    await ensureCableTvExtendedTables(db);
    const period = subscriptionGenerationPeriod(req.body.subscription_month, req.body.subscription_year);
    if (!period) return res.status(400).json({ message: 'Valid subscription month and year are required' });
    const customerIds = [...new Set((req.body.customer_ids || []).map(intOrNull).filter(Boolean))];
    if (!customerIds.length) return res.status(400).json({ message: 'Select at least one active customer' });

    await db.beginTransaction();
    const rows = await subscriptionGenerationRows(db, period, customerIds);
    if (!rows.length) {
      await db.rollback();
      return res.status(409).json({ message: 'Selected customers already have this subscription or are no longer eligible' });
    }
    const optionalColumns = await existingColumns(db, 'cable_subscriptions', ['received_count']);
    const createdBy = currentUserId(req);
    for (const row of rows) {
      const columns = [
        'cable_customer_id', 'customer_package_id', 'subscription_month', 'subscription_year',
        'days_in_month', 'billing_basis', 'number_of_days_or_months'
      ];
      const values = [
        row.cable_customer_id, row.customer_package_id, period.month, period.year,
        period.days, 'MONTH', 1
      ];
      if (optionalColumns.has('received_count')) {
        columns.push('received_count');
        values.push(1);
      }
      columns.push(
        'amount', 'paid_amount', 'balance_amount', 'collect_date', 'start_date', 'expiry_date',
        'collected_by_employee_id', 'payment_mode', 'payment_status', 'approval_status', 'remarks', 'created_by_user_id'
      );
      values.push(
        money(row.amount), 0, money(row.amount), null, period.startDate, period.endDate,
        null, 'CASH', 'PENDING', 'APPROVED',
        `Monthly subscription generated for ${period.startDate.slice(0, 7)}`, createdBy
      );
      await db.query(
        `INSERT INTO cable_subscriptions (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
        values
      );
    }
    await db.commit();
    return res.status(201).json({
      message: `${rows.length} unpaid subscription${rows.length === 1 ? '' : 's'} generated successfully`,
      generated_count: rows.length,
      skipped_count: customerIds.length - rows.length,
      period
    });
  } catch (error) {
    try { await db.rollback(); } catch (_rollbackError) {}
    return res.status(500).json({ message: 'Monthly subscription generation failed', error: error.message });
  }
};

const getCableSubscriptionReport = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const today = dateOnly(new Date());
    const startDate = textOrNull(req.query.start_date) || `${today.slice(0, 8)}01`;
    const endDate = textOrNull(req.query.end_date) || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ message: 'Valid From Date and To Date are required' });
    }
    if (new Date(`${endDate}T00:00:00`) < new Date(`${startDate}T00:00:00`)) {
      return res.status(400).json({ message: 'To Date cannot be before From Date' });
    }

    const filters = [
      "sub.approval_status IN ('PENDING','APPROVED')",
      'DATE(COALESCE(sub.collect_date, sub.created_at)) BETWEEN ? AND ?',
      "(COALESCE(sub.paid_amount, 0) > 0 OR UPPER(COALESCE(sub.payment_status, '')) = 'PAID')"
    ];
    const values = [startDate, endDate];
    const networkId = intOrNull(req.query.network_id);
    if (networkId) {
      filters.push('c.network_id = ?');
      values.push(networkId);
    }
    const customerType = String(req.query.customer_type || '').trim().toUpperCase();
    if (customerType && !['REGULAR', 'BUSINESS'].includes(customerType)) {
      return res.status(400).json({ message: 'Valid customer type is required' });
    }
    if (customerType) {
      filters.push("UPPER(COALESCE(c.customer_type, 'REGULAR')) = ?");
      values.push(customerType);
    }
    const paymentType = String(req.query.payment_type || '').trim().toUpperCase();
    if (paymentType && !['CASH', 'ONLINE', 'OFFICE'].includes(paymentType)) {
      return res.status(400).json({ message: 'Valid payment type is required' });
    }
    if (paymentType) {
      filters.push("UPPER(COALESCE(sub.payment_mode, 'CASH')) = ?");
      values.push(paymentType);
    }

    let collectedByEmployeeId;
    if (isAdmin(req)) {
      collectedByEmployeeId = intOrNull(req.query.collected_by_employee_id);
    } else {
      collectedByEmployeeId = await resolveEmployeeId(db, req, null);
      if (!collectedByEmployeeId) {
        return res.status(403).json({ message: 'Logged-in user is not mapped to an employee' });
      }
    }
    if (collectedByEmployeeId) {
      filters.push(`(sub.collected_by_employee_id = ? OR (
        UPPER(COALESCE(sub.payment_mode, 'CASH')) IN ('ONLINE', 'OFFICE')
        AND sub.payment_mapped_employee_id = ?
      ))`);
      values.push(collectedByEmployeeId, collectedByEmployeeId);
    }

    const [rows] = await db.query(
      `SELECT sub.subscription_id, DATE(COALESCE(sub.collect_date, sub.created_at)) AS collect_date,
              sub.subscription_month, sub.subscription_year,
              sub.start_date, sub.expiry_date, sub.days_in_month, sub.billing_basis,
              sub.number_of_days_or_months, sub.payment_mode, sub.payment_status,
              COALESCE(NULLIF(sub.received_count, 0), 1) AS received_count,
               ROUND(CASE WHEN UPPER(COALESCE(sub.payment_status, '')) = 'PAID' AND COALESCE(sub.paid_amount, 0) <= 0
                 THEN sub.amount ELSE COALESCE(sub.paid_amount, 0) END) AS paid_amount,
               ROUND(CASE WHEN UPPER(COALESCE(sub.payment_status, '')) = 'PAID'
                 THEN 0 ELSE COALESCE(sub.balance_amount, 0) END) AS balance_amount,
               c.customer_code, c.legacy_customer_no, c.full_name, c.network_id, COALESCE(c.customer_type, 'REGULAR') AS customer_type,
               n.network_code, n.network_name,
               sub.collected_by_employee_id,
               sub.payment_mapped_employee_id,
               COALESCE(NULLIF(TRIM(CONCAT_WS(' ', collector.first_name, collector.last_name)), ''), collector.employee_code, '-') AS collected_by_name,
               CASE WHEN UPPER(COALESCE(sub.payment_mode, 'CASH')) IN ('ONLINE', 'OFFICE')
                 THEN COALESCE(NULLIF(TRIM(CONCAT_WS(' ', mapped.first_name, mapped.last_name)), ''), mapped.employee_code, '-')
                 ELSE '-' END AS mapped_employee_name,
              CASE
                WHEN sub.start_date IS NOT NULL AND sub.expiry_date IS NOT NULL
                  THEN DATEDIFF(sub.expiry_date, sub.start_date) + 1
                ELSE COALESCE(sub.days_in_month, sub.number_of_days_or_months, 0)
              END AS number_of_days
       FROM cable_subscriptions sub
       INNER JOIN cable_tv_customers c ON c.cable_customer_id = sub.cable_customer_id
       LEFT JOIN cable_network_master n ON n.network_id = c.network_id
       LEFT JOIN employees collector ON collector.employee_id = sub.collected_by_employee_id
       LEFT JOIN employees mapped ON mapped.employee_id = sub.payment_mapped_employee_id
       WHERE ${filters.join(' AND ')}
       ORDER BY sub.collect_date, c.customer_code, sub.subscription_year, sub.subscription_month, sub.subscription_id`,
      values
    );
    const totalAmount = rows.reduce((sum, row) => sum + Math.round(money(row.paid_amount)), 0);
    const totalBalance = rows.reduce((sum, row) => sum + Math.round(money(row.balance_amount)), 0);
    const totalCount = Number(rows.reduce((sum, row) => sum + money(row.received_count), 0).toFixed(2));
    return res.json({
      filters: {
        start_date: startDate,
        end_date: endDate,
        network_id: networkId,
         customer_type: customerType || null,
         payment_type: paymentType || null,
        collected_by_employee_id: collectedByEmployeeId || null
      },
      total_records: rows.length,
      total_amount: totalAmount,
      total_balance: totalBalance,
      total_count: totalCount,
      rows
    });
  } catch (error) {
    return res.status(500).json({ message: 'CATV subscription report failed', error: error.message });
  }
};

const getStbPaymentReport = async (req,res) => {
  try {
    const db=connection.promise();await ensureCableTvExtendedTables(db);
    const networkId=intOrNull(req.query.network_id),collectorId=intOrNull(req.query.collected_by_employee_id);
    const startDate=String(req.query.start_date||''),endDate=String(req.query.end_date||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||!/^\d{4}-\d{2}-\d{2}$/.test(endDate))return res.status(400).json({message:'Collection Start Date and Collection End Date are required'});
    if(endDate<startDate)return res.status(400).json({message:'End Date cannot be before Start Date'});
    const paymentFilters=['sp.collected_date BETWEEN ? AND ?','COALESCE(sp.received_amount,0)>0'];
    const subscriptionFilters=[
      'DATE(COALESCE(sub.collect_date, sub.created_at)) BETWEEN ? AND ?',
      "(COALESCE(sub.paid_amount,0)>0 OR UPPER(COALESCE(sub.payment_status,''))='PAID')"
    ];
    const paymentValues=[startDate,endDate],subscriptionValues=[startDate,endDate];
    if(networkId){paymentFilters.push('c.network_id=?');paymentValues.push(networkId);subscriptionFilters.push('c.network_id=?');subscriptionValues.push(networkId);}
    if(collectorId){
      paymentFilters.push(`(sp.received_by_employee_id=? OR (
        UPPER(COALESCE(sub.payment_mode,'CASH')) IN ('ONLINE','OFFICE')
        AND sub.payment_mapped_employee_id=?
      ))`);
      paymentValues.push(collectorId,collectorId);
      subscriptionFilters.push(`(sub.collected_by_employee_id=? OR (
        UPPER(COALESCE(sub.payment_mode,'CASH')) IN ('ONLINE','OFFICE')
        AND sub.payment_mapped_employee_id=?
      ))`);
      subscriptionValues.push(collectorId,collectorId);
    }
    const [rows]=await db.query(`SELECT report.* FROM (SELECT CONCAT('SUBSCRIPTION-PAYMENT-',sp.subscription_payment_id) payment_id,sp.collected_date collect_date,c.customer_code,c.full_name,
      CONCAT(MONTHNAME(STR_TO_DATE(CONCAT(sub.subscription_year,'-',sub.subscription_month,'-01'),'%Y-%c-%d')),' ',sub.subscription_year) payment_month,
      CASE UPPER(COALESCE(sp.payment_mode,'CASH')) WHEN 'ONLINE' THEN 'Online' WHEN 'OFFICE' THEN 'Office' ELSE 'Cash' END payment_mode,
      COALESCE(NULLIF(TRIM(CONCAT_WS(' ',e.first_name,e.last_name)),''),'-') received_by_name,stb.stb_no,
      COALESCE(NULLIF(cp.package_price,0),pkg.price,sub.amount,0) package_amount,sp.balance_after_payment balance_amount,sp.received_amount received_amount,n.network_code,n.network_name
      FROM cable_subscription_payments sp JOIN cable_subscriptions sub ON sub.subscription_id=sp.subscription_id
      JOIN cable_tv_customers c ON c.cable_customer_id=sp.cable_customer_id JOIN cable_network_master n ON n.network_id=c.network_id
      LEFT JOIN employees e ON e.employee_id=sp.received_by_employee_id
      LEFT JOIN cable_customer_stbs stb ON stb.customer_stb_id=(SELECT MAX(s2.customer_stb_id) FROM cable_customer_stbs s2 WHERE s2.cable_customer_id=c.cable_customer_id)
      LEFT JOIN cable_customer_packages cp ON cp.customer_package_id=sub.customer_package_id LEFT JOIN cable_package_master pkg ON pkg.package_id=cp.package_id
      WHERE ${paymentFilters.join(' AND ')}
      UNION ALL
      SELECT CONCAT('SUBSCRIPTION-',sub.subscription_id),DATE(COALESCE(sub.collect_date,sub.created_at)),c.customer_code,c.full_name,
      CONCAT(MONTHNAME(STR_TO_DATE(CONCAT(sub.subscription_year,'-',sub.subscription_month,'-01'),'%Y-%c-%d')),' ',sub.subscription_year),
      CASE UPPER(COALESCE(sub.payment_mode,'CASH')) WHEN 'ONLINE' THEN 'Online' WHEN 'OFFICE' THEN 'Office' ELSE 'Cash' END,
      COALESCE(NULLIF(TRIM(CONCAT_WS(' ',e.first_name,e.last_name)),''),'-'),stb.stb_no,
      COALESCE(NULLIF(cp.package_price,0),pkg.price,sub.amount,0),
      CASE WHEN UPPER(COALESCE(sub.payment_status,''))='PAID' THEN 0 ELSE COALESCE(sub.balance_amount,0) END,
      CASE WHEN UPPER(COALESCE(sub.payment_status,''))='PAID' AND COALESCE(sub.paid_amount,0)<=0 THEN sub.amount ELSE sub.paid_amount END,
      n.network_code,n.network_name
      FROM cable_subscriptions sub JOIN cable_tv_customers c ON c.cable_customer_id=sub.cable_customer_id
      JOIN cable_network_master n ON n.network_id=c.network_id LEFT JOIN employees e ON e.employee_id=sub.collected_by_employee_id
      LEFT JOIN cable_customer_stbs stb ON stb.customer_stb_id=(SELECT MAX(s2.customer_stb_id) FROM cable_customer_stbs s2 WHERE s2.cable_customer_id=c.cable_customer_id)
      LEFT JOIN cable_customer_packages cp ON cp.customer_package_id=sub.customer_package_id LEFT JOIN cable_package_master pkg ON pkg.package_id=cp.package_id
      WHERE ${subscriptionFilters.join(' AND ')}
      AND NOT EXISTS (SELECT 1 FROM cable_subscription_payments sp WHERE sp.subscription_id=sub.subscription_id)
      ) report ORDER BY report.collect_date,report.payment_id`,[...paymentValues,...subscriptionValues]);
    return res.json({rows,total_records:rows.length,total_amount:rows.reduce((s,r)=>s+Number(r.received_amount||0),0),total_balance:rows.reduce((s,r)=>s+Number(r.balance_amount||0),0)});
  } catch(error){return res.status(500).json({message:'STB payment report failed',error:error.message});}
};

const receiveSubscriptionPayment = async (req, res) => {
  const db = connection.promise();
  try {
    await ensureCableTvExtendedTables(db);
    await db.beginTransaction();
    const subscriptionId = Number(req.params.subscriptionId);
    const [[subscription]] = await db.query(
      `SELECT sub.subscription_id, sub.cable_customer_id, sub.customer_package_id,
              sub.subscription_month, sub.subscription_year, sub.days_in_month,
              sub.billing_basis, sub.number_of_days_or_months, sub.start_date, sub.expiry_date,
              sub.amount, sub.paid_amount, sub.balance_amount, sub.payment_status, sub.approval_status,
              COALESCE(
                NULLIF((SELECT SUM(COALESCE(NULLIF(active_cp.package_price, 0), active_pkg.price, 0))
                        FROM cable_customer_packages active_cp
                        LEFT JOIN cable_package_master active_pkg ON active_pkg.package_id = active_cp.package_id
                        WHERE active_cp.cable_customer_id = sub.cable_customer_id
                          AND active_cp.is_active = 1 AND active_cp.approval_status = 'APPROVED'), 0),
                NULLIF(cp.package_price, 0), pkg.price, sub.amount
              ) AS monthly_package_amount
       FROM cable_subscriptions sub
       LEFT JOIN cable_customer_packages cp ON cp.customer_package_id = sub.customer_package_id
       LEFT JOIN cable_package_master pkg ON pkg.package_id = cp.package_id
       WHERE sub.subscription_id = ? FOR UPDATE`,
      [subscriptionId]
    );
    if (!subscription) {
      await db.rollback();
      return res.status(404).json({ message: 'Subscription month was not found' });
    }
    if (subscription.approval_status !== 'APPROVED') {
      await db.rollback();
      return res.status(409).json({ message: 'Subscription must be approved before receiving payment' });
    }
    const billingBasis = ['MONTH', 'YEAR', 'DAY'].includes(String(req.body.billing_basis || '').toUpperCase())
      ? String(req.body.billing_basis).toUpperCase()
      : String(subscription.billing_basis || 'MONTH').toUpperCase();
    const subscriptionMonth = Number(req.body.subscription_month || subscription.subscription_month);
    const subscriptionYear = Number(req.body.subscription_year || subscription.subscription_year);
    if (!Number.isInteger(subscriptionMonth) || subscriptionMonth < 1 || subscriptionMonth > 12 ||
        !Number.isInteger(subscriptionYear) || subscriptionYear < 2000 || subscriptionYear > 2100) {
      await db.rollback();
      return res.status(400).json({ message: 'Valid subscription month and year are required' });
    }
    const [[duplicateSubscription]] = await db.query(
      `SELECT subscription_id FROM cable_subscriptions
       WHERE cable_customer_id = ? AND subscription_month = ? AND subscription_year = ?
         AND subscription_id <> ? LIMIT 1`,
      [subscription.cable_customer_id, subscriptionMonth, subscriptionYear, subscriptionId]
    );
    if (duplicateSubscription) {
      await db.rollback();
      return res.status(409).json({ message: 'Subscription already exists for the selected month and year' });
    }
    let periodCount = Math.max(Math.round(money(req.body.number_of_days_or_months || subscription.number_of_days_or_months || 1)), 1);
    const monthStartDate = `${subscriptionYear}-${String(subscriptionMonth).padStart(2, '0')}-01`;
    const startDate = billingBasis === 'DAY'
      ? (textOrNull(req.body.start_date) || dateOnly(subscription.start_date || monthStartDate))
      : monthStartDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || Number.isNaN(new Date(`${startDate}T00:00:00`).getTime())) {
      await db.rollback();
      return res.status(400).json({ message: 'Valid start date is required' });
    }
    const start = new Date(`${startDate}T00:00:00`);
    const selectedMonthDays = daysInMonth(subscriptionMonth, subscriptionYear);
    let expiryDate;
    if (billingBasis === 'DAY') {
      expiryDate = textOrNull(req.body.expiry_date) || dateOnly(subscription.expiry_date || startDate);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate) || Number.isNaN(new Date(`${expiryDate}T00:00:00`).getTime())) {
        await db.rollback();
        return res.status(400).json({ message: 'Valid end date is required' });
      }
      const expiry = new Date(`${expiryDate}T00:00:00`);
      periodCount = Math.floor((expiry.getTime() - start.getTime()) / 86400000) + 1;
      if (periodCount < 1) {
        await db.rollback();
        return res.status(400).json({ message: 'End date cannot be before start date' });
      }
    } else {
      const expiry = new Date(start);
      expiry.setMonth(expiry.getMonth() + (billingBasis === 'YEAR' ? periodCount * 12 : periodCount));
      expiry.setDate(expiry.getDate() - 1);
      expiryDate = `${expiry.getFullYear()}-${String(expiry.getMonth() + 1).padStart(2, '0')}-${String(expiry.getDate()).padStart(2, '0')}`;
    }
    const monthlyAmount = Math.round(money(subscription.monthly_package_amount));
    const subscriptionAmount = billingBasis === 'YEAR'
      ? Math.round(monthlyAmount * periodCount * 12)
      : billingBasis === 'DAY'
        ? Math.round((monthlyAmount / selectedMonthDays) * periodCount)
        : Math.round(monthlyAmount * periodCount);
    const existingPaidAmount = Math.round(money(subscription.paid_amount));
    const currentBalance = Math.max(Math.round(subscriptionAmount - existingPaidAmount), 0);
    if (currentBalance <= 0 || subscription.payment_status === 'PAID') {
      await db.rollback();
      return res.status(409).json({ message: 'This subscription month is already paid' });
    }
    const receivedAmount = Math.round(money(req.body.received_amount));
    if (receivedAmount <= 0) {
      await db.rollback();
      return res.status(400).json({ message: 'Received amount must be greater than zero' });
    }
    if (receivedAmount > currentBalance) {
      await db.rollback();
      return res.status(400).json({ message: `Received amount cannot exceed the subscription balance ${currentBalance}` });
    }
    const collectedDate = isAdmin(req)
      ? (textOrNull(req.body.collected_date) || dateOnly(new Date()))
      : dateOnly(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(collectedDate)) {
      await db.rollback();
      return res.status(400).json({ message: 'Valid collected date is required' });
    }
    const receivedByEmployeeId = await resolveEmployeeId(
      db,
      req,
      req.body.received_by_employee_id || req.res?.locals?.employee_id
    );
    if (!receivedByEmployeeId) {
      await db.rollback();
      return res.status(400).json({ message: 'Receiver name is required' });
    }
    const requestedPaymentMode = String(req.body.payment_mode || 'CASH').toUpperCase();
    const paymentMode = isAdmin(req) && ['CASH', 'ONLINE', 'OFFICE'].includes(requestedPaymentMode)
      ? requestedPaymentMode
      : 'CASH';
    const newPaidAmount = Math.round(existingPaidAmount + receivedAmount);
    const newBalance = Math.max(Math.round(currentBalance - receivedAmount), 0);
    const paymentStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';
    const receivedCount = billingBasis === 'YEAR'
      ? periodCount * 12
      : billingBasis === 'DAY'
        ? Number((periodCount / selectedMonthDays).toFixed(2))
        : periodCount;
    const comments = textOrNull(req.body.comments || req.body.remarks);
    const paymentReference = textOrNull(req.body.payment_reference || req.body.paid_from_account);

    const optionalColumns = await existingColumns(db, 'cable_subscriptions', ['payment_reference', 'received_count']);
    await db.query(
      `INSERT INTO cable_subscription_payments (
        subscription_id, cable_customer_id, received_amount, collected_date, payment_mode,
        payment_reference, received_by_employee_id, comments, balance_after_payment,
        payment_status, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subscriptionId, subscription.cable_customer_id, receivedAmount, collectedDate, paymentMode,
        paymentReference, receivedByEmployeeId, comments, newBalance, paymentStatus, currentUserId(req)
      ]
    );
    const setClauses = [
      'subscription_month = ?', 'subscription_year = ?',
      'amount = ?', 'paid_amount = ?', 'balance_amount = ?', 'payment_status = ?', 'collect_date = ?',
      'start_date = ?', 'expiry_date = ?', 'days_in_month = ?', 'billing_basis = ?', 'number_of_days_or_months = ?',
      'collected_by_employee_id = ?', 'payment_mode = ?', 'remarks = ?', 'updated_at = NOW()'
    ];
    const values = [
      subscriptionMonth, subscriptionYear,
      subscriptionAmount, newPaidAmount, newBalance, paymentStatus, collectedDate,
      startDate, expiryDate, selectedMonthDays, billingBasis, periodCount,
      receivedByEmployeeId, paymentMode, comments
    ];
    if (optionalColumns.has('received_count')) {
      setClauses.splice(setClauses.length - 1, 0, 'received_count = ?');
      values.push(receivedCount);
    }
    if (optionalColumns.has('payment_reference')) {
      setClauses.splice(setClauses.length - 1, 0, 'payment_reference = ?');
      values.push(paymentReference);
    }
    values.push(subscriptionId);
    await db.query(`UPDATE cable_subscriptions SET ${setClauses.join(', ')} WHERE subscription_id = ?`, values);
    await db.commit();
    return res.json({
      message: paymentStatus === 'PAID' ? 'Subscription payment received in full' : 'Partial subscription payment received',
      payment_status: paymentStatus,
      paid_amount: newPaidAmount,
      balance_amount: newBalance
    });
  } catch (error) {
    await db.rollback();
    return res.status(500).json({ message: 'Subscription payment failed', error: error.message });
  }
};

const getAccountPayments = async (req, res) => {
  try {
    const accountId = Number(req.params.accountId);
    if (accountId <= -1000000000) {
      const internetAccountId=-accountId-1000000000,db=connection.promise();
      const [rows]=await db.query(`SELECT p.internet_payment_id payment_id,p.cash_amount,p.online_amount,p.received_amount,p.paid_date,p.received_date,p.due_date,p.balance_after_payment,p.payment_status,p.created_at,COALESCE(NULLIF(TRIM(CONCAT_WS(' ',e.first_name,e.last_name)),''),u.username) received_by_name FROM internet_customer_account_payments p LEFT JOIN users u ON u.user_id=p.received_by_user_id LEFT JOIN employees e ON e.employee_id=COALESCE(p.received_by_employee_id,u.employee_id) WHERE p.internet_account_id=? ORDER BY p.internet_payment_id DESC`,[internetAccountId]);
      return res.json(rows);
    }
    if (accountId < 0) return getMaterialSalePayments(req, res, accountId);
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
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
    if(accountId<=-1000000000){
      const internetAccountId=-accountId-1000000000;
      await db.beginTransaction();
      const [[account]]=await db.query('SELECT * FROM internet_customer_accounts WHERE internet_account_id=? FOR UPDATE',[internetAccountId]);
      if(!account){await db.rollback();return res.status(404).json({message:'Pending Internet account was not found'});}
      const current=Number(Math.max(money(account.grand_total)-money(account.office_received_amount),0).toFixed(2));
      if(!['PENDING','PARTIAL'].includes(account.account_status)&&current>0){await db.rollback();return res.status(409).json({message:'This account is already fully paid'});}
      const cash=money(req.body.cash_amount),online=money(req.body.online_amount),received=Number((cash+online).toFixed(2));
      const paidDate=textOrNull(req.body.paid_date)||dateOnly(new Date()),receivedDate=textOrNull(req.body.received_date)||dateOnly(new Date());
      if(cash<0||online<0||(current>0&&received<=0)){await db.rollback();return res.status(400).json({message:'Enter a cash or online received amount greater than zero unless Total Payment is zero'});}
      if(received>current){await db.rollback();return res.status(400).json({message:`Cash + Online cannot exceed Total Payment balance: ${current.toFixed(2)}`});}
      const receiver=intOrNull(req.body.received_by_employee_id||req.res?.locals?.employee_id);
      if(receiver){const [[employee]]=await db.query('SELECT employee_id FROM employees WHERE employee_id=? AND is_active=1 LIMIT 1',[receiver]);if(!employee){await db.rollback();return res.status(400).json({message:'Selected Received By employee is not active'});}}
      if(!/^\d{4}-\d{2}-\d{2}$/.test(paidDate)||!/^\d{4}-\d{2}-\d{2}$/.test(receivedDate)){await db.rollback();return res.status(400).json({message:'Valid paid date and received date are required'});}
      const newReceived=Number((money(account.office_received_amount)+received).toFixed(2)),balance=Number(Math.max(current-received,0).toFixed(2)),paymentStatus=balance<=0?'PAID':'PARTIAL',dueDate=paymentStatus==='PARTIAL'?textOrNull(req.body.due_date):null;
      if(paymentStatus==='PARTIAL'&&!dueDate){await db.rollback();return res.status(400).json({message:'Due date is required for a partial payment'});}
      await db.query(`INSERT INTO internet_customer_account_payments(internet_account_id,cash_amount,online_amount,received_amount,paid_date,received_date,due_date,balance_after_payment,payment_status,received_by_user_id,received_by_employee_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,[internetAccountId,cash,online,received,paidDate,receivedDate,dueDate,balance,paymentStatus,currentUserId(req),receiver]);
      await db.query('UPDATE internet_customer_accounts SET office_received_amount=?,office_balance_amount=?,balance_amount=?,due_date=?,account_status=?,updated_at=NOW() WHERE internet_account_id=?',[newReceived,balance,balance,dueDate,paymentStatus,internetAccountId]);
      if(paymentStatus==='PAID') await db.query("UPDATE internet_subscriptions SET paid_amount=amount,balance_amount=0,payment_status='PAID',collect_date=?,collected_by_employee_id=COALESCE(?,collected_by_employee_id) WHERE internet_customer_id=? AND payment_status<>'PAID'",[receivedDate,receiver,account.internet_customer_id]);
      await db.commit();return res.json({message:paymentStatus==='PAID'?'Payment received in full':'Partial payment recorded',payment_status:paymentStatus,received_amount:received,balance_amount:balance});
    }
    if (accountId < 0) return receiveMaterialSale(req, res, accountId);

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
    const calculatedBalance = Number(Math.max(
      money(account.grand_total) - money(account.office_received_amount),
      0
    ).toFixed(2));
    if (!['PENDING', 'PARTIAL'].includes(account.account_status) && calculatedBalance > 0) {
      await db.rollback();
      return res.status(409).json({ message: 'This account is already fully paid' });
    }

    const cashAmount = money(req.body.cash_amount);
    const onlineAmount = money(req.body.online_amount);
    const receivedAmount = Number((cashAmount + onlineAmount).toFixed(2));
    const currentBalance = calculatedBalance;
    const paidDate = textOrNull(req.body.paid_date) || dateOnly(new Date());
    const receivedDate = textOrNull(req.body.received_date) || dateOnly(new Date());
    if (cashAmount < 0 || onlineAmount < 0 || (currentBalance > 0 && receivedAmount <= 0)) {
      await db.rollback();
      return res.status(400).json({ message: 'Enter a cash or online received amount greater than zero unless Total Payment is zero' });
    }
    if (receivedAmount > currentBalance) {
      await db.rollback();
      return res.status(400).json({ message: `Cash + Online cannot exceed Total Payment balance: ${currentBalance.toFixed(2)}` });
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

    await db.query(
      `UPDATE cable_customer_accounts
       SET office_received_amount = ?,
           office_balance_amount = ?,
           balance_amount = ?,
           due_date = ?,
           account_status = ?,
           received_by_user_id = ?,
           received_by_employee_id = ?,
           received_at = TIMESTAMP(?, CURRENT_TIME()),
           updated_at = NOW()
       WHERE account_id = ?`,
      [
        newOfficeReceivedAmount, newBalance, newBalance, dueDate, paymentStatus,
        currentUserId(req), receiverEmployeeId, receivedDate, accountId
      ]
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
      await applyApprovedLocationChange(db, account.approval_group_id);
      await synchronizeLatestCustomerStbStatus(db, [account.cable_customer_id]);
    }

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
      `SELECT account_id, approval_group_id, cable_customer_id, account_status, customer_paid_amount
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
    await synchronizeLatestCustomerStbStatus(db, [account.cable_customer_id]);
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
      `SELECT c.cable_customer_id, c.customer_code, c.network_customer_no, c.legacy_customer_no, c.customer_type,c.topup_base_amount,c.topup_gst_percent,c.recharge_amount,c.full_name,
               c.door_no, c.city, c.pincode, c.mobile_no, c.aadhaar_no, c.alternate_mobile_no,
               CASE
                 WHEN UPPER(c.approval_status) = 'PENDING' OR EXISTS (
                   SELECT 1 FROM cable_approval_groups pending_group
                   WHERE pending_group.approval_status = 'PENDING'
                     AND (
                       pending_group.approval_group_id = c.approval_group_id
                       OR EXISTS (SELECT 1 FROM cable_customer_stbs pending_stb WHERE pending_stb.cable_customer_id = c.cable_customer_id AND pending_stb.approval_group_id = pending_group.approval_group_id)
                       OR EXISTS (SELECT 1 FROM cable_connections pending_connection WHERE pending_connection.cable_customer_id = c.cable_customer_id AND pending_connection.approval_group_id = pending_group.approval_group_id)
                       OR EXISTS (SELECT 1 FROM cable_customer_packages pending_package WHERE pending_package.cable_customer_id = c.cable_customer_id AND pending_package.approval_group_id = pending_group.approval_group_id)
                       OR EXISTS (SELECT 1 FROM cable_subscriptions pending_subscription WHERE pending_subscription.cable_customer_id = c.cable_customer_id AND pending_subscription.approval_group_id = pending_group.approval_group_id)
                       OR EXISTS (SELECT 1 FROM cable_customer_accounts pending_account WHERE pending_account.cable_customer_id = c.cable_customer_id AND pending_account.approval_group_id = pending_group.approval_group_id)
                     )
                 ) THEN 'Waiting Approval'
                 WHEN UPPER(c.approval_status) = 'REJECTED' THEN 'Rejected'
                 WHEN acc.account_id IS NOT NULL
                   AND GREATEST(COALESCE(acc.grand_total, 0) - COALESCE(acc.office_received_amount, 0), 0) > 0
                   AND UPPER(acc.account_status) IN ('PENDING', 'PARTIAL')
                   AND NOT EXISTS (
                     SELECT 1 FROM cable_customer_account_payments paid_account
                     WHERE paid_account.account_id = acc.account_id
                       AND paid_account.payment_status = 'PAID'
                   )
                 THEN 'Pending Payment'
                 WHEN UPPER(COALESCE(c.customer_type, 'REGULAR')) = 'FREE' THEN 'Free'
                 WHEN UPPER(COALESCE(c.customer_type, 'REGULAR')) = 'LEASE_LINE' THEN 'Lease Line'
                 ELSE COALESCE(CASE UPPER(stb.status)
                   WHEN 'ACTIVE' THEN 'Active' WHEN 'RETRIEVED' THEN 'Retrieved'
                   WHEN 'RETURNED' THEN 'Retrieved' WHEN 'FAULT' THEN 'Fault'
                   WHEN 'FAULTY' THEN 'Fault' WHEN 'UPGRADE' THEN 'Upgrade'
                   WHEN 'REPLACED' THEN 'Active' ELSE 'Disconnected' END, c.status)
               END AS status,
               c.approval_status, c.created_at,
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
         ORDER BY latest_stb.customer_stb_id DESC
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

    const customerIds = rows.map((row) => Number(row.cable_customer_id)).filter(Boolean);
    const packagesByCustomer = new Map();
    if (customerIds.length) {
      const placeholders = customerIds.map(() => '?').join(',');
      const [packageRows] = await db.query(
        `SELECT cp.cable_customer_id, pkg.package_name, cp.package_type,
                COALESCE(NULLIF(cp.package_price, 0), pkg.price, 0) AS amount
         FROM cable_customer_packages cp
         INNER JOIN cable_package_master pkg ON pkg.package_id = cp.package_id
         WHERE cp.cable_customer_id IN (${placeholders})
           AND cp.is_active = 1
           AND cp.approval_status = 'APPROVED'
         ORDER BY cp.cable_customer_id, cp.customer_package_id`,
        customerIds
      );
      packageRows.forEach((packageRow) => {
        const customerId = Number(packageRow.cable_customer_id);
        if (!packagesByCustomer.has(customerId)) packagesByCustomer.set(customerId, []);
        packagesByCustomer.get(customerId).push({
          package_name: packageRow.package_name,
          package_type: packageRow.package_type,
          amount: money(packageRow.amount)
        });
      });
    }

    return res.json(rows.map((row) => {
      const package_information = packagesByCustomer.get(Number(row.cable_customer_id)) || [];
      return {
        ...row,
        package_amount: money(package_information.reduce((total, item) => total + money(item.amount), 0)),
        package_information
      };
    }));
  } catch (error) {
    return res.status(500).json({ message: 'Cable TV customers failed', error: error.message });
  }
};

const getCableCustomerById = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const { id } = req.params;
    await reconcileApprovedLocationChanges(db, id);
    await reconcileMissingStbAmounts(db, id);
    await synchronizeLatestCustomerStbStatus(db, [id]);
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
      `SELECT stb.*, COALESCE(NULLIF(stb.stb_no, ''), stb_master.stb_number) AS stb_no,
              stb_master.stb_amount AS master_stb_amount,
              stb_master.full_set_amount AS master_full_set_amount,
              CONCAT_WS(' ', installed.first_name, installed.last_name) AS installed_by_name,
              CONCAT_WS(' ', entered.first_name, entered.last_name) AS entered_by_name,
              installed_mso.mso_name AS installed_mso_name,
              exchange_mso.mso_name AS exchange_original_mso_name,
              CASE
                WHEN stb.approval_group_id IS NULL
                  AND stb.entered_by_employee_id IS NULL
                  AND EXISTS (
                    SELECT 1 FROM cable_tv_customers legacy_customer
                    WHERE legacy_customer.cable_customer_id = stb.cable_customer_id
                      AND legacy_customer.legacy_customer_no IS NOT NULL
                  ) THEN 'NA'
                WHEN UPPER(COALESCE(stb.update_reason, '')) IN ('FAULT','DAMAGED','BROKEN','BURNT','DISCONNECT','VACATED','STB_LOST','OUTSTATION') THEN 'NA'
                WHEN UPPER(COALESCE(stb.update_reason, '')) = 'RETURNED' THEN
                  CASE
                    WHEN stb.approval_status = 'PENDING' THEN 'PENDING'
                    WHEN COALESCE(stb.refund_amount, 0) = 0 OR EXISTS (
                      SELECT 1 FROM finance_transactions ft
                      WHERE ft.source_module = 'CATV_STB_RETURN' AND ft.source_id = stb.customer_stb_id
                    ) THEN 'PAID'
                    ELSE 'PENDING'
                  END
                ELSE COALESCE((
                SELECT CASE
                  WHEN ca.account_status = 'NA' OR ca.grand_total <= 0 THEN 'NA'
                  WHEN EXISTS (
                    SELECT 1 FROM cable_customer_account_payments cap
                    WHERE cap.account_id = ca.account_id AND cap.payment_status = 'PAID'
                  ) THEN 'PAID'
                  ELSE ca.account_status
                END
                FROM cable_customer_accounts ca
                WHERE ca.approval_group_id = stb.approval_group_id
                ORDER BY ca.account_id DESC LIMIT 1
                ), 'PENDING')
              END AS payment_status
       FROM cable_customer_stbs stb
       LEFT JOIN cable_stb_master stb_master ON stb_master.stb_master_id = stb.stb_master_id
       LEFT JOIN employees installed ON installed.employee_id = stb.installed_by_employee_id
       LEFT JOIN employees entered ON entered.employee_id = stb.entered_by_employee_id
       LEFT JOIN cable_mso_master installed_mso ON installed_mso.mso_id = stb.installed_mso_id
       LEFT JOIN cable_mso_master exchange_mso ON exchange_mso.mso_id = stb.exchange_original_mso_id
       WHERE stb.cable_customer_id = ?
       ORDER BY stb.customer_stb_id DESC,
                COALESCE(stb.updated_date, stb.installed_date) DESC,
                stb.updated_at DESC`,
      [id]
    );
    const [connections] = await db.query(
      `SELECT conn.*, CONCAT_WS(' ', installed.first_name, installed.last_name) AS installed_by_name,
              CONCAT_WS(' ', entered.first_name, entered.last_name) AS entered_by_name,
              COALESCE((
                SELECT CASE
                  WHEN ca.account_status = 'NA' OR ca.grand_total <= 0 THEN 'NA'
                  WHEN EXISTS (
                    SELECT 1 FROM cable_customer_account_payments cap
                    WHERE cap.account_id = ca.account_id AND cap.payment_status = 'PAID'
                  ) THEN 'PAID'
                  ELSE ca.account_status
                END
                FROM cable_customer_accounts ca
                WHERE ca.approval_group_id = conn.approval_group_id
                ORDER BY ca.account_id DESC LIMIT 1
              ), 'PENDING') AS payment_status
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
              pkg.price AS master_package_price,
              pkg.package_type AS master_package_type,
              CONCAT_WS(' ', updated.first_name, updated.last_name) AS updated_by_name
       FROM cable_customer_packages cp
       LEFT JOIN cable_package_master pkg ON pkg.package_id = cp.package_id
       LEFT JOIN employees updated ON updated.employee_id = cp.updated_by_employee_id
       LEFT JOIN cable_subscriptions sub ON sub.subscription_id = (
         SELECT MAX(latest_sub.subscription_id)
         FROM cable_subscriptions latest_sub
         WHERE latest_sub.customer_package_id = cp.customer_package_id
       )
       WHERE cp.cable_customer_id = ?
       ORDER BY cp.customer_package_id DESC`,
      [id]
    );
    const [subscriptions] = await db.query(
      `SELECT sub.*,
              CASE WHEN sub.payment_status = 'PENDING' THEN
                ROUND(COALESCE(NULLIF((SELECT SUM(COALESCE(NULLIF(active_cp.package_price, 0), active_pkg.price, 0))
                  FROM cable_customer_packages active_cp
                  LEFT JOIN cable_package_master active_pkg ON active_pkg.package_id = active_cp.package_id
                  WHERE active_cp.cable_customer_id = sub.cable_customer_id
                    AND active_cp.is_active = 1 AND active_cp.approval_status = 'APPROVED'), 0), sub.amount)
                  * COALESCE(NULLIF(sub.received_count, 0), 1), 0)
                ELSE sub.amount END AS amount,
              CASE WHEN sub.payment_status = 'PENDING' THEN
                GREATEST(ROUND(COALESCE(NULLIF((SELECT SUM(COALESCE(NULLIF(active_cp.package_price, 0), active_pkg.price, 0))
                  FROM cable_customer_packages active_cp
                  LEFT JOIN cable_package_master active_pkg ON active_pkg.package_id = active_cp.package_id
                  WHERE active_cp.cable_customer_id = sub.cable_customer_id
                    AND active_cp.is_active = 1 AND active_cp.approval_status = 'APPROVED'), 0), sub.amount)
                  * COALESCE(NULLIF(sub.received_count, 0), 1), 0) - COALESCE(sub.paid_amount, 0), 0)
                WHEN sub.payment_status = 'PAID' THEN 0
                ELSE sub.balance_amount END AS balance_amount,
              CASE WHEN sub.payment_status = 'PAID' AND COALESCE(sub.paid_amount, 0) <= 0
                THEN sub.amount ELSE sub.paid_amount END AS paid_amount,
              cp.package_price, pkg.package_name, pkg.package_type,
              pkg.price AS master_package_price,
              NULLIF(TRIM(CONCAT_WS(' ', collected.first_name, collected.last_name)), '') AS collected_by_name,
              collected.employee_code AS collected_by_code,
              COALESCE(
                NULLIF(TRIM(CONCAT_WS(' ', collected.first_name, collected.last_name)), ''),
                collected.employee_code,
                CAST(sub.collected_by_employee_id AS CHAR)
              ) AS collected_by_display,
              NULLIF(TRIM(CONCAT_WS(' ', mapped.first_name, mapped.last_name)), '') AS payment_mapped_employee_name
       FROM cable_subscriptions sub
       LEFT JOIN cable_customer_packages cp ON cp.customer_package_id = sub.customer_package_id
       LEFT JOIN cable_package_master pkg ON pkg.package_id = cp.package_id
       LEFT JOIN employees collected ON collected.employee_id = sub.collected_by_employee_id
       LEFT JOIN employees mapped ON mapped.employee_id = sub.payment_mapped_employee_id
       WHERE sub.cable_customer_id = ?
       ORDER BY sub.subscription_year DESC, sub.subscription_month DESC, sub.subscription_id DESC`,
      [id]
    );
    const [accounts] = await db.query('SELECT * FROM cable_customer_accounts WHERE cable_customer_id = ? ORDER BY account_id DESC', [id]);
    const [approvalGroups] = await db.query(
      `SELECT cag.approval_group_id, cag.approval_group_no, cag.group_type, cag.approval_status
       FROM cable_approval_groups cag
       WHERE cag.approval_group_id IN (
         SELECT approval_group_id FROM cable_tv_customers WHERE cable_customer_id = ?
         UNION SELECT approval_group_id FROM cable_connections WHERE cable_customer_id = ?
         UNION SELECT approval_group_id FROM cable_customer_stbs WHERE cable_customer_id = ?
         UNION SELECT approval_group_id FROM cable_customer_packages WHERE cable_customer_id = ?
         UNION SELECT approval_group_id FROM cable_subscriptions WHERE cable_customer_id = ?
         UNION SELECT approval_group_id FROM cable_customer_accounts WHERE cable_customer_id = ?
       )
       ORDER BY cag.approval_group_id DESC`,
      [id, id, id, id, id, id]
    );

    return res.json({ customer, stbs, stbAccessories, connections, materials, customerPackages, subscriptions, accounts, approvalGroups });
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

    const packageIds = (Array.isArray(payload.packages) ? payload.packages : [])
      .map((item) => Number(item.package_id))
      .filter(Boolean);
    if (new Set(packageIds).size !== packageIds.length) {
      await db.rollback();
      return res.status(400).json({ message: 'The same package cannot be added more than once' });
    }
    const materialKeys = (Array.isArray(payload.materials) ? payload.materials : [])
      .filter((item) => item.product_id || String(item.item_name || '').trim())
      .map((item) => item.product_id
        ? `product:${Number(item.product_id)}`
        : `item:${String(item.item_name || '').trim().toLowerCase()}`);
    if (new Set(materialKeys).size !== materialKeys.length) {
      await db.rollback();
      return res.status(400).json({ message: 'The same used material cannot be added more than once' });
    }

    const customerCode = await generateCustomerCode(db);
    const networkCustomerNo = await generateNetworkCustomerNo(db,networkType);
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
    const customerType = String(payload.customer_type || 'REGULAR').toUpperCase();
    if (!['REGULAR', 'BUSINESS','FREE','LEASE_LINE'].includes(customerType) || (customerType==='LEASE_LINE' && String(networkType).toUpperCase()!=='LO')) {
      await db.rollback();
      return res.status(400).json({ message: 'Customer Type must be Regular, Business, Free, or LO Lease Line' });
    }
    const customerStatus=customerType==='FREE'?'FREE':customerType==='LEASE_LINE'?'LEASE_LINE':stbStatus;
    const topupBase=customerType==='LEASE_LINE'?money(payload.topup_base_amount):0,topupGst=customerType==='LEASE_LINE'?18:0,rechargeAmount=money(topupBase*1.18);
    const [customerResult] = await db.query(
      `INSERT INTO cable_tv_customers (
        approval_group_id, network_id, network_type, customer_type, topup_base_amount,topup_gst_percent,recharge_amount,legacy_customer_no,network_customer_no,customer_code, full_name, door_no,
        location_id, area_id, street_id, city, pincode, mobile_no, aadhaar_no, alternate_mobile_no,
        source_id, installed_by_employee_id, labour_service_charge, status, approval_status,
        created_by_user_id, approved_by_user_id, approved_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${approvalStatus === 'APPROVED' ? 'NOW()' : 'NULL'})`,
      [
        approvalGroupId, networkId, networkType, customerType,topupBase,topupGst,rechargeAmount,nullable(payload.legacy_customer_no),networkCustomerNo, customerCode, payload.full_name, payload.door_no,
        Number(payload.location_id), Number(payload.area_id), Number(payload.street_id), 'Chennai', nullable(addressMapping.pincode),
        payload.mobile_no, nullable(payload.aadhaar_no), nullable(payload.alternate_mobile_no), sourceId,
        employeeId, money(payload.labour_service_charge), customerStatus, approvalStatus, createdBy,
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
        if (Number(stbRow.assigned_employee_id) !== Number(employeeId)) {
          await db.rollback();
          return res.status(403).json({ message: 'This STB is assigned to another employee' });
        }
        selectedStb = stbRow;
      }

      const inventoryStbType = String(payload.stb.stb_type || selectedStb?.stock_type || 'NEW').toUpperCase();
      if (!installedStbTypes.includes(inventoryStbType)) {
        await db.rollback();
        return res.status(400).json({ message: 'Installed STB type must be New, Serviced or Returned' });
      }
      const issueMode = String(payload.stb.issue_mode || 'FULL_SET').toUpperCase() === 'BOX_ONLY' ? 'BOX_ONLY' : 'FULL_SET';
      issuedStbAmount = money(issueMode === 'BOX_ONLY' ? selectedStb?.stb_amount : selectedStb?.full_set_amount)
        || (issueMode === 'BOX_ONLY' ? 500 : 800);

      const [stbResult] = await db.query(
        `INSERT INTO cable_customer_stbs (
          approval_group_id, cable_customer_id, stb_master_id, stb_type, issue_mode, installed_mso_id, exchange_original_mso_id,
          stb_no, stb_amount, stb_discount, labour_service_charge, installed_by_employee_id,
          entered_by_employee_id, installed_date, status, approval_status, created_by_user_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          approvalGroupId, cableCustomerId, intOrNull(payload.stb.stb_master_id), 'NEW', issueMode,
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
      const periodCount = billingBasis === 'DAY'
        ? subscriptionBillingDays(startDate)
        : money(packageItem.number_of_days_or_months || inclusiveDays(startDate, endDate));
      const amount = money(
        billingBasis === 'YEAR'
          ? packagePrice * 12 * periodCount
          : billingBasis === 'MONTH'
            ? packagePrice * periodCount
            : (packagePrice / monthDays) * periodCount
      );
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
      if (['FREE','LEASE_LINE'].includes(customerType)) continue;
      const billableAmount = amount;
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
          billableAmount, paidAmount, billableAmount, null,
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
    const subscriptionAmount = ['FREE','LEASE_LINE'].includes(customerType) ? 0
      : Math.round(packageRowsPayload.reduce((sum, item) => sum + money(item.amount), 0));
    const accountStbAmount = issuedStbAmount || money(accountPayload.stb_amount ?? payload.stb?.stb_amount);
    const connectionAmount = money(payload.connection?.connection_charge ?? accountPayload.connection_amount);
    const laborAmount = money(payload.connection?.labour_service_charge ?? accountPayload.labor_amount);
    const materialDiscount = money(accountPayload.material_discount);
    const overallDiscount = money(accountPayload.overall_discount);
    const discount = money(payload.stb?.stb_discount) + money(payload.connection?.connection_discount) + materialDiscount + overallDiscount;
    const subTotal = money(accountPayload.sub_total || (accountStbAmount + connectionAmount + materialCost + subscriptionAmount));
    // Derive the pending amount on the server so material discount is always deducted.
    const normalizedGrandTotal = Math.max(money(subTotal - discount), 0);
    const customerPaidAmount = money(accountPayload.customer_paid_amount);
    const balanceAmount = Math.max(normalizedGrandTotal - customerPaidAmount, 0);
    const dueDate = null;
    const accountStatus = normalizedGrandTotal <= 0 ? 'NA' : 'PENDING';
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
    const customerType = String(payload.customer_type || 'REGULAR').toUpperCase();
    if (!['REGULAR', 'BUSINESS','FREE','LEASE_LINE'].includes(customerType) || (customerType==='LEASE_LINE' && String(networkType).toUpperCase()!=='LO')) {
      return res.status(400).json({ message: 'Customer Type must be Regular, Business, Free, or LO Lease Line' });
    }
    const customerStatus=customerType==='FREE'?'FREE':customerType==='LEASE_LINE'?'LEASE_LINE':String(payload.status||'ACTIVE').toUpperCase();
    const topupBase=customerType==='LEASE_LINE'?money(payload.topup_base_amount):0,topupGst=customerType==='LEASE_LINE'?18:0,rechargeAmount=money(topupBase*1.18);
    const employeeId = await resolveEmployeeId(db, req, payload.installed_by_employee_id);
    await db.query(
      `UPDATE cable_tv_customers SET
        network_id = ?, network_type = ?, customer_type = ?,topup_base_amount=?,topup_gst_percent=?,recharge_amount=?, legacy_customer_no = ?, full_name = ?, door_no = ?, location_id = ?,
        area_id = ?, street_id = ?, city = ?, pincode = ?, mobile_no = ?, aadhaar_no = ?,
        alternate_mobile_no = ?, source_id = ?, installed_by_employee_id = ?,
        labour_service_charge = ?, status = ?, updated_at = NOW()
       WHERE cable_customer_id = ?`,
      [
        networkId, networkType, customerType,topupBase,topupGst,rechargeAmount, nullable(payload.legacy_customer_no), payload.full_name, payload.door_no,
        Number(payload.location_id), Number(payload.area_id), Number(payload.street_id), 'Chennai',
        nullable(addressMapping.pincode), payload.mobile_no, nullable(payload.aadhaar_no), nullable(payload.alternate_mobile_no),
        sourceId, employeeId, money(payload.labour_service_charge),
        customerStatus, id
      ]
    );

    return res.json({ message: 'Cable TV customer updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Cable TV customer update failed', error: error.message });
  }
};

const updateCableCustomerInformation = async (req, res) => {
  try {
    const cableCustomerId = Number(req.params.id);
    const payload = req.body || {};
    const fullName = String(payload.full_name || '').trim();
    const mobileNo = String(payload.mobile_no || '').trim();
    const alternateMobileNo = String(payload.alternate_mobile_no || '').trim();
    const aadhaarNo = String(payload.aadhaar_no || '').trim();
    if (!cableCustomerId || !fullName || !/^[0-9]{10}$/.test(mobileNo)) {
      return res.status(400).json({ message: 'Network, Full Name and valid 10-digit Mobile No are required' });
    }
    if (alternateMobileNo && !/^[0-9]{10}$/.test(alternateMobileNo)) {
      return res.status(400).json({ message: 'Alternate Mobile must contain 10 digits' });
    }
    if (aadhaarNo && !/^[0-9]{12}$/.test(aadhaarNo)) {
      return res.status(400).json({ message: 'Aadhaar No must contain 12 digits' });
    }

    const db = connection.promise();
    await ensureCableTvExtendedTables(db);
    const networkId = intOrNull(payload.network_id);
    const networkType = await resolveNetworkType(db, networkId);
    if (!networkType) return res.status(400).json({ message: 'Select a valid Network' });
    const sourceId = await resolveSourceId(db, payload.source_id || payload.source_name);
    const installedByEmployeeId = await resolveEmployeeId(db, req, payload.installed_by_employee_id);
    if (!installedByEmployeeId) {
      return res.status(400).json({ message: 'Installed By employee is required' });
    }

    const [result] = await db.query(
      `UPDATE cable_tv_customers
       SET network_id = ?, network_type = ?, full_name = ?, mobile_no = ?,
           alternate_mobile_no = ?, aadhaar_no = ?, source_id = ?,
           installed_by_employee_id = ?, updated_at = NOW()
       WHERE cable_customer_id = ?`,
      [
        networkId, networkType, fullName, mobileNo, nullable(alternateMobileNo),
        nullable(aadhaarNo), sourceId, installedByEmployeeId, cableCustomerId
      ]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Cable TV customer not found' });
    return res.json({ message: 'Customer information updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Customer information update failed', error: error.message });
  }
};

const assignStbMaster = async (req, res) => {
  try {
    const stbMasterId = Number(req.params.stbMasterId);
    const assignedEmployeeId = intOrNull(req.body.assigned_employee_id);
    if (!stbMasterId || !assignedEmployeeId) return res.status(400).json({ message: 'STB and employee are required' });
    const [result] = await connection.promise().query(
      `UPDATE cable_stb_master SET assigned_employee_id = ?, updated_at = NOW()
       WHERE stb_master_id = ? AND is_active = 1 AND status = 'AVAILABLE' AND stock_type <> 'FAULT'`,
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
    const selectedNetworkId = intOrNull(payload.network_id);
    const selectedNetworkType = selectedNetworkId ? await resolveNetworkType(db, selectedNetworkId) : null;
    if (!selectedNetworkId || !selectedNetworkType) {
      await db.rollback();
      return res.status(400).json({ message: 'Select a valid Network for Connection Details' });
    }
    if (connectionType !== 'SHIFTED' && selectedNetworkId !== Number(currentCustomer.network_id)) {
      await db.rollback();
      return res.status(400).json({ message: 'Network can be changed only through Location Change' });
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
        network_id: selectedNetworkId,
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
        old_network_id, new_network_id,
        old_door_no, new_door_no, old_location_id, old_area_id, old_street_id, new_location_id, new_area_id, new_street_id, old_address, new_address,
        connected_by_employee_id, entered_by_employee_id, connection_charge, connection_discount, labour_service_charge,
        status, approval_status, remarks, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        approvalGroupId, cableCustomerId, payload.connection_date || new Date(),
        nullable(payload.disconnection_date), connectionType,
        connectionType === 'SHIFTED' ? currentCustomer.network_id : null,
        connectionType === 'SHIFTED' ? selectedNetworkId : null,
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
    if (approvalStatus === 'APPROVED' && connectionType === 'SHIFTED') {
      await db.query(
        `UPDATE cable_tv_customers
         SET network_id = ?, network_type = ?, door_no = ?, location_id = ?, area_id = ?, street_id = ?, city = ?, pincode = ?, updated_at = NOW()
         WHERE cable_customer_id = ?`,
        [selectedNetworkId, selectedNetworkType, newDoorNo, newLocationId, newAreaId, newStreetId,
          newMapping.city || 'Chennai', newMapping.pincode, cableCustomerId]
      );
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
    await ensureCableTvExtendedTables(db);
    const connectionId = Number(req.params.connectionId);
    const cableCustomerId = Number(req.params.id);
    const [[existingConnection]] = await db.query(
      `SELECT approval_group_id FROM cable_connections
       WHERE connection_id = ? AND cable_customer_id = ? LIMIT 1`,
      [connectionId, cableCustomerId]
    );
    if (!existingConnection) return res.status(404).json({ message: 'Connection details not found' });
    await db.query(
      `UPDATE cable_connections
       SET connection_date = ?, disconnection_date = ?, connection_type = ?, connected_by_employee_id = ?,
           connection_charge = ?, connection_discount = ?, labour_service_charge = ?, status = ?, remarks = ?, updated_at = NOW()
       WHERE connection_id = ? AND cable_customer_id = ?`,
      [
        req.body.connection_date || new Date(), nullable(req.body.disconnection_date), req.body.connection_type || 'RECONNECTION',
        intOrNull(req.body.installed_by_employee_id), money(req.body.connection_charge), money(req.body.connection_discount),
        money(req.body.labour_service_charge), req.body.status || 'ACTIVE', nullable(req.body.remarks),
        connectionId, cableCustomerId
      ]
    );
    await recalculateLinkedPendingAccount(db, existingConnection.approval_group_id);
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
    const [[customerForStbUpdate]] = await db.query(
      'SELECT cable_customer_id FROM cable_tv_customers WHERE cable_customer_id = ? FOR UPDATE',
      [cableCustomerId]
    );
    if (!customerForStbUpdate) {
      await db.rollback();
      return res.status(404).json({ message: 'Cable TV customer not found' });
    }
    const [[pendingStbUpdate]] = await db.query(
      `SELECT stb.customer_stb_id
       FROM cable_customer_stbs stb
       INNER JOIN cable_approval_groups approval_group
         ON approval_group.approval_group_id = stb.approval_group_id
       WHERE stb.cable_customer_id = ?
         AND stb.approval_status = 'PENDING'
         AND approval_group.approval_status = 'PENDING'
       LIMIT 1`,
      [cableCustomerId]
    );
    if (pendingStbUpdate) {
      await db.rollback();
      return res.status(409).json({
        message: 'An STB update is pending for administrator approval. Complete the pending approval before adding another STB.'
      });
    }
    const { approvalGroupId, approvalStatus, createdBy } = await createApprovalGroup(db, req, 'STB_UPDATE');
    const employeeId = await resolveEmployeeId(db, req, payload.installed_by_employee_id || payload.entered_by_employee_id);
    const updateReason = String(payload.reason || payload.update_reason || '').toUpperCase();
    const activeReasons = new Set(['FAULT', 'DAMAGED', 'BROKEN', 'BURNT', 'DISCONNECT', 'VACATED', 'STB_LOST', 'OUTSTATION', 'RETURNED']);
    const disconnectedReasons = new Set(['REACTIVATE', 'REPLACED']);
    if (!activeReasons.has(updateReason) && !disconnectedReasons.has(updateReason)) {
      await db.rollback();
      return res.status(400).json({ message: 'Invalid STB update reason' });
    }
    const remarks = textOrNull(payload.remarks || payload.reason_remarks);
    const updatedDate = payload.updated_date || payload.installed_date || new Date();
    const isReplacement = updateReason === 'REPLACED';
    const isReactivate = updateReason === 'REACTIVATE';
    const isReturn = updateReason === 'RETURNED';
    const faultReasons = new Set(['FAULT', 'DAMAGED', 'BROKEN', 'BURNT']);
    const selectedStbStatus = disconnectedReasons.has(updateReason)
      ? 'ACTIVE'
      : faultReasons.has(updateReason)
        ? 'FAULT'
        : updateReason === 'RETURNED'
          ? 'RETRIEVED'
          : 'DISCONNECTED';
    const customerStatus = customerStatusForStbStatus(selectedStbStatus);

    const [activeStbs] = await db.query(
      `SELECT customer_stb_id, stb_master_id, stb_type, installed_mso_id, exchange_original_mso_id,
              stb_no, stb_image_path, stb_amount, installed_by_employee_id, installed_date, status
       FROM cable_customer_stbs
       WHERE cable_customer_id = ? AND approval_status = 'APPROVED'
       ORDER BY customer_stb_id DESC,
                COALESCE(updated_date, installed_date) DESC,
                updated_at DESC
       LIMIT 1`,
      [cableCustomerId]
    );
    const currentStatus = String(activeStbs[0]?.status || '').toUpperCase();
    if (currentStatus === 'ACTIVE' && !activeReasons.has(updateReason)) {
      await db.rollback();
      return res.status(400).json({ message: 'Active STB can only be disconnected, faulted, vacated, lost, outstation or returned' });
    }
    if (currentStatus && currentStatus !== 'ACTIVE' && !disconnectedReasons.has(updateReason) && !isReturn) {
      await db.rollback();
      return res.status(400).json({ message: 'Disconnected STB can only be Reactivated, Replaced or Returned' });
    }

    if (!isReplacement) {
      let targetStbs = activeStbs;
      if (!targetStbs.length) {
        const [latestStbs] = await db.query(
          `SELECT customer_stb_id, stb_master_id, stb_type, installed_mso_id, exchange_original_mso_id,
                  stb_no, stb_image_path, stb_amount, installed_by_employee_id, installed_date
           FROM cable_customer_stbs
           WHERE cable_customer_id = ?
           ORDER BY customer_stb_id DESC,
                    COALESCE(updated_date, installed_date) DESC,
                    updated_at DESC
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
          stb_no, stb_image_path, stb_amount, stb_discount, labour_service_charge, refund_amount, refund_payment_mode,
          installed_by_employee_id, entered_by_employee_id, installed_date, updated_date,
          update_reason, reason_remarks, status, approval_status, created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          approvalGroupId, cableCustomerId, targetStb.stb_master_id,
          faultReasons.has(updateReason) ? 'FAULT'
            : updateReason === 'RETURNED' ? 'RETURNED'
              : isReactivate ? 'SERVICED'
                : targetStb.stb_type || 'NEW',
          targetStb.installed_mso_id, targetStb.exchange_original_mso_id,
          targetStb.stb_no, targetStb.stb_image_path,
          isReactivate ? money(payload.stb_amount) : 0,
          isReactivate ? money(payload.stb_discount) : 0,
          isReactivate ? money(payload.labour_service_charge) : 0,
          isReturn ? money(payload.refund_amount) : 0,
          isReturn ? String(payload.refund_payment_mode || 'CASH').toUpperCase() : 'CASH',
          employeeId || targetStb.installed_by_employee_id,
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
      if (isReactivate) {
        await addPendingAccount(db, req, {
          approval_group_id: approvalGroupId,
          cable_customer_id: cableCustomerId,
          stb_amount: payload.stb_amount,
          labor_amount: payload.labour_service_charge,
          discount: payload.stb_discount,
          approval_status: approvalStatus,
          created_by_user_id: createdBy
        });
      }
      if (approvalStatus === 'APPROVED') {
        if (faultReasons.has(updateReason)) {
          const faultMasterId = await upsertFaultStbMaster(db, {
            stb_master_id: targetStb.stb_master_id,
            stb_no: targetStb.stb_no,
            reason: updateReason,
            mso_id: targetStb.installed_mso_id,
            stb_amount: payload.stb_amount,
            updated_date: updatedDate
          });
          if (faultMasterId) {
            await db.query(
              'UPDATE cable_customer_stbs SET stb_master_id = ? WHERE customer_stb_id = ?',
              [faultMasterId, statusResult.insertId]
            );
            targetStb.stb_master_id = faultMasterId;
          }
        }
        if (isReturn) {
          const returnedMasterId = await upsertReturnedStbMaster(db, {
            stb_master_id: targetStb.stb_master_id,
            stb_no: targetStb.stb_no,
            mso_id: targetStb.installed_mso_id,
            stb_amount: targetStb.stb_amount,
            updated_date: updatedDate
          });
          if (returnedMasterId) {
            targetStb.stb_master_id = returnedMasterId;
            await db.query(
              'UPDATE cable_customer_stbs SET stb_master_id = ? WHERE customer_stb_id = ?',
              [returnedMasterId, statusResult.insertId]
            );
          }
        }
        if (isReturn && targetStb.stb_master_id) {
          await db.query(
            `UPDATE cable_stb_issue_master SET issue_status = 'RETURNED'
             WHERE stb_master_id = ? AND cable_customer_id = ? AND issue_status = 'ISSUED'`,
            [targetStb.stb_master_id, cableCustomerId]
          );
        }
        if (isReactivate && targetStb.stb_master_id) {
          await db.query(
            "UPDATE cable_stb_master SET stock_type = 'SERVICED', status = 'NOT_AVAILABLE', updated_date = ?, updated_at = NOW() WHERE stb_master_id = ?",
            [dateOnly(updatedDate), targetStb.stb_master_id]
          );
          await db.query(
            `INSERT INTO cable_stb_issue_master (
               stb_master_id, cable_customer_id, customer_stb_id, issued_by_employee_id, issue_status
             )
             SELECT ?, ?, ?, ?, 'ISSUED'
             WHERE NOT EXISTS (
               SELECT 1 FROM cable_stb_issue_master
               WHERE stb_master_id = ? AND cable_customer_id = ? AND issue_status = 'ISSUED'
             )`,
            [
              targetStb.stb_master_id, cableCustomerId, statusResult.insertId, employeeId,
              targetStb.stb_master_id, cableCustomerId
            ]
          );
        }
        if (isReturn && money(payload.refund_amount) > 0) {
          await db.query(
            `INSERT INTO finance_transactions (
              transaction_date, transaction_type, category, amount, payment_mode,
              reference_no, description, source_module, source_id,
              created_by_user_id, created_by_employee_id
            ) VALUES (?, 'DEBIT', 'STB Return Refund', ?, ?, ?, ?, 'CATV_STB_RETURN', ?, ?, ?)`,
            [
              updatedDate, money(payload.refund_amount), String(payload.refund_payment_mode || 'CASH').toUpperCase(),
              `CTV-STB-${statusResult.insertId}`, `Refund paid for returned STB ${targetStb.stb_no}`,
              statusResult.insertId, createdBy, employeeId
            ]
          );
        }
        await db.query("UPDATE cable_tv_customers SET status = CASE WHEN customer_type IN ('FREE','LEASE_LINE') THEN customer_type ELSE ? END WHERE cable_customer_id = ?", [customerStatus, cableCustomerId]);
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
    const chargedStbAmount = money(issueMode === 'FULL_SET' ? selectedStb?.full_set_amount : selectedStb?.stb_amount)
      || (issueMode === 'FULL_SET' ? 800 : 500);
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
        "UPDATE cable_stb_master SET status = 'NOT_AVAILABLE', assigned_employee_id = ?, updated_at = NOW() WHERE stb_master_id = ?",
        [employeeId, selectedStb.stb_master_id]
      );
      await db.query(
        `INSERT INTO cable_stb_issue_master (
          stb_master_id, cable_customer_id, customer_stb_id, issued_by_employee_id, issue_status
        ) VALUES (?, ?, ?, ?, 'ISSUED')`,
        [selectedStb.stb_master_id, cableCustomerId, stbResult.insertId, employeeId]
      );
    }
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
    if (approvalStatus === 'APPROVED') {
      await db.query("UPDATE cable_tv_customers SET status = CASE WHEN customer_type IN ('FREE','LEASE_LINE') THEN customer_type ELSE ? END WHERE cable_customer_id = ?", [customerStatus, cableCustomerId]);
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
    const customerStbId = Number(req.params.stbId);
    const cableCustomerId = Number(req.params.id);
    const [[existingStb]] = await db.query(
      `SELECT customer_stb_id, approval_group_id, stb_master_id, stb_type, installed_mso_id, stb_no, update_reason
       FROM cable_customer_stbs
       WHERE customer_stb_id = ? AND cable_customer_id = ?
       LIMIT 1`,
      [customerStbId, cableCustomerId]
    );
    if (!existingStb) return res.status(404).json({ message: 'STB details not found' });
    const issueMode = String(req.body.issue_mode || 'BOX_ONLY').toUpperCase() === 'FULL_SET' ? 'FULL_SET' : 'BOX_ONLY';
    const stbMasterId = existingStb.stb_master_id;
    const [[stbMaster]] = stbMasterId
      ? await db.query(
        'SELECT stb_number, stock_type, stb_amount, full_set_amount FROM cable_stb_master WHERE stb_master_id = ? LIMIT 1',
        [stbMasterId]
      )
      : [[null]];
    const initialRecord = !existingStb.update_reason;
    const requestedReason = String(req.body.reason || req.body.update_reason || '').toUpperCase();
    const updateReason = initialRecord && requestedReason === 'NEW'
      ? null
      : (requestedReason || existingStb.update_reason || null);
    const stbType = initialRecord ? 'NEW' : (existingStb.stb_type || 'NEW');
    const stbAmount = stbMaster
      ? money(issueMode === 'FULL_SET' ? stbMaster.full_set_amount : stbMaster.stb_amount)
        || (issueMode === 'FULL_SET' ? 800 : 500)
      : money(req.body.stb_amount);
    const laborAmount = money(req.body.labour_service_charge);
    const stbDiscount = money(req.body.stb_discount);
    const overallDiscount = money(req.body.overall_discount);
    const customerPaidAmount = money(req.body.customer_paid_amount);
    const payableTotal = Math.max(stbAmount - stbDiscount - overallDiscount, 0);
    let approvalGroupId = existingStb.approval_group_id;
    if (!approvalGroupId && payableTotal > 0) {
      const createdApproval = await createApprovalGroup(db, req, 'STB_UPDATE');
      approvalGroupId = createdApproval.approvalGroupId;
    }
    const stbStatus = String(req.body.status || 'ACTIVE').toUpperCase();
    const [updateResult] = await db.query(
      `UPDATE cable_customer_stbs
       SET approval_group_id = ?, stb_master_id = ?, stb_type = ?, issue_mode = ?, stb_no = ?, stb_amount = ?, stb_discount = ?, labour_service_charge = ?,
           installed_date = ?, updated_date = ?, update_reason = ?, reason_remarks = ?,
           installed_by_employee_id = ?, status = ?, updated_at = NOW()
       WHERE customer_stb_id = ? AND cable_customer_id = ?`,
      [
        approvalGroupId, stbMasterId, stbType, issueMode, existingStb.stb_no || stbMaster?.stb_number,
        stbAmount, stbDiscount,
        laborAmount, req.body.installed_date || req.body.updated_date || new Date(),
        req.body.updated_date || req.body.installed_date || new Date(), updateReason,
        nullable(req.body.remarks || req.body.reason_remarks), intOrNull(req.body.installed_by_employee_id), stbStatus,
        customerStbId, cableCustomerId
      ]
    );
    if (!updateResult.affectedRows) return res.status(404).json({ message: 'STB details not found' });
    if (['FAULT', 'DAMAGED', 'BROKEN', 'BURNT'].includes(String(updateReason || '').toUpperCase())) {
      const faultMasterId = await upsertFaultStbMaster(db, {
        stb_master_id: stbMasterId,
        stb_no: existingStb.stb_no || stbMaster?.stb_number,
        reason: updateReason,
        mso_id: existingStb.installed_mso_id,
        stb_amount: stbAmount,
        updated_date: req.body.updated_date || req.body.installed_date || new Date()
      });
      if (faultMasterId) {
        await db.query(
          'UPDATE cable_customer_stbs SET stb_master_id = ? WHERE customer_stb_id = ?',
          [faultMasterId, customerStbId]
        );
      }
    }
    await db.query(
      "UPDATE cable_tv_customers SET status = CASE WHEN customer_type IN ('FREE','LEASE_LINE') THEN customer_type ELSE ? END WHERE cable_customer_id = ?",
      [customerStatusForStbStatus(stbStatus), cableCustomerId]
    );
    if (approvalGroupId) {
      const [[linkedAccount]] = await db.query(
        `SELECT account_id FROM cable_customer_accounts
         WHERE approval_group_id = ? ORDER BY account_id DESC LIMIT 1`,
        [approvalGroupId]
      );
      if (linkedAccount) {
        await db.query(
          `UPDATE cable_customer_accounts
           SET overall_discount = ?, customer_paid_amount = ?, updated_at = NOW()
           WHERE account_id = ?`,
          [overallDiscount, customerPaidAmount, linkedAccount.account_id]
        );
        await recalculateLinkedPendingAccount(db, approvalGroupId);
      } else if (payableTotal > 0) {
        await addPendingAccount(db, req, {
          approval_group_id: approvalGroupId,
          cable_customer_id: cableCustomerId,
          stb_amount: stbAmount,
          labor_amount: laborAmount,
          discount: stbDiscount,
          overall_discount: overallDiscount,
          customer_paid_amount: customerPaidAmount,
          approval_status: 'APPROVED',
          created_by_user_id: currentUserId(req)
        });
      }
    }
    return res.json({ message: 'STB details updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'STB update failed', error: error.message });
  }
};

const deleteCustomerStb = async (req, res) => {
  const db = connection.promise();
  try {
    await db.beginTransaction();
    const cableCustomerId = Number(req.params.id);
    const customerStbId = Number(req.params.stbId);
    const [[stbRecord]] = await db.query(
      `SELECT customer_stb_id, stb_master_id, approval_group_id
       FROM cable_customer_stbs
       WHERE customer_stb_id = ? AND cable_customer_id = ?
       LIMIT 1 FOR UPDATE`,
      [customerStbId, cableCustomerId]
    );
    if (!stbRecord) {
      await db.rollback();
      return res.status(404).json({ message: 'STB record not found' });
    }
    await db.query(
      'DELETE FROM cable_stb_issue_master WHERE customer_stb_id = ? AND cable_customer_id = ?',
      [customerStbId, cableCustomerId]
    );
    await db.query(
      'DELETE FROM cable_customer_stbs WHERE customer_stb_id = ? AND cable_customer_id = ?',
      [customerStbId, cableCustomerId]
    );
    if (stbRecord.stb_master_id) {
      await db.query(
        `UPDATE cable_stb_master
         SET status = 'AVAILABLE', assigned_employee_id = NULL, updated_at = NOW()
         WHERE stb_master_id = ?
           AND NOT EXISTS (
             SELECT 1 FROM cable_stb_issue_master issued_stb
             WHERE issued_stb.stb_master_id = cable_stb_master.stb_master_id
               AND issued_stb.issue_status = 'ISSUED'
           )`,
        [stbRecord.stb_master_id]
      );
    }
    await recalculateLinkedPendingAccount(db, stbRecord.approval_group_id);
    await synchronizeLatestCustomerStbStatus(db, [cableCustomerId]);
    await db.commit();
    return res.json({ message: 'STB details deleted successfully' });
  } catch (error) {
    await db.rollback();
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
    const employeeId = await resolveEmployeeId(
      db,
      req,
      req.res?.locals?.employee_id || payload.updated_by_employee_id
    );
    const [[pkg]] = await db.query(
      'SELECT package_id, package_name, price FROM cable_package_master WHERE package_id = ? AND is_active = 1',
      [payload.package_id]
    );
    if (!pkg) {
      await db.rollback();
      return res.status(400).json({ message: 'Selected package was not found or is inactive' });
    }
    const [[activeSamePackage]] = await db.query(
      `SELECT cp.customer_package_id
       FROM cable_customer_packages cp
       INNER JOIN cable_package_master active_pkg ON active_pkg.package_id = cp.package_id
       WHERE cp.cable_customer_id = ?
         AND LOWER(TRIM(active_pkg.package_name)) = LOWER(TRIM(?))
         AND cp.is_active = 1 AND cp.approval_status IN ('PENDING', 'APPROVED')
       LIMIT 1`,
      [cableCustomerId, pkg.package_name]
    );
    if (activeSamePackage) {
      await db.rollback();
      return res.status(400).json({ message: 'This package is already active. Deactivate the previous package before adding it again.' });
    }
    const packagePrice = money(payload.package_price ?? pkg?.price);
    if (approvalStatus === 'APPROVED') {
      await db.query(
        `UPDATE cable_customer_packages
         SET is_active = 0, package_price = 0, end_date = COALESCE(end_date, CURDATE()), updated_at = NOW()
         WHERE cable_customer_id = ? AND package_type = ? AND is_active = 1
           AND approval_status = 'APPROVED'`,
        [cableCustomerId, packageType]
      );
    }
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
  const db = connection.promise();
  try {
    await ensureCableTvExtendedTables(db);
    await db.beginTransaction();
    const cableCustomerId = Number(req.params.id);
    const customerPackageId = Number(req.params.packageId);
    const packageType = normalizePackageType(req.body.package_type);
    const isActive = Number(req.body.is_active ?? 1) === 1 ? 1 : 0;
    const employeeId = await resolveEmployeeId(
      db,
      req,
      req.res?.locals?.employee_id || req.body.updated_by_employee_id
    );
    const [[pkg]] = await db.query(
      'SELECT package_id, package_name, price FROM cable_package_master WHERE package_id = ?',
      [req.body.package_id]
    );
    if (!pkg) {
      await db.rollback();
      return res.status(400).json({ message: 'Selected package was not found' });
    }
    if (isActive) {
      const [[activeDuplicate]] = await db.query(
        `SELECT cp.customer_package_id
         FROM cable_customer_packages cp
         INNER JOIN cable_package_master active_pkg ON active_pkg.package_id = cp.package_id
         WHERE cp.cable_customer_id = ?
           AND LOWER(TRIM(active_pkg.package_name)) = LOWER(TRIM(?))
           AND cp.is_active = 1 AND cp.approval_status = 'APPROVED'
           AND cp.customer_package_id <> ?
         LIMIT 1`,
        [cableCustomerId, pkg.package_name, customerPackageId]
      );
      if (activeDuplicate) {
        await db.rollback();
        return res.status(400).json({ message: 'This package is already active. Remove the previous package before adding it again.' });
      }
      if (packageType === 'ADDON') {
        await db.query(
          `UPDATE cable_customer_packages
           SET is_active = 0, package_price = 0,
               end_date = COALESCE(end_date, CURDATE()), updated_at = NOW()
           WHERE cable_customer_id = ? AND package_type = 'ADDON' AND is_active = 1
             AND approval_status = 'APPROVED' AND customer_package_id <> ?`,
          [cableCustomerId, customerPackageId]
        );
      }
    }
    const [linkedSubscriptionGroups] = await db.query(
      `SELECT DISTINCT approval_group_id
       FROM cable_subscriptions
       WHERE customer_package_id = ? AND cable_customer_id = ? AND approval_group_id IS NOT NULL`,
      [customerPackageId, cableCustomerId]
    );
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
    if (isActive) {
      await db.query(
        `UPDATE cable_subscriptions
         SET amount = ROUND(? * COALESCE(NULLIF(received_count, 0), 1), 0),
             balance_amount = GREATEST(
               ROUND(? * COALESCE(NULLIF(received_count, 0), 1), 0) - COALESCE(paid_amount, 0),
               0
             ),
             updated_at = NOW()
         WHERE customer_package_id = ?
           AND cable_customer_id = ?
           AND payment_status = 'PENDING'`,
        [packagePrice, packagePrice, customerPackageId, cableCustomerId]
      );
    }
    for (const linked of linkedSubscriptionGroups) {
      await recalculateLinkedPendingAccount(db, linked.approval_group_id);
    }
    await db.commit();
    return res.json({ message: 'Package details updated successfully' });
  } catch (error) {
    try { await db.rollback(); } catch (_rollbackError) {}
    return res.status(500).json({ message: 'Package update failed', error: error.message });
  }
};

const removeCustomerPackage = async (req, res) => {
  const db = connection.promise();
  try {
    await ensureCableTvExtendedTables(db);
    await db.beginTransaction();
    const cableCustomerId = Number(req.params.id);
    const customerPackageId = Number(req.params.packageId);
    const [[packageRow]] = await db.query(
      `SELECT cp.*, pkg.package_name
       FROM cable_customer_packages cp
       INNER JOIN cable_package_master pkg ON pkg.package_id = cp.package_id
       WHERE cp.customer_package_id = ? AND cp.cable_customer_id = ?
         AND cp.is_active = 1 AND cp.approval_status = 'APPROVED'
       FOR UPDATE`,
      [customerPackageId, cableCustomerId]
    );
    if (!packageRow) {
      await db.rollback();
      return res.status(404).json({ message: 'Active package was not found' });
    }
    const packageType = normalizePackageType(packageRow.package_type);
    if (!['ALACARTE', 'BROADCASTER'].includes(packageType)) {
      await db.rollback();
      return res.status(400).json({ message: 'Remove action is available only for Alacarte and Broadcaster packages' });
    }
    const employeeId = await resolveEmployeeId(db, req, req.res?.locals?.employee_id);
    if (isAdmin(req)) {
      await db.query(
        `UPDATE cable_customer_packages
         SET is_active = 0, package_price = 0, end_date = CURDATE(),
             removal_status = 'APPROVED', removal_requested_at = NOW(),
             updated_by_employee_id = ?, updated_at = NOW()
         WHERE customer_package_id = ? AND cable_customer_id = ?`,
        [employeeId, customerPackageId, cableCustomerId]
      );
      await db.commit();
      return res.json({ message: `${packageRow.package_name} removed successfully` });
    }

    if (String(packageRow.removal_status || 'NONE').toUpperCase() === 'PENDING') {
      await db.rollback();
      return res.status(409).json({ message: 'A removal request for this package is already waiting for administrator approval' });
    }

    const { approvalGroupId } = await createApprovalGroup(db, req, 'PACKAGE_UPDATE');
    await db.query(
      `UPDATE cable_customer_packages
       SET approval_group_id = ?, removal_status = 'PENDING', removal_requested_at = NOW(),
           updated_by_employee_id = ?, updated_at = NOW()
       WHERE customer_package_id = ? AND cable_customer_id = ?`,
      [approvalGroupId, employeeId, customerPackageId, cableCustomerId]
    );
    await db.commit();
    return res.status(201).json({ message: `${packageRow.package_name} removal sent for administrator approval` });
  } catch (error) {
    try { await db.rollback(); } catch (_rollbackError) {}
    return res.status(500).json({ message: 'Package removal failed', error: error.message });
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
    // Subscription collection is handled directly in the CATV Subscription list.
    // It does not require the general administrator workflow.
    const approvalGroupId = null;
    const approvalStatus = 'APPROVED';
    const createdBy = currentUserId(req);
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
    const billingBasis = String(payload.billing_basis || 'MONTH').toUpperCase();
    const numberOfDays = billingBasis === 'DAY'
      ? subscriptionBillingDays(startDate)
      : money(payload.number_of_days_or_months || inclusiveDays(startDate, expiryDate));
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
         AND cp.is_active = 1 AND cp.approval_status = 'APPROVED'
       LIMIT 1`,
      [payload.customer_package_id, cableCustomerId]
    );
    if (!customerPackage) {
      await db.rollback();
      return res.status(400).json({ message: 'Select an active approved package before adding the subscription' });
    }
    const packageAmount = money(payload.package_amount ?? customerPackage?.package_price ?? customerPackage?.master_price);
    const amount = billingBasis === 'DAY'
      ? money((packageAmount / monthDays) * numberOfDays)
      : money(payload.amount || packageAmount);
    const paidAmount = money(payload.paid_amount);
    if (paidAmount > amount) {
      await db.rollback();
      return res.status(400).json({ message: 'Paid Amount cannot exceed Subscription Amount' });
    }
    const balanceAmount = Math.max(money(amount - paidAmount), 0);
    const paymentStatus = balanceAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING';
    const employeeId = await resolveEmployeeId(db, req, payload.collected_by_employee_id);
    if (!employeeId) {
      await db.rollback();
      return res.status(400).json({ message: 'Collected By employee name is required' });
    }
    const paymentMode = isAdmin(req) ? String(payload.payment_mode || 'CASH').toUpperCase() : 'CASH';
    const paymentMappedEmployeeId = isAdmin(req) && ['ONLINE', 'OFFICE'].includes(paymentMode)
      ? intOrNull(payload.payment_mapped_employee_id)
      : null;
    if (isAdmin(req) && ['ONLINE', 'OFFICE'].includes(paymentMode) && !paymentMappedEmployeeId) {
      await db.rollback();
      return res.status(400).json({ message: 'Payment Mapped Employee is required for Online or Office payment' });
    }
    if (paymentMappedEmployeeId) {
      const [[mappedEmployee]] = await db.query('SELECT employee_id FROM employees WHERE employee_id = ? LIMIT 1', [paymentMappedEmployeeId]);
      if (!mappedEmployee) {
        await db.rollback();
        return res.status(400).json({ message: 'Selected Payment Mapped Employee is invalid' });
      }
    }
    const collectDate = isAdmin(req) ? nullable(payload.collect_date) : dateOnly(new Date());
    const optionalColumns = await existingColumns(db, 'cable_subscriptions', ['payment_reference', 'payment_mapped_employee_id', 'received_count']);
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
    if (optionalColumns.has('payment_mapped_employee_id')) {
      subscriptionColumns.push('payment_mapped_employee_id');
      subscriptionValues.push(paymentMappedEmployeeId);
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
      `SELECT sub.*, c.status AS customer_status
       FROM cable_subscriptions sub
       JOIN cable_tv_customers c ON c.cable_customer_id = sub.cable_customer_id
       WHERE sub.cable_customer_id = ? AND sub.subscription_id = ?
       LIMIT 1`,
      [cableCustomerId, subscriptionId]
    );
    if (!existingSubscription) {
      return res.status(404).json({ message: 'Subscription record not found for update' });
    }
    if (!isAdmin(req) && String(existingSubscription.payment_status || '').toUpperCase() === 'PAID') {
      return res.status(403).json({ message: 'Paid subscription details cannot be edited' });
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
    const amount = isAdmin(req) ? money(req.body.amount) : money(existingSubscription.amount);
    const requestedStatus = String(req.body.payment_status || 'PENDING').toUpperCase();
    let paidAmount = money(req.body.paid_amount);
    if (isAdmin(req) && requestedStatus === 'PAID') paidAmount = amount;
    if (!isAdmin(req) && paidAmount < money(existingSubscription.paid_amount)) {
      return res.status(400).json({ message: 'Paid Amount cannot be less than the amount already collected' });
    }
    if (paidAmount > amount) {
      return res.status(400).json({ message: 'Paid Amount cannot exceed Subscription Amount' });
    }
    const balanceAmount = Math.max(money(amount - paidAmount), 0);
    const paymentStatus = balanceAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING';
    const receivedCount = money(req.body.received_count || 1);
    const employeeId = await resolveEmployeeId(db, req, req.body.collected_by_employee_id);
    if (!employeeId) {
      return res.status(400).json({ message: 'Collected By employee name is required' });
    }
    const paymentMode = isAdmin(req) ? String(req.body.payment_mode || 'CASH').toUpperCase() : 'CASH';
    const paymentMappedEmployeeId = isAdmin(req) && ['ONLINE', 'OFFICE'].includes(paymentMode)
      ? intOrNull(req.body.payment_mapped_employee_id)
      : null;
    if (isAdmin(req) && ['ONLINE', 'OFFICE'].includes(paymentMode) && !paymentMappedEmployeeId) {
      return res.status(400).json({ message: 'Payment Mapped Employee is required for Online or Office payment' });
    }
    if (paymentMappedEmployeeId) {
      const [[mappedEmployee]] = await db.query('SELECT employee_id FROM employees WHERE employee_id = ? LIMIT 1', [paymentMappedEmployeeId]);
      if (!mappedEmployee) return res.status(400).json({ message: 'Selected Payment Mapped Employee is invalid' });
    }
    const collectDate = isAdmin(req) ? nullable(req.body.collect_date) : dateOnly(new Date());
    const optionalColumns = await existingColumns(db, 'cable_subscriptions', ['payment_reference', 'payment_mapped_employee_id', 'received_count']);
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
    if (optionalColumns.has('payment_mapped_employee_id')) {
      setClauses.push('payment_mapped_employee_id = ?');
      values.push(paymentMappedEmployeeId);
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
    await recalculateLinkedPendingAccount(db, existingSubscription.approval_group_id);
    return res.json({ message: 'Subscription details updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Subscription update failed', error: error.message });
  }
};

const deleteCustomerSubscription = async (req, res) => {
  try {
    const db = connection.promise();
    const subscriptionId = Number(req.params.subscriptionId);
    const cableCustomerId = Number(req.params.id);
    const [[existingSubscription]] = await db.query(
      `SELECT approval_group_id FROM cable_subscriptions
       WHERE subscription_id = ? AND cable_customer_id = ? LIMIT 1`,
      [subscriptionId, cableCustomerId]
    );
    await db.query(
      'DELETE FROM cable_subscriptions WHERE subscription_id = ? AND cable_customer_id = ?',
      [subscriptionId, cableCustomerId]
    );
    await recalculateLinkedPendingAccount(db, existingSubscription?.approval_group_id);
    return res.json({ message: 'Subscription details deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Subscription delete failed', error: error.message });
  }
};

module.exports = {
  recalculateLinkedPendingAccount,
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
  updateStbMaster,
  deleteStbMaster,
  assignStbMaster,
  getPendingAccounts,
  getLoAccounts,
  getPendingSubscriptions,
  previewSubscriptionGeneration,
  generateMonthlySubscriptions,
  getCableSubscriptionReport,
  getStbPaymentReport,
  getAccountPayments,
  receiveSubscriptionPayment,
  receiveAccount,
  revertAccountToPending,
  getCableCustomers,
  getCableCustomerById,
  addCableCustomer,
  updateCableCustomer,
  updateCableCustomerInformation,
  addCustomerConnection,
  updateCustomerConnection,
  deleteCustomerConnection,
  addCustomerStb,
  updateCustomerStb,
  deleteCustomerStb,
  addCustomerPackage,
  updateCustomerPackage,
  removeCustomerPackage,
  deleteCustomerPackage,
  addCustomerSubscription,
  updateCustomerSubscription,
  deleteCustomerSubscription
};
