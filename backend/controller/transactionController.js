const connection = require('../connection');

const ensureTransactionTable = async (db = connection.promise()) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS finance_transactions (
      finance_transaction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      transaction_date DATE NOT NULL,
      transaction_type ENUM('DEBIT','CREDIT') NOT NULL,
      category VARCHAR(100) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      payment_mode ENUM('CASH','ONLINE','BANK','UPI','OTHER') NOT NULL DEFAULT 'CASH',
      reference_no VARCHAR(100) NULL,
      description VARCHAR(500) NULL,
      instructed_by VARCHAR(150) NULL,
      bill_copy_available ENUM('YES','NO') NULL,
      item_list TEXT NULL,
      received_by VARCHAR(150) NULL,
      received_date DATE NULL,
      approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
      approved_by_user_id INT NULL,
      approved_at DATETIME NULL,
      source_module VARCHAR(50) NULL,
      source_id BIGINT NULL,
      created_by_user_id INT NULL,
      created_by_employee_id INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_finance_transaction_date (transaction_date),
      INDEX idx_finance_transaction_type (transaction_type),
      UNIQUE KEY uk_finance_source (source_module, source_id),
      CONSTRAINT fk_finance_transaction_user FOREIGN KEY (created_by_user_id) REFERENCES users(user_id),
      CONSTRAINT fk_finance_transaction_employee FOREIGN KEY (created_by_employee_id) REFERENCES employees(employee_id)
    )
  `);
  const additions = [
    ['instructed_by', "ALTER TABLE finance_transactions ADD COLUMN instructed_by VARCHAR(150) NULL AFTER description"],
    ['bill_copy_available', "ALTER TABLE finance_transactions ADD COLUMN bill_copy_available ENUM('YES','NO') NULL AFTER instructed_by"],
    ['item_list', 'ALTER TABLE finance_transactions ADD COLUMN item_list TEXT NULL AFTER bill_copy_available'],
    ['received_by', 'ALTER TABLE finance_transactions ADD COLUMN received_by VARCHAR(150) NULL AFTER item_list'],
    ['received_date', 'ALTER TABLE finance_transactions ADD COLUMN received_date DATE NULL AFTER received_by'],
    ['approval_status', "ALTER TABLE finance_transactions ADD COLUMN approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING' AFTER received_date"],
    ['approved_by_user_id', 'ALTER TABLE finance_transactions ADD COLUMN approved_by_user_id INT NULL AFTER approval_status'],
    ['approved_at', 'ALTER TABLE finance_transactions ADD COLUMN approved_at DATETIME NULL AFTER approved_by_user_id']
  ];
  for (const [column, sql] of additions) {
    const [[existing]] = await db.query(
      `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_transactions' AND COLUMN_NAME = ?`,
      [column]
    );
    if (!Number(existing.count)) await db.query(sql);
  }
};

const currentUserId = (res) => Number(res.locals?.userId || res.locals?.user_id) || null;
const currentEmployeeId = (res) => Number(res.locals?.employee_id || res.locals?.employeeId) || null;

