const connection = require('../connection');

const allowedStatuses = new Set(['OPEN', 'IN_PROGRESS', 'HOLD', 'PENDING', 'COMPLETED']);
const allowedComplainantTypes = new Set(['CATV', 'NET', 'CCTV', 'ANONYMOUS']);
const numberOrNull = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
const textOrNull = value => String(value ?? '').trim() || null;
const userId = req => numberOrNull(req.res?.locals?.userId || req.res?.locals?.user_id || req.res?.locals?.id);

const ensureComplaintTables = async db => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS cable_tv_complaints (
      complaint_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      complaint_no VARCHAR(30) NOT NULL,
      complainant_type ENUM('CATV','NET','CCTV','ANONYMOUS') NOT NULL DEFAULT 'CATV',
      cable_customer_id BIGINT NULL,
      service_customer_id INT NULL,
      anonymous_name VARCHAR(150) NULL,
      anonymous_mobile VARCHAR(20) NULL,
      reported_mobile VARCHAR(20) NULL,
      anonymous_address VARCHAR(500) NULL,
      nature_of_complaint VARCHAR(250) NOT NULL,
      complaint_description TEXT NULL,
      status ENUM('OPEN','IN_PROGRESS','HOLD','PENDING','COMPLETED') NOT NULL DEFAULT 'OPEN',
      assigned_employee_id INT NULL,
      registered_by_user_id INT NULL,
      registered_by_employee_id INT NULL,
      registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_cable_tv_complaint_no (complaint_no),
      INDEX idx_cable_tv_complaint_customer (cable_customer_id),
      INDEX idx_cable_tv_complaint_service_customer (service_customer_id),
      INDEX idx_cable_tv_complaint_status (status),
      INDEX idx_cable_tv_complaint_assigned (assigned_employee_id),
      CONSTRAINT fk_cable_tv_complaint_customer FOREIGN KEY (cable_customer_id) REFERENCES cable_tv_customers(cable_customer_id),
      CONSTRAINT fk_cable_tv_complaint_service_customer FOREIGN KEY (service_customer_id) REFERENCES customers(customer_id),
      CONSTRAINT fk_cable_tv_complaint_assigned FOREIGN KEY (assigned_employee_id) REFERENCES employees(employee_id)
    )
  `);
  const [complaintTypeColumns] = await db.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_tv_complaints'
       AND COLUMN_NAME IN ('complainant_type', 'service_customer_id')`
  );
  const complaintTypeColumnNames = new Set(complaintTypeColumns.map(column => column.COLUMN_NAME));
  if (!complaintTypeColumnNames.has('complainant_type')) {
    await db.query(`ALTER TABLE cable_tv_complaints
      ADD COLUMN complainant_type ENUM('CATV','NET','CCTV','ANONYMOUS') NOT NULL DEFAULT 'CATV' AFTER complaint_no`);
    await db.query(`UPDATE cable_tv_complaints
      SET complainant_type = CASE WHEN cable_customer_id IS NULL THEN 'ANONYMOUS' ELSE 'CATV' END`);
  }
  if (!complaintTypeColumnNames.has('service_customer_id')) {
    await db.query('ALTER TABLE cable_tv_complaints ADD COLUMN service_customer_id INT NULL AFTER cable_customer_id');
    await db.query('ALTER TABLE cable_tv_complaints ADD INDEX idx_cable_tv_complaint_service_customer (service_customer_id)');
  }
  const [[reportedMobileColumn]] = await db.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cable_tv_complaints'
       AND COLUMN_NAME = 'reported_mobile' LIMIT 1`
  );
  if (!reportedMobileColumn) {
    await db.query('ALTER TABLE cable_tv_complaints ADD COLUMN reported_mobile VARCHAR(20) NULL AFTER anonymous_mobile');
  }
  await db.query(`
    CREATE TABLE IF NOT EXISTS cable_tv_complaint_attempts (
      complaint_attempt_id BIGINT AUTO_INCREMENT PRIMARY KEY,
      complaint_id BIGINT NOT NULL,
      attempt_no INT NOT NULL,
      status ENUM('OPEN','IN_PROGRESS','HOLD','PENDING','COMPLETED') NOT NULL,
      assigned_employee_id INT NULL,
      start_time DATETIME NULL,
      end_time DATETIME NULL,
      reason TEXT NULL,
      remedy TEXT NULL,
      notes TEXT NULL,
      entered_by_user_id INT NULL,
      entered_by_employee_id INT NULL,
      entered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cable_tv_attempt_complaint (complaint_id),
      CONSTRAINT fk_cable_tv_attempt_complaint FOREIGN KEY (complaint_id) REFERENCES cable_tv_complaints(complaint_id),
      CONSTRAINT fk_cable_tv_attempt_employee FOREIGN KEY (assigned_employee_id) REFERENCES employees(employee_id)
    )
  `);
};

const resolveEmployeeId = async (db, req, requestedId) => {
  if (numberOrNull(requestedId)) return numberOrNull(requestedId);
  const tokenEmployeeId = numberOrNull(req.res?.locals?.employee_id);
  if (tokenEmployeeId) return tokenEmployeeId;
  const username = req.res?.locals?.username || req.res?.locals?.userName;
  if (!username) return null;
  const [[employee]] = await db.query(
    `SELECT employee_id FROM employees
     WHERE employee_code = ? OR email = ? OR CONCAT_WS(' ', first_name, last_name) = ?
     LIMIT 1`,
    [username, username, username]
  );
  return employee?.employee_id || null;
};

const complaintSelect = `
  SELECT c.*,
         COALESCE(CAST(customer.customer_code AS CHAR), CAST(service_customer.customer_id AS CHAR)) AS customer_code,
         COALESCE(customer.full_name,
           NULLIF(TRIM(CONCAT_WS(' ', service_customer.salutation, service_customer.customer_name)), '')) AS customer_name,
         COALESCE(customer.mobile_no, service_customer.phone) AS customer_mobile,
         COALESCE(customer.alternate_mobile_no, service_customer.alternate_phone) AS customer_alternate_mobile,
         CASE WHEN c.cable_customer_id IS NOT NULL
           THEN CONCAT_WS(', ', customer.door_no, street.street_name, area.area_name, location.location_name, customer.city, customer.pincode)
           ELSE CONCAT_WS(', ', service_customer.address, service_customer.city_district, service_customer.state, service_customer.pincode)
         END AS customer_address,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', assigned.first_name, assigned.last_name)), ''), assigned.employee_code) AS assigned_employee_name,
         COALESCE(NULLIF(TRIM(CONCAT_WS(' ', registered.first_name, registered.last_name)), ''), registered.employee_code, registered_user.username) AS registered_by_name
  FROM cable_tv_complaints c
  LEFT JOIN cable_tv_customers customer ON customer.cable_customer_id = c.cable_customer_id
  LEFT JOIN cable_streets street ON street.street_id = customer.street_id
  LEFT JOIN cable_areas area ON area.area_id = customer.area_id
  LEFT JOIN cable_locations location ON location.location_id = customer.location_id
  LEFT JOIN customers service_customer ON service_customer.customer_id = c.service_customer_id
  LEFT JOIN employees assigned ON assigned.employee_id = c.assigned_employee_id
  LEFT JOIN employees registered ON registered.employee_id = c.registered_by_employee_id
  LEFT JOIN users registered_user ON registered_user.user_id = c.registered_by_user_id`;

const getComplaints = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureComplaintTables(db);
    const filters = [];
    const values = [];
    const status = String(req.query.status || '').toUpperCase();
    if (allowedStatuses.has(status)) { filters.push('c.status = ?'); values.push(status); }
    if (numberOrNull(req.query.assigned_employee_id)) {
      filters.push('c.assigned_employee_id = ?');
      values.push(numberOrNull(req.query.assigned_employee_id));
    }
    if (textOrNull(req.query.search)) {
      const search = `%${textOrNull(req.query.search)}%`;
      filters.push(`(c.complaint_no LIKE ? OR customer.customer_code LIKE ? OR customer.full_name LIKE ?
        OR service_customer.customer_name LIKE ? OR service_customer.phone LIKE ?
        OR c.anonymous_name LIKE ? OR c.anonymous_mobile LIKE ? OR c.nature_of_complaint LIKE ?)`);
      values.push(search, search, search, search, search, search, search, search);
    }
    const [rows] = await db.query(
      `${complaintSelect} ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
       ORDER BY c.registered_at DESC, c.complaint_id DESC`,
      values
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Complaint list could not be loaded', error: error.message });
  }
};

const getComplaintCustomers = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureComplaintTables(db);
    const type = String(req.query.type || 'CATV').toUpperCase();
    if (!['CATV', 'NET', 'CCTV'].includes(type)) {
      return res.status(400).json({ message: 'Customer type must be CATV, Net or CCTV' });
    }
    if (type === 'CATV') {
      const [rows] = await db.query(
        `SELECT c.cable_customer_id AS customer_id, c.customer_code,
                c.full_name AS customer_name, c.mobile_no AS phone,
                c.alternate_mobile_no AS alternate_phone,
                CONCAT_WS(', ', c.door_no, s.street_name, a.area_name, l.location_name, c.city, c.pincode) AS address
         FROM cable_tv_customers c
         LEFT JOIN cable_streets s ON s.street_id = c.street_id
         LEFT JOIN cable_areas a ON a.area_id = c.area_id
         LEFT JOIN cable_locations l ON l.location_id = c.location_id
         ORDER BY c.full_name`
      );
      return res.json(rows);
    }
    const [rows] = await db.query(
      `SELECT customer_id, customer_id AS customer_code,
              NULLIF(TRIM(CONCAT_WS(' ', salutation, customer_name)), '') AS customer_name,
              phone, alternate_phone,
              CONCAT_WS(', ', address, city_district, state, pincode) AS address
       FROM customers WHERE is_active = 1 ORDER BY customer_name`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Complaint customers could not be loaded', error: error.message });
  }
};

const getComplaintById = async (req, res) => {
  try {
    const db = connection.promise();
    await ensureComplaintTables(db);
    const complaintId = numberOrNull(req.params.complaintId);
    const [[complaint]] = await db.query(`${complaintSelect} WHERE c.complaint_id = ?`, [complaintId]);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    const [attempts] = await db.query(
      `SELECT a.*,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', assigned.first_name, assigned.last_name)), ''), assigned.employee_code) AS assigned_employee_name,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', entered.first_name, entered.last_name)), ''), entered.employee_code, entered_user.username) AS entered_by_name
       FROM cable_tv_complaint_attempts a
       LEFT JOIN employees assigned ON assigned.employee_id = a.assigned_employee_id
       LEFT JOIN employees entered ON entered.employee_id = a.entered_by_employee_id
       LEFT JOIN users entered_user ON entered_user.user_id = a.entered_by_user_id
       WHERE a.complaint_id = ?
       ORDER BY a.attempt_no DESC, a.complaint_attempt_id DESC`,
      [complaintId]
    );
    return res.json({ ...complaint, attempts });
  } catch (error) {
    return res.status(500).json({ message: 'Complaint details could not be loaded', error: error.message });
  }
};

const addComplaint = async (req, res) => {
  const db = connection.promise();
  let transactionStarted = false;
  try {
    await ensureComplaintTables(db);
    const payload = req.body || {};
    const complainantType = String(payload.complainant_type || (payload.cable_customer_id ? 'CATV' : 'ANONYMOUS')).toUpperCase();
    const customerId = complainantType === 'CATV' ? numberOrNull(payload.cable_customer_id) : null;
    const serviceCustomerId = ['NET', 'CCTV'].includes(complainantType) ? numberOrNull(payload.service_customer_id) : null;
    const anonymousName = textOrNull(payload.anonymous_name);
    const anonymousMobile = textOrNull(payload.anonymous_mobile);
    const nature = textOrNull(payload.nature_of_complaint);
    if (!allowedComplainantTypes.has(complainantType)) {
      return res.status(400).json({ message: 'Complaint type is invalid' });
    }
    if (complainantType === 'ANONYMOUS' && !anonymousName && !anonymousMobile) {
      return res.status(400).json({ message: 'Select a customer or enter anonymous caller details' });
    }
    if (complainantType === 'CATV' && !customerId) return res.status(400).json({ message: 'Select a CATV customer' });
    if (['NET', 'CCTV'].includes(complainantType) && !serviceCustomerId) {
      return res.status(400).json({ message: `Select a ${complainantType === 'NET' ? 'Net' : 'CCTV'} customer` });
    }
    if (!nature) return res.status(400).json({ message: 'Nature of complaint is required' });
    if (customerId) {
      const [[customer]] = await db.query(
        'SELECT cable_customer_id FROM cable_tv_customers WHERE cable_customer_id = ? LIMIT 1',
        [customerId]
      );
      if (!customer) return res.status(400).json({ message: 'Selected customer was not found' });
    }
    if (serviceCustomerId) {
      const [[serviceCustomer]] = await db.query(
        'SELECT customer_id FROM customers WHERE customer_id = ? AND is_active = 1 LIMIT 1',
        [serviceCustomerId]
      );
      if (!serviceCustomer) return res.status(400).json({ message: 'Selected customer was not found' });
    }
    const registeredEmployeeId = await resolveEmployeeId(db, req);
    await db.beginTransaction();
    transactionStarted = true;
    const [[next]] = await db.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(complaint_no, '-', -1) AS UNSIGNED)), 0) + 1 AS next_no
       FROM cable_tv_complaints FOR UPDATE`
    );
    const complaintNo = `CMP-${String(next.next_no).padStart(6, '0')}`;
    const [result] = await db.query(
      `INSERT INTO cable_tv_complaints
       (complaint_no, complainant_type, cable_customer_id, service_customer_id,
        anonymous_name, anonymous_mobile, reported_mobile, anonymous_address,
        nature_of_complaint, complaint_description, status, registered_by_user_id, registered_by_employee_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)`,
      [
        complaintNo, complainantType, customerId, serviceCustomerId,
        anonymousName, anonymousMobile, textOrNull(payload.reported_mobile), textOrNull(payload.anonymous_address),
        nature, textOrNull(payload.complaint_description), userId(req), registeredEmployeeId
      ]
    );
    await db.query(
      `INSERT INTO cable_tv_complaint_attempts
       (complaint_id, attempt_no, status, notes, entered_by_user_id, entered_by_employee_id)
       VALUES (?, 1, 'OPEN', ?, ?, ?)`,
      [result.insertId, textOrNull(payload.complaint_description) || 'Complaint registered', userId(req), registeredEmployeeId]
    );
    await db.commit();
    return res.status(201).json({ message: 'Complaint registered successfully', complaint_id: result.insertId, complaint_no: complaintNo });
  } catch (error) {
    if (transactionStarted) await db.rollback();
    return res.status(500).json({ message: 'Complaint registration failed', error: error.message });
  }
};

