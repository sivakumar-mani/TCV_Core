const connection = require('../connection');

const movementTypes = new Set(['ISSUE', 'SALE', 'FAULT', 'RETURN']);
const customerTypes = new Set(['CATV', 'NET', 'CCTV', 'ANONYMOUS']);
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const id = value => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const text = value => String(value ?? '').trim() || null;
const currentUserId = req => id(req.res?.locals?.userId || req.res?.locals?.user_id || req.res?.locals?.id);
const isAdmin = req => String(req.res?.locals?.role || '').toUpperCase() === 'ADMIN';

const resolveEmployeeId = async (db, req, requested) => {
  if (id(requested)) return id(requested);
  if (id(req.res?.locals?.employee_id)) return id(req.res.locals.employee_id);
  const username = req.res?.locals?.username || req.res?.locals?.userName;
  if (!username) return null;
  const [[employee]] = await db.query(
    `SELECT employee_id FROM employees
     WHERE employee_code = ? OR email = ? OR CONCAT_WS(' ', first_name, last_name) = ? LIMIT 1`,
    [username, username, username]
  );
  return employee?.employee_id || null;
};

const ensureMaterialSalesTables = async db => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS technician_material_stock (
      technician_material_stock_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      employee_id INT NOT NULL,
      product_id INT NOT NULL,
      available_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_technician_product (employee_id, product_id),
      CONSTRAINT fk_technician_stock_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
      CONSTRAINT fk_technician_stock_product FOREIGN KEY (product_id) REFERENCES products(product_id)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS technician_material_movements (
      material_movement_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      movement_no VARCHAR(30) NOT NULL,
      movement_type ENUM('ISSUE','SALE','FAULT','RETURN') NOT NULL,
      employee_id INT NOT NULL,
      product_id INT NOT NULL,
      qty DECIMAL(10,2) NOT NULL,
      unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      payment_status ENUM('PENDING','PARTIAL','PAID') NOT NULL DEFAULT 'PENDING',
      customer_type ENUM('CATV','NET','CCTV','ANONYMOUS') NULL,
      cable_customer_id BIGINT NULL,
      service_customer_id INT NULL,
      anonymous_name VARCHAR(150) NULL,
      anonymous_mobile VARCHAR(20) NULL,
      reason VARCHAR(500) NULL,
      remarks TEXT NULL,
      movement_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by_user_id INT NULL,
      created_by_employee_id INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_material_movement_no (movement_no),
      INDEX idx_material_movement_employee (employee_id),
      INDEX idx_material_movement_product (product_id),
      INDEX idx_material_movement_date (movement_date),
      CONSTRAINT fk_material_movement_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
      CONSTRAINT fk_material_movement_product FOREIGN KEY (product_id) REFERENCES products(product_id),
      CONSTRAINT fk_material_movement_catv_customer FOREIGN KEY (cable_customer_id) REFERENCES cable_tv_customers(cable_customer_id),
      CONSTRAINT fk_material_movement_service_customer FOREIGN KEY (service_customer_id) REFERENCES customers(customer_id)
    )
  `);
  const [paymentColumns] = await db.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'technician_material_movements'
       AND COLUMN_NAME IN ('commission_amount','paid_amount','balance_amount','payment_status')`
  );
  const paymentColumnNames = new Set(paymentColumns.map(column => column.COLUMN_NAME));
  if (!paymentColumnNames.has('commission_amount')) {
    await db.query('ALTER TABLE technician_material_movements ADD COLUMN commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER total_amount');
  }
  if (!paymentColumnNames.has('paid_amount')) {
    await db.query('ALTER TABLE technician_material_movements ADD COLUMN paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER total_amount');
  }
  if (!paymentColumnNames.has('balance_amount')) {
    await db.query('ALTER TABLE technician_material_movements ADD COLUMN balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER paid_amount');
    await db.query(`UPDATE technician_material_movements SET balance_amount = total_amount
      WHERE movement_type = 'SALE' AND paid_amount = 0`);
  }
  if (!paymentColumnNames.has('payment_status')) {
    await db.query(`ALTER TABLE technician_material_movements
      ADD COLUMN payment_status ENUM('PENDING','PARTIAL','PAID') NOT NULL DEFAULT 'PENDING' AFTER balance_amount`);
    await db.query(`UPDATE technician_material_movements SET payment_status = 'PAID'
      WHERE movement_type <> 'SALE' OR balance_amount <= 0`);
  }
  await db.query(`
    CREATE TABLE IF NOT EXISTS technician_material_sale_payments (
      material_sale_payment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      material_movement_id BIGINT NOT NULL,
      cash_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      online_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      received_amount DECIMAL(12,2) NOT NULL,
      balance_after_payment DECIMAL(12,2) NOT NULL,
      payment_status ENUM('PARTIAL','PAID') NOT NULL,
      received_by_user_id INT NULL,
      received_by_employee_id INT NULL,
      received_date DATE NOT NULL,
      due_date DATE NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_material_sale_payment_movement (material_movement_id),
      CONSTRAINT fk_material_sale_payment_movement FOREIGN KEY (material_movement_id)
        REFERENCES technician_material_movements(material_movement_id)
    )
  `);
};

