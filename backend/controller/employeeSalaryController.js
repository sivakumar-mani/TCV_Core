const connection = require('../connection');

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

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

const getSalaries = async (req, res) => {
  try {
    const [salaries] = await connection.promise().query(
      `SELECT 
        es.salary_id,
        es.employee_id,
        e.employee_code,
        e.first_name,
        e.last_name,
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
  try {
    const salary = req.body;
    const validation = validateSalary(salary);

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
      salary_amount = 0,
      earnings_total = 0,
      deductions_total = 0,
      net_salary,
      status = 'FINAL',
      remarks
    } = salary;

    // Check if employee exists
    const [employees] = await connection.promise().query(
      'SELECT employee_id FROM employees WHERE employee_id = ?',
      [employee_id]
    );

    if (!employees.length) {
      return res.status(400).json({ error: 'Employee not found' });
    }

    // Check for duplicate salary record
    const [existing] = await connection.promise().query(
      `SELECT salary_id FROM employee_salary 
       WHERE employee_id = ? AND salary_month = ? AND salary_year = ?`,
      [employee_id, salary_month, salary_year]
    );

    if (existing.length) {
      return res.status(400).json({ error: 'Salary record already exists for this month' });
    }

    const [result] = await connection.promise().query(
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
        salary_amount,
        earnings_total,
        deductions_total,
        net_salary,
        status,
        remarks
      ]
    );

    res.status(201).json({ message: 'Salary record created', salary_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateSalary = async (req, res) => {
  try {
    const { salary_id, ...updates } = req.body;

    if (isBlank(salary_id)) {
      return res.status(400).json({ error: 'Salary ID is required' });
    }

    // Check if salary exists
    const [existing] = await connection.promise().query(
      'SELECT salary_id FROM employee_salary WHERE salary_id = ?',
      [salary_id]
    );

    if (!existing.length) {
      return res.status(404).json({ error: 'Salary record not found' });
    }

    const allowedFields = [
      'salary_amount',
      'earnings_total',
      'deductions_total',
      'net_salary',
      'status',
      'remarks'
    ];

    const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const values = updateFields.map(field => updates[field]);
    values.push(salary_id);

    await connection.promise().query(
      `UPDATE employee_salary SET ${setClause} WHERE salary_id = ?`,
      values
    );

    res.status(200).json({ message: 'Salary record updated' });
  } catch (error) {
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
