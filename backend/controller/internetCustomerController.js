const connection = require('../connection');

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
    customer_code INT NOT NULL, network_type ENUM('KRISHI','RAILWIRE','DMNET') NOT NULL,
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
  ]) {
    const [[existing]] = await db.query(`SELECT COUNT(*) count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`, [table, column]);
    if (!existing.count) await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
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
    const [routers] = employeeId ? await db.query(`SELECT p.product_id, p.product_name, p.hsn_code, p.unit, p.selling_price,
        ts.available_qty
      FROM technician_material_stock ts
      JOIN products p ON p.product_id = ts.product_id
      JOIN categories c ON c.category_id = p.category_id
      WHERE ts.employee_id = ? AND ts.available_qty > 0
        AND p.status = 'ACTIVE'
        AND (LOWER(c.category_name) = 'router' OR LOWER(COALESCE(c.slug, '')) LIKE 'internet%')
      ORDER BY p.product_name`, [employeeId]) : [[]];
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
        WHEN COALESCE(acc.account_status, 'PENDING') IN ('PENDING','PARTIAL') THEN 'PENDING PAYMENT'
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
      pm.gst_percent, ROUND(CASE WHEN pm.price_including_gst > 0 THEN pm.price_including_gst ELSE pm.price + (pm.price * pm.gst_percent / 100) END, 2) AS total_price
      FROM internet_customer_packages p JOIN cable_package_master pm ON pm.package_id=p.package_id WHERE p.internet_customer_id=?`, [id]);
    const [routers] = await db.query(`SELECT r.*, p.product_name FROM internet_customer_routers r JOIN products p ON p.product_id=r.product_id WHERE r.internet_customer_id=?`, [id]);
    const [connections] = await db.query('SELECT * FROM internet_connections WHERE internet_customer_id=? ORDER BY internet_connection_id DESC', [id]);
    const [materials] = await db.query('SELECT * FROM internet_connection_materials WHERE internet_customer_id=?', [id]);
    const [subscriptions] = await db.query('SELECT * FROM internet_subscriptions WHERE internet_customer_id=? ORDER BY internet_subscription_id DESC', [id]);
    const [[account]] = await db.query('SELECT * FROM internet_customer_accounts WHERE internet_customer_id=? ORDER BY internet_account_id DESC LIMIT 1', [id]);
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
    const approvalStatus=isAdmin(req)?'APPROVED':'PENDING';
    if(id){ await db.query(`UPDATE internet_customers SET network_type=?,full_name=?,net_id=?,network_password=?,door_no=?,location_id=?,area_id=?,street_id=?,state=?,city=?,pincode=?,mobile_no=?,alternate_mobile_no=?,aadhaar_no=?,source_name=?,installed_by_employee_id=?,installed_date=?,status=?,approval_status=?,updated_at=NOW() WHERE internet_customer_id=?`,[network,payload.full_name,netId,textOrNull(payload.network_password),payload.door_no,payload.location_id,payload.area_id,payload.street_id,payload.state||'Tamil Nadu',payload.city||address.city,textOrNull(payload.pincode)||address.pincode,payload.mobile_no,textOrNull(payload.alternate_mobile_no),textOrNull(payload.aadhaar_no),payload.source_name||'Direct',installedByEmployeeId,installedDate,payload.status||'ACTIVE',approvalStatus,id]); for(const table of ['internet_subscriptions','internet_customer_packages','internet_customer_routers','internet_connections','internet_connection_materials','internet_customer_accounts']) await db.query(`DELETE FROM ${table} WHERE internet_customer_id=?`,[id]); }
    else { const [[next]]=await db.query('SELECT COALESCE(MAX(customer_code),2000)+1 next_code FROM internet_customers'); const [result]=await db.query(`INSERT INTO internet_customers(customer_code,network_type,full_name,net_id,network_password,door_no,location_id,area_id,street_id,state,city,pincode,mobile_no,alternate_mobile_no,aadhaar_no,source_name,installed_by_employee_id,installed_date,status,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[next.next_code,network,payload.full_name,netId,textOrNull(payload.network_password),payload.door_no,payload.location_id,payload.area_id,payload.street_id,payload.state||'Tamil Nadu',payload.city||address.city,textOrNull(payload.pincode)||address.pincode,payload.mobile_no,textOrNull(payload.alternate_mobile_no),textOrNull(payload.aadhaar_no),payload.source_name||'Direct',installedByEmployeeId,installedDate,'ACTIVE',userId(req)]); customerId=result.insertId; }
    await db.query('UPDATE internet_customers SET approval_status=? WHERE internet_customer_id=?',[approvalStatus,customerId]);
    let subscriptionTotal=0;
    for(const item of packages){ const [[master]]=await db.query("SELECT price,gst_percent,price_including_gst,internet_network_type FROM cable_package_master WHERE package_id=? AND service_category='INTERNET' AND is_active=1",[item.package_id]); if(!master) throw Object.assign(new Error('Select only active Internet packages'),{status:400}); if(master.internet_network_type&&master.internet_network_type!==network) throw Object.assign(new Error(`Select only ${network} packages for this customer`),{status:400}); const price=money(Number(master.price_including_gst)>0?master.price_including_gst:Number(master.price)+(Number(master.price)*Number(master.gst_percent)/100)); const dates=subscriptionDates(network,item.start_date||installedDate); const month=new Date(`${dates.start}T00:00:00Z`).getUTCMonth()+1, year=Number(dates.start.slice(0,4)); if(!isAdmin(req)){ const [[dup]]=await db.query('SELECT internet_subscription_id FROM internet_subscriptions WHERE internet_customer_id=? AND subscription_month=? AND subscription_year=? AND internet_customer_package_id IN (SELECT internet_customer_package_id FROM internet_customer_packages WHERE package_id=?) LIMIT 1',[customerId,month,year,item.package_id]); if(dup) throw Object.assign(new Error('Subscription already exists for selected package month and year'),{status:409}); } const amount=network==='KRISHI'?money(price/ new Date(year,month,0).getDate()*dates.days):price; const [pr]=await db.query('INSERT INTO internet_customer_packages(internet_customer_id,package_id,package_price,start_date,end_date) VALUES(?,?,?,?,?)',[customerId,item.package_id,price,dates.start,dates.end]); await db.query('INSERT INTO internet_subscriptions(internet_customer_id,internet_customer_package_id,subscription_month,subscription_year,start_date,end_date,amount,balance_amount) VALUES(?,?,?,?,?,?,?,?)',[customerId,pr.insertId,month,year,dates.start,dates.end,amount,amount]); subscriptionTotal+=amount; }
    if(routers.length&&!loggedInEmployeeId) throw Object.assign(new Error('Logged-in user is not mapped to an employee for router stock'),{status:400});
    let routerTotal=0; for(const item of routers){ const [[p]]=await db.query(`SELECT p.hsn_code,p.unit,p.selling_price,ts.available_qty FROM technician_material_stock ts JOIN products p ON p.product_id=ts.product_id JOIN categories c ON c.category_id=p.category_id WHERE ts.employee_id=? AND ts.product_id=? AND ts.available_qty>0 AND p.status='ACTIVE' AND (LOWER(c.category_name)='router' OR LOWER(COALESCE(c.slug,'')) LIKE 'internet%')`,[loggedInEmployeeId,item.product_id]); if(!p) throw Object.assign(new Error('Select a router issued to the logged-in employee'),{status:400}); const qty=money(item.qty||1); if(qty>money(p.available_qty)) throw Object.assign(new Error(`Router quantity cannot exceed issued stock (${money(p.available_qty)})`),{status:400}); const rate=money(p.selling_price),amount=money(qty*rate); routerTotal+=amount; await db.query('INSERT INTO internet_customer_routers(internet_customer_id,router_type,product_id,hsn_code,qty,unit,rate,amount) VALUES(?,?,?,?,?,?,?,?)',[customerId,String(item.router_type||'NEW').toUpperCase(),item.product_id,p.hsn_code,qty,p.unit||'PCS',rate,amount]); }
    const conn=payload.connection||{}; await db.query('INSERT INTO internet_connections(internet_customer_id,connection_date,connection_type,connection_charge,connection_discount,labour_service_charge,remarks) VALUES(?,?,?,?,?,?,?)',[customerId,dateOnly(conn.connection_date||installedDate),conn.connection_type||'NEW',money(conn.connection_charge),money(conn.connection_discount),money(conn.labour_service_charge),textOrNull(conn.remarks)]);
    let materialTotal=0; for(const item of materials){ const qty=money(item.qty||1),rate=money(item.unit_rate),amount=money(item.amount||qty*rate); materialTotal+=amount; await db.query('INSERT INTO internet_connection_materials(internet_customer_id,product_id,item_name,qty,unit,unit_rate,amount) VALUES(?,?,?,?,?,?,?)',[customerId,intOrNull(item.product_id),item.item_name||'Material',qty,item.unit||'PCS',rate,amount]); }
    const routerDiscount=money(payload.account?.router_discount),materialDiscount=money(payload.account?.material_discount),discount=routerDiscount+money(conn.connection_discount)+materialDiscount+money(payload.account?.overall_discount), grand=Math.max(money(routerTotal+money(conn.connection_charge)+money(conn.labour_service_charge)+materialTotal+subscriptionTotal-discount),0),paid=money(payload.account?.customer_paid_amount),balance=Math.max(money(grand-paid),0); await db.query('INSERT INTO internet_customer_accounts(internet_customer_id,router_amount,router_discount,connection_amount,labor_amount,material_cost,material_discount,subscription_amount,overall_discount,grand_total,customer_paid_amount,office_received_amount,office_balance_amount,balance_amount,account_status,approval_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[customerId,routerTotal,routerDiscount,money(conn.connection_charge),money(conn.labour_service_charge),materialTotal,materialDiscount,subscriptionTotal,money(payload.account?.overall_discount),grand,paid,0,grand,balance,'PENDING',approvalStatus]); if(!isAdmin(req)){await db.query(`INSERT INTO workflow_approvals(module_name,reference_id,reference_no,workflow_status,requested_by_employee_id,remarks) VALUES('INTERNET_CUSTOMER',?,?, 'PENDING',?,'Internet customer approval') ON DUPLICATE KEY UPDATE workflow_status='PENDING',requested_by_employee_id=VALUES(requested_by_employee_id),reviewed_at=NULL,remarks=VALUES(remarks)`,[customerId,String(customerId),loggedInEmployeeId]);} await db.commit(); return res.status(id?200:201).json({message:isAdmin(req)?(id?'Internet customer updated successfully':'Internet customer saved successfully'):'Internet customer sent for admin approval',internet_customer_id:customerId,approval_status:approvalStatus,account_status:'PENDING'});
  } catch(error){ try{await db.rollback();}catch(_e){} if(error.code==='ER_DUP_ENTRY'&&String(error.message).includes('uk_internet_net_id'))return res.status(409).json({message:'Netid already exists'}); return res.status(error.status||500).json({message:error.message||'Internet customer save failed'}); }
};

const getInternetComplaints = async (req,res) => { try { const db=connection.promise();await ensureInternetSchema(db);const [rows]=await db.query('SELECT * FROM internet_customer_complaints WHERE internet_customer_id=? ORDER BY internet_complaint_id DESC',[Number(req.params.id)]);return res.json(rows); } catch(error){return res.status(500).json({message:'Internet complaints failed',error:error.message});} };
const addInternetComplaint = async (req,res) => { try { const db=connection.promise();await ensureInternetSchema(db);const subject=String(req.body.subject||'').trim();if(!subject)return res.status(400).json({message:'Complaint subject is required'});await db.query('INSERT INTO internet_customer_complaints(internet_customer_id,complaint_date,subject,description,complaint_status,created_by_user_id) VALUES(?,?,?,?,?,?)',[Number(req.params.id),dateOnly(req.body.complaint_date||new Date()),subject,textOrNull(req.body.description),'OPEN',userId(req)]);return res.status(201).json({message:'Internet complaint registered successfully'});}catch(error){return res.status(500).json({message:'Internet complaint save failed',error:error.message});} };

module.exports={ensureInternetSchema,internetLookups,getInternetCustomers,getInternetCustomer,saveInternetCustomer,getInternetComplaints,addInternetComplaint};