const getMaterialSalesLookups = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureMaterialSalesTables(db);
    const [products] = await db.query(
      `SELECT p.product_id, p.product_code, p.product_name, p.unit, p.selling_price,
              COALESCE(sm.available_qty, 0) AS office_qty
       FROM products p LEFT JOIN stock_master sm ON sm.product_id = p.product_id
       WHERE p.status = 'ACTIVE' AND p.product_type = 'MATERIAL' ORDER BY p.product_name`
    );
    const loggedInEmployeeId = isAdmin(req) ? null : await resolveEmployeeId(db, req, null);
    const [employees] = await db.query(
      `SELECT employee_id, employee_code,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', first_name, last_name)), ''), employee_code) AS employee_name
       FROM employees
       WHERE is_active = 1 ${loggedInEmployeeId ? 'AND employee_id = ?' : isAdmin(req) ? '' : 'AND 1 = 0'}
       ORDER BY first_name, last_name`,
      loggedInEmployeeId ? [loggedInEmployeeId] : []
    );
    return res.json({ products, employees, logged_in_employee_id: loggedInEmployeeId });
  } catch (error) {
    return res.status(500).json({ message: 'Material sales lookups failed', error: error.message });
  }
};

const getTechnicianStock = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureMaterialSalesTables(db);
    const employeeId = isAdmin(req)
      ? id(req.query.employee_id)
      : await resolveEmployeeId(db, req, null);
    if (!isAdmin(req) && !employeeId) return res.json([]);
    const [rows] = await db.query(
      `SELECT ts.*, p.product_code, p.product_name, p.unit,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', e.first_name, e.last_name)), ''), e.employee_code) AS employee_name
       FROM technician_material_stock ts
       JOIN products p ON p.product_id = ts.product_id
       JOIN employees e ON e.employee_id = ts.employee_id
       ${employeeId ? 'WHERE ts.employee_id = ?' : ''}
       ORDER BY e.first_name, p.product_name`,
      employeeId ? [employeeId] : []
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Technician stock could not be loaded', error: error.message });
  }
};

const getMaterialMovements = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureMaterialSalesTables(db);
    const conditions = [];
    const values = [];
    const employeeId = isAdmin(req)
      ? id(req.query.employee_id)
      : await resolveEmployeeId(db, req, null);
    if (employeeId) { conditions.push('m.employee_id = ?'); values.push(employeeId); }
    else if (!isAdmin(req)) conditions.push('1 = 0');
    if (movementTypes.has(String(req.query.movement_type || '').toUpperCase())) {
      conditions.push('m.movement_type = ?'); values.push(String(req.query.movement_type).toUpperCase());
    }
    if (text(req.query.start_date)) { conditions.push('DATE(m.movement_date) >= ?'); values.push(text(req.query.start_date)); }
    if (text(req.query.end_date)) { conditions.push('DATE(m.movement_date) <= ?'); values.push(text(req.query.end_date)); }
    const [rows] = await db.query(
      `SELECT m.*, p.product_code, p.product_name, p.unit,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', e.first_name, e.last_name)), ''), e.employee_code) AS employee_name,
              COALESCE(catv.full_name,
                NULLIF(TRIM(CONCAT_WS(' ', service.salutation, service.customer_name)), ''),
                m.anonymous_name) AS customer_name,
              COALESCE(catv.mobile_no, service.phone, m.anonymous_mobile) AS customer_mobile
       FROM technician_material_movements m
       JOIN products p ON p.product_id = m.product_id
       JOIN employees e ON e.employee_id = m.employee_id
       LEFT JOIN cable_tv_customers catv ON catv.cable_customer_id = m.cable_customer_id
       LEFT JOIN customers service ON service.customer_id = m.service_customer_id
       ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
       ORDER BY m.movement_date DESC, m.material_movement_id DESC`,
      values
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Material movement report failed', error: error.message });
  }
};

