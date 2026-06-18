const connection = require('../connection');
const { ensureAuditLogTable } = require('../utils/auditLogSchema');

const AUDIT_FIELDS = [
  'user_id',
  'module',
  'action',
  'table_name',
  'record_id',
  'old_values',
  'new_values',
  'ip_address',
  'browser_info',
  'change_reason'
];

const normalizeJson = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  JSON.parse(value);
  return value;
};

const getAuditLogs = async (req, res) => {
  try {
    const conn = connection.promise();
    await ensureAuditLogTable(conn);
    const [rows] = await conn.query(
      `SELECT audit_id, user_id, module, action, table_name, record_id, ip_address,
              change_reason, created_at
       FROM audit_log
       ORDER BY audit_id DESC`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getAuditLogById = async (req, res) => {
  try {
    const conn = connection.promise();
    await ensureAuditLogTable(conn);
    const { audit_id } = req.params;
    const [rows] = await conn.query(
      'SELECT * FROM audit_log WHERE audit_id = ?',
      [audit_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const addAuditLog = async (req, res) => {
  try {
    const conn = connection.promise();
    await ensureAuditLogTable(conn);
    const audit = {
      ...req.body,
      old_values: normalizeJson(req.body.old_values),
      new_values: normalizeJson(req.body.new_values)
    };

    if (!audit.module || !audit.action || !audit.table_name) {
      return res.status(400).json({ success: false, message: 'Module, action, and table name are required' });
    }

    const placeholders = AUDIT_FIELDS.map(() => '?').join(', ');
    const values = AUDIT_FIELDS.map((field) => audit[field] || null);

    const [result] = await conn.query(
      `INSERT INTO audit_log (${AUDIT_FIELDS.join(', ')}) VALUES (${placeholders})`,
      values
    );

    return res.status(201).json({ success: true, message: 'Audit log added successfully', audit_id: result.insertId });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(400).json({ success: false, message: 'Old values and new values must be valid JSON' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const updateAuditLog = async (req, res) => {
  try {
    const conn = connection.promise();
    await ensureAuditLogTable(conn);
    const { audit_id } = req.body;

    if (!audit_id) {
      return res.status(400).json({ success: false, message: 'audit_id is required' });
    }

    const [existing] = await conn.query(
      'SELECT audit_id FROM audit_log WHERE audit_id = ?',
      [audit_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }

    const audit = {
      ...req.body,
      old_values: normalizeJson(req.body.old_values),
      new_values: normalizeJson(req.body.new_values)
    };

    const assignments = AUDIT_FIELDS.map((field) => `${field} = ?`).join(', ');
    const values = AUDIT_FIELDS.map((field) => audit[field] || null);
    values.push(audit_id);

    await conn.query(
      `UPDATE audit_log SET ${assignments} WHERE audit_id = ?`,
      values
    );

    return res.json({ success: true, message: 'Audit log updated successfully' });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(400).json({ success: false, message: 'Old values and new values must be valid JSON' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const deleteAuditLog = async (req, res) => {
  try {
    const conn = connection.promise();
    await ensureAuditLogTable(conn);
    const { audit_id } = req.body;

    if (!audit_id) {
      return res.status(400).json({ success: false, message: 'audit_id is required' });
    }

    await conn.query('DELETE FROM audit_log WHERE audit_id = ?', [audit_id]);
    return res.json({ success: true, message: 'Audit log deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { getAuditLogs, getAuditLogById, addAuditLog, updateAuditLog, deleteAuditLog };
