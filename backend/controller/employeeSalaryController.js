const connection = require('../connection');

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';
const toNumber = (value) => Number.parseFloat(value || 0) || 0;

const validateSalary = (salary) => {
  const requiredFields = [
    ['employee_id', 'Employee'],
    ['salary_month', 'Salary month'],
    ['salary_year', 'Salary year'],
    ['period_start_date', 'Period start date'],
    ['period_end_date', 'Period end date'],
    ['net_salary', 'Net salary']
  ];

  for (const [field, label] of requiredFields) {
    if (isBlank(salary[field])) {
      return { valid: false, error: `${label} is required` };
    }
  }

  if (salary.salary_month < 1 || salary.salary_month > 12) {
    return { valid: false, error: 'Salary month must be between 1 and 12' };
  }

  if (salary.salary_year < 2000) {
    return { valid: false, error: 'Salary year must be 2000 or later' };
  }

  if (parseFloat(salary.net_salary) < 0) {
    return { valid: false, error: 'Net salary cannot be negative' };
  }

  return { valid: true };
};

const normalizeSalaryItems = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      valid: false,
      error: 'At least one salary component is required',
      items: [],
      earnings_total: 0,
      deductions_total: 0,
      net_salary: 0
    };
  }

  const normalizedItems = [];
  let earnings_total = 0;
  let deductions_total = 0;

  for (const [index, item] of items.entries()) {
    const item_type = item.item_type === 'DEDUCTION' ? 'DEDUCTION' : 'EARNING';
    const description = String(item.description || '').trim();
    const qty = toNumber(item.qty || 1);
    const price = toNumber(item.price);
    const total = Number((qty * price).toFixed(2));

    if (isBlank(description)) {
      return { valid: false, error: `Description is required for line ${index + 1}` };
    }

    if (qty < 0 || price < 0) {
      return { valid: false, error: `Qty and price cannot be negative on line ${index + 1}` };
    }

    if (item_type === 'EARNING') earnings_total += total;
    else deductions_total += total;

    normalizedItems.push({
      item_type,
      line_no: index + 1,
      description,
      qty,
      price,
      total
    });
  }

  return {
    valid: true,
    items: normalizedItems,
    earnings_total: Number(earnings_total.toFixed(2)),
    deductions_total: Number(deductions_total.toFixed(2)),
    net_salary: Number((earnings_total - deductions_total).toFixed(2))
  };
};

