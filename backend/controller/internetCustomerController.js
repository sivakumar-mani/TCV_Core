const connection = require('../connection');
const { ensureTransactionTable } = require('./transactionController');

const money = (value) => Math.round(Number(value) || 0);
const intOrNull = (value) => Number(value) || null;
const textOrNull = (value) => String(value || '').trim() || null;
const isAdmin = (req) => String(req.res?.locals?.role || '').toUpperCase() === 'ADMIN';
const userId = (req) => Number(req.res?.locals?.userId || req.res?.locals?.user_id) || null;
const resolveLoggedInEmployeeId = async (db, req) => {
  const tokenEmployeeId = intOrNull(req.res?.locals?.employee_id);
  if (tokenEmployeeId) return tokenEmployeeId;
  const username = req.res?.locals?.username || req.res?.locals?.userName;
  if (!username) return null;
  const [[employee]] = await db.query(
    `SELECT employee_id FROM employees
     WHERE employee_code = ? OR email = ? OR CONCAT_WS(' ', first_name, last_name) = ? LIMIT 1`,
    [username, username, username]
  );
  return employee?.employee_id || null;
};
const dateOnly = (value) => {
  const date = new Date(value || new Date());
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const ensureInternetSchema = async (db) => {
  const [[categoryColumn]] = await db.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_package_master' AND COLUMN_NAME = 'service_category'`
  );
  if (!categoryColumn.count) {
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
  await db.query(`CREATE TABLE IF NOT EXISTS internet_customers (
    internet_customer_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_code INT NOT NULL, legacy_customer_no VARCHAR(100) NULL, network_type ENUM('KRISHI','RAILWIRE','DMNET') NOT NULL,
    full_name VARCHAR(200) NOT NULL, net_id VARCHAR(150) NOT NULL, network_password VARCHAR(255) NULL,
    door_no VARCHAR(50) NOT NULL, location_id INT NOT NULL, area_id INT NOT NULL, street_id INT NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'Tamil Nadu', city VARCHAR(100) NOT NULL, pincode VARCHAR(10) NULL,
    mobile_no VARCHAR(20) NOT NULL, alternate_mobile_no VARCHAR(20) NULL, aadhaar_no VARCHAR(20) NULL,
    source_name ENUM('Customer Approach Office','Direct','Customer Approach Engineer') NOT NULL DEFAULT 'Direct',
    installed_by_employee_id INT NULL, installed_date DATE NOT NULL, status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    created_by_user_id INT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_internet_customer_code (customer_code), UNIQUE KEY uk_internet_net_id (net_id),
    INDEX idx_internet_customer_name (full_name), INDEX idx_internet_customer_mobile (mobile_no)
  ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [[legacyCustomerColumn]] = await db.query(`SELECT COUNT(*) count FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='internet_customers' AND column_name='legacy_customer_no'`);
  if (!legacyCustomerColumn.count) {
    await db.query('ALTER TABLE internet_customers ADD COLUMN legacy_customer_no VARCHAR(100) NULL AFTER customer_code, ADD INDEX idx_internet_legacy_customer_no (legacy_customer_no)');
  }
  await db.query(`CREATE TABLE IF NOT EXISTS internet_customer_packages (
    internet_customer_package_id BIGINT AUTO_INCREMENT PRIMARY KEY, internet_customer_id BIGINT NOT NULL,
    package_id INT NOT NULL, package_price DECIMAL(12,2) NOT NULL DEFAULT 0, start_date DATE NOT NULL,
    end_date DATE NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_internet_package_customer (internet_customer_id),
    CONSTRAINT fk_internet_package_customer FOREIGN KEY (internet_customer_id) REFERENCES internet_customers(internet_customer_id) ON DELETE CASCADE,
    CONSTRAINT fk_internet_package_master FOREIGN KEY (package_id) REFERENCES cable_package_master(package_id)
  ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS internet_customer_routers (
    internet_router_id BIGINT AUTO_INCREMENT PRIMARY KEY, internet_customer_id BIGINT NOT NULL,
    router_type ENUM('NEW','SERVICED','RETURNED') NOT NULL DEFAULT 'NEW', product_id INT NOT NULL,
    hsn_code VARCHAR(30) NULL, qty DECIMAL(10,2) NOT NULL DEFAULT 1, unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    rate DECIMAL(12,2) NOT NULL DEFAULT 0, amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    INDEX idx_internet_router_customer (internet_customer_id),
    CONSTRAINT fk_internet_router_customer FOREIGN KEY (internet_customer_id) REFERENCES internet_customers(internet_customer_id) ON DELETE CASCADE,
    CONSTRAINT fk_internet_router_product FOREIGN KEY (product_id) REFERENCES products(product_id)
  ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS internet_connections (
    internet_connection_id BIGINT AUTO_INCREMENT PRIMARY KEY, internet_customer_id BIGINT NOT NULL,
    connection_date DATE NOT NULL, connection_type ENUM('NEW','RECONNECTION','LOCATION_CHANGE') NOT NULL DEFAULT 'NEW',
    connection_charge DECIMAL(12,2) NOT NULL DEFAULT 0, connection_discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    labour_service_charge DECIMAL(12,2) NOT NULL DEFAULT 0, remarks VARCHAR(500) NULL,
    CONSTRAINT fk_internet_connection_customer FOREIGN KEY (internet_customer_id) REFERENCES internet_customers(internet_customer_id) ON DELETE CASCADE
  ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS internet_connection_materials (
    internet_material_id BIGINT AUTO_INCREMENT PRIMARY KEY, internet_customer_id BIGINT NOT NULL,
    product_id INT NULL, item_name VARCHAR(200) NOT NULL, qty DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS', unit_rate DECIMAL(12,2) NOT NULL DEFAULT 0, amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_internet_material_customer FOREIGN KEY (internet_customer_id) REFERENCES internet_customers(internet_customer_id) ON DELETE CASCADE,
    CONSTRAINT fk_internet_material_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL
  ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS internet_subscriptions (
    internet_subscription_id BIGINT AUTO_INCREMENT PRIMARY KEY, internet_customer_id BIGINT NOT NULL,
    internet_customer_package_id BIGINT NOT NULL, subscription_month INT NOT NULL, subscription_year INT NOT NULL,
    start_date DATE NOT NULL, end_date DATE NOT NULL, amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0, balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_status ENUM('PENDING','PARTIAL','PAID') NOT NULL DEFAULT 'PENDING', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_internet_subscription_period (internet_customer_id, subscription_month, subscription_year),
    CONSTRAINT fk_internet_subscription_customer FOREIGN KEY (internet_customer_id) REFERENCES internet_customers(internet_customer_id) ON DELETE CASCADE,
    CONSTRAINT fk_internet_subscription_package FOREIGN KEY (internet_customer_package_id) REFERENCES internet_customer_packages(internet_customer_package_id) ON DELETE CASCADE
  ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS internet_customer_accounts (
    internet_account_id BIGINT AUTO_INCREMENT PRIMARY KEY, internet_customer_id BIGINT NOT NULL,
    router_amount DECIMAL(12,2) NOT NULL DEFAULT 0, router_discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    connection_amount DECIMAL(12,2) NOT NULL DEFAULT 0, labor_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    material_cost DECIMAL(12,2) NOT NULL DEFAULT 0, material_discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    subscription_amount DECIMAL(12,2) NOT NULL DEFAULT 0, overall_discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(12,2) NOT NULL DEFAULT 0, customer_paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    office_received_amount DECIMAL(12,2) NOT NULL DEFAULT 0, office_balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0, due_date DATE NULL,
    account_status ENUM('PENDING','PARTIAL','PAID') NOT NULL DEFAULT 'PENDING',
    approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_internet_account_customer FOREIGN KEY (internet_customer_id) REFERENCES internet_customers(internet_customer_id) ON DELETE CASCADE
  ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  for (const [column, definition] of [
    ['router_discount', 'DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER router_amount'],
    ['material_discount', 'DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER material_cost']
  ]) {
    const [[existing]] = await db.query(
      `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'internet_customer_accounts' AND COLUMN_NAME = ?`,
      [column]
    );
    if (!existing.count) await db.query(`ALTER TABLE internet_customer_accounts ADD COLUMN ${column} ${definition}`);
  }
  for (const [table, column, definition] of [
    ['internet_customers', 'approval_status', "ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING' AFTER status"],
    ['internet_customer_accounts', 'approval_status', "ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING' AFTER account_status"],
    ['internet_customer_accounts', 'office_received_amount', 'DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER customer_paid_amount'],
    ['internet_customer_accounts', 'office_balance_amount', 'DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER office_received_amount'],
    ['internet_customer_accounts', 'due_date', 'DATE NULL AFTER balance_amount']
    ,['internet_customer_accounts', 'account_source', "ENUM('LEGACY','CONNECTION','ROUTER','PACKAGE','SUBSCRIPTION') NOT NULL DEFAULT 'LEGACY' AFTER internet_customer_id"]
    ,['internet_customer_packages', 'approval_status', "ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'APPROVED' AFTER is_active"]
    ,['internet_customer_packages', 'updated_by_employee_id', 'INT NULL AFTER approval_status']
    ,['internet_customer_packages', 'updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at']
    ,['internet_customer_routers', 'approval_status', "ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'APPROVED' AFTER amount"]
    ,['internet_customer_routers', 'usage_category', "ENUM('CUSTOMER_PAID','FREE_USE') NOT NULL DEFAULT 'CUSTOMER_PAID' AFTER router_type"]
    ,['internet_customer_routers', 'discount', 'DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER rate']
    ,['internet_customer_routers', 'created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER amount']
    ,['internet_customer_routers', 'updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at']
    ,['internet_customer_routers', 'remarks', 'VARCHAR(500) NULL AFTER amount']
    ,['internet_customer_routers', 'returned_router_qty', 'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER remarks']
    ,['internet_customer_routers', 'returned_adapter_product_id', 'INT NULL AFTER returned_router_qty']
    ,['internet_customer_routers', 'returned_adapter_qty', 'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER returned_adapter_product_id']
    ,['internet_customer_routers', 'refund_amount', 'DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER returned_adapter_qty']
    ,['internet_customer_routers', 'refund_payment_mode', "ENUM('CASH','ONLINE','OTHER') NOT NULL DEFAULT 'CASH' AFTER refund_amount"]
    ,['internet_customer_routers', 'refund_status', "ENUM('NOT_APPLICABLE','PENDING') NOT NULL DEFAULT 'NOT_APPLICABLE' AFTER refund_payment_mode"]
    ,['internet_customer_routers', 'updated_by_employee_id', 'INT NULL AFTER refund_status']
    ,['internet_customer_routers', 'stock_processed', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER updated_by_employee_id']
    ,['internet_customer_routers', 'update_reason', 'VARCHAR(50) NULL AFTER remarks']
    ,['internet_customer_routers', 'reason_remarks', 'VARCHAR(500) NULL AFTER update_reason']
    ,['internet_customer_routers', 'router_status', "ENUM('ACTIVE','DISCONNECTED','FAULT','DAMAGED','RETURNED','REPLACED') NOT NULL DEFAULT 'ACTIVE' AFTER reason_remarks"]
    ,['internet_connections', 'approval_status', "ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'APPROVED' AFTER remarks"]
    ,['internet_connections', 'connection_status', "ENUM('ACTIVE','DISCONNECTED') NOT NULL DEFAULT 'ACTIVE' AFTER connection_type"]
    ,['internet_connections', 'installed_by_employee_id', 'INT NULL AFTER connection_status']
    ,['internet_connections', 'old_address', 'VARCHAR(500) NULL AFTER installed_by_employee_id']
    ,['internet_connections', 'new_address', 'VARCHAR(500) NULL AFTER old_address']
    ,['internet_connections', 'new_door_no', 'VARCHAR(50) NULL AFTER new_address']
    ,['internet_connections', 'new_location_id', 'INT NULL AFTER new_door_no']
    ,['internet_connections', 'new_area_id', 'INT NULL AFTER new_location_id']
    ,['internet_connections', 'new_street_id', 'INT NULL AFTER new_area_id']
    ,['internet_subscriptions', 'approval_status', "ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'APPROVED' AFTER payment_status"]
    ,['internet_subscriptions', 'billing_basis', "ENUM('MONTH','YEAR') NOT NULL DEFAULT 'MONTH' AFTER subscription_year"]
    ,['internet_subscriptions', 'period_count', 'INT NOT NULL DEFAULT 1 AFTER billing_basis']
    ,['internet_subscriptions', 'additional_months', 'INT NOT NULL DEFAULT 0 AFTER period_count']
    ,['internet_subscriptions', 'additional_days', 'INT NOT NULL DEFAULT 0 AFTER additional_months']
    ,['internet_subscriptions', 'additional_years', 'INT NOT NULL DEFAULT 0 AFTER additional_days']
    ,['internet_subscriptions', 'collect_date', 'DATE NULL AFTER end_date']
    ,['internet_subscriptions', 'collected_by_employee_id', 'INT NULL AFTER collect_date']
    ,['internet_subscriptions', 'renewed_by', "ENUM('LOGGED_IN_USER','CUSTOMER','ADMIN') NOT NULL DEFAULT 'LOGGED_IN_USER' AFTER collected_by_employee_id"]
    ,['internet_subscriptions', 'renewed_by_employee_id', 'INT NULL AFTER renewed_by']
    ,['internet_subscriptions', 'payment_mode', "ENUM('CASH','ONLINE','BANK_PAYMENT') NOT NULL DEFAULT 'CASH' AFTER renewed_by"]
    ,['internet_subscriptions', 'payment_reference', 'VARCHAR(150) NULL AFTER payment_mode']
    ,['internet_subscriptions', 'payment_mapped_employee_id', 'INT NULL AFTER payment_reference']
    ,['internet_subscriptions', 'cash_admin_locked', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER payment_mapped_employee_id']
    ,['internet_subscriptions', 'period_value', 'DECIMAL(10,2) NOT NULL DEFAULT 1 AFTER billing_basis']
    ,['internet_subscriptions', 'free_period_value', 'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER additional_years']
    ,['internet_subscriptions', 'free_period_unit', "ENUM('MONTH','DAYS','YEAR') NOT NULL DEFAULT 'MONTH' AFTER free_period_value"]
  ]) {
    const [[existing]] = await db.query(`SELECT COUNT(*) count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`, [table, column]);
    if (!existing.count) await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  await db.query(`UPDATE internet_customer_accounts SET account_source='SUBSCRIPTION' WHERE account_source='LEGACY' AND subscription_amount>0 AND router_amount=0 AND connection_amount=0 AND labor_amount=0 AND material_cost=0`);
  await db.query("ALTER TABLE internet_subscriptions MODIFY billing_basis ENUM('MONTH','DAYS','YEAR') NOT NULL DEFAULT 'MONTH'");
  await db.query('ALTER TABLE internet_subscriptions MODIFY period_count DECIMAL(10,4) NOT NULL DEFAULT 1');
  await db.query("ALTER TABLE internet_subscriptions MODIFY renewed_by ENUM('LOGGED_IN_USER','EMPLOYEE','CUSTOMER','ADMIN') NOT NULL DEFAULT 'LOGGED_IN_USER'");
  await db.query("ALTER TABLE internet_subscriptions MODIFY payment_mode ENUM('DASHBOARD','CASH','ONLINE','BANK_PAYMENT') NOT NULL DEFAULT 'DASHBOARD'");
  await db.query("ALTER TABLE internet_connections MODIFY connection_type ENUM('NEW','RECONNECTION','LOCATION_CHANGE','DISCONNECT') NOT NULL DEFAULT 'NEW'");
  await db.query(`CREATE TABLE IF NOT EXISTS workflow_approvals (
    workflow_id INT AUTO_INCREMENT PRIMARY KEY, module_name VARCHAR(50) NOT NULL, reference_id INT NOT NULL,
    reference_no VARCHAR(50) NOT NULL, workflow_status ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
    requested_by_employee_id INT NULL, approved_by_employee_id INT NULL, requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL, remarks TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_workflow_reference (module_name, reference_id)
  ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS internet_customer_account_payments (
    internet_payment_id BIGINT AUTO_INCREMENT PRIMARY KEY, internet_account_id BIGINT NOT NULL,
    cash_amount DECIMAL(12,2) NOT NULL DEFAULT 0, online_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    received_amount DECIMAL(12,2) NOT NULL DEFAULT 0, paid_date DATE NOT NULL, received_date DATE NOT NULL,
    due_date DATE NULL, balance_after_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_status ENUM('PARTIAL','PAID') NOT NULL, received_by_user_id INT NULL,
    received_by_employee_id INT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_internet_account_payment FOREIGN KEY(internet_account_id) REFERENCES internet_customer_accounts(internet_account_id) ON DELETE CASCADE
  ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS internet_customer_complaints (
    internet_complaint_id BIGINT AUTO_INCREMENT PRIMARY KEY, internet_customer_id BIGINT NOT NULL,
    complaint_date DATE NOT NULL, subject VARCHAR(200) NOT NULL, description VARCHAR(1000) NULL,
    complaint_status ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
    created_by_user_id INT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_internet_complaint_customer (internet_customer_id),
    CONSTRAINT fk_internet_complaint_customer FOREIGN KEY (internet_customer_id) REFERENCES internet_customers(internet_customer_id) ON DELETE CASCADE
  ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
};

const internetLookups = async (req, res) => {
  try {
    const db = connection.promise(); await ensureInternetSchema(db);
    const employeeId = await resolveLoggedInEmployeeId(db, req);
    const [packages] = await db.query(`SELECT *,
      ROUND(CASE WHEN price_including_gst > 0 THEN price_including_gst ELSE price + (price * gst_percent / 100) END, 2) AS total_price
      FROM cable_package_master WHERE service_category = 'INTERNET' AND is_active = 1 ORDER BY package_name`);
    const routerEmployeeFilter=isAdmin(req)?'':'AND ts.employee_id = ?';
    const [routers] = (isAdmin(req)||employeeId) ? await db.query(`SELECT p.product_id, p.product_name, p.hsn_code, p.unit, p.selling_price,
        ts.employee_id, ts.available_qty
      FROM technician_material_stock ts
      JOIN products p ON p.product_id = ts.product_id
      JOIN categories c ON c.category_id = p.category_id
      WHERE ts.available_qty > 0 ${routerEmployeeFilter}
        AND p.status = 'ACTIVE'
        AND (LOWER(c.category_name) = 'router' OR LOWER(COALESCE(c.slug, '')) LIKE 'internet%')
      ORDER BY p.product_name`, isAdmin(req)?[]:[employeeId]) : [[]];
    const [products] = await db.query("SELECT product_id, product_name, hsn_code, unit, selling_price FROM products WHERE status = 'ACTIVE' ORDER BY product_name");
    const [locations] = await db.query('SELECT * FROM cable_locations WHERE is_active = 1 ORDER BY location_name');
    const [areas] = await db.query('SELECT * FROM cable_areas WHERE is_active = 1 ORDER BY area_name');
    const [streets] = await db.query('SELECT * FROM cable_streets WHERE is_active = 1 ORDER BY street_name');
    const [employees] = await db.query("SELECT employee_id, employee_code, CONCAT_WS(' ', first_name, last_name) employee_name FROM employees WHERE is_active = 1 ORDER BY first_name");
    return res.json({ packages, routers, products, locations, areas, streets, employees, logged_in_employee_id: employeeId, is_admin: isAdmin(req),
      networks: ['KRISHI','RAILWIRE','DMNET'], sources: ['Customer Approach Office','Direct','Customer Approach Engineer'] });
  } catch (error) { return res.status(500).json({ message: 'Internet customer lookups failed', error: error.message }); }
};

const getInternetCustomers = async (_req, res) => {
  try {
    const db = connection.promise(); await ensureInternetSchema(db);
    const [rows] = await db.query(`SELECT c.*, l.location_name, a.area_name, s.street_name,
      CONCAT_WS(' ', e.first_name, e.last_name) installed_by_name,
      CASE
        WHEN NULLIF(TRIM(c.legacy_customer_no), '') IS NOT NULL THEN
          CASE WHEN UPPER(COALESCE(c.status, 'INACTIVE')) = 'ACTIVE' THEN 'Active' ELSE 'Disconnected' END
        WHEN c.approval_status = 'REJECTED' OR acc.approval_status = 'REJECTED' THEN 'Rejected'
        WHEN EXISTS(SELECT 1 FROM workflow_approvals wa WHERE wa.module_name='INTERNET_CUSTOMER_UPDATE' AND wa.reference_id=c.internet_customer_id AND wa.workflow_status='PENDING') THEN 'Waiting Approval'
        WHEN COALESCE(c.approval_status, 'PENDING') <> 'APPROVED'
          OR COALESCE(acc.approval_status, 'PENDING') <> 'APPROVED' THEN 'Waiting Approval'
        WHEN COALESCE(acc.account_status, 'PENDING') IN ('PENDING','PARTIAL') THEN 'Pending Payment'
        WHEN acc.account_status = 'PAID' THEN 'Active'
        ELSE c.status
      END AS status,
      COALESCE(acc.account_status, 'PENDING') AS account_status,
      COALESCE((SELECT SUM(p.package_price) FROM internet_customer_packages p WHERE p.internet_customer_id=c.internet_customer_id AND p.is_active=1),0) package_amount,
      (SELECT GROUP_CONCAT(pm.package_name ORDER BY pm.package_name SEPARATOR ', ') FROM internet_customer_packages p JOIN cable_package_master pm ON pm.package_id=p.package_id WHERE p.internet_customer_id=c.internet_customer_id AND p.is_active=1) package_names
      FROM internet_customers c LEFT JOIN cable_locations l ON l.location_id=c.location_id
      LEFT JOIN cable_areas a ON a.area_id=c.area_id LEFT JOIN cable_streets s ON s.street_id=c.street_id
      LEFT JOIN employees e ON e.employee_id=c.installed_by_employee_id
      LEFT JOIN internet_customer_accounts acc ON acc.internet_account_id=(
        SELECT latest.internet_account_id FROM internet_customer_accounts latest
        WHERE latest.internet_customer_id=c.internet_customer_id
          AND NOT(latest.account_source='ROUTER' AND latest.grand_total=0)
        ORDER BY latest.internet_account_id DESC LIMIT 1
      )
      ORDER BY c.internet_customer_id DESC`);
    return res.json(rows);
  } catch (error) { return res.status(500).json({ message: 'Internet customers failed', error: error.message }); }
};

const getInternetCustomer = async (req, res) => {
  try {
    const db = connection.promise(); await ensureInternetSchema(db); const id = Number(req.params.id);
    const [[customer]] = await db.query(`SELECT c.*, l.location_name, a.area_name, s.street_name,
      CONCAT_WS(' ', e.first_name, e.last_name) installed_by_name FROM internet_customers c
      LEFT JOIN cable_locations l ON l.location_id=c.location_id LEFT JOIN cable_areas a ON a.area_id=c.area_id
      LEFT JOIN cable_streets s ON s.street_id=c.street_id LEFT JOIN employees e ON e.employee_id=c.installed_by_employee_id
      WHERE c.internet_customer_id=?`, [id]);
    if (!customer) return res.status(404).json({ message: 'Internet customer not found' });
    const [packages] = await db.query(`SELECT p.*, pm.package_name, pm.package_type, pm.price AS base_price,
      CONCAT_WS(' ', updated_by.first_name, updated_by.last_name) updated_by_name,
      pm.gst_percent, ROUND(CASE WHEN pm.price_including_gst > 0 THEN pm.price_including_gst ELSE pm.price + (pm.price * pm.gst_percent / 100) END, 2) AS total_price
      FROM internet_customer_packages p JOIN cable_package_master pm ON pm.package_id=p.package_id
      LEFT JOIN employees updated_by ON updated_by.employee_id=p.updated_by_employee_id
      WHERE p.internet_customer_id=? ORDER BY p.internet_customer_package_id DESC`, [id]);
    const [routers] = await db.query(`SELECT r.*, p.product_name,adapter.product_name returned_adapter_name,CONCAT_WS(' ',updated_by.first_name,updated_by.last_name) updated_by_name FROM internet_customer_routers r JOIN products p ON p.product_id=r.product_id LEFT JOIN products adapter ON adapter.product_id=r.returned_adapter_product_id LEFT JOIN employees updated_by ON updated_by.employee_id=r.updated_by_employee_id WHERE r.internet_customer_id=? ORDER BY r.internet_router_id DESC`, [id]);
    const [connections] = await db.query(`SELECT conn.*,CONCAT_WS(' ',e.first_name,e.last_name) installed_by_name FROM internet_connections conn LEFT JOIN employees e ON e.employee_id=conn.installed_by_employee_id WHERE conn.internet_customer_id=? ORDER BY conn.internet_connection_id DESC`, [id]);
    const [materials] = await db.query('SELECT * FROM internet_connection_materials WHERE internet_customer_id=?', [id]);
    const [subscriptions] = await db.query(`SELECT sub.*,CONCAT_WS(' ',e.first_name,e.last_name) collected_by_name,CONCAT_WS(' ',renewed.first_name,renewed.last_name) renewed_by_employee_name,CONCAT_WS(' ',mapped.first_name,mapped.last_name) payment_mapped_employee_name FROM internet_subscriptions sub LEFT JOIN employees e ON e.employee_id=sub.collected_by_employee_id LEFT JOIN employees renewed ON renewed.employee_id=sub.renewed_by_employee_id LEFT JOIN employees mapped ON mapped.employee_id=sub.payment_mapped_employee_id WHERE sub.internet_customer_id=? ORDER BY sub.internet_subscription_id DESC`, [id]);
    const [[account]] = await db.query("SELECT * FROM internet_customer_accounts WHERE internet_customer_id=? AND NOT(account_source='ROUTER' AND grand_total=0) ORDER BY internet_account_id DESC LIMIT 1", [id]);
    return res.json({ customer, packages, routers, connections, materials, subscriptions, account: account || {} });
  } catch (error) { return res.status(500).json({ message: 'Internet customer details failed', error: error.message }); }
};

const validateAddress = async (db, payload) => {
  const [[row]] = await db.query(`SELECT l.city, l.pincode FROM cable_locations l
    JOIN cable_areas a ON a.location_id=l.location_id JOIN cable_streets s ON s.area_id=a.area_id
    WHERE l.location_id=? AND a.area_id=? AND s.street_id=? AND l.is_active=1 AND a.is_active=1 AND s.is_active=1`,
  [payload.location_id, payload.area_id, payload.street_id]);
  return row;
};

const subscriptionDates = (network, startValue) => {
  const start = new Date(`${dateOnly(startValue)}T00:00:00Z`); const end = new Date(start);
  if (network === 'KRISHI') { if (start.getUTCDate() > 15) end.setUTCMonth(end.getUTCMonth()+1); end.setUTCDate(15); }
  else end.setUTCDate(end.getUTCDate()+29);
  return { start: dateOnly(start), end: dateOnly(end), days: Math.round((end-start)/86400000)+1 };
};

const saveInternetCustomer = async (req, res) => {
  const db = connection.promise();
  try {
    await ensureInternetSchema(db); await db.beginTransaction(); const payload=req.body||{}; const id=Number(req.params.id||0);
    const network=String(payload.network_type||'').toUpperCase();
    const netId=textOrNull(payload.net_id);
    const loggedInEmployeeId=await resolveLoggedInEmployeeId(db,req);
    const installedByEmployeeId=isAdmin(req)?intOrNull(payload.installed_by_employee_id):loggedInEmployeeId;
    const installedDate=isAdmin(req)?dateOnly(payload.installed_date):dateOnly(new Date());
    if (!['KRISHI','RAILWIRE','DMNET'].includes(network) || !payload.full_name || !netId || !payload.door_no || !payload.mobile_no || !installedDate) throw Object.assign(new Error('Network, Full Name, Netid, address, Mobile No and Installed Date are required'),{status:400});
    if(!installedByEmployeeId) throw Object.assign(new Error('Logged-in user is not mapped to an employee'),{status:400});
    const address=await validateAddress(db,payload); if(!address) throw Object.assign(new Error('Select a valid Postal Area, Location and Street mapping'),{status:400});
    const packages=(payload.packages||[]).filter(x=>x.package_id); const materials=(payload.materials||[]).filter(x=>x.product_id||x.item_name); const routers=(payload.routers||[]).filter(x=>x.product_id);
    if(new Set(packages.map(x=>Number(x.package_id))).size!==packages.length) throw Object.assign(new Error('Duplicate internet packages are not allowed'),{status:400});
    if(new Set(materials.map(x=>x.product_id?`p:${x.product_id}`:`n:${String(x.item_name).toLowerCase()}`)).size!==materials.length) throw Object.assign(new Error('Duplicate used materials are not allowed'),{status:400});
    if(new Set(routers.map(x=>Number(x.product_id))).size!==routers.length) throw Object.assign(new Error('Duplicate routers are not allowed'),{status:400});
    const [[netDuplicate]]=await db.query('SELECT internet_customer_id FROM internet_customers WHERE net_id=? AND internet_customer_id<>? LIMIT 1',[netId,id]); if(netDuplicate) throw Object.assign(new Error('Netid already exists'),{status:409});
    let customerId=id;
    const approvalStatus='PENDING';
    if(id){ await db.query(`UPDATE internet_customers SET network_type=?,full_name=?,net_id=?,network_password=?,door_no=?,location_id=?,area_id=?,street_id=?,state=?,city=?,pincode=?,mobile_no=?,alternate_mobile_no=?,aadhaar_no=?,source_name=?,installed_by_employee_id=?,installed_date=?,status=?,approval_status=?,updated_at=NOW() WHERE internet_customer_id=?`,[network,payload.full_name,netId,textOrNull(payload.network_password),payload.door_no,payload.location_id,payload.area_id,payload.street_id,payload.state||'Tamil Nadu',payload.city||address.city,textOrNull(payload.pincode)||address.pincode,payload.mobile_no,textOrNull(payload.alternate_mobile_no),textOrNull(payload.aadhaar_no),payload.source_name||'Direct',installedByEmployeeId,installedDate,payload.status||'ACTIVE',approvalStatus,id]); for(const table of ['internet_subscriptions','internet_customer_packages','internet_customer_routers','internet_connections','internet_connection_materials','internet_customer_accounts']) await db.query(`DELETE FROM ${table} WHERE internet_customer_id=?`,[id]); }
    else { const [[next]]=await db.query('SELECT COALESCE(MAX(customer_code),2000)+1 next_code FROM internet_customers'); const [result]=await db.query(`INSERT INTO internet_customers(customer_code,network_type,full_name,net_id,network_password,door_no,location_id,area_id,street_id,state,city,pincode,mobile_no,alternate_mobile_no,aadhaar_no,source_name,installed_by_employee_id,installed_date,status,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[next.next_code,network,payload.full_name,netId,textOrNull(payload.network_password),payload.door_no,payload.location_id,payload.area_id,payload.street_id,payload.state||'Tamil Nadu',payload.city||address.city,textOrNull(payload.pincode)||address.pincode,payload.mobile_no,textOrNull(payload.alternate_mobile_no),textOrNull(payload.aadhaar_no),payload.source_name||'Direct',installedByEmployeeId,installedDate,'ACTIVE',userId(req)]); customerId=result.insertId; }
    await db.query('UPDATE internet_customers SET approval_status=? WHERE internet_customer_id=?',[approvalStatus,customerId]);
    let subscriptionTotal=0;
    for(const item of packages){ const [[master]]=await db.query("SELECT price,gst_percent,price_including_gst,internet_network_type FROM cable_package_master WHERE package_id=? AND service_category='INTERNET' AND is_active=1",[item.package_id]); if(!master) throw Object.assign(new Error('Select only active Internet packages'),{status:400}); if(master.internet_network_type&&master.internet_network_type!==network) throw Object.assign(new Error(`Select only ${network} packages for this customer`),{status:400}); const price=money(Number(master.price_including_gst)>0?master.price_including_gst:Number(master.price)+(Number(master.price)*Number(master.gst_percent)/100)); const dates=subscriptionDates(network,item.start_date||installedDate); const month=new Date(`${dates.start}T00:00:00Z`).getUTCMonth()+1, year=Number(dates.start.slice(0,4)); if(!isAdmin(req)){ const [[dup]]=await db.query('SELECT internet_subscription_id FROM internet_subscriptions WHERE internet_customer_id=? AND subscription_month=? AND subscription_year=? AND internet_customer_package_id IN (SELECT internet_customer_package_id FROM internet_customer_packages WHERE package_id=?) LIMIT 1',[customerId,month,year,item.package_id]); if(dup) throw Object.assign(new Error('Subscription already exists for selected package month and year'),{status:409}); } const amount=network==='KRISHI'?money(price/ new Date(year,month,0).getDate()*dates.days):price; const [pr]=await db.query('INSERT INTO internet_customer_packages(internet_customer_id,package_id,package_price,start_date,end_date) VALUES(?,?,?,?,?)',[customerId,item.package_id,price,dates.start,dates.end]); await db.query('INSERT INTO internet_subscriptions(internet_customer_id,internet_customer_package_id,subscription_month,subscription_year,start_date,end_date,amount,balance_amount) VALUES(?,?,?,?,?,?,?,?)',[customerId,pr.insertId,month,year,dates.start,dates.end,amount,amount]); subscriptionTotal+=amount; }
    const routerStockEmployeeId=isAdmin(req)?installedByEmployeeId:loggedInEmployeeId;
    if(routers.length&&!routerStockEmployeeId) throw Object.assign(new Error('Select Installed By employee for router stock'),{status:400});
    let routerTotal=0,routerDiscount=0; for(const item of routers){ const [[p]]=await db.query(`SELECT p.hsn_code,p.unit,p.selling_price,ts.available_qty FROM technician_material_stock ts JOIN products p ON p.product_id=ts.product_id JOIN categories c ON c.category_id=p.category_id WHERE ts.employee_id=? AND ts.product_id=? AND ts.available_qty>0 AND p.status='ACTIVE' AND LOWER(COALESCE(c.slug,'')) LIKE 'internet%' FOR UPDATE`,[routerStockEmployeeId,item.product_id]); if(!p) throw Object.assign(new Error('Select an issued Internet router assigned to the Installed By employee'),{status:400}); const qty=money(item.qty||1); if(qty>money(p.available_qty)) throw Object.assign(new Error(`Router quantity cannot exceed issued stock (${money(p.available_qty)})`),{status:400}); const rate=money(p.selling_price),gross=money(qty*rate),usageCategory=String(item.usage_category||'CUSTOMER_PAID').toUpperCase()==='FREE_USE'?'FREE_USE':'CUSTOMER_PAID',routerItemDiscount=usageCategory==='FREE_USE'?gross:0,amount=money(gross-routerItemDiscount); routerTotal+=amount;routerDiscount+=routerItemDiscount; await db.query('INSERT INTO internet_customer_routers(internet_customer_id,router_type,usage_category,product_id,hsn_code,qty,unit,rate,discount,amount) VALUES(?,?,?,?,?,?,?,?,?,?)',[customerId,String(item.router_type||'NEW').toUpperCase(),usageCategory,item.product_id,p.hsn_code,qty,p.unit||'PCS',rate,routerItemDiscount,amount]); if(!id)await db.query('UPDATE technician_material_stock SET available_qty=available_qty-? WHERE employee_id=? AND product_id=?',[qty,routerStockEmployeeId,item.product_id]); }
    const conn=payload.connection||{}; await db.query('INSERT INTO internet_connections(internet_customer_id,connection_date,connection_type,connection_charge,connection_discount,labour_service_charge,remarks) VALUES(?,?,?,?,?,?,?)',[customerId,dateOnly(conn.connection_date||installedDate),conn.connection_type||'NEW',money(conn.connection_charge),money(conn.connection_discount),money(conn.labour_service_charge),textOrNull(conn.remarks)]);
    let materialTotal=0; for(const item of materials){ const qty=money(item.qty||1),rate=money(item.unit_rate),amount=money(item.amount||qty*rate); materialTotal+=amount; await db.query('INSERT INTO internet_connection_materials(internet_customer_id,product_id,item_name,qty,unit,unit_rate,amount) VALUES(?,?,?,?,?,?,?)',[customerId,intOrNull(item.product_id),item.item_name||'Material',qty,item.unit||'PCS',rate,amount]); }
    const laborAmount=money(conn.labour_service_charge),materialDiscount=money(payload.account?.material_discount),discount=money(conn.connection_discount)+materialDiscount+money(payload.account?.overall_discount), grand=Math.max(money(routerTotal+money(conn.connection_charge)+laborAmount+materialTotal+subscriptionTotal-discount),0),paid=money(payload.account?.customer_paid_amount),balance=Math.max(money(grand-paid),0); await db.query('INSERT INTO internet_customer_accounts(internet_customer_id,account_source,router_amount,router_discount,connection_amount,labor_amount,material_cost,material_discount,subscription_amount,overall_discount,grand_total,customer_paid_amount,office_received_amount,office_balance_amount,balance_amount,account_status,approval_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[customerId,'CONNECTION',routerTotal,routerDiscount,money(conn.connection_charge),laborAmount,materialTotal,materialDiscount,subscriptionTotal,money(payload.account?.overall_discount),grand,paid,0,grand,balance,'PENDING',approvalStatus]); const workflowRequester=loggedInEmployeeId||installedByEmployeeId;await db.query(`INSERT INTO workflow_approvals(module_name,reference_id,reference_no,workflow_status,requested_by_employee_id,remarks) VALUES('INTERNET_CUSTOMER',?,?, 'PENDING',?,'Internet customer approval') ON DUPLICATE KEY UPDATE workflow_status='PENDING',requested_by_employee_id=VALUES(requested_by_employee_id),reviewed_at=NULL,remarks=VALUES(remarks)`,[customerId,String(customerId),workflowRequester]); await db.commit(); return res.status(id?200:201).json({message:'Internet customer sent for admin approval',internet_customer_id:customerId,approval_status:approvalStatus,account_status:'PENDING'});
  } catch(error){ try{await db.rollback();}catch(_e){} if(error.code==='ER_DUP_ENTRY'&&String(error.message).includes('uk_internet_net_id'))return res.status(409).json({message:'Netid already exists'}); return res.status(error.status||500).json({message:error.message||'Internet customer save failed'}); }
};

const getInternetComplaints = async (req,res) => { try { const db=connection.promise();await ensureInternetSchema(db);const [rows]=await db.query('SELECT * FROM internet_customer_complaints WHERE internet_customer_id=? ORDER BY internet_complaint_id DESC',[Number(req.params.id)]);return res.json(rows); } catch(error){return res.status(500).json({message:'Internet complaints failed',error:error.message});} };
const addInternetComplaint = async (req,res) => { try { const db=connection.promise();await ensureInternetSchema(db);const subject=String(req.body.subject||'').trim();if(!subject)return res.status(400).json({message:'Complaint subject is required'});await db.query('INSERT INTO internet_customer_complaints(internet_customer_id,complaint_date,subject,description,complaint_status,created_by_user_id) VALUES(?,?,?,?,?,?)',[Number(req.params.id),dateOnly(req.body.complaint_date||new Date()),subject,textOrNull(req.body.description),'OPEN',userId(req)]);return res.status(201).json({message:'Internet complaint registered successfully'});}catch(error){return res.status(500).json({message:'Internet complaint save failed',error:error.message});} };

const updateInternetCustomerInformation = async (req,res) => {
  try {
    if(!isAdmin(req)) return res.status(403).json({message:'Administrator permission is required'});
    const db=connection.promise(); await ensureInternetSchema(db); const id=Number(req.params.id); const payload=req.body||{};
    const network=String(payload.network_type||'').toUpperCase(), fullName=String(payload.full_name||'').trim(), netId=String(payload.net_id||'').trim();
    const mobile=String(payload.mobile_no||'').trim(), alternate=String(payload.alternate_mobile_no||'').trim();
    const aadhaar=String(payload.aadhaar_no||'').trim(), source=String(payload.source_name||'').trim();
    const installedBy=intOrNull(payload.installed_by_employee_id);
    if(!id||!['KRISHI','RAILWIRE','DMNET'].includes(network)||!fullName||!netId||!/^\d{10}$/.test(mobile)||
      (alternate&&!/^\d{10}$/.test(alternate))||(aadhaar&&!/^\d{12}$/.test(aadhaar))||
      !['Customer Approach Office','Direct','Customer Approach Engineer'].includes(source)||!installedBy) {
      return res.status(400).json({message:'Enter valid required customer information'});
    }
    const [[customer]]=await db.query('SELECT approval_status FROM internet_customers WHERE internet_customer_id=?',[id]);
    if(!customer) return res.status(404).json({message:'Internet customer not found'});
    if(customer.approval_status!=='APPROVED') return res.status(409).json({message:'Approve the Internet customer workflow before updating customer information'});
    const [[duplicateNetId]]=await db.query('SELECT internet_customer_id FROM internet_customers WHERE net_id=? AND internet_customer_id<>? LIMIT 1',[netId,id]);
    if(duplicateNetId) return res.status(409).json({message:'Net ID is already assigned to another Internet customer'});
    const [[employee]]=await db.query('SELECT employee_id FROM employees WHERE employee_id=? AND is_active=1',[installedBy]);
    if(!employee) return res.status(400).json({message:'Select an active Installed By employee'});
    const [result]=await db.query(`UPDATE internet_customers SET network_type=?,full_name=?,net_id=?,mobile_no=?,alternate_mobile_no=?,aadhaar_no=?,source_name=?,installed_by_employee_id=?,updated_at=NOW() WHERE internet_customer_id=?`,[network,fullName,netId,mobile,textOrNull(alternate),textOrNull(aadhaar),source,installedBy,id]);
    if(!result.affectedRows) return res.status(404).json({message:'Internet customer not found'});
    return res.json({message:'Internet customer information updated successfully'});
  } catch(error){return res.status(500).json({message:'Internet customer information update failed',error:error.message});}
};

const addInternetCustomerHistory = async (req,res) => {
  const db=connection.promise();
  try{
    await ensureInternetSchema(db);await db.beginTransaction();const customerId=Number(req.params.id),section=String(req.params.section||'').toLowerCase(),p=req.body||{};
    if(!['subscriptions','routers','connections','packages'].includes(section))throw Object.assign(new Error('Invalid Internet customer section'),{status:400});
    const [[customer]]=await db.query("SELECT * FROM internet_customers WHERE internet_customer_id=? AND approval_status='APPROVED' FOR UPDATE",[customerId]);
    if(!customer)throw Object.assign(new Error('Approve the Internet customer before adding details'),{status:409});
    const [[latest]]=await db.query("SELECT account_status FROM internet_customer_accounts WHERE internet_customer_id=? AND NOT(account_source='ROUTER' AND grand_total=0) ORDER BY internet_account_id DESC LIMIT 1",[customerId]);
    if(latest?.account_status!=='PAID')throw Object.assign(new Error('Receive the pending account payment before adding details'),{status:409});
    const employeeId=isAdmin(req)?intOrNull(p.updated_by_employee_id||p.installed_by_employee_id)||await resolveLoggedInEmployeeId(db,req):await resolveLoggedInEmployeeId(db,req);
    if(!employeeId)throw Object.assign(new Error('Logged-in user is not mapped to an employee'),{status:400});
    const approval=isAdmin(req)?'APPROVED':'PENDING';let routerAmount=0,connectionAmount=0,laborAmount=0,subscriptionAmount=0,updatedRouterId=null,noPaymentRouterUpdate=false,noPaymentConnectionUpdate=false;
    if(section==='routers'){
      const [[latestRouter]]=await db.query("SELECT product_id,router_status,approval_status FROM internet_customer_routers WHERE internet_customer_id=? AND approval_status<>'REJECTED' ORDER BY internet_router_id DESC LIMIT 1 FOR UPDATE",[customerId]);
      const reason=String(p.update_reason||(latestRouter?'':'INSTALL')).toUpperCase(),disconnectReasons=new Set(['DISCONNECT','FAULT','DAMAGED','UPGRADE','RETURNED']),isStatusUpdate=Boolean(latestRouter)&&disconnectReasons.has(reason),isReplacement=reason==='REPLACED';
      noPaymentRouterUpdate=['FAULT','DISCONNECT','UPGRADE'].includes(reason);
      if(latestRouter?.approval_status==='PENDING')throw Object.assign(new Error('Approve the pending router update before adding another router update'),{status:409});
      if(latestRouter?.router_status==='ACTIVE'&&!isStatusUpdate)throw Object.assign(new Error('Disconnect the active router with a reason before replacing it'),{status:409});
      if(latestRouter&&latestRouter.router_status!=='ACTIVE'&&!isReplacement)throw Object.assign(new Error('A disconnected router can only be replaced'),{status:409});
      if(isStatusUpdate&&Number(p.product_id)!==Number(latestRouter.product_id))throw Object.assign(new Error('Select the currently active router'),{status:400});
      const routerType=reason==='RETURNED'?'RETURNED':isReplacement?'NEW':(['NEW','SERVICED'].includes(String(p.router_type||'').toUpperCase())?String(p.router_type).toUpperCase():'NEW'),qty=Math.max(money(p.qty||1),1);
      const [[product]]=isStatusUpdate
        ? await db.query("SELECT p.product_id,p.hsn_code,p.unit,p.selling_price FROM internet_customer_routers r JOIN products p ON p.product_id=r.product_id WHERE r.internet_customer_id=? AND r.product_id=? AND r.router_type<>'RETURNED' ORDER BY r.internet_router_id DESC LIMIT 1",[customerId,Number(p.product_id)])
        : await db.query("SELECT p.product_id,p.hsn_code,p.unit,p.selling_price FROM technician_material_stock ts JOIN products p ON p.product_id=ts.product_id WHERE ts.employee_id=? AND p.product_id=? AND ts.available_qty>=? AND p.status='ACTIVE' FOR UPDATE",[employeeId,Number(p.product_id),qty]);
      if(!product)throw Object.assign(new Error(routerType==='RETURNED'?'Select a router installed for this customer':'Select an issued router available with the logged-in employee'),{status:400});
      const category=String(p.usage_category||'CUSTOMER_PAID').toUpperCase()==='FREE_USE'?'FREE_USE':'CUSTOMER_PAID',rate=money(product.selling_price),gross=money(qty*rate),discount=category==='FREE_USE'?gross:0,amount=money(gross-discount),returnedRouterQty=routerType==='RETURNED'&&p.returned_router?1:0,returnedAdapterQty=routerType==='RETURNED'&&p.returned_adapter?1:0,adapterProductId=returnedAdapterQty?intOrNull(p.returned_adapter_product_id):null,refundAmount=routerType==='RETURNED'?Math.max(money(p.refund_amount),0):0,refundMode=['CASH','ONLINE','OTHER'].includes(String(p.refund_payment_mode||'').toUpperCase())?String(p.refund_payment_mode).toUpperCase():'CASH';
      if(returnedAdapterQty){const [[adapter]]=await db.query("SELECT product_id FROM products WHERE product_id=? AND LOWER(REPLACE(product_name,' ','')) REGEXP 'adapt(or|er).*12v.*1amp' AND status='ACTIVE'",[adapterProductId]);if(!adapter)throw Object.assign(new Error('Select VK Adaptor 12V 1amp'),{status:400});}
      const routerStatus=['DISCONNECT','UPGRADE'].includes(reason)?'DISCONNECTED':isStatusUpdate?reason:'ACTIVE';routerAmount=isStatusUpdate?0:amount;const [routerResult]=await db.query('INSERT INTO internet_customer_routers(internet_customer_id,router_type,usage_category,product_id,hsn_code,qty,unit,rate,discount,amount,remarks,update_reason,reason_remarks,router_status,returned_router_qty,returned_adapter_product_id,returned_adapter_qty,refund_amount,refund_payment_mode,refund_status,updated_by_employee_id,stock_processed,approval_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[customerId,routerType,category,product.product_id,product.hsn_code,qty,product.unit||'PCS',rate,isStatusUpdate?0:discount,isStatusUpdate?0:amount,textOrNull(p.remarks),reason,textOrNull(p.reason_remarks||p.remarks),routerStatus,returnedRouterQty,adapterProductId,returnedAdapterQty,refundAmount,refundMode,refundAmount>0?'PENDING':'NOT_APPLICABLE',employeeId,isAdmin(req)?1:0,approval]);updatedRouterId=routerResult.insertId;
      if(isAdmin(req)){
        const movements=routerType==='RETURNED'?[[product.product_id,returnedRouterQty],[adapterProductId,returnedAdapterQty]]:isStatusUpdate?[]:[[product.product_id,-qty]];
        for(const [productId,change] of movements){if(!productId||!change)continue;await db.query('INSERT INTO technician_material_stock(employee_id,product_id,available_qty) VALUES(?,?,?) ON DUPLICATE KEY UPDATE available_qty=available_qty+VALUES(available_qty)',[employeeId,productId,change]);}
      }
      if(refundAmount>0){await ensureTransactionTable(db);await db.query(`INSERT INTO finance_transactions(transaction_date,transaction_type,category,amount,payment_mode,reference_no,description,source_module,source_id,created_by_user_id,created_by_employee_id) VALUES(CURDATE(),'DEBIT','Internet Router Return Refund',?,?,?,?, 'INTERNET_ROUTER_RETURN',?,?,?)`,[refundAmount,refundMode,`NET-ROUTER-${routerResult.insertId}`,`Customer refund for returned Internet router`,routerResult.insertId,userId(req),employeeId]);}
    }else if(section==='connections'){
      const [[latestConnection]]=await db.query("SELECT connection_status,approval_status FROM internet_connections WHERE internet_customer_id=? AND approval_status<>'REJECTED' ORDER BY internet_connection_id DESC LIMIT 1 FOR UPDATE",[customerId]);
      if(latestConnection?.approval_status==='PENDING')throw Object.assign(new Error('Approve the pending connection update before adding another'),{status:409});
      const type=String(p.connection_type||'').toUpperCase();if(latestConnection?.connection_status==='ACTIVE'&&!['DISCONNECT','LOCATION_CHANGE'].includes(type))throw Object.assign(new Error('Active connection can only be disconnected or location changed'),{status:409});if(latestConnection?.connection_status==='DISCONNECTED'&&type!=='RECONNECTION')throw Object.assign(new Error('Disconnected connection can only be reconnected'),{status:409});
      connectionAmount=type==='DISCONNECT'?0:money(p.connection_charge);laborAmount=type==='DISCONNECT'?0:money(p.labour_service_charge);const discount=type==='DISCONNECT'?0:money(p.connection_discount),chargeable=Math.max(connectionAmount+laborAmount-discount,0);noPaymentConnectionUpdate=chargeable<=0;
      let oldAddress=null,newAddress=null,newDoorNo=null,newLocationId=null,newAreaId=null,newStreetId=null;if(type==='LOCATION_CHANGE'){newDoorNo=textOrNull(p.new_door_no);newLocationId=intOrNull(p.new_location_id);newAreaId=intOrNull(p.new_area_id);newStreetId=intOrNull(p.new_street_id);const [[mapping]]=await db.query(`SELECT l.location_name,a.area_name,s.street_name,l.city,l.pincode FROM cable_locations l JOIN cable_areas a ON a.location_id=l.location_id JOIN cable_streets s ON s.area_id=a.area_id WHERE l.location_id=? AND a.area_id=? AND s.street_id=? LIMIT 1`,[newLocationId,newAreaId,newStreetId]);if(!newDoorNo||!mapping)throw Object.assign(new Error('Enter Door No and select a valid Location, Area and Street'),{status:400});const [[currentAddress]]=await db.query(`SELECT l.location_name,a.area_name,s.street_name FROM internet_customers c LEFT JOIN cable_locations l ON l.location_id=c.location_id LEFT JOIN cable_areas a ON a.area_id=c.area_id LEFT JOIN cable_streets s ON s.street_id=c.street_id WHERE c.internet_customer_id=?`,[customerId]);oldAddress=[customer.door_no,currentAddress?.street_name,currentAddress?.area_name,currentAddress?.location_name,customer.city,customer.pincode].filter(Boolean).join(', ');newAddress=[newDoorNo,mapping.street_name,mapping.area_name,mapping.location_name,mapping.city,mapping.pincode].filter(Boolean).join(', ');}
      const connectionStatus=type==='DISCONNECT'?'DISCONNECTED':'ACTIVE';await db.query('INSERT INTO internet_connections(internet_customer_id,connection_date,connection_type,connection_status,installed_by_employee_id,old_address,new_address,new_door_no,new_location_id,new_area_id,new_street_id,connection_charge,connection_discount,labour_service_charge,remarks,approval_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[customerId,dateOnly(p.connection_date),type,connectionStatus,employeeId,oldAddress,newAddress,newDoorNo,newLocationId,newAreaId,newStreetId,connectionAmount,discount,laborAmount,textOrNull(p.remarks),approval]);
      if(isAdmin(req)){if(type==='DISCONNECT')await db.query("UPDATE internet_customers SET status='INACTIVE',updated_at=NOW() WHERE internet_customer_id=?",[customerId]);else if(type==='RECONNECTION')await db.query("UPDATE internet_customers SET status='ACTIVE',updated_at=NOW() WHERE internet_customer_id=?",[customerId]);else await db.query("UPDATE internet_customers SET door_no=?,location_id=?,area_id=?,street_id=?,updated_at=NOW() WHERE internet_customer_id=?",[newDoorNo,newLocationId,newAreaId,newStreetId,customerId]);}
    }else if(section==='packages'){
      const [[pkg]]=await db.query("SELECT package_id,price,gst_percent,price_including_gst,internet_network_type FROM cable_package_master WHERE package_id=? AND service_category='INTERNET' AND is_active=1",[Number(p.package_id)]);if(!pkg)throw Object.assign(new Error('Select an active Internet package'),{status:400});if(pkg.internet_network_type&&pkg.internet_network_type!==customer.network_type)throw Object.assign(new Error(`Select only ${customer.network_type} packages for this customer`),{status:400});
      const [[duplicatePackage]]=await db.query("SELECT internet_customer_package_id FROM internet_customer_packages WHERE internet_customer_id=? AND package_id=? AND approval_status<>'REJECTED' AND (is_active=1 OR approval_status='PENDING') LIMIT 1",[customerId,pkg.package_id]);if(duplicatePackage)throw Object.assign(new Error('This package is already assigned to the customer'),{status:409});
      const [[pendingPackage]]=await db.query("SELECT internet_customer_package_id FROM internet_customer_packages WHERE internet_customer_id=? AND approval_status='PENDING' LIMIT 1",[customerId]);if(pendingPackage)throw Object.assign(new Error('Approve or remove the pending package request before adding another package'),{status:409});
      const start=dateOnly(p.start_date);if(!start)throw Object.assign(new Error('Select a valid package start date'),{status:400});
      const [[period]]=await db.query("SELECT DATE_FORMAT(DATE_ADD(?,INTERVAL 1 YEAR),'%Y-%m-%d') end_date",[start]);
      const price=money(Number(pkg.price_including_gst)>0?pkg.price_including_gst:Number(pkg.price)+(Number(pkg.price)*Number(pkg.gst_percent)/100));subscriptionAmount=price;
      if(isAdmin(req))await db.query("UPDATE internet_customer_packages SET is_active=0,package_price=0,updated_at=NOW() WHERE internet_customer_id=? AND is_active=1 AND approval_status='APPROVED'",[customerId]);
      await db.query('INSERT INTO internet_customer_packages(internet_customer_id,package_id,package_price,start_date,end_date,is_active,approval_status,updated_by_employee_id) VALUES(?,?,?,?,?,?,?,?)',[customerId,pkg.package_id,price,start,period.end_date,isAdmin(req)?1:0,approval,employeeId]);
    }else{
      let packageId=Number(p.internet_customer_package_id);let [[pkg]]=packageId?await db.query('SELECT internet_customer_package_id,package_price FROM internet_customer_packages WHERE internet_customer_package_id=? AND internet_customer_id=? AND is_active=1',[packageId,customerId]):[[]];if(!pkg){[[pkg]]=await db.query('SELECT internet_customer_package_id,package_price FROM internet_customer_packages WHERE internet_customer_id=? AND is_active=1 ORDER BY internet_customer_package_id DESC LIMIT 1',[customerId]);packageId=Number(pkg?.internet_customer_package_id);}if(!pkg)throw Object.assign(new Error('No active Internet package is assigned to this customer'),{status:400});
      const basis=['MONTH','DAYS','YEAR'].includes(String(p.period_unit||'').toUpperCase())?String(p.period_unit).toUpperCase():'MONTH',freeUnit=['MONTH','DAYS','YEAR'].includes(String(p.free_period_unit||'').toUpperCase())?String(p.free_period_unit).toUpperCase():'MONTH';
      const value=Math.min(Math.max(Number(p.period_value)||1,1),basis==='DAYS'?31:12),freeValue=Math.min(Math.max(Number(p.free_period_value)||0,0),freeUnit==='DAYS'?31:12);
      const [[prior]]=await db.query("SELECT DATE_FORMAT(DATE_ADD(MAX(end_date),INTERVAL 1 DAY),'%Y-%m-%d') start_date FROM internet_subscriptions WHERE internet_customer_id=?",[customerId]);let start;
      if(prior?.start_date)start=new Date(`${prior.start_date}T00:00:00Z`);else start=new Date(Date.UTC(Number(p.subscription_year)||new Date().getUTCFullYear(),Math.max((Number(p.subscription_month)||1)-1,0),customer.network_type==='KRISHI'?16:1));
      const daysInMonth=new Date(start.getUTCFullYear(),start.getUTCMonth()+1,0).getDate(),count=basis==='YEAR'?value*12:basis==='DAYS'?value/daysInMonth:value;let end=new Date(start);if(basis==='DAYS')end.setUTCDate(end.getUTCDate()+value-1);else if(customer.network_type==='KRISHI'){end.setUTCMonth(end.getUTCMonth()+count);end.setUTCDate(15);}else end.setUTCDate(end.getUTCDate()+count*30-1);if(freeUnit==='DAYS')end.setUTCDate(end.getUTCDate()+freeValue);else if(customer.network_type==='KRISHI')end.setUTCMonth(end.getUTCMonth()+freeValue*(freeUnit==='YEAR'?12:1));else end.setUTCDate(end.getUTCDate()+freeValue*(freeUnit==='YEAR'?360:30));
      const startValue=dateOnly(start),endValue=dateOnly(end),amount=money(pkg.package_price*count),paid=Math.min(Math.max(money(p.paid_amount),0),amount),subscriptionBalance=Math.max(amount-paid,0),autoStatus=subscriptionBalance<=0?'PAID':paid>0?'PARTIAL':'PENDING';subscriptionAmount=amount;
      const paymentStatus=isAdmin(req)&&['PENDING','PARTIAL','PAID'].includes(String(p.payment_status||'').replace('UNPAID','PENDING'))?String(p.payment_status).replace('UNPAID','PENDING'):autoStatus,collectDate=isAdmin(req)?dateOnly(p.collect_date):dateOnly(new Date()),collectedBy=isAdmin(req)?intOrNull(p.collected_by_employee_id):employeeId;
      const renewedValue=isAdmin(req)?String(p.renewed_by_value||''):(p.renewed_by_value==='CUSTOMER'?'CUSTOMER':`EMPLOYEE:${employeeId}`),renewedBy=['ADMIN','CUSTOMER'].includes(renewedValue)?renewedValue:'EMPLOYEE',renewedByEmployeeId=renewedBy==='EMPLOYEE'?intOrNull(renewedValue.split(':')[1])||employeeId:null;
      const paymentMode=isAdmin(req)&&renewedBy==='ADMIN'&&['DASHBOARD','CASH','ONLINE'].includes(p.payment_mode)?p.payment_mode:'DASHBOARD',paymentReference=isAdmin(req)?textOrNull(p.payment_reference):null,paymentMappedEmployee=isAdmin(req)?intOrNull(p.payment_mapped_employee_id):null;
      await db.query(`INSERT INTO internet_subscriptions(internet_customer_id,internet_customer_package_id,subscription_month,subscription_year,billing_basis,period_value,period_count,additional_months,additional_days,additional_years,free_period_value,free_period_unit,start_date,end_date,collect_date,collected_by_employee_id,renewed_by,renewed_by_employee_id,payment_mode,payment_reference,payment_mapped_employee_id,amount,paid_amount,balance_amount,payment_status,approval_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[customerId,packageId,start.getUTCMonth()+1,start.getUTCFullYear(),basis,value,count,0,0,0,freeValue,freeUnit,startValue,endValue,collectDate,collectedBy,renewedBy,renewedByEmployeeId,paymentMode,paymentReference,paymentMappedEmployee,amount,paid,subscriptionBalance,paymentStatus,approval]);
      p.customer_paid_amount=paid;
    }
    const grand=money(routerAmount+connectionAmount+laborAmount+subscriptionAmount),paid=money(p.customer_paid_amount),balance=Math.max(grand-paid,0);
    if(!['subscriptions','packages'].includes(section)&&!noPaymentRouterUpdate&&!noPaymentConnectionUpdate)await db.query('INSERT INTO internet_customer_accounts(internet_customer_id,account_source,router_amount,connection_amount,labor_amount,subscription_amount,grand_total,customer_paid_amount,office_received_amount,office_balance_amount,balance_amount,account_status,approval_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',[customerId,section.slice(0,-1).toUpperCase(),routerAmount,connectionAmount,laborAmount,subscriptionAmount,grand,paid,0,grand,balance,'PENDING',approval]);
    if(!isAdmin(req)){const workflowRemarks=updatedRouterId?`Internet customer router update:${updatedRouterId}`:`Internet customer ${section.replace(/s$/,'')} update`;await db.query(`INSERT INTO workflow_approvals(module_name,reference_id,reference_no,workflow_status,requested_by_employee_id,remarks) VALUES('INTERNET_CUSTOMER_UPDATE',?,?,'PENDING',?,?) ON DUPLICATE KEY UPDATE workflow_status='PENDING',requested_by_employee_id=VALUES(requested_by_employee_id),reviewed_at=NULL,remarks=VALUES(remarks)`,[customerId,String(customer.customer_code),employeeId,workflowRemarks]);}
    await db.commit();return res.status(201).json({message:isAdmin(req)?'Internet customer detail added successfully':'Internet customer update sent for admin approval'});
  }catch(error){try{await db.rollback();}catch(_e){}return res.status(error.status||500).json({message:error.message||'Internet customer detail save failed'});}
};

const getPendingInternetSubscriptions = async (req,res) => {
  try {
    const db=connection.promise(); await ensureInternetSchema(db);
    const values=[]; const conditions=["s.approval_status<>'REJECTED'","s.balance_amount>0","s.payment_status<>'PAID'","c.approval_status='APPROVED'"];
    if(req.query.customer_no){conditions.push("COALESCE(NULLIF(TRIM(c.legacy_customer_no),''),CAST(c.customer_code AS CHAR)) LIKE ?");values.push(`%${String(req.query.customer_no).trim()}%`);}
    if(req.query.customer_name){conditions.push('c.full_name LIKE ?');values.push(`%${String(req.query.customer_name).trim()}%`);}
    if(req.query.area_id){conditions.push('c.area_id=?');values.push(Number(req.query.area_id));}
    if(req.query.street_id){conditions.push('c.street_id=?');values.push(Number(req.query.street_id));}
    const [rows]=await db.query(`SELECT s.*,c.internet_customer_id,c.customer_code,c.legacy_customer_no,COALESCE(NULLIF(TRIM(c.legacy_customer_no),''),CAST(c.customer_code AS CHAR)) display_customer_no,c.full_name,c.net_id,c.network_type,c.door_no,c.city,c.pincode,c.status customer_status,a.area_name,st.street_name,pm.package_name,cp.package_price FROM internet_subscriptions s JOIN internet_customers c ON c.internet_customer_id=s.internet_customer_id LEFT JOIN cable_areas a ON a.area_id=c.area_id LEFT JOIN cable_streets st ON st.street_id=c.street_id LEFT JOIN internet_customer_packages cp ON cp.internet_customer_package_id=s.internet_customer_package_id LEFT JOIN cable_package_master pm ON pm.package_id=cp.package_id WHERE ${conditions.join(' AND ')} ORDER BY CAST(COALESCE(NULLIF(TRIM(c.legacy_customer_no),''),CAST(c.customer_code AS CHAR)) AS UNSIGNED),s.start_date`,values);
    const map=new Map();for(const row of rows){let customer=map.get(row.internet_customer_id);if(!customer){customer={...row,pending_subscriptions:[]};delete customer.internet_subscription_id;map.set(row.internet_customer_id,customer);}customer.pending_subscriptions.push({...row});}
    return res.json({customers:[...map.values()],total_customers:map.size});
  } catch(error){return res.status(500).json({message:'Internet subscription dues failed',error:error.message});}
};

const receiveInternetSubscriptionPayment = async (req,res) => {
  const db=connection.promise();try{await ensureInternetSchema(db);await db.beginTransaction();const id=Number(req.params.id);const [[row]]=await db.query(`SELECT s.* FROM internet_subscriptions s JOIN internet_customers c ON c.internet_customer_id=s.internet_customer_id WHERE s.internet_subscription_id=? AND s.approval_status<>'REJECTED' AND c.approval_status='APPROVED' FOR UPDATE`,[id]);if(!row)throw Object.assign(new Error('Internet subscription not found'),{status:404});
    const employeeId=await resolveLoggedInEmployeeId(db,req);const received=money(req.body.received_amount),amount=money(req.body.amount||row.amount),available=money(Math.max(amount-Number(row.paid_amount),0));if(received<=0||received>available)throw Object.assign(new Error(`Received amount must be between 1 and ${available}`),{status:400});
    const paid=money(Number(row.paid_amount)+received),remaining=money(Math.max(amount-paid,0)),status=remaining===0?'PAID':'PARTIAL';const collectedBy=isAdmin(req)?intOrNull(req.body.collected_by_employee_id)||employeeId:employeeId;const collectDate=isAdmin(req)?dateOnly(req.body.collect_date||new Date()):dateOnly(new Date());const mode=row.cash_admin_locked?'CASH':isAdmin(req)&&['DASHBOARD','CASH','ONLINE'].includes(String(req.body.payment_mode||'').toUpperCase())?String(req.body.payment_mode).toUpperCase():'DASHBOARD';
    const renewedValue=String(req.body.renewed_by_value||'');const renewedBy=row.cash_admin_locked?'ADMIN':renewedValue==='CUSTOMER'?'CUSTOMER':'EMPLOYEE';const renewedEmployee=renewedBy==='EMPLOYEE'?(isAdmin(req)?intOrNull(renewedValue.split(':')[1])||employeeId:employeeId):null;
    const basis=['MONTH','DAYS','YEAR'].includes(String(req.body.period_unit||'').toUpperCase())?String(req.body.period_unit).toUpperCase():row.billing_basis,freeUnit=['MONTH','DAYS','YEAR'].includes(String(req.body.free_period_unit||'').toUpperCase())?String(req.body.free_period_unit).toUpperCase():row.free_period_unit;
    await db.query('UPDATE internet_subscriptions SET subscription_month=?,subscription_year=?,billing_basis=?,period_value=?,period_count=?,free_period_value=?,free_period_unit=?,start_date=?,end_date=?,amount=?,paid_amount=?,balance_amount=?,payment_status=?,collect_date=?,collected_by_employee_id=?,renewed_by=?,renewed_by_employee_id=?,payment_mode=?,payment_reference=?,payment_mapped_employee_id=? WHERE internet_subscription_id=?',[Number(req.body.subscription_month)||row.subscription_month,Number(req.body.subscription_year)||row.subscription_year,basis,Number(req.body.period_value)||1,Number(req.body.period_count)||1,Number(req.body.free_period_value)||0,freeUnit,dateOnly(req.body.start_date)||row.start_date,dateOnly(req.body.end_date)||row.end_date,amount,paid,remaining,status,collectDate,collectedBy,renewedBy,renewedEmployee,mode,isAdmin(req)?textOrNull(req.body.payment_reference):null,isAdmin(req)?intOrNull(req.body.payment_mapped_employee_id):null,id]);await db.commit();return res.json({message:'Internet subscription updated successfully',payment_status:status,balance_amount:remaining});
  }catch(error){try{await db.rollback();}catch(_e){}return res.status(error.status||500).json({message:error.message||'Internet subscription payment failed'});}
};

const updateInternetSubscription = async (req,res) => {
  try {
    const db=connection.promise();await ensureInternetSchema(db);const customerId=Number(req.params.id),subscriptionId=Number(req.params.subscriptionId),p=req.body||{};
    const [[row]]=await db.query('SELECT internet_subscription_id,payment_status,cash_admin_locked FROM internet_subscriptions WHERE internet_subscription_id=? AND internet_customer_id=?',[subscriptionId,customerId]);if(!row)return res.status(404).json({message:'Internet subscription not found'});
    if(!isAdmin(req)&&String(row.payment_status).toUpperCase()==='PAID')return res.status(409).json({message:'Paid subscriptions can only be edited by an administrator'});
    const employeeId=await resolveLoggedInEmployeeId(db,req);if(!isAdmin(req)&&!employeeId)return res.status(400).json({message:'Logged-in user is not mapped to an employee'});
    const start=dateOnly(p.start_date),end=dateOnly(p.end_date),amount=money(p.amount),paid=Math.min(Math.max(money(p.paid_amount),0),amount);if(!start||!end||end<start||amount<0)return res.status(400).json({message:'Enter valid subscription dates and amount'});
    const balance=money(Math.max(amount-paid,0)),status=balance===0?'PAID':paid>0?'PARTIAL':'PENDING',basis=['MONTH','DAYS','YEAR'].includes(String(p.period_unit||'').toUpperCase())?String(p.period_unit).toUpperCase():'MONTH',freeUnit=['MONTH','DAYS','YEAR'].includes(String(p.free_period_unit||'').toUpperCase())?String(p.free_period_unit).toUpperCase():'MONTH';
    const renewedValue=String(p.renewed_by_value||''),renewedBy=row.cash_admin_locked?'ADMIN':renewedValue==='CUSTOMER'?'CUSTOMER':isAdmin(req)&&renewedValue==='ADMIN'?'ADMIN':'EMPLOYEE',renewedEmployee=renewedBy==='EMPLOYEE'?(isAdmin(req)?intOrNull(renewedValue.split(':')[1]):employeeId):null,paymentMode=row.cash_admin_locked?'CASH':isAdmin(req)&&['DASHBOARD','CASH','ONLINE'].includes(String(p.payment_mode||'').toUpperCase())?String(p.payment_mode).toUpperCase():'DASHBOARD',collectDate=isAdmin(req)?dateOnly(p.collect_date):dateOnly(new Date()),collectedBy=isAdmin(req)?intOrNull(p.collected_by_employee_id):employeeId;
    await db.query(`UPDATE internet_subscriptions SET subscription_month=?,subscription_year=?,billing_basis=?,period_value=?,period_count=?,free_period_value=?,free_period_unit=?,start_date=?,end_date=?,collect_date=?,collected_by_employee_id=?,renewed_by=?,renewed_by_employee_id=?,payment_mode=?,payment_reference=?,payment_mapped_employee_id=?,amount=?,paid_amount=?,balance_amount=?,payment_status=? WHERE internet_subscription_id=? AND internet_customer_id=?`,[Number(p.subscription_month),Number(p.subscription_year),basis,Number(p.period_value)||1,Number(p.period_count)||1,Number(p.free_period_value)||0,freeUnit,start,end,collectDate,collectedBy,renewedBy,renewedEmployee,paymentMode,isAdmin(req)?textOrNull(p.payment_reference):null,isAdmin(req)?intOrNull(p.payment_mapped_employee_id):null,amount,paid,balance,status,subscriptionId,customerId]);
    return res.json({message:'Internet subscription updated successfully'});
  }catch(error){return res.status(error.status||500).json({message:error.message||'Internet subscription update failed'});}
};

const deleteInternetSubscription = async (req,res) => {
  try{if(!isAdmin(req))return res.status(403).json({message:'Administrator permission is required'});const db=connection.promise();await ensureInternetSchema(db);const [result]=await db.query('DELETE FROM internet_subscriptions WHERE internet_subscription_id=? AND internet_customer_id=?',[Number(req.params.subscriptionId),Number(req.params.id)]);if(!result.affectedRows)return res.status(404).json({message:'Internet subscription not found'});return res.json({message:'Internet subscription deleted successfully'});}catch(error){return res.status(500).json({message:'Internet subscription delete failed',error:error.message});}
};

const updateInternetCustomerPackage = async (req,res) => {
  const db=connection.promise();
  try{
    if(!isAdmin(req))return res.status(403).json({message:'Administrator permission is required'});
    await ensureInternetSchema(db);await db.beginTransaction();const customerId=Number(req.params.id),packageRowId=Number(req.params.packageRowId),p=req.body||{};
    const [[row]]=await db.query('SELECT * FROM internet_customer_packages WHERE internet_customer_package_id=? AND internet_customer_id=? FOR UPDATE',[packageRowId,customerId]);if(!row)throw Object.assign(new Error('Internet package detail not found'),{status:404});
    const [[pkg]]=await db.query("SELECT package_id,price,gst_percent,price_including_gst,internet_network_type FROM cable_package_master WHERE package_id=? AND service_category='INTERNET' AND is_active=1",[Number(p.package_id)]);if(!pkg)throw Object.assign(new Error('Select an active Internet package'),{status:400});const [[customer]]=await db.query('SELECT network_type FROM internet_customers WHERE internet_customer_id=?',[customerId]);if(pkg.internet_network_type&&pkg.internet_network_type!==customer?.network_type)throw Object.assign(new Error(`Select only ${customer?.network_type} packages for this customer`),{status:400});
    const [[duplicatePackage]]=await db.query("SELECT internet_customer_package_id FROM internet_customer_packages WHERE internet_customer_id=? AND package_id=? AND internet_customer_package_id<>? AND approval_status<>'REJECTED' AND (is_active=1 OR approval_status='PENDING') LIMIT 1",[customerId,pkg.package_id,packageRowId]);if(duplicatePackage)throw Object.assign(new Error('This package is already assigned to the customer'),{status:409});
    const start=dateOnly(p.start_date);if(!start)throw Object.assign(new Error('Select a valid package start date'),{status:400});const [[period]]=await db.query("SELECT DATE_FORMAT(DATE_ADD(?,INTERVAL 1 YEAR),'%Y-%m-%d') end_date",[start]);
    const employeeId=await resolveLoggedInEmployeeId(db,req),price=money(Number(pkg.price_including_gst)>0?pkg.price_including_gst:Number(pkg.price)+(Number(pkg.price)*Number(pkg.gst_percent)/100));
    await db.query("UPDATE internet_customer_packages SET is_active=0,package_price=0,updated_at=NOW() WHERE internet_customer_id=? AND internet_customer_package_id<>? AND is_active=1 AND approval_status='APPROVED'",[customerId,packageRowId]);
    await db.query("UPDATE internet_customer_packages SET package_id=?,package_price=?,start_date=?,end_date=?,is_active=1,approval_status='APPROVED',updated_by_employee_id=?,updated_at=NOW() WHERE internet_customer_package_id=? AND internet_customer_id=?",[pkg.package_id,price,start,period.end_date,employeeId,packageRowId,customerId]);
    await db.commit();return res.json({message:'Internet package detail updated successfully'});
  }catch(error){try{await db.rollback();}catch(_e){}return res.status(error.status||500).json({message:error.message||'Internet package update failed'});}
};

const deleteInternetCustomerPackage = async (req,res) => {
  try{if(!isAdmin(req))return res.status(403).json({message:'Administrator permission is required'});const db=connection.promise();await ensureInternetSchema(db);const employeeId=await resolveLoggedInEmployeeId(db,req);const [result]=await db.query("UPDATE internet_customer_packages SET package_price=0,is_active=0,approval_status=IF(approval_status='PENDING','REJECTED',approval_status),updated_by_employee_id=?,updated_at=NOW() WHERE internet_customer_package_id=? AND internet_customer_id=?",[employeeId,Number(req.params.packageRowId),Number(req.params.id)]);if(!result.affectedRows)return res.status(404).json({message:'Internet package detail not found'});return res.json({message:'Internet package detail removed successfully'});}catch(error){return res.status(500).json({message:'Internet package delete failed',error:error.message});}
};

const updateInternetCustomerRouter = async (req,res) => {
  try{if(!isAdmin(req))return res.status(403).json({message:'Administrator permission is required'});const db=connection.promise();await ensureInternetSchema(db);const customerId=Number(req.params.id),routerId=Number(req.params.routerId),p=req.body||{};const [[row]]=await db.query('SELECT * FROM internet_customer_routers WHERE internet_router_id=? AND internet_customer_id=?',[routerId,customerId]);if(!row)return res.status(404).json({message:'Internet router detail not found'});const reason=String(p.update_reason||row.update_reason||'INSTALL').toUpperCase(),allowed=new Set(['INSTALL','DISCONNECT','FAULT','DAMAGED','UPGRADE','RETURNED','REPLACED']);if(!allowed.has(reason))return res.status(400).json({message:'Select a valid router update reason'});const status=['INSTALL','REPLACED'].includes(reason)?'ACTIVE':['DISCONNECT','UPGRADE'].includes(reason)?'DISCONNECTED':reason;await db.query('UPDATE internet_customer_routers SET update_reason=?,reason_remarks=?,remarks=?,router_status=?,updated_at=NOW() WHERE internet_router_id=? AND internet_customer_id=?',[reason,textOrNull(p.reason_remarks||p.remarks),textOrNull(p.reason_remarks||p.remarks),status,routerId,customerId]);return res.json({message:'Internet router detail updated successfully'});}catch(error){return res.status(500).json({message:'Internet router update failed',error:error.message});}
};

const deleteInternetCustomerRouter = async (req,res) => {
  const db=connection.promise();try{if(!isAdmin(req))return res.status(403).json({message:'Administrator permission is required'});await ensureInternetSchema(db);await db.beginTransaction();const customerId=Number(req.params.id),routerId=Number(req.params.routerId);const [[row]]=await db.query('SELECT * FROM internet_customer_routers WHERE internet_router_id=? AND internet_customer_id=? FOR UPDATE',[routerId,customerId]);if(!row)throw Object.assign(new Error('Internet router detail not found'),{status:404});const [[latest]]=await db.query("SELECT internet_router_id FROM internet_customer_routers WHERE internet_customer_id=? AND approval_status<>'REJECTED' ORDER BY internet_router_id DESC LIMIT 1",[customerId]);if(Number(latest?.internet_router_id)!==routerId)throw Object.assign(new Error('Only the latest router history row can be deleted'),{status:409});if(row.stock_processed){const reason=String(row.update_reason||'INSTALL').toUpperCase(),employeeId=Number(row.updated_by_employee_id);if(reason==='RETURNED'){for(const [productId,qty] of [[row.product_id,row.returned_router_qty],[row.returned_adapter_product_id,row.returned_adapter_qty]]){if(!productId||Number(qty)<=0)continue;const [stock]=await db.query('UPDATE technician_material_stock SET available_qty=available_qty-? WHERE employee_id=? AND product_id=? AND available_qty>=?',[qty,employeeId,productId,qty]);if(!stock.affectedRows)throw Object.assign(new Error('Returned router stock is no longer available to reverse this entry'),{status:409});}}else if(['INSTALL','REPLACED'].includes(reason)){await db.query('INSERT INTO technician_material_stock(employee_id,product_id,available_qty) VALUES(?,?,?) ON DUPLICATE KEY UPDATE available_qty=available_qty+VALUES(available_qty)',[employeeId,row.product_id,row.qty]);}}await db.query('DELETE FROM internet_customer_routers WHERE internet_router_id=? AND internet_customer_id=?',[routerId,customerId]);await db.commit();return res.json({message:'Internet router detail deleted successfully'});}catch(error){try{await db.rollback();}catch(_e){}return res.status(error.status||500).json({message:error.message||'Internet router delete failed'});}
};

const internetAppendPeriod=(monthValue,yearValue)=>{const month=Number(monthValue),year=Number(yearValue);if(!Number.isInteger(month)||month<1||month>12||!Number.isInteger(year)||year<2000||year>2200)return null;const startDate=`${year}-${String(month).padStart(2,'0')}-01`,endDate=dateOnly(new Date(year,month,0));return{month,year,startDate,endDate,days:new Date(year,month,0).getDate()};};
const internetAppendRows=async(db,period,customerIds=[])=>{
  const filters=["c.approval_status='APPROVED'","c.status='ACTIVE'",`NOT EXISTS(SELECT 1 FROM internet_subscriptions existing WHERE existing.internet_customer_id=c.internet_customer_id AND existing.subscription_month=? AND existing.subscription_year=? AND existing.approval_status<>'REJECTED')`,'(last_sub.end_date IS NULL OR last_sub.end_date<=?)'],values=[period.month,period.year,period.endDate];
  if(customerIds.length){filters.push(`c.internet_customer_id IN (${customerIds.map(()=>'?').join(',')})`);values.push(...customerIds);}
  const [rows]=await db.query(`SELECT c.internet_customer_id,c.customer_code,c.full_name,c.network_type,c.door_no,c.city,c.pincode,a.area_name,s.street_name,cp.internet_customer_package_id,cp.package_id,cp.package_price,pm.package_name,last_sub.end_date previous_end_date,ROUND(cp.package_price,2) amount FROM internet_customers c JOIN internet_customer_packages cp ON cp.internet_customer_package_id=(SELECT cp2.internet_customer_package_id FROM internet_customer_packages cp2 WHERE cp2.internet_customer_id=c.internet_customer_id AND cp2.is_active=1 AND cp2.approval_status='APPROVED' ORDER BY cp2.internet_customer_package_id DESC LIMIT 1) JOIN cable_package_master pm ON pm.package_id=cp.package_id LEFT JOIN cable_areas a ON a.area_id=c.area_id LEFT JOIN cable_streets s ON s.street_id=c.street_id LEFT JOIN internet_subscriptions last_sub ON last_sub.internet_subscription_id=(SELECT sub2.internet_subscription_id FROM internet_subscriptions sub2 WHERE sub2.internet_customer_id=c.internet_customer_id AND sub2.approval_status='APPROVED' ORDER BY sub2.end_date DESC,sub2.internet_subscription_id DESC LIMIT 1) WHERE ${filters.join(' AND ')} ORDER BY c.customer_code`,values);
  return rows.map(row=>{let start=new Date(`${period.startDate}T00:00:00Z`);const previous=dateOnly(row.previous_end_date);if(previous&&previous>=period.startDate){start=new Date(`${previous}T00:00:00Z`);start.setUTCDate(start.getUTCDate()+1);}const end=new Date(start);end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(end.getUTCDate()-1);return{...row,start_date:dateOnly(start),end_date:dateOnly(end),number_of_days:Math.round((end.getTime()-start.getTime())/86400000)+1};});
};
const previewInternetSubscriptionAppend=async(req,res)=>{try{if(!isAdmin(req))return res.status(403).json({message:'Administrator permission is required'});const db=connection.promise();await ensureInternetSchema(db);const period=internetAppendPeriod(req.query.subscription_month,req.query.subscription_year);if(!period)return res.status(400).json({message:'Valid subscription month and year are required'});const rows=await internetAppendRows(db,period);return res.json({period,total_customers:rows.length,total_amount:rows.reduce((sum,row)=>sum+money(row.amount),0),rows});}catch(error){return res.status(500).json({message:'Net subscription append preview failed',error:error.message});}};
const appendInternetSubscriptions=async(req,res)=>{const db=connection.promise();try{if(!isAdmin(req))return res.status(403).json({message:'Administrator permission is required'});await ensureInternetSchema(db);const period=internetAppendPeriod(req.body.subscription_month,req.body.subscription_year),customerIds=[...new Set((req.body.customer_ids||[]).map(intOrNull).filter(Boolean))];if(!period)return res.status(400).json({message:'Valid subscription month and year are required'});if(!customerIds.length)return res.status(400).json({message:'Select at least one active Internet customer'});await db.beginTransaction();const rows=await internetAppendRows(db,period,customerIds);if(!rows.length)throw Object.assign(new Error('Selected customers already have this subscription or are no longer eligible'),{status:409});for(const row of rows)await db.query(`INSERT INTO internet_subscriptions(internet_customer_id,internet_customer_package_id,subscription_month,subscription_year,billing_basis,period_value,period_count,additional_months,additional_days,additional_years,free_period_value,free_period_unit,start_date,end_date,amount,paid_amount,balance_amount,payment_status,approval_status,payment_mode) VALUES(?,?,?,?, 'MONTH',1,1,0,0,0,0,'MONTH',?,?,?,?,?,'PENDING','APPROVED','DASHBOARD')`,[row.internet_customer_id,row.internet_customer_package_id,period.month,period.year,period.startDate,period.endDate,money(row.amount),0,money(row.amount)]);await db.commit();return res.status(201).json({message:`${rows.length} Net subscription(s) appended successfully`,created_count:rows.length});}catch(error){try{await db.rollback();}catch(_e){}return res.status(error.status||500).json({message:error.message||'Net subscription append failed'});}};

const parseNetIds=value=>[...new Set(String(value||'').split(/[\s,]+/).map(item=>item.trim()).filter(Boolean))];
const cashAdminCorrectionRows=async(db,netIds,monthValue,yearValue)=>{
  if(!netIds.length)throw Object.assign(new Error('Enter at least one Net ID'),{status:400});
  if(netIds.length>500)throw Object.assign(new Error('A maximum of 500 Net IDs can be processed at one time'),{status:400});
  const month=Number(monthValue),year=Number(yearValue);
  if(!Number.isInteger(month)||month<1||month>12||!Number.isInteger(year)||year<2000||year>2200)throw Object.assign(new Error('Select a valid subscription month and year'),{status:400});
  const placeholders=netIds.map(()=>'?').join(',');
  const [customers]=await db.query(`SELECT c.internet_customer_id,c.net_id,c.full_name,c.network_type,
    COUNT(s.internet_subscription_id) subscription_count,
    COALESCE(SUM(s.amount),0) subscription_amount,
    SUM(CASE WHEN s.cash_admin_locked=1 THEN 1 ELSE 0 END) locked_count
    FROM internet_customers c
    LEFT JOIN internet_subscriptions s ON s.internet_customer_id=c.internet_customer_id
      AND s.approval_status<>'REJECTED' AND s.subscription_month=? AND s.subscription_year=?
    WHERE c.net_id IN (${placeholders})
    GROUP BY c.internet_customer_id,c.net_id,c.full_name,c.network_type ORDER BY c.net_id`,[month,year,...netIds]);
  const found=new Set(customers.map(row=>String(row.net_id).toLowerCase()));
  return {net_ids:netIds,month,year,customers,unmatched_net_ids:netIds.filter(id=>!found.has(id.toLowerCase())),subscription_count:customers.reduce((sum,row)=>sum+Number(row.subscription_count||0),0)};
};
const previewCashAdminCorrection=async(req,res)=>{try{if(!isAdmin(req))return res.status(403).json({message:'Administrator permission is required'});const db=connection.promise();await ensureInternetSchema(db);return res.json(await cashAdminCorrectionRows(db,parseNetIds(req.body.net_ids),req.body.subscription_month,req.body.subscription_year));}catch(error){return res.status(error.status||500).json({message:error.message||'Cash/Admin correction preview failed'});}};
const applyCashAdminCorrection=async(req,res)=>{const db=connection.promise();try{if(!isAdmin(req))return res.status(403).json({message:'Administrator permission is required'});await ensureInternetSchema(db);await db.beginTransaction();const preview=await cashAdminCorrectionRows(db,parseNetIds(req.body.net_ids),req.body.subscription_month,req.body.subscription_year),customerIds=preview.customers.filter(row=>Number(row.subscription_count)>0).map(row=>Number(row.internet_customer_id));if(!customerIds.length)throw Object.assign(new Error(`No subscriptions were found for ${preview.month}/${preview.year} and the supplied Net IDs`),{status:400});const placeholders=customerIds.map(()=>'?').join(',');const [result]=await db.query(`UPDATE internet_subscriptions SET payment_mode='CASH',renewed_by='ADMIN',renewed_by_employee_id=NULL,cash_admin_locked=1 WHERE internet_customer_id IN (${placeholders}) AND subscription_month=? AND subscription_year=? AND approval_status<>'REJECTED'`,[...customerIds,preview.month,preview.year]);await db.commit();return res.json({message:`${result.affectedRows} subscription(s) updated and locked successfully for ${preview.month}/${preview.year}`,updated_subscriptions:result.affectedRows,matched_customers:customerIds.length,month:preview.month,year:preview.year,unmatched_net_ids:preview.unmatched_net_ids});}catch(error){try{await db.rollback();}catch(_e){}return res.status(error.status||500).json({message:error.message||'Cash/Admin correction failed'});}};

const getInternetSubscriptionReport = async (req,res) => {
  try{const db=connection.promise();await ensureInternetSchema(db);const employeeId=await resolveLoggedInEmployeeId(db,req),values=[],where=["s.approval_status<>'REJECTED'","s.payment_status='PAID'","s.balance_amount=0"],collector="CASE WHEN s.payment_mode='ONLINE' THEN COALESCE(s.payment_mapped_employee_id,s.collected_by_employee_id,ip.received_by_employee_id,pu.employee_id) ELSE COALESCE(s.collected_by_employee_id,ip.received_by_employee_id,pu.employee_id) END",renewer="COALESCE(s.renewed_by_employee_id,s.collected_by_employee_id)",collectedDate="COALESCE(s.collect_date,ip.received_date,DATE(s.created_at))";
    if(!isAdmin(req)){if(!employeeId)return res.status(400).json({message:'Logged-in user is not mapped to an employee'});where.push(`${collector}=?`);values.push(employeeId);}else if(req.query.collected_by_employee_id){where.push(`${collector}=?`);values.push(Number(req.query.collected_by_employee_id));}
    if(req.query.network_type){where.push('c.network_type=?');values.push(String(req.query.network_type).toUpperCase());}if(req.query.renewed_by_employee_id){where.push(`${renewer}=?`);values.push(Number(req.query.renewed_by_employee_id));}if(req.query.payment_mode){const mode=String(req.query.payment_mode).toUpperCase();if(!['DASHBOARD','ONLINE','CASH'].includes(mode))return res.status(400).json({message:'Select a valid payment type'});where.push('s.payment_mode=?');values.push(mode);}if(req.query.start_date){where.push(`${collectedDate}>=?`);values.push(dateOnly(req.query.start_date));}if(req.query.end_date){where.push(`${collectedDate}<=?`);values.push(dateOnly(req.query.end_date));}
    const [rows]=await db.query(`SELECT s.internet_subscription_id,s.subscription_month,s.subscription_year,s.start_date,s.end_date,${collectedDate} collect_date,s.period_count,s.billing_basis,s.amount,s.paid_amount,s.balance_amount,s.payment_status,s.payment_mode,c.customer_code,c.full_name,c.network_type,c.net_id,COALESCE(NULLIF(CONCAT_WS(' ',e.first_name,e.last_name),''),'Not Recorded') collected_by_name,CASE WHEN s.renewed_by='CUSTOMER' THEN 'Customer' WHEN s.renewed_by='ADMIN' THEN COALESCE(NULLIF(CONCAT_WS(' ',re.first_name,re.last_name),''),'Admin') ELSE COALESCE(NULLIF(CONCAT_WS(' ',re.first_name,re.last_name),''),'Not Recorded') END renewed_by_name,DATEDIFF(s.end_date,s.start_date)+1 number_of_days FROM internet_subscriptions s JOIN internet_customers c ON c.internet_customer_id=s.internet_customer_id LEFT JOIN internet_customer_accounts ia ON ia.internet_account_id=(SELECT MAX(ia2.internet_account_id) FROM internet_customer_accounts ia2 WHERE ia2.internet_customer_id=s.internet_customer_id AND ia2.account_source='CONNECTION' AND ia2.account_status='PAID') LEFT JOIN internet_customer_account_payments ip ON ip.internet_payment_id=(SELECT MAX(ip2.internet_payment_id) FROM internet_customer_account_payments ip2 WHERE ip2.internet_account_id=ia.internet_account_id AND ip2.payment_status='PAID') LEFT JOIN users pu ON pu.user_id=ip.received_by_user_id LEFT JOIN employees e ON e.employee_id=${collector} LEFT JOIN employees re ON re.employee_id=${renewer} WHERE ${where.join(' AND ')} ORDER BY collect_date DESC,s.internet_subscription_id DESC`,values);
    const summary=rows.reduce((a,r)=>({total_records:a.total_records+1,total_amount:a.total_amount+Number(r.paid_amount||0),total_balance:a.total_balance+Number(r.balance_amount||0),total_count:a.total_count+Number(r.period_count||0)}),{total_records:0,total_amount:0,total_balance:0,total_count:0});return res.json({rows,...summary});
  }catch(error){return res.status(500).json({message:'Net subscription report failed',error:error.message});}
};

module.exports={ensureInternetSchema,internetLookups,getInternetCustomers,getInternetCustomer,saveInternetCustomer,getInternetComplaints,addInternetComplaint,updateInternetCustomerInformation,addInternetCustomerHistory,getPendingInternetSubscriptions,receiveInternetSubscriptionPayment,updateInternetSubscription,deleteInternetSubscription,updateInternetCustomerPackage,deleteInternetCustomerPackage,updateInternetCustomerRouter,deleteInternetCustomerRouter,previewInternetSubscriptionAppend,appendInternetSubscriptions,previewCashAdminCorrection,applyCashAdminCorrection,getInternetSubscriptionReport};
