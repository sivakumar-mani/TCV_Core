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
};

const currentUserId = (res) => Number(res.locals?.userId || res.locals?.user_id) || null;
const currentEmployeeId = (res) => Number(res.locals?.employee_id || res.locals?.employeeId) || null;

const addTransaction = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureTransactionTable(db);
    const type = String(req.body.transaction_type || '').toUpperCase();
    const amount = Number(req.body.amount);
    if (!['DEBIT', 'CREDIT'].includes(type)) {
      return res.status(400).json({ message: 'Transaction type must be Debit or Credit' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }
    const category = String(req.body.category || '').trim();
    if (!category) return res.status(400).json({ message: 'Category is required' });
    const paymentMode = String(req.body.payment_mode || 'CASH').toUpperCase();
    if (!['CASH', 'ONLINE', 'BANK', 'UPI', 'OTHER'].includes(paymentMode)) {
      return res.status(400).json({ message: 'Invalid payment mode' });
    }
    const [result] = await db.query(
      `INSERT INTO finance_transactions (
        transaction_date, transaction_type, category, amount, payment_mode,
        reference_no, description, created_by_user_id, created_by_employee_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.body.transaction_date || new Date(),
        type,
        category,
        amount,
        paymentMode,
        String(req.body.reference_no || '').trim() || null,
        String(req.body.description || '').trim() || null,
        currentUserId(res),
        currentEmployeeId(res)
      ]
    );
    return res.status(201).json({ message: 'Transaction added successfully', finance_transaction_id: result.insertId });
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
    const summary = rows.reduce((result, row) => {
      const amount = Number(row.amount) || 0;
      if (row.transaction_type === 'CREDIT') result.total_credit += amount;
      else result.total_debit += amount;
      return result;
    }, { total_credit: 0, total_debit: 0 });
    return res.json({
      rows,
      users,
      total_credit: summary.total_credit,
      total_debit: summary.total_debit,
      balance: summary.total_credit - summary.total_debit
    });
  } catch (error) {
    return res.status(500).json({ message: 'Transaction report failed', error: error.message });
  }
};

module.exports = { ensureTransactionTable, addTransaction, getTransactions };
