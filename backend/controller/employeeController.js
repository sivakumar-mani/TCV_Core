const connection = require('../connection');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'uploads', 'employees');
fs.mkdirSync(uploadDir, { recursive: true });

const allowedPhotoTypes = ['image/jpeg', 'image/jpg', 'image/png'];
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const uploadPhotoMiddleware = multer({
  storage: photoStorage,
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedPhotoTypes.includes(file.mimetype)) {
      return cb(new Error('Only jpeg, jpg, and png employee photos are allowed'));
    }
    return cb(null, true);
  }
}).single('photo');

const EMPLOYEE_FIELDS = [
  'employee_code',
  'first_name',
  'last_name',
  'phone',
  'alternate_phone',
  'email',
  'designation',
  'department',
  'date_of_birth',
  'qualification',
  'photo_file_name',
  'photo_path',
  'spouse_or_parent_name',
  'relationship',
  'kids_details',
  'id_proof_type',
  'id_proof_name',
  'id_proof_number',
  'joining_date',
  'permanent_address',
  'permanent_city_district',
  'permanent_state',
  'permanent_pincode',
  'temporary_address',
  'temporary_city_district',
  'temporary_state',
  'temporary_pincode',
  'is_active'
];

const generateEmployeeCode = async () => {
  const [rows] = await connection.promise().query(
    `SELECT employee_code
     FROM employees
     WHERE employee_code REGEXP '^TCV[0-9]+$'
     ORDER BY CAST(SUBSTRING(employee_code, 4) AS UNSIGNED) DESC
     LIMIT 1`
  );
  const lastNumber = rows.length ? Number(rows[0].employee_code.replace('TCV', '')) : 0;
  return `TCV${lastNumber + 1}`;
};

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';
const phoneRegex = /^[0-9]{10}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmployee = (employee) => {
  const requiredFields = [
    ['first_name', 'First name'],
    ['last_name', 'Last name'],
    ['phone', 'Phone'],
    ['designation', 'Designation'],
    ['department', 'Department'],
    ['joining_date', 'Joining date'],
    ['date_of_birth', 'Date of birth'],
    ['qualification', 'Qualification'],
    ['spouse_or_parent_name', 'Spouse/parent name'],
    ['id_proof_type', 'ID proof type'],
    ['id_proof_number', 'ID proof number'],
    ['permanent_address', 'Permanent address'],
    ['permanent_city_district', 'Permanent city/district'],
    ['permanent_state', 'Permanent state'],
    ['permanent_pincode', 'Permanent pincode']
  ];

  const missing = requiredFields
    .filter(([field]) => isBlank(employee[field]))
    .map(([, label]) => label);

  if (missing.length > 0) {
    return `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required`;
  }

  if (!phoneRegex.test(String(employee.phone))) {
    return 'Phone must be numeric and exactly 10 digits';
  }

  if (!isBlank(employee.alternate_phone) && !phoneRegex.test(String(employee.alternate_phone))) {
    return 'Alternate phone must be numeric and exactly 10 digits';
  }

  if (!isBlank(employee.email) && !emailRegex.test(String(employee.email))) {
    return 'Email is invalid';
  }

  return null;
};

const getEmployees = async (req, res) => {
  try {
    const [rows] = await connection.promise().query(
      `SELECT employee_id, employee_code, CONCAT_WS(' ', first_name, last_name) AS employee_name,
              first_name, last_name, phone, email, designation, department,
              joining_date, permanent_city_district, permanent_state, is_active, photo_file_name, photo_path,
              created_at, updated_at
       FROM employees
       ORDER BY employee_id DESC`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const [rows] = await connection.promise().query(
      "SELECT *, CONCAT_WS(' ', first_name, last_name) AS employee_name FROM employees WHERE employee_id = ?",
      [employee_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const addEmployee = async (req, res) => {
  try {
    const employee = req.body;
    const validationMessage = validateEmployee(employee);
    if (validationMessage) return res.status(400).json({ success: false, message: validationMessage });

    employee.employee_code = employee.employee_code || await generateEmployeeCode();

    const placeholders = EMPLOYEE_FIELDS.map(() => '?').join(', ');
    const values = EMPLOYEE_FIELDS.map((field) => {
      if (field === 'is_active') return typeof employee[field] !== 'undefined' ? employee[field] : 1;
      return employee[field] || null;
    });

    const [result] = await connection.promise().query(
      `INSERT INTO employees (${EMPLOYEE_FIELDS.join(', ')}) VALUES (${placeholders})`,
      values
    );

    return res.status(201).json({ success: true, message: 'Employee added successfully', employee_id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Employee code or email already exists' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const { employee_id } = req.body;
    const validationMessage = validateEmployee(req.body);
    if (validationMessage) return res.status(400).json({ success: false, message: validationMessage });

    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'employee_id is required' });
    }

    const [existing] = await connection.promise().query(
      'SELECT employee_id FROM employees WHERE employee_id = ?',
      [employee_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const assignments = EMPLOYEE_FIELDS.map((field) => `${field} = ?`).join(', ');
    const values = EMPLOYEE_FIELDS.map((field) => {
      if (field === 'employee_code') return req.body[field] || null;
      if (field === 'is_active') return typeof req.body[field] !== 'undefined' ? req.body[field] : 1;
      return req.body[field] || null;
    });
    values.push(employee_id);

    await connection.promise().query(
      `UPDATE employees SET ${assignments}, updated_at = NOW() WHERE employee_id = ?`,
      values
    );

    return res.json({ success: true, message: 'Employee updated successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Employee code or email already exists' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { employee_id } = req.body;

    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'employee_id is required' });
    }

    const [existing] = await connection.promise().query(
      'SELECT employee_id FROM employees WHERE employee_id = ?',
      [employee_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    await connection.promise().query('DELETE FROM employees WHERE employee_id = ?', [employee_id]);
    return res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getNextEmployeeCode = async (req, res) => {
  try {
    const employee_code = await generateEmployeeCode();
    return res.json({ success: true, employee_code });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Employee code generation failed', error: error.message });
  }
};

const uploadEmployeePhoto = (req, res) => {
  uploadPhotoMiddleware(req, res, (error) => {
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Photo file is required' });
    }

    return res.status(201).json({
      success: true,
      message: 'Photo uploaded successfully',
      photo_file_name: req.file.filename,
      photo_path: `/uploads/employees/${req.file.filename}`
    });
  });
};

module.exports = {
  getEmployees,
  getEmployeeById,
  getNextEmployeeCode,
  uploadEmployeePhoto,
  addEmployee,
  updateEmployee,
  deleteEmployee
};
