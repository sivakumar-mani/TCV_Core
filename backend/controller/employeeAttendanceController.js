const connection = require('../connection');
const { ensureEmployeeAttendanceTable } = require('../utils/businessModuleSchema');

const statuses = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY'];

const validateAttendance = (payload) => {
    if (!payload.employee_id) return 'Employee is required';
    if (!payload.attendance_date) return 'Attendance date is required';
    if (payload.status && !statuses.includes(payload.status)) return 'Invalid attendance status';
    return null;
};

const getAttendance = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureEmployeeAttendanceTable(conn);
        const [rows] = await conn.query(
            `SELECT ea.*, e.employee_code, CONCAT_WS(' ', e.first_name, e.last_name) AS employee_name
             FROM employee_attendance ea
             JOIN employees e ON e.employee_id = ea.employee_id
             ORDER BY ea.attendance_date DESC, ea.attendance_id DESC`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const addAttendance = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureEmployeeAttendanceTable(conn);
        const payload = req.body;
        const error = validateAttendance(payload);
        if (error) return res.status(400).json({ success: false, message: error });

        const [result] = await conn.query(
            `INSERT INTO employee_attendance
                (employee_id, attendance_date, status, check_in, check_out, remarks)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                payload.employee_id,
                String(payload.attendance_date).slice(0, 10),
                payload.status || 'PRESENT',
                payload.check_in || null,
                payload.check_out || null,
                payload.remarks || null
            ]
        );

        return res.status(201).json({ success: true, message: 'Attendance added successfully', attendance_id: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Attendance already exists for this employee and date' });
        }
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const updateAttendance = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureEmployeeAttendanceTable(conn);
        const payload = req.body;
        if (!payload.attendance_id) return res.status(400).json({ success: false, message: 'attendance_id is required' });
        const error = validateAttendance(payload);
        if (error) return res.status(400).json({ success: false, message: error });

        await conn.query(
            `UPDATE employee_attendance SET
                employee_id = ?, attendance_date = ?, status = ?, check_in = ?, check_out = ?, remarks = ?
             WHERE attendance_id = ?`,
            [
                payload.employee_id,
                String(payload.attendance_date).slice(0, 10),
                payload.status || 'PRESENT',
                payload.check_in || null,
                payload.check_out || null,
                payload.remarks || null,
                payload.attendance_id
            ]
        );

        return res.json({ success: true, message: 'Attendance updated successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Attendance already exists for this employee and date' });
        }
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const deleteAttendance = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureEmployeeAttendanceTable(conn);
        const { attendance_id } = req.body;
        if (!attendance_id) return res.status(400).json({ success: false, message: 'attendance_id is required' });
        await conn.query('DELETE FROM employee_attendance WHERE attendance_id = ?', [attendance_id]);
        return res.json({ success: true, message: 'Attendance deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getAttendance,
    addAttendance,
    updateAttendance,
    deleteAttendance
};
