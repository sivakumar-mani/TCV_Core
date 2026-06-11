const connection = require('../connection');

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';
const toMoney = (value) => Number(Number(value || 0).toFixed(2));

const salaryListSelect = `
  SELECT es.salary_id, es.employee_id, es.company_name, es.salary_month, es.salary_year,
         es.period_start_date, es.period_end_date, es.earnings_total, es.deductions_total,
         es.net_salary, es.status, es.remarks, es.created_at, es.updated_at,
         e.employee_code, CONCAT_WS(' ', e.first_name, e.last_name) AS employee_name
  FROM employee_salary es
  INNER JOIN employees e ON e.employee_id = es.employee_id
`;

const normalizeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'At least one salary component is required' };
  }

  const normalized = [];
  for (const [index, item] of items.entries()) {
    const description = String(item.description || '').trim();
    const itemType = item.item_type === 'DEDUCTION' ? 'DEDUCTION' : 'EARNING';
    const qty = Number(item.qty);
    const price = Number(item.price);

    if (!description) return { error: `Description is required for row ${index + 1}` };
    if (!Number.isFinite(qty) || qty < 0) return { error: `Qty is invalid for row ${index + 1}` };
    if (!Number.isFinite(price) || price < 0) return { error: `Price is invalid for row ${index + 1}` };

    normalized.push({
      item_type: itemType,
      line_no: index + 1,
      description,
      qty: toMoney(qty),
      price: toMoney(price),
      total: toMoney(qty * price)
    });
  }

  return { items: normalized };
};

const buildSalaryPayload = (body) => {
  const required = [
    ['employee_id', 'Employee'],
    ['company_name', 'Company name'],
    ['salary_month', 'Salary month'],
    ['salary_year', 'Salary year'],
    ['period_start_date', 'Start date'],
    ['period_end_date', 'End date']
  ];

  const missing = required.filter(([field]) => isBlank(body[field])).map(([, label]) => label);
  if (missing.length > 0) {
    return { error: `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required` };
  }

  const salaryMonth = Number(body.salary_month);
  const salaryYear = Number(body.salary_year);
  if (!Number.isInteger(salaryMonth) || salaryMonth < 1 || salaryMonth > 12) {
    return { error: 'Salary month must be between 1 and 12' };
  }
  if (!Number.isInteger(salaryYear) || salaryYear < 2000) {
    return { error: 'Salary year is invalid' };
  }
  if (new Date(body.period_start_date) > new Date(body.period_end_date)) {
    return { error: 'Start date must be before end date' };
  }

  const normalized = normalizeItems(body.items);
  if (normalized.error) return normalized;

  const earningsTotal = toMoney(
    normalized.items.filter((item) => item.item_type === 'EARNING').reduce((sum, item) => sum + item.total, 0)
  );
  const deductionsTotal = toMoney(
    normalized.items.filter((item) => item.item_type === 'DEDUCTION').reduce((sum, item) => sum + item.total, 0)
  );

  return {
    salary: {
      employee_id: Number(body.employee_id),
      company_name: String(body.company_name).trim(),
      salary_month: salaryMonth,
      salary_year: salaryYear,
      period_start_date: body.period_start_date,
      period_end_date: body.period_end_date,
      salary_amount: earningsTotal,
      earnings_total: earningsTotal,
      deductions_total: deductionsTotal,
      net_salary: toMoney(earningsTotal - deductionsTotal),
      status: body.status === 'DRAFT' ? 'DRAFT' : 'FINAL',
      remarks: body.remarks || null
    },
    items: normalized.items
  };
};

const insertItems = async (salaryId, items) => {
  const values = items.map((item) => [
    salaryId,
    item.item_type,
    item.line_no,
    item.description,
    item.qty,
    item.price,
    item.total
  ]);

  await connection.promise().query(
    `INSERT INTO employee_salary_items
       (salary_id, item_type, line_no, description, qty, price, total)
     VALUES ?`,
    [values]
  );
};

const getSalarySlips = async (req, res) => {
  try {
    const [rows] = await connection.promise().query(`${salaryListSelect} ORDER BY es.salary_year DESC, es.salary_month DESC, es.salary_id DESC`);
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getSalarySlipById = async (req, res) => {
  try {
    const { salary_id } = req.params;
    const [rows] = await connection.promise().query(`${salaryListSelect} WHERE es.salary_id = ?`, [salary_id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Salary slip not found' });

    const [items] = await connection.promise().query(
      `SELECT salary_item_id, salary_id, item_type, line_no, description, qty, price, total
       FROM employee_salary_items
       WHERE salary_id = ?
       ORDER BY line_no`,
      [salary_id]
    );

    return res.json({ success: true, data: { ...rows[0], items } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const addSalarySlip = async (req, res) => {
  const payload = buildSalaryPayload(req.body);
  if (payload.error) return res.status(400).json({ success: false, message: payload.error });

  try {
    await connection.promise().beginTransaction();
    const fields = Object.keys(payload.salary);
    const [result] = await connection.promise().query(
      `INSERT INTO employee_salary (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
      fields.map((field) => payload.salary[field])
    );

    await insertItems(result.insertId, payload.items);
    await connection.promise().commit();
    return res.status(201).json({ success: true, message: 'Salary slip added successfully', salary_id: result.insertId });
  } catch (error) {
    await connection.promise().rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Salary slip already exists for this employee and month' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const updateSalarySlip = async (req, res) => {
  if (!req.body.salary_id) return res.status(400).json({ success: false, message: 'salary_id is required' });
  const payload = buildSalaryPayload(req.body);
  if (payload.error) return res.status(400).json({ success: false, message: payload.error });

  try {
    const { salary_id } = req.body;
    const [existing] = await connection.promise().query('SELECT salary_id FROM employee_salary WHERE salary_id = ?', [salary_id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Salary slip not found' });

    await connection.promise().beginTransaction();
    const fields = Object.keys(payload.salary);
    await connection.promise().query(
      `UPDATE employee_salary SET ${fields.map((field) => `${field} = ?`).join(', ')}, updated_at = NOW() WHERE salary_id = ?`,
      [...fields.map((field) => payload.salary[field]), salary_id]
    );
    await connection.promise().query('DELETE FROM employee_salary_items WHERE salary_id = ?', [salary_id]);
    await insertItems(salary_id, payload.items);
    await connection.promise().commit();
    return res.json({ success: true, message: 'Salary slip updated successfully' });
  } catch (error) {
    await connection.promise().rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Salary slip already exists for this employee and month' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const deleteSalarySlip = async (req, res) => {
  try {
    const { salary_id } = req.body;
    if (!salary_id) return res.status(400).json({ success: false, message: 'salary_id is required' });

    const [existing] = await connection.promise().query('SELECT salary_id FROM employee_salary WHERE salary_id = ?', [salary_id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Salary slip not found' });

    await connection.promise().query('DELETE FROM employee_salary WHERE salary_id = ?', [salary_id]);
    return res.json({ success: true, message: 'Salary slip deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getSalarySlips,
  getSalarySlipById,
  addSalarySlip,
  updateSalarySlip,
  deleteSalarySlip
};
