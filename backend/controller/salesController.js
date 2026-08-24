const connection = require('../connection');
const { ensureSalesTable } = require('../utils/businessModuleSchema');

const toNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const createInvoiceNo = async (conn) => {
    const [rows] = await conn.query(
        `SELECT invoice_no FROM sales_master
         WHERE invoice_no REGEXP '^INV[0-9]+$'
         ORDER BY CAST(SUBSTRING(invoice_no, 4) AS UNSIGNED) DESC
         LIMIT 1`
    );
    const lastNumber = rows.length ? Number(rows[0].invoice_no.replace('INV', '')) : 0;
    return `INV${String(lastNumber + 1).padStart(5, '0')}`;
};

const summarize = (payload) => {
    const total = toNumber(payload.total_amount);
    const discount = toNumber(payload.discount_amount);
    const tax = toNumber(payload.tax_amount);
    const paid = toNumber(payload.paid_amount);
    const net = payload.net_amount !== undefined ? toNumber(payload.net_amount) : Math.max(total - discount + tax, 0);
    return { total, discount, tax, paid, net, balance: net - paid };
};

const getSales = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureSalesTable(conn);
        const [rows] = await conn.query(
            `SELECT sm.*, c.customer_name, qm.quotation_no, wo.work_order_no
             FROM sales_master sm
             JOIN customers c ON c.customer_id = sm.customer_id
             LEFT JOIN quotation_master qm ON qm.quotation_id = sm.quotation_id
             LEFT JOIN work_orders wo ON wo.work_order_id = sm.work_order_id
             ORDER BY sm.invoice_date DESC, sm.sales_id DESC`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getSaleById = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureSalesTable(conn);
        const [sales] = await conn.query(
            `SELECT sm.*, c.customer_name, c.address, c.phone, c.email,
                    qm.quotation_no, wo.work_order_no
             FROM sales_master sm
             JOIN customers c ON c.customer_id = sm.customer_id
             LEFT JOIN quotation_master qm ON qm.quotation_id = sm.quotation_id
             LEFT JOIN work_orders wo ON wo.work_order_id = sm.work_order_id
             WHERE sm.sales_id = ?`,
            [req.params.sales_id]
        );
        if (!sales.length) return res.status(404).json({ success: false, message: 'Invoice not found' });
        const [items] = await conn.query(
            `SELECT si.*, COALESCE(p.unit, 'PCS') AS unit
             FROM sales_items si
             LEFT JOIN products p ON p.product_id = si.product_id
             WHERE si.sales_id = ?
             ORDER BY si.line_no, si.sales_item_id`,
            [req.params.sales_id]
        );
        return res.json({ success: true, data: { ...sales[0], items } });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const addSale = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureSalesTable(conn);
        const payload = req.body;
        if (!payload.customer_id) return res.status(400).json({ success: false, message: 'Customer is required' });
        const invoiceNo = payload.invoice_no || await createInvoiceNo(conn);
        const summary = summarize(payload);

        const [result] = await conn.query(
            `INSERT INTO sales_master
                (invoice_no, invoice_date, customer_id, quotation_id, work_order_id, total_amount,
                 discount_amount, discount_percent, tax_amount, net_amount, paid_amount, balance_amount,
                 payment_mode, payment_status, sales_status, due_date, remarks, created_by_employee_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                invoiceNo,
                String(payload.invoice_date || new Date().toISOString()).slice(0, 10),
                payload.customer_id,
                payload.quotation_id || null,
                payload.work_order_id || null,
                summary.total,
                summary.discount,
                toNumber(payload.discount_percent),
                summary.tax,
                summary.net,
                summary.paid,
                summary.balance,
                payload.payment_mode || 'CREDIT',
                payload.payment_status || (summary.paid >= summary.net ? 'PAID' : summary.paid > 0 ? 'PARTIAL' : 'PENDING'),
                payload.sales_status || 'DRAFT',
                payload.due_date ? String(payload.due_date).slice(0, 10) : null,
                payload.remarks || null,
                payload.created_by_employee_id || null
            ]
        );
        return res.status(201).json({ success: true, message: 'Sale added successfully', sales_id: result.insertId, invoice_no: invoiceNo });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Invoice number already exists' });
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const updateSale = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureSalesTable(conn);
        const payload = req.body;
        if (!payload.sales_id) return res.status(400).json({ success: false, message: 'sales_id is required' });
        if (!payload.customer_id) return res.status(400).json({ success: false, message: 'Customer is required' });
        const summary = summarize(payload);

        await conn.query(
            `UPDATE sales_master SET
                invoice_no = ?, invoice_date = ?, customer_id = ?, quotation_id = ?, work_order_id = ?,
                total_amount = ?, discount_amount = ?, discount_percent = ?, tax_amount = ?, net_amount = ?,
                paid_amount = ?, balance_amount = ?, payment_mode = ?, payment_status = ?, sales_status = ?,
                due_date = ?, remarks = ?, created_by_employee_id = ?
             WHERE sales_id = ?`,
            [
                payload.invoice_no,
                String(payload.invoice_date || new Date().toISOString()).slice(0, 10),
                payload.customer_id,
                payload.quotation_id || null,
                payload.work_order_id || null,
                summary.total,
                summary.discount,
                toNumber(payload.discount_percent),
                summary.tax,
                summary.net,
                summary.paid,
                summary.balance,
                payload.payment_mode || 'CREDIT',
                payload.payment_status || (summary.paid >= summary.net ? 'PAID' : summary.paid > 0 ? 'PARTIAL' : 'PENDING'),
                payload.sales_status || 'DRAFT',
                payload.due_date ? String(payload.due_date).slice(0, 10) : null,
                payload.remarks || null,
                payload.created_by_employee_id || null,
                payload.sales_id
            ]
        );
        return res.json({ success: true, message: 'Sale updated successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Invoice number already exists' });
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const deleteSale = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureSalesTable(conn);
        if (!req.body.sales_id) return res.status(400).json({ success: false, message: 'sales_id is required' });
        await conn.query('DELETE FROM sales_master WHERE sales_id = ?', [req.body.sales_id]);
        return res.json({ success: true, message: 'Sale deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getSales,
    getSaleById,
    addSale,
    updateSale,
    deleteSale
};
