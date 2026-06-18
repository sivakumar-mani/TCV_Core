const connection = require('../connection');
const { ensureWarrantyTable } = require('../utils/businessModuleSchema');

const warrantyTypes = ['MANUFACTURER', 'EXTENDED', 'VOID'];
const warrantyStatuses = ['ACTIVE', 'EXPIRED', 'CLAIMED', 'VOID'];

const createWarrantyNo = async (conn) => {
    const [rows] = await conn.query(
        `SELECT warranty_no FROM warranty_master
         WHERE warranty_no REGEXP '^WAR[0-9]+$'
         ORDER BY CAST(SUBSTRING(warranty_no, 4) AS UNSIGNED) DESC
         LIMIT 1`
    );
    const lastNumber = rows.length ? Number(rows[0].warranty_no.replace('WAR', '')) : 0;
    return `WAR${String(lastNumber + 1).padStart(5, '0')}`;
};

const validateWarranty = (payload) => {
    if (!payload.customer_id) return 'Customer is required';
    if (!payload.product_id) return 'Product is required';
    if (!payload.warranty_end_date) return 'Warranty end date is required';
    if (payload.warranty_type && !warrantyTypes.includes(payload.warranty_type)) return 'Invalid warranty type';
    if (payload.warranty_status && !warrantyStatuses.includes(payload.warranty_status)) return 'Invalid warranty status';
    return null;
};

const getWarranties = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureWarrantyTable(conn);
        const [rows] = await conn.query(
            `SELECT wm.*, c.customer_name, p.product_name, sm.invoice_no
             FROM warranty_master wm
             JOIN customers c ON c.customer_id = wm.customer_id
             JOIN products p ON p.product_id = wm.product_id
             LEFT JOIN sales_master sm ON sm.sales_id = wm.sales_id
             ORDER BY wm.warranty_end_date DESC, wm.warranty_id DESC`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const addWarranty = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureWarrantyTable(conn);
        const payload = req.body;
        const error = validateWarranty(payload);
        if (error) return res.status(400).json({ success: false, message: error });
        const warrantyNo = payload.warranty_no || await createWarrantyNo(conn);

        const [result] = await conn.query(
            `INSERT INTO warranty_master
                (warranty_no, customer_id, sales_id, product_id, serial_no, warranty_start_date,
                 warranty_end_date, warranty_type, warranty_status, coverage_type, warranty_cost, claims_count, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                warrantyNo,
                payload.customer_id,
                payload.sales_id || null,
                payload.product_id,
                payload.serial_no || null,
                String(payload.warranty_start_date || new Date().toISOString()).slice(0, 10),
                String(payload.warranty_end_date).slice(0, 10),
                payload.warranty_type || 'MANUFACTURER',
                payload.warranty_status || 'ACTIVE',
                payload.coverage_type || null,
                Number(payload.warranty_cost || 0),
                Number(payload.claims_count || 0),
                payload.remarks || null
            ]
        );
        return res.status(201).json({ success: true, message: 'Warranty added successfully', warranty_id: result.insertId, warranty_no: warrantyNo });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Warranty number or serial number already exists' });
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const updateWarranty = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureWarrantyTable(conn);
        const payload = req.body;
        if (!payload.warranty_id) return res.status(400).json({ success: false, message: 'warranty_id is required' });
        const error = validateWarranty(payload);
        if (error) return res.status(400).json({ success: false, message: error });

        await conn.query(
            `UPDATE warranty_master SET
                warranty_no = ?, customer_id = ?, sales_id = ?, product_id = ?, serial_no = ?,
                warranty_start_date = ?, warranty_end_date = ?, warranty_type = ?, warranty_status = ?,
                coverage_type = ?, warranty_cost = ?, claims_count = ?, remarks = ?
             WHERE warranty_id = ?`,
            [
                payload.warranty_no,
                payload.customer_id,
                payload.sales_id || null,
                payload.product_id,
                payload.serial_no || null,
                String(payload.warranty_start_date || new Date().toISOString()).slice(0, 10),
                String(payload.warranty_end_date).slice(0, 10),
                payload.warranty_type || 'MANUFACTURER',
                payload.warranty_status || 'ACTIVE',
                payload.coverage_type || null,
                Number(payload.warranty_cost || 0),
                Number(payload.claims_count || 0),
                payload.remarks || null,
                payload.warranty_id
            ]
        );
        return res.json({ success: true, message: 'Warranty updated successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Warranty number or serial number already exists' });
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const deleteWarranty = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureWarrantyTable(conn);
        if (!req.body.warranty_id) return res.status(400).json({ success: false, message: 'warranty_id is required' });
        await conn.query('DELETE FROM warranty_master WHERE warranty_id = ?', [req.body.warranty_id]);
        return res.json({ success: true, message: 'Warranty deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getWarranties,
    addWarranty,
    updateWarranty,
    deleteWarranty
};