const getSalaries = async (req, res) => {
  try {
    const [salaries] = await connection.promise().query(
      `SELECT 
        es.salary_id,
        es.employee_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        CONCAT_WS(' ', e.first_name, e.last_name) AS employee_name,
        es.company_name,
        es.salary_month,
        es.salary_year,
        es.period_start_date,
        es.period_end_date,
        es.salary_amount,
        es.earnings_total,
        es.deductions_total,
        es.net_salary,
        es.status,
        es.remarks,
        es.created_at,
        es.updated_at
      FROM employee_salary es
      JOIN employees e ON es.employee_id = e.employee_id
      ORDER BY es.salary_year DESC, es.salary_month DESC`
    );
    res.status(200).json({ data: salaries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSalaryById = async (req, res) => {
  try {
    const { salary_id } = req.params;

    if (isBlank(salary_id)) {
      return res.status(400).json({ error: 'Salary ID is required' });
    }

    const [salary] = await connection.promise().query(
      `SELECT 
        es.*,
        e.employee_code,
        e.first_name,
        e.last_name
      FROM employee_salary es
      JOIN employees e ON es.employee_id = e.employee_id
      WHERE es.salary_id = ?`,
      [salary_id]
    );

    if (!salary.length) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    const [items] = await connection.promise().query(
      `SELECT * FROM employee_salary_items WHERE salary_id = ? ORDER BY line_no`,
      [salary_id]
    );

    res.status(200).json({ data: { ...salary[0], items } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addSalary = async (req, res) => {
  const db = connection.promise();

  try {
    const salary = req.body;
    const itemResult = normalizeSalaryItems(salary.items);

    if (!itemResult.valid) {
      return res.status(400).json({ error: itemResult.error });
    }

    const validation = validateSalary({ ...salary, net_salary: itemResult.net_salary });

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const {
      employee_id,
      company_name = 'TCV',
      salary_month,
      salary_year,
      period_start_date,
      period_end_date,
      status = 'FINAL',
      remarks
    } = salary;

    // Check if employee exists
    const [employees] = await db.query(
      'SELECT employee_id FROM employees WHERE employee_id = ?',
      [employee_id]
    );

    if (!employees.length) {
      return res.status(400).json({ error: 'Employee not found' });
    }

    // Check for duplicate salary record
    const [existing] = await db.query(
      `SELECT salary_id FROM employee_salary 
       WHERE employee_id = ? AND salary_month = ? AND salary_year = ?`,
      [employee_id, salary_month, salary_year]
    );

    if (existing.length) {
      return res.status(400).json({ error: 'Salary record already exists for this month' });
    }

    await db.beginTransaction();

    const [result] = await db.query(
      `INSERT INTO employee_salary 
       (employee_id, company_name, salary_month, salary_year, period_start_date, 
        period_end_date, salary_amount, earnings_total, deductions_total, net_salary, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee_id,
        company_name,
        salary_month,
        salary_year,
        period_start_date,
        period_end_date,
        itemResult.earnings_total,
        itemResult.earnings_total,
        itemResult.deductions_total,
        itemResult.net_salary,
        status,
        remarks
      ]
    );

    const itemValues = itemResult.items.map((item) => [
      result.insertId,
      item.item_type,
      item.line_no,
      item.description,
      item.qty,
      item.price,
      item.total
    ]);

    await db.query(
      `INSERT INTO employee_salary_items
       (salary_id, item_type, line_no, description, qty, price, total)
       VALUES ?`,
      [itemValues]
    );

    await db.commit();

    res.status(201).json({
      message: 'Salary record created',
      salary_id: result.insertId,
      earnings_total: itemResult.earnings_total,
      deductions_total: itemResult.deductions_total,
      net_salary: itemResult.net_salary
    });
  } catch (error) {
    try {
      await db.rollback();
    } catch (rollbackError) {
      console.error('Salary add rollback failed:', rollbackError);
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Salary record already exists for this month' });
    }

    res.status(500).json({ error: error.message });
  }
};

const updateSalary = async (req, res) => {
  const db = connection.promise();

  try {
    const { salary_id, ...updates } = req.body;
    const itemResult = normalizeSalaryItems(updates.items);

    if (isBlank(salary_id)) {
      return res.status(400).json({ error: 'Salary ID is required' });
    }

    if (!itemResult.valid) {
      return res.status(400).json({ error: itemResult.error });
    }

    const validation = validateSalary({ ...updates, net_salary: itemResult.net_salary });

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Check if salary exists
    const [existing] = await db.query(
      'SELECT salary_id FROM employee_salary WHERE salary_id = ?',
      [salary_id]
    );

    if (!existing.length) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    await db.beginTransaction();

    await db.query(
      `UPDATE employee_salary
       SET employee_id = ?, company_name = ?, salary_month = ?, salary_year = ?,
           period_start_date = ?, period_end_date = ?, salary_amount = ?,
           earnings_total = ?, deductions_total = ?, net_salary = ?,
           status = ?, remarks = ?
       WHERE salary_id = ?`,
      [
        updates.employee_id,
        updates.company_name || 'TCV',
        updates.salary_month,
        updates.salary_year,
        updates.period_start_date,
        updates.period_end_date,
        itemResult.earnings_total,
        itemResult.earnings_total,
        itemResult.deductions_total,
        itemResult.net_salary,
        updates.status || 'FINAL',
        updates.remarks || null,
        salary_id
      ]
    );

    await db.query('DELETE FROM employee_salary_items WHERE salary_id = ?', [salary_id]);

    const itemValues = itemResult.items.map((item) => [
      salary_id,
      item.item_type,
      item.line_no,
      item.description,
      item.qty,
      item.price,
      item.total
    ]);

    await db.query(
      `INSERT INTO employee_salary_items
       (salary_id, item_type, line_no, description, qty, price, total)
       VALUES ?`,
      [itemValues]
    );

    await db.commit();

    res.status(200).json({
      message: 'Salary record updated',
      earnings_total: itemResult.earnings_total,
      deductions_total: itemResult.deductions_total,
      net_salary: itemResult.net_salary
    });
  } catch (error) {
    try {
      await db.rollback();
    } catch (rollbackError) {
      console.error('Salary update rollback failed:', rollbackError);
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Salary record already exists for this month' });
    }

    res.status(500).json({ error: error.message });
  }
};

const deleteSalary = async (req, res) => {
  try {
    const { salary_id } = req.body;

    if (isBlank(salary_id)) {
      return res.status(400).json({ error: 'Salary ID is required' });
    }

    await connection.promise().query(
      'DELETE FROM employee_salary WHERE salary_id = ?',
      [salary_id]
    );

    res.status(200).json({ message: 'Salary record deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSalaryByEmployee = async (req, res) => {
  try {
    const { employee_id } = req.params;

    if (isBlank(employee_id)) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    const [salaries] = await connection.promise().query(
      `SELECT * FROM employee_salary 
       WHERE employee_id = ?
       ORDER BY salary_year DESC, salary_month DESC`,
      [employee_id]
    );

    res.status(200).json({ data: salaries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getSalaries,
  getSalaryById,
  addSalary,
  updateSalary,
  deleteSalary,
  getSalaryByEmployee
};