const addMaterialMovement = async (req, res) => {
  const db = connection.promise();
  let started = false;
  try {
    await ensureMaterialSalesTables(db);
    const payload = req.body || {};
    const movementType = String(payload.movement_type || '').toUpperCase();
    if (movementType === 'ISSUE' && !isAdmin(req)) {
      return res.status(403).json({ message: 'Administrator permission is required for office material issue' });
    }
    const employeeId = isAdmin(req)
      ? id(payload.employee_id)
      : await resolveEmployeeId(db, req, null);
    const productId = id(payload.product_id);
    const qty = num(payload.qty);
    const unitPrice = num(payload.unit_price);
    const commissionAmount = movementType === 'SALE' ? num(payload.commission_amount) : 0;
    const grossAmount = Number((qty * unitPrice).toFixed(2));
    const netSaleAmount = Number((grossAmount - commissionAmount).toFixed(2));
    if (!movementTypes.has(movementType)) return res.status(400).json({ message: 'Movement type is invalid' });
    if (!employeeId || !productId || qty <= 0) return res.status(400).json({ message: 'Technician, material and quantity are required' });
    const customerType = movementType === 'SALE' ? String(payload.customer_type || 'ANONYMOUS').toUpperCase() : null;
    if (customerType && !customerTypes.has(customerType)) return res.status(400).json({ message: 'Customer type is invalid' });
    const cableCustomerId = customerType === 'CATV' ? id(payload.cable_customer_id) : null;
    const serviceCustomerId = ['NET', 'CCTV'].includes(customerType) ? id(payload.service_customer_id) : null;
    if (movementType === 'SALE' && customerType === 'CATV' && !cableCustomerId) return res.status(400).json({ message: 'Select a CATV customer' });
    if (movementType === 'SALE' && ['NET', 'CCTV'].includes(customerType) && !serviceCustomerId) return res.status(400).json({ message: `Select a ${customerType} customer` });
    if (movementType === 'FAULT' && !text(payload.reason)) return res.status(400).json({ message: 'Fault reason is required' });
    if (commissionAmount < 0) return res.status(400).json({ message: 'Commission amount cannot be negative' });
    if (movementType === 'SALE' && commissionAmount > grossAmount) {
      return res.status(400).json({ message: `Commission amount cannot exceed the gross sale amount ${grossAmount.toFixed(2)}` });
    }

    await db.beginTransaction();
    started = true;
    await db.query(
      `INSERT INTO technician_material_stock (employee_id, product_id, available_qty)
       VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE updated_at = NOW()`,
      [employeeId, productId]
    );
    const [[technicianStock]] = await db.query(
      `SELECT available_qty FROM technician_material_stock
       WHERE employee_id = ? AND product_id = ? FOR UPDATE`,
      [employeeId, productId]
    );
    const currentTechnicianQty = num(technicianStock.available_qty);
    const technicianQty = movementType === 'ISSUE' ? currentTechnicianQty + qty : currentTechnicianQty - qty;
    if (technicianQty < 0) {
      await db.rollback(); started = false;
      return res.status(409).json({ message: `Insufficient technician stock. Available: ${currentTechnicianQty}` });
    }

    if (movementType === 'ISSUE' || movementType === 'RETURN') {
      await db.query(
        `INSERT INTO stock_master (product_id, available_qty, last_stock_check_date)
         VALUES (?, 0, CURDATE()) ON DUPLICATE KEY UPDATE last_stock_check_date = CURDATE()`,
        [productId]
      );
      const [[officeStock]] = await db.query(
        'SELECT available_qty FROM stock_master WHERE product_id = ? FOR UPDATE',
        [productId]
      );
      const currentOfficeQty = num(officeStock.available_qty);
      const officeQty = movementType === 'ISSUE' ? currentOfficeQty - qty : currentOfficeQty + qty;
      if (officeQty < 0) {
        await db.rollback(); started = false;
        return res.status(409).json({ message: `Insufficient office stock. Available: ${currentOfficeQty}` });
      }
      await db.query(
        'UPDATE stock_master SET available_qty = ?, last_stock_check_date = CURDATE(), last_updated = NOW() WHERE product_id = ?',
        [officeQty, productId]
      );
      await db.query(
        `INSERT INTO stock_ledger
         (product_id, transaction_type, reference_no, qty_in, qty_out, balance_qty, unit_cost, remarks, recorded_by_employee_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productId, movementType === 'RETURN' ? 'RETURN' : 'ADJUSTMENT', null,
          movementType === 'RETURN' ? qty : 0, movementType === 'ISSUE' ? qty : 0,
          officeQty, unitPrice || null, `${movementType === 'ISSUE' ? 'Issued to' : 'Returned by'} technician ${employeeId}`,
          await resolveEmployeeId(db, req)
        ]
      );
    }

    await db.query(
      `UPDATE technician_material_stock SET available_qty = ?
       WHERE employee_id = ? AND product_id = ?`,
      [technicianQty, employeeId, productId]
    );
    const [[next]] = await db.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(movement_no, '-', -1) AS UNSIGNED)), 0) + 1 AS next_no
       FROM technician_material_movements`
    );
    const movementNo = `MAT-${String(next.next_no).padStart(6, '0')}`;
    const createdByEmployeeId = await resolveEmployeeId(db, req);
    const [result] = await db.query(
      `INSERT INTO technician_material_movements
       (movement_no, movement_type, employee_id, product_id, qty, unit_price, total_amount, commission_amount,
        paid_amount, balance_amount, payment_status,
        customer_type, cable_customer_id, service_customer_id, anonymous_name, anonymous_mobile,
        reason, remarks, movement_date, created_by_user_id, created_by_employee_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), ?, ?)`,
      [
        movementNo, movementType, employeeId, productId, qty, unitPrice,
        movementType === 'SALE' ? netSaleAmount : grossAmount,
        commissionAmount,
        movementType === 'SALE' ? netSaleAmount : 0, movementType === 'SALE' ? 'PENDING' : 'PAID',
        customerType, cableCustomerId, serviceCustomerId, text(payload.anonymous_name), text(payload.anonymous_mobile),
        text(payload.reason), text(payload.remarks), text(payload.movement_date), currentUserId(req), createdByEmployeeId
      ]
    );
    await db.commit();
    return res.status(201).json({ message: 'Material movement saved successfully', movement_no: movementNo });
  } catch (error) {
    if (started) await db.rollback();
    return res.status(500).json({ message: 'Material movement failed', error: error.message });
  }
};

const getMaterialSalePayments = async (req, res, movementIdValue) => {
  try {
    const db = connection.promise();
    await ensureMaterialSalesTables(db);
    const movementId = Math.abs(Number(movementIdValue) || 0);
    const [rows] = await db.query(
      `SELECT material_sale_payment_id AS payment_id, cash_amount, online_amount, received_amount,
              received_date AS paid_date, received_date, due_date, balance_after_payment,
              payment_status, created_at,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', e.first_name, e.last_name)), ''), u.username) AS received_by_name
       FROM technician_material_sale_payments p
       LEFT JOIN users u ON u.user_id = p.received_by_user_id
       LEFT JOIN employees e ON e.employee_id = p.received_by_employee_id
       WHERE p.material_movement_id = ? ORDER BY p.material_sale_payment_id DESC`,
      [movementId]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Material sale payment history failed', error: error.message });
  }
};

const receiveMaterialSale = async (req, res, movementIdValue) => {
  const db = connection.promise();
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Administrator permission is required' });
    await ensureMaterialSalesTables(db);
    const movementId = Math.abs(Number(movementIdValue) || 0);
    await db.beginTransaction();
    const [[sale]] = await db.query(
      `SELECT material_movement_id, total_amount, paid_amount, balance_amount, payment_status
       FROM technician_material_movements
       WHERE material_movement_id = ? AND movement_type = 'SALE' FOR UPDATE`,
      [movementId]
    );
    if (!sale) { await db.rollback(); return res.status(404).json({ message: 'Material sale was not found' }); }
    if (sale.payment_status === 'PAID') { await db.rollback(); return res.status(409).json({ message: 'This material sale is already paid' }); }
    const cashAmount = num(req.body.cash_amount);
    const onlineAmount = num(req.body.online_amount);
    const receivedAmount = Number((cashAmount + onlineAmount).toFixed(2));
    const currentBalance = num(sale.balance_amount);
    if (cashAmount < 0 || onlineAmount < 0 || receivedAmount <= 0) {
      await db.rollback(); return res.status(400).json({ message: 'Enter a cash or online amount greater than zero' });
    }
    if (receivedAmount > currentBalance) {
      await db.rollback(); return res.status(400).json({ message: `Cash + Online cannot exceed Total Payment balance: ${currentBalance.toFixed(2)}` });
    }
    const newPaidAmount = Number((num(sale.paid_amount) + receivedAmount).toFixed(2));
    const newBalance = Number((currentBalance - receivedAmount).toFixed(2));
    const paymentStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';
    const dueDate = paymentStatus === 'PARTIAL' ? text(req.body.due_date) : null;
    if (paymentStatus === 'PARTIAL' && !dueDate) {
      await db.rollback(); return res.status(400).json({ message: 'Due date is required for a partial payment' });
    }
    const receiverEmployeeId = id(req.body.received_by_employee_id || req.res?.locals?.employee_id);
    const receivedDate = text(req.body.received_date) || new Date().toISOString().slice(0, 10);
    await db.query(
      `INSERT INTO technician_material_sale_payments
       (material_movement_id, cash_amount, online_amount, received_amount, balance_after_payment,
        payment_status, received_by_user_id, received_by_employee_id, received_date, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [movementId, cashAmount, onlineAmount, receivedAmount, newBalance, paymentStatus,
        currentUserId(req), receiverEmployeeId, receivedDate, dueDate]
    );
    await db.query(
      `UPDATE technician_material_movements
       SET paid_amount = ?, balance_amount = ?, payment_status = ?
       WHERE material_movement_id = ?`,
      [newPaidAmount, newBalance, paymentStatus, movementId]
    );
    await db.commit();
    return res.json({ message: paymentStatus === 'PAID' ? 'Material sale payment received in full' : 'Partial material sale payment received' });
  } catch (error) {
    await db.rollback();
    return res.status(500).json({ message: 'Material sale payment failed', error: error.message });
  }
};

const mapMaterialSaleCustomer = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureMaterialSalesTables(db);
    const movementId = id(req.params.movementId);
    const customerType = String(req.body.customer_type || '').toUpperCase();
    if (!movementId || !['CATV', 'NET', 'CCTV'].includes(customerType)) {
      return res.status(400).json({ message: 'A valid sale and customer type are required' });
    }
    const cableCustomerId = customerType === 'CATV' ? id(req.body.cable_customer_id) : null;
    const serviceCustomerId = ['NET', 'CCTV'].includes(customerType) ? id(req.body.service_customer_id) : null;
    if (!cableCustomerId && !serviceCustomerId) return res.status(400).json({ message: 'Select a customer' });
    const [result] = await db.query(
      `UPDATE technician_material_movements
       SET customer_type = ?, cable_customer_id = ?, service_customer_id = ?
       WHERE material_movement_id = ? AND movement_type = 'SALE'`,
      [customerType, cableCustomerId, serviceCustomerId, movementId]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Material sale was not found' });
    return res.json({ message: 'Customer mapped to material sale successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Customer mapping failed', error: error.message });
  }
};

const addMaterialIssueBatch = async (req, res) => {
  const db = connection.promise();
  let started = false;
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: 'Administrator permission is required for office material issue' });
    await ensureMaterialSalesTables(db);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ message: 'Add at least one material issue row' });
    const normalized = items.map((item, index) => ({
      row: index + 1,
      employeeId: id(item.employee_id),
      productId: id(item.product_id),
      qty: num(item.qty),
      movementDate: text(item.movement_date),
      remarks: text(item.remarks)
    }));
    const invalid = normalized.find(item => !item.employeeId || !item.productId || item.qty <= 0);
    if (invalid) return res.status(400).json({ message: `Complete technician, material and quantity in row ${invalid.row}` });

    await db.beginTransaction();
    started = true;
    const [[sequence]] = await db.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(movement_no, '-', -1) AS UNSIGNED)), 0) AS last_no
       FROM technician_material_movements FOR UPDATE`
    );
    let nextNo = Number(sequence.last_no || 0);
    const createdByEmployeeId = await resolveEmployeeId(db, req);
    const movementNumbers = [];
    for (const item of normalized) {
      const [[product]] = await db.query(
        `SELECT p.product_name, COALESCE(sm.available_qty, 0) AS available_qty
         FROM products p LEFT JOIN stock_master sm ON sm.product_id = p.product_id
         WHERE p.product_id = ? AND p.status = 'ACTIVE' LIMIT 1 FOR UPDATE`,
        [item.productId]
      );
      if (!product) throw Object.assign(new Error(`Material in row ${item.row} was not found`), { statusCode: 400 });
      if (num(product.available_qty) < item.qty) {
        throw Object.assign(
          new Error(`Insufficient office stock for ${product.product_name} in row ${item.row}. Available: ${num(product.available_qty)}`),
          { statusCode: 409 }
        );
      }
      const officeBalance = num(product.available_qty) - item.qty;
      await db.query(
        'UPDATE stock_master SET available_qty = ?, last_stock_check_date = CURDATE(), last_updated = NOW() WHERE product_id = ?',
        [officeBalance, item.productId]
      );
      await db.query(
        `INSERT INTO technician_material_stock (employee_id, product_id, available_qty)
         VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE available_qty = available_qty + VALUES(available_qty)`,
        [item.employeeId, item.productId, item.qty]
      );
      nextNo += 1;
      const movementNo = `MAT-${String(nextNo).padStart(6, '0')}`;
      movementNumbers.push(movementNo);
      const [movementResult] = await db.query(
        `INSERT INTO technician_material_movements
         (movement_no, movement_type, employee_id, product_id, qty, unit_price, total_amount,
          commission_amount, paid_amount, balance_amount, payment_status, reason, remarks,
          movement_date, created_by_user_id, created_by_employee_id)
         VALUES (?, 'ISSUE', ?, ?, ?, 0, 0, 0, 0, 0, 'PAID', NULL, ?, COALESCE(?, NOW()), ?, ?)`,
        [movementNo, item.employeeId, item.productId, item.qty, item.remarks, item.movementDate, currentUserId(req), createdByEmployeeId]
      );
      await db.query(
        `INSERT INTO stock_ledger
         (product_id, transaction_type, transaction_id, reference_no, qty_in, qty_out,
          balance_qty, remarks, recorded_by_employee_id)
         VALUES (?, 'ADJUSTMENT', ?, ?, 0, ?, ?, ?, ?)`,
        [item.productId, movementResult.insertId, movementNo, item.qty, officeBalance,
          `Issued to technician ${item.employeeId}${item.remarks ? ` - ${item.remarks}` : ''}`, createdByEmployeeId]
      );
    }
    await db.commit();
    return res.status(201).json({
      message: `${normalized.length} material issue row${normalized.length === 1 ? '' : 's'} saved successfully`,
      movement_numbers: movementNumbers
    });
  } catch (error) {
    if (started) await db.rollback();
    return res.status(error.statusCode || 500).json({ message: error.message || 'Batch material issue failed' });
  }
};

const addMaterialSaleBatch = async (req, res) => {
  const db = connection.promise();
  let started = false;
  try {
    await ensureMaterialSalesTables(db);
    const payload = req.body || {};
    const employeeId = isAdmin(req)
      ? id(payload.employee_id)
      : await resolveEmployeeId(db, req, null);
    const customerType = String(payload.customer_type || 'ANONYMOUS').toUpperCase();
    const cableCustomerId = customerType === 'CATV' ? id(payload.cable_customer_id) : null;
    const serviceCustomerId = ['NET', 'CCTV'].includes(customerType) ? id(payload.service_customer_id) : null;
    if (!employeeId) return res.status(400).json({ message: 'Technician is required' });
    if (!customerTypes.has(customerType)) return res.status(400).json({ message: 'Customer type is invalid' });
    if (customerType === 'CATV' && !cableCustomerId) return res.status(400).json({ message: 'Select a CATV customer' });
    if (['NET', 'CCTV'].includes(customerType) && !serviceCustomerId) {
      return res.status(400).json({ message: `Select a ${customerType} customer` });
    }
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) return res.status(400).json({ message: 'Add at least one material sale row' });
    const normalized = items.map((item, index) => {
      const qty = num(item.qty);
      const unitPrice = num(item.unit_price);
      const commission = num(item.commission_amount);
      const gross = Number((qty * unitPrice).toFixed(2));
      return {
        row: index + 1, productId: id(item.product_id), qty, unitPrice, commission, gross,
        net: Number((gross - commission).toFixed(2)), remarks: text(item.remarks)
      };
    });
    const invalid = normalized.find(item =>
      !item.productId || item.qty <= 0 || item.unitPrice < 0 || item.commission < 0 || item.commission > item.gross
    );
    if (invalid) return res.status(400).json({ message: `Check material, quantity, price and commission in row ${invalid.row}` });

    await db.beginTransaction();
    started = true;
    const [[sequence]] = await db.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(movement_no, '-', -1) AS UNSIGNED)), 0) AS last_no
       FROM technician_material_movements FOR UPDATE`
    );
    let nextNo = Number(sequence.last_no || 0);
    const createdByEmployeeId = await resolveEmployeeId(db, req, null);
    const movementNumbers = [];
    for (const item of normalized) {
      const [[stock]] = await db.query(
        `SELECT ts.available_qty, p.product_name
         FROM technician_material_stock ts
         JOIN products p ON p.product_id = ts.product_id
         WHERE ts.employee_id = ? AND ts.product_id = ? FOR UPDATE`,
        [employeeId, item.productId]
      );
      const availableQty = num(stock?.available_qty);
      if (!stock || availableQty < item.qty) {
        throw Object.assign(
          new Error(`Insufficient technician stock for ${stock?.product_name || `row ${item.row}`}. Available: ${availableQty}`),
          { statusCode: 409 }
        );
      }
      await db.query(
        `UPDATE technician_material_stock SET available_qty = ?
         WHERE employee_id = ? AND product_id = ?`,
        [availableQty - item.qty, employeeId, item.productId]
      );
      nextNo += 1;
      const movementNo = `MAT-${String(nextNo).padStart(6, '0')}`;
      movementNumbers.push(movementNo);
      await db.query(
        `INSERT INTO technician_material_movements
         (movement_no, movement_type, employee_id, product_id, qty, unit_price, total_amount,
          commission_amount, paid_amount, balance_amount, payment_status, customer_type,
          cable_customer_id, service_customer_id, anonymous_name, anonymous_mobile,
          remarks, movement_date, created_by_user_id, created_by_employee_id)
         VALUES (?, 'SALE', ?, ?, ?, ?, ?, ?, 0, ?, 'PENDING', ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), ?, ?)`,
        [
          movementNo, employeeId, item.productId, item.qty, item.unitPrice, item.net,
          item.commission, item.net, customerType, cableCustomerId, serviceCustomerId,
          text(payload.anonymous_name), text(payload.anonymous_mobile), item.remarks,
          text(payload.movement_date), currentUserId(req), createdByEmployeeId
        ]
      );
    }
    await db.commit();
    return res.status(201).json({
      message: `${normalized.length} material sale item${normalized.length === 1 ? '' : 's'} saved successfully`,
      movement_numbers: movementNumbers,
      pending_amount: normalized.reduce((sum, item) => sum + item.net, 0)
    });
  } catch (error) {
    if (started) await db.rollback();
    return res.status(error.statusCode || 500).json({ message: error.message || 'Batch material sale failed' });
  }
};

module.exports = {
  ensureMaterialSalesTables, getMaterialSalesLookups, getTechnicianStock,
  getMaterialMovements, addMaterialMovement, mapMaterialSaleCustomer,
  getMaterialSalePayments, receiveMaterialSale, addMaterialIssueBatch, addMaterialSaleBatch
};
