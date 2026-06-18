const connection = require('../connection');
const { ensureServiceTicketTable } = require('../utils/businessModuleSchema');

const statuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED'];
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const createTicketNo = async (conn) => {
    const [rows] = await conn.query(
        `SELECT ticket_no FROM service_tickets
         WHERE ticket_no REGEXP '^ST[0-9]+$'
         ORDER BY CAST(SUBSTRING(ticket_no, 3) AS UNSIGNED) DESC
         LIMIT 1`
    );
    const lastNumber = rows.length ? Number(rows[0].ticket_no.replace('ST', '')) : 0;
    return `ST${String(lastNumber + 1).padStart(5, '0')}`;
};

const validateTicket = (payload) => {
    if (!payload.customer_id) return 'Customer is required';
    if (!payload.complaint_details) return 'Complaint details are required';
    if (payload.service_status && !statuses.includes(payload.service_status)) return 'Invalid service status';
    if (payload.priority && !priorities.includes(payload.priority)) return 'Invalid priority';
    return null;
};

const getServiceTickets = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureServiceTicketTable(conn);
        const [rows] = await conn.query(
            `SELECT st.*, c.customer_name, p.product_name, sm.invoice_no,
                    CONCAT_WS(' ', ae.first_name, ae.last_name) AS assigned_employee_name
             FROM service_tickets st
             JOIN customers c ON c.customer_id = st.customer_id
             LEFT JOIN products p ON p.product_id = st.product_id
             LEFT JOIN sales_master sm ON sm.sales_id = st.sales_id
             LEFT JOIN employees ae ON ae.employee_id = st.assigned_to_employee_id
             ORDER BY st.opened_date DESC, st.service_ticket_id DESC`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const addServiceTicket = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureServiceTicketTable(conn);
        const payload = req.body;
        const error = validateTicket(payload);
        if (error) return res.status(400).json({ success: false, message: error });
        const ticketNo = payload.ticket_no || await createTicketNo(conn);

        const [result] = await conn.query(
            `INSERT INTO service_tickets
                (ticket_no, customer_id, product_id, sales_id, assigned_to_employee_id, complaint_details,
                 service_status, priority, opened_date, closed_date, resolution_notes, resolution_time_hours, created_by_employee_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ticketNo,
                payload.customer_id,
                payload.product_id || null,
                payload.sales_id || null,
                payload.assigned_to_employee_id || null,
                payload.complaint_details,
                payload.service_status || 'OPEN',
                payload.priority || 'MEDIUM',
                String(payload.opened_date || new Date().toISOString()).slice(0, 10),
                payload.closed_date ? String(payload.closed_date).slice(0, 10) : null,
                payload.resolution_notes || null,
                payload.resolution_time_hours || null,
                payload.created_by_employee_id || null
            ]
        );
        return res.status(201).json({ success: true, message: 'Service ticket added successfully', service_ticket_id: result.insertId, ticket_no: ticketNo });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Ticket number already exists' });
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const updateServiceTicket = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureServiceTicketTable(conn);
        const payload = req.body;
        if (!payload.service_ticket_id) return res.status(400).json({ success: false, message: 'service_ticket_id is required' });
        const error = validateTicket(payload);
        if (error) return res.status(400).json({ success: false, message: error });

        await conn.query(
            `UPDATE service_tickets SET
                ticket_no = ?, customer_id = ?, product_id = ?, sales_id = ?, assigned_to_employee_id = ?,
                complaint_details = ?, service_status = ?, priority = ?, opened_date = ?, closed_date = ?,
                resolution_notes = ?, resolution_time_hours = ?, created_by_employee_id = ?
             WHERE service_ticket_id = ?`,
            [
                payload.ticket_no,
                payload.customer_id,
                payload.product_id || null,
                payload.sales_id || null,
                payload.assigned_to_employee_id || null,
                payload.complaint_details,
                payload.service_status || 'OPEN',
                payload.priority || 'MEDIUM',
                String(payload.opened_date || new Date().toISOString()).slice(0, 10),
                payload.closed_date ? String(payload.closed_date).slice(0, 10) : null,
                payload.resolution_notes || null,
                payload.resolution_time_hours || null,
                payload.created_by_employee_id || null,
                payload.service_ticket_id
            ]
        );
        return res.json({ success: true, message: 'Service ticket updated successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Ticket number already exists' });
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const deleteServiceTicket = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureServiceTicketTable(conn);
        if (!req.body.service_ticket_id) return res.status(400).json({ success: false, message: 'service_ticket_id is required' });
        await conn.query('DELETE FROM service_tickets WHERE service_ticket_id = ?', [req.body.service_ticket_id]);
        return res.json({ success: true, message: 'Service ticket deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getServiceTickets,
    addServiceTicket,
    updateServiceTicket,
    deleteServiceTicket
};