const addTransaction = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureTransactionTable(db);
    const type = String(req.body.transaction_type || '').toUpperCase();
    const amount = Number(req.body.amount);
    const transactionDate = String(req.body.transaction_date || '').trim();
    if (!transactionDate || Number.isNaN(new Date(`${transactionDate}T00:00:00`).getTime())) {
      return res.status(400).json({ message: 'Valid transaction date is required' });
    }
    if (!['DEBIT', 'CREDIT'].includes(type)) {
      return res.status(400).json({ message: 'Transaction type must be Debit or Credit' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }
    const category = String(req.body.category || '').trim();
    if (!category) return res.status(400).json({ message: 'Purpose is required' });
    const paymentMode = String(req.body.payment_mode || 'CASH').toUpperCase();
    if (!['CASH', 'ONLINE', 'BANK', 'UPI', 'OTHER'].includes(paymentMode)) {
      return res.status(400).json({ message: 'Invalid payment mode' });
    }
    const referenceNo = String(req.body.reference_no || '').trim();
    const description = String(req.body.description || '').trim();
    if (!referenceNo || !description) {
      return res.status(400).json({ message: 'Reference No and Description are required' });
    }
    const instructedByUserId = Number(req.body.instructed_by_user_id) || null;
    let instructedBy = null;
    if (type === 'DEBIT' && instructedByUserId) {
      const [[selectedUser]] = await db.query(
        `SELECT u.user_id,
                COALESCE(NULLIF(TRIM(CONCAT_WS(' ', e.first_name, e.last_name)), ''),
                         NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username) AS display_name
         FROM users u
         LEFT JOIN employees e ON e.employee_id = u.employee_id
         WHERE u.user_id = ? AND (UPPER(u.role) = 'ADMIN' OR u.user_id = ?)
         LIMIT 1`,
        [instructedByUserId, currentUserId(res) || 0]
      );
      instructedBy = selectedUser?.display_name || null;
    }
    const billCopyAvailable = String(req.body.bill_copy_available || '').toUpperCase();
    const itemList = String(req.body.item_list || '').trim() || null;
    const receivedBy = String(req.body.received_by || '').trim() || null;
    const receivedDate = req.body.received_date || null;
    if (type === 'DEBIT' && (!instructedBy || !['YES', 'NO'].includes(billCopyAvailable) || !itemList)) {
      return res.status(400).json({ message: 'Instructed By, Bill Copy Yes/No, and Item List/Description are required for Debit' });
    }
    if (type === 'CREDIT' && (!receivedBy || !receivedDate)) {
      return res.status(400).json({ message: 'Received By and Received Date are required for Credit' });
    }
    const [result] = await db.query(
      `INSERT INTO finance_transactions (
        transaction_date, transaction_type, category, amount, payment_mode,
        reference_no, description, instructed_by, bill_copy_available, item_list,
        received_by, received_date, approval_status, created_by_user_id, created_by_employee_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [
        transactionDate,
        type,
        category,
        amount,
        paymentMode,
        referenceNo,
        description,
        type === 'DEBIT' ? instructedBy : null,
        type === 'DEBIT' ? billCopyAvailable : null,
        type === 'DEBIT' ? itemList : null,
        type === 'CREDIT' ? receivedBy : null,
        type === 'CREDIT' ? receivedDate : null,
        currentUserId(res),
        currentEmployeeId(res)
      ]
    );
    return res.status(201).json({ message: 'Transaction submitted for approval', finance_transaction_id: result.insertId });
  } catch (error) {
    return res.status(500).json({ message: 'Transaction save failed', error: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureTransactionTable(db);
    const startDate = req.query.start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = req.query.end_date || new Date();
    const type = String(req.query.transaction_type || '').toUpperCase();
    const values = [startDate, endDate];
    let typeFilter = '';
    if (['DEBIT', 'CREDIT'].includes(type)) {
      typeFilter = ' AND ft.transaction_type = ?';
      values.push(type);
    }
    const createdByUserId = Number(req.query.created_by_user_id) || null;
    let userFilter = '';
    if (createdByUserId) {
      userFilter = ' AND ft.created_by_user_id = ?';
      values.push(createdByUserId);
    }
    const [rows] = await db.query(
      `SELECT ft.*, COALESCE(NULLIF(CONCAT_WS(' ', e.first_name, e.last_name), ''), NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''), u.username, '-') AS entered_by_name
       FROM finance_transactions ft
       LEFT JOIN employees e ON e.employee_id = ft.created_by_employee_id
       LEFT JOIN users u ON u.user_id = ft.created_by_user_id
       WHERE ft.transaction_date BETWEEN ? AND ?${typeFilter}${userFilter}
       ORDER BY ft.transaction_date DESC, ft.finance_transaction_id DESC`,
      values
    );
    const [users] = await db.query(
      `SELECT DISTINCT ft.created_by_user_id AS user_id,
              COALESCE(NULLIF(CONCAT_WS(' ', e.first_name, e.last_name), ''),
                       NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''), u.username, '-') AS user_name,
              u.username
       FROM finance_transactions ft
       LEFT JOIN employees e ON e.employee_id = ft.created_by_employee_id
       LEFT JOIN users u ON u.user_id = ft.created_by_user_id
       WHERE ft.created_by_user_id IS NOT NULL
       ORDER BY user_name`
    );
    const [instructedByUsers] = await db.query(
      `SELECT u.user_id,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', e.first_name, e.last_name)), ''),
                       NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username) AS user_name,
              u.username, u.role
       FROM users u
       LEFT JOIN employees e ON e.employee_id = u.employee_id
       WHERE UPPER(u.role) = 'ADMIN' OR u.user_id = ?
       ORDER BY CASE WHEN u.user_id = ? THEN 0 ELSE 1 END, user_name`,
      [currentUserId(res) || 0, currentUserId(res) || 0]
    );
    const summary = rows.reduce((result, row) => {
      if (row.approval_status !== 'APPROVED') return result;
      const amount = Number(row.amount) || 0;
      if (row.transaction_type === 'CREDIT') result.total_credit += amount;
      else result.total_debit += amount;
      return result;
    }, { total_credit: 0, total_debit: 0 });
    return res.json({
      rows,
      users,
      instructed_by_users: instructedByUsers,
      total_credit: summary.total_credit,
      total_debit: summary.total_debit,
      balance: summary.total_credit - summary.total_debit
    });
  } catch (error) {
    return res.status(500).json({ message: 'Transaction report failed', error: error.message });
  }
};

const approveTransaction = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureTransactionTable(db);
    const transactionId = Number(req.params.transactionId);
    if (!transactionId) return res.status(400).json({ message: 'Valid transaction is required' });
    const [result] = await db.query(
      `UPDATE finance_transactions
       SET approval_status = 'APPROVED', approved_by_user_id = ?, approved_at = NOW()
       WHERE finance_transaction_id = ? AND approval_status = 'PENDING'`,
      [currentUserId(res), transactionId]
    );
    if (!result.affectedRows) return res.status(409).json({ message: 'Transaction is already processed or unavailable' });
    return res.json({ message: 'Transaction approved successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Transaction approval failed', error: error.message });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureTransactionTable(db);
    const transactionId = Number(req.params.transactionId);
    if (!transactionId) return res.status(400).json({ message: 'Valid transaction is required' });
    const [result] = await db.query(
      'DELETE FROM finance_transactions WHERE finance_transaction_id = ?',
      [transactionId]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Transaction not found' });
    return res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Transaction delete failed', error: error.message });
  }
};

module.exports = { ensureTransactionTable, addTransaction, getTransactions, approveTransaction, deleteTransaction };