const addComplaintAttempt = async (req, res) => {
  const db = connection.promise();
  let transactionStarted = false;
  try {
    await ensureComplaintTables(db);
    const complaintId = numberOrNull(req.params.complaintId);
    const payload = req.body || {};
    const status = String(payload.status || '').toUpperCase();
    if (!complaintId || !allowedStatuses.has(status) || status === 'OPEN') {
      return res.status(400).json({ message: 'A valid complaint status is required' });
    }
    await db.beginTransaction();
    transactionStarted = true;
    const [[complaint]] = await db.query(
      'SELECT * FROM cable_tv_complaints WHERE complaint_id = ? FOR UPDATE',
      [complaintId]
    );
    if (!complaint) {
      await db.rollback(); transactionStarted = false;
      return res.status(404).json({ message: 'Complaint not found' });
    }
    if (complaint.status === 'COMPLETED') {
      await db.rollback(); transactionStarted = false;
      return res.status(409).json({ message: 'Completed complaints cannot be updated' });
    }
    if (complaint.status === 'OPEN' && status !== 'IN_PROGRESS') {
      await db.rollback(); transactionStarted = false;
      return res.status(400).json({ message: 'The first assignment must change the complaint status to In Progress' });
    }
    const mappingType = String(payload.mapping_type || complaint.complainant_type || 'ANONYMOUS').toUpperCase();
    const customerId = mappingType === 'CATV'
      ? numberOrNull(payload.cable_customer_id) || complaint.cable_customer_id
      : complaint.cable_customer_id;
    const serviceCustomerId = ['NET', 'CCTV'].includes(mappingType)
      ? numberOrNull(payload.service_customer_id) || complaint.service_customer_id
      : complaint.service_customer_id;
    const assignedEmployeeId = await resolveEmployeeId(db, req, payload.assigned_employee_id || complaint.assigned_employee_id);
    const startTime = textOrNull(payload.start_time);
    const endTime = textOrNull(payload.end_time);
    if (!assignedEmployeeId) {
      await db.rollback(); transactionStarted = false;
      return res.status(400).json({ message: 'Assigned technician is required' });
    }
    if ((customerId || serviceCustomerId) && (!startTime || !endTime)) {
      await db.rollback(); transactionStarted = false;
      return res.status(400).json({ message: 'Start time and end time are required for customer complaints' });
    }
    if (startTime && endTime && new Date(endTime) < new Date(startTime)) {
      await db.rollback(); transactionStarted = false;
      return res.status(400).json({ message: 'End time cannot be before start time' });
    }
    const [[nextAttempt]] = await db.query(
      'SELECT COALESCE(MAX(attempt_no), 0) + 1 AS attempt_no FROM cable_tv_complaint_attempts WHERE complaint_id = ?',
      [complaintId]
    );
    const enteredEmployeeId = await resolveEmployeeId(db, req);
    await db.query(
      `INSERT INTO cable_tv_complaint_attempts
       (complaint_id, attempt_no, status, assigned_employee_id, start_time, end_time,
        reason, remedy, notes, entered_by_user_id, entered_by_employee_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        complaintId, nextAttempt.attempt_no, status, assignedEmployeeId, startTime, endTime,
        textOrNull(payload.reason), textOrNull(payload.remedy), textOrNull(payload.notes),
        userId(req), enteredEmployeeId
      ]
    );
    await db.query(
      `UPDATE cable_tv_complaints
       SET complainant_type = ?, cable_customer_id = ?, service_customer_id = ?,
           assigned_employee_id = ?, status = ?,
           completed_at = CASE WHEN ? = 'COMPLETED' THEN NOW() ELSE NULL END
       WHERE complaint_id = ?`,
      [mappingType, customerId, serviceCustomerId, assignedEmployeeId, status, status, complaintId]
    );
    await db.commit();
    return res.json({ message: status === 'COMPLETED' ? 'Complaint completed successfully' : 'Complaint attempt saved successfully' });
  } catch (error) {
    if (transactionStarted) await db.rollback();
    return res.status(500).json({ message: 'Complaint update failed', error: error.message });
  }
};

module.exports = {
  ensureComplaintTables, getComplaintCustomers, getComplaints,
  getComplaintById, addComplaint, addComplaintAttempt
};
