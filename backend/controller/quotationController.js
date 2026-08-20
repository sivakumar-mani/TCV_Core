const connection = require('../connection');
const { ensureCustomerSchema } = require('../utils/customerSchema');

const quotationStatuses = ['DRAFT', 'SENT', 'APPROVED', 'ACCEPTED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'CONVERTED'];

const toNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const toSqlDate = (value) => {
    if (!value) return null;
    return String(value).slice(0, 10);
};

const columnExists = async (conn, tableName, columnName) => {
    const [rows] = await conn.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?`,
        [tableName, columnName]
    );
    return rows.length > 0;
};

const ensureQuotationSupport = async (conn) => {
    await conn.query(`ALTER TABLE quotation_master MODIFY quotation_status
        ENUM('DRAFT','SENT','APPROVED','ACCEPTED','CANCELLED','REJECTED','EXPIRED','CONVERTED') NOT NULL DEFAULT 'DRAFT'`);
    await ensureCustomerSchema(conn);

    const additions = [
        ['quotation_master', 'quotation_version', 'ADD COLUMN quotation_version INT NOT NULL DEFAULT 1 AFTER quotation_no'],
        ['quotation_master', 'cgst_percent', 'ADD COLUMN cgst_percent DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER discount_percent'],
        ['quotation_master', 'sgst_percent', 'ADD COLUMN sgst_percent DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER cgst_percent']
    ];

    for (const [table, column, ddl] of additions) {
        if (!await columnExists(conn, table, column)) {
            await conn.query(`ALTER TABLE ${table} ${ddl}`);
        }
    }

    await conn.query(`
        CREATE TABLE IF NOT EXISTS workflow_approvals (
            workflow_id INT AUTO_INCREMENT PRIMARY KEY,
            module_name VARCHAR(50) NOT NULL,
            reference_id INT NOT NULL,
            reference_no VARCHAR(50) NOT NULL,
            workflow_status ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
            requested_by_employee_id INT,
            approved_by_employee_id INT,
            requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP NULL,
            remarks TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_workflow_reference (module_name, reference_id),
            INDEX idx_module_status (module_name, workflow_status),
            INDEX idx_reference_no (reference_no),
            FOREIGN KEY (requested_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
            FOREIGN KEY (approved_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

const calculateLine = (item, index) => {
    const qty = toNumber(item.qty);
    const sellingPrice = toNumber(item.selling_price);
    const gross = qty * sellingPrice;
    const discountPercent = toNumber(item.discount_percent);
    const discountAmount = item.discount_amount !== undefined
        ? toNumber(item.discount_amount)
        : gross * discountPercent / 100;
    const taxable = Math.max(gross - discountAmount, 0);
    const taxPercent = toNumber(item.tax_percent);
    const taxAmount = taxable * taxPercent / 100;
    const amount = taxable + taxAmount;

    return {
        product_id: item.product_id || null,
        item_name: item.item_name || item.product_name || `Item ${index + 1}`,
        description: item.description || null,
        qty,
        selling_price: sellingPrice,
        discount_amount: discountAmount,
        discount_percent: discountPercent,
        tax_percent: taxPercent,
        tax_amount: taxAmount,
        amount,
        notes: item.notes || null,
        line_no: index + 1
    };
};

const calculateSummary = (items, discountAmount = 0, discountPercent = 0, cgstPercent = 0, sgstPercent = 0) => {
    const totalAmount = items.reduce((sum, item) => sum + item.qty * item.selling_price, 0);
    const lineDiscount = items.reduce((sum, item) => sum + item.discount_amount, 0);
    const headerDiscount = toNumber(discountAmount) || totalAmount * toNumber(discountPercent) / 100;
    const taxable = Math.max(totalAmount - lineDiscount - headerDiscount, 0);
    const itemTax = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const cgstAmount = taxable * toNumber(cgstPercent) / 100;
    const sgstAmount = taxable * toNumber(sgstPercent) / 100;
    const taxAmount = itemTax + cgstAmount + sgstAmount;

    return {
        total_amount: totalAmount,
        discount_amount: headerDiscount,
        discount_percent: toNumber(discountPercent),
        cgst_percent: toNumber(cgstPercent),
        sgst_percent: toNumber(sgstPercent),
        tax_amount: taxAmount,
        net_amount: taxable + taxAmount
    };
};

const validateQuotation = (payload, items) => {
    const errors = [];
    if (!payload.customer_id) errors.push('Customer is required');
    if (!payload.quotation_date) errors.push('Quotation date is required');
    if (payload.quotation_status && !quotationStatuses.includes(payload.quotation_status)) errors.push('Invalid quotation status');
    if (!items.length) errors.push('At least one quotation item is required');

    items.forEach((item, index) => {
        if (!item.item_name) errors.push(`Item name is required in row ${index + 1}`);
        if (item.qty <= 0) errors.push(`Quantity must be greater than 0 in row ${index + 1}`);
        if (item.selling_price < 0) errors.push(`Selling price cannot be negative in row ${index + 1}`);
    });

    return errors;
};

const createQuotationNo = async (conn) => {
    const prefix = `QT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-`;
    const [rows] = await conn.query(
        'SELECT quotation_no FROM quotation_master WHERE quotation_no LIKE ? ORDER BY quotation_no DESC LIMIT 1',
        [`${prefix}%`]
    );
    const last = rows[0]?.quotation_no || '';
    const nextNumber = String((Number(last.replace(prefix, '')) || 0) + 1).padStart(4, '0');
    return `${prefix}${nextNumber}`;
};

const upsertWorkflow = async (conn, quotationId, quotationNo, requestedBy, remarks = null) => {
    await conn.query(
        `INSERT INTO workflow_approvals (
            module_name, reference_id, reference_no, workflow_status,
            requested_by_employee_id, remarks
         ) VALUES ('QUOTATION', ?, ?, 'PENDING', ?, ?)
         ON DUPLICATE KEY UPDATE
            reference_no = VALUES(reference_no),
            workflow_status = IF(workflow_status = 'APPROVED', workflow_status, 'PENDING'),
            requested_by_employee_id = VALUES(requested_by_employee_id),
            remarks = VALUES(remarks),
            updated_at = NOW()`,
        [quotationId, quotationNo, requestedBy || null, remarks]
    );
};

const getNextQuotationNo = async (req, res) => {
    try {
        await ensureQuotationSupport(connection.promise());
        const quotationNo = await createQuotationNo(connection.promise());
        return res.json({ success: true, quotation_no: quotationNo });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getQuotations = async (req, res) => {
    try {
        await ensureQuotationSupport(connection.promise());
        const [rows] = await connection.promise().query(
            `SELECT qm.*, TRIM(CONCAT(COALESCE(c.salutation, ''), ' ', c.customer_name)) AS customer_name,
                    pe.employee_code AS prepared_by_employee_code,
                    CONCAT_WS(' ', pe.first_name, pe.last_name) AS prepared_by_employee_name,
                    pe.designation AS prepared_by_designation,
                    pe.department AS prepared_by_department,
                    pe.phone AS prepared_by_phone,
                    pe.email AS prepared_by_email,
                    ae.employee_code AS approved_by_employee_code,
                    CONCAT_WS(' ', ae.first_name, ae.last_name) AS approved_by_employee_name,
                    COALESCE(item_counts.item_count, 0) AS item_count,
                    COALESCE(item_counts.total_qty, 0) AS total_qty,
                    wa.workflow_status
             FROM quotation_master qm
             JOIN customers c ON c.customer_id = qm.customer_id
             LEFT JOIN employees pe ON pe.employee_id = qm.prepared_by_employee_id
             LEFT JOIN employees ae ON ae.employee_id = qm.approved_by_employee_id
             LEFT JOIN (
                SELECT quotation_id, COUNT(*) AS item_count, SUM(qty) AS total_qty
                FROM quotation_items
                GROUP BY quotation_id
             ) item_counts ON item_counts.quotation_id = qm.quotation_id
             LEFT JOIN workflow_approvals wa
                ON wa.module_name = 'QUOTATION' AND wa.reference_id = qm.quotation_id
             ORDER BY qm.quotation_id DESC`
        );
        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getQuotationById = async (req, res) => {
    try {
        await ensureQuotationSupport(connection.promise());
        const { quotation_id } = req.params;
        const [quotations] = await connection.promise().query(
            `SELECT qm.*, TRIM(CONCAT(COALESCE(c.salutation, ''), ' ', c.customer_name)) AS customer_name,
                    c.contact_person, c.phone, c.email, c.address,
                    pe.employee_code AS prepared_by_employee_code,
                    CONCAT_WS(' ', pe.first_name, pe.last_name) AS prepared_by_employee_name,
                    pe.designation AS prepared_by_designation,
                    pe.department AS prepared_by_department,
                    pe.phone AS prepared_by_phone,
                    pe.email AS prepared_by_email,
                    ae.employee_code AS approved_by_employee_code,
                    CONCAT_WS(' ', ae.first_name, ae.last_name) AS approved_by_employee_name,
                    wa.workflow_id, wa.workflow_status
             FROM quotation_master qm
             JOIN customers c ON c.customer_id = qm.customer_id
             LEFT JOIN employees pe ON pe.employee_id = qm.prepared_by_employee_id
             LEFT JOIN employees ae ON ae.employee_id = qm.approved_by_employee_id
             LEFT JOIN workflow_approvals wa
                ON wa.module_name = 'QUOTATION' AND wa.reference_id = qm.quotation_id
             WHERE qm.quotation_id = ?`,
            [quotation_id]
        );

        if (quotations.length === 0) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        const [items] = await connection.promise().query(
            `SELECT qi.*, p.product_code, p.product_name, p.unit, p.gst_percent
             FROM quotation_items qi
             LEFT JOIN products p ON p.product_id = qi.product_id
             WHERE qi.quotation_id = ?
             ORDER BY qi.line_no, qi.quotation_item_id`,
            [quotation_id]
        );

        return res.json({ success: true, data: { ...quotations[0], items } });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const saveQuotation = async (req, res, isUpdate = false) => {
    const conn = connection.promise();
    try {
        await ensureQuotationSupport(conn);
        const payload = req.body;
        const items = (payload.items || []).map(calculateLine);
        const errors = validateQuotation(payload, items);

        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        await conn.beginTransaction();

        let quotationId = payload.quotation_id;
        let quotationNo = payload.quotation_no;
        let nextVersion = 1;

        if (isUpdate) {
            const [existing] = await conn.query('SELECT * FROM quotation_master WHERE quotation_id = ? FOR UPDATE', [quotationId]);
            if (existing.length === 0) {
                await conn.rollback();
                return res.status(404).json({ success: false, message: 'Quotation not found' });
            }
            quotationNo = existing[0].quotation_no;
            nextVersion = Number(existing[0].quotation_version || 1) + 1;
        } else {
            quotationNo = quotationNo || await createQuotationNo(conn);
        }

        const summary = calculateSummary(
            items,
            payload.discount_amount,
            payload.discount_percent,
            payload.cgst_percent,
            payload.sgst_percent
        );
        const status = payload.quotation_status || 'DRAFT';

        if (isUpdate) {
            await conn.query(
                `UPDATE quotation_master SET
                    quotation_version = ?, quotation_date = ?, valid_until = ?, customer_id = ?,
                    prepared_by_employee_id = ?, requirement_details = ?, total_amount = ?,
                    discount_amount = ?, discount_percent = ?, cgst_percent = ?, sgst_percent = ?,
                    tax_amount = ?, net_amount = ?, quotation_status = ?, sent_date = ?,
                    remarks = ?, updated_at = NOW()
                 WHERE quotation_id = ?`,
                [
                    nextVersion,
                    toSqlDate(payload.quotation_date),
                    toSqlDate(payload.valid_until),
                    payload.customer_id,
                    payload.prepared_by_employee_id || null,
                    payload.requirement_details || null,
                    summary.total_amount,
                    summary.discount_amount,
                    summary.discount_percent,
                    summary.cgst_percent,
                    summary.sgst_percent,
                    summary.tax_amount,
                    summary.net_amount,
                    status,
                    status === 'SENT' ? toSqlDate(new Date().toISOString()) : toSqlDate(payload.sent_date),
                    payload.remarks || null,
                    quotationId
                ]
            );
            await conn.query('DELETE FROM quotation_items WHERE quotation_id = ?', [quotationId]);
        } else {
            const [result] = await conn.query(
                `INSERT INTO quotation_master (
                    quotation_no, quotation_version, quotation_date, valid_until, customer_id,
                    prepared_by_employee_id, requirement_details, total_amount, discount_amount,
                    discount_percent, cgst_percent, sgst_percent, tax_amount, net_amount,
                    quotation_status, sent_date, remarks
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    quotationNo,
                    nextVersion,
                    toSqlDate(payload.quotation_date),
                    toSqlDate(payload.valid_until),
                    payload.customer_id,
                    payload.prepared_by_employee_id || null,
                    payload.requirement_details || null,
                    summary.total_amount,
                    summary.discount_amount,
                    summary.discount_percent,
                    summary.cgst_percent,
                    summary.sgst_percent,
                    summary.tax_amount,
                    summary.net_amount,
                    status,
                    status === 'SENT' ? toSqlDate(new Date().toISOString()) : null,
                    payload.remarks || null
                ]
            );
            quotationId = result.insertId;
        }

        for (const item of items) {
            await conn.query(
                `INSERT INTO quotation_items (
                    quotation_id, product_id, item_name, description, qty, selling_price,
                    discount_amount, discount_percent, tax_percent, tax_amount, amount, notes, line_no
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    quotationId,
                    item.product_id,
                    item.item_name,
                    item.description,
                    item.qty,
                    item.selling_price,
                    item.discount_amount,
                    item.discount_percent,
                    item.tax_percent,
                    item.tax_amount,
                    item.amount,
                    item.notes,
                    item.line_no
                ]
            );
        }

        if (status === 'DRAFT') {
            await upsertWorkflow(conn, quotationId, quotationNo, payload.prepared_by_employee_id, 'Quotation draft awaiting approval');
        }

        await conn.commit();
        return res.status(isUpdate ? 200 : 201).json({
            success: true,
            message: isUpdate ? 'Quotation updated successfully' : 'Quotation saved as draft successfully',
            quotation_id: quotationId,
            quotation_no: quotationNo,
            quotation_version: nextVersion
        });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const addQuotation = (req, res) => saveQuotation(req, res, false);
const updateQuotation = (req, res) => saveQuotation(req, res, true);

const approveQuotation = async (req, res) => {
    const conn = connection.promise();
    try {
        await ensureQuotationSupport(conn);
        const quotationId = req.body.quotation_id || req.params.quotation_id;
        const approvedBy = req.body.approved_by_employee_id || null;

        await conn.beginTransaction();
        const [existing] = await conn.query('SELECT quotation_id FROM quotation_master WHERE quotation_id = ? FOR UPDATE', [quotationId]);
        if (existing.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        await conn.query(
            `UPDATE quotation_master
             SET quotation_status = 'APPROVED',
                 approved_by_employee_id = ?,
                 approved_date = CURDATE(),
                 updated_at = NOW()
             WHERE quotation_id = ?`,
            [approvedBy, quotationId]
        );
        await conn.query(
            `UPDATE workflow_approvals
             SET workflow_status = 'APPROVED',
                 approved_by_employee_id = ?,
                 reviewed_at = NOW(),
                 remarks = ?
             WHERE module_name = 'QUOTATION' AND reference_id = ?`,
            [approvedBy, req.body.remarks || 'Approved', quotationId]
        );

        await conn.commit();
        return res.json({ success: true, message: 'Quotation approved successfully' });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const submitQuotation = async (req, res) => {
    try {
        await ensureQuotationSupport(connection.promise());
        const quotationId = req.body.quotation_id || req.params.quotation_id;
        const [existing] = await connection.promise().query(
            'SELECT quotation_status FROM quotation_master WHERE quotation_id = ?',
            [quotationId]
        );
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Quotation not found' });
        if (existing[0].quotation_status !== 'APPROVED') {
            return res.status(400).json({ success: false, message: 'Only approved quotations can be submitted to customer' });
        }

        await connection.promise().query(
            `UPDATE quotation_master
             SET quotation_status = 'SENT', sent_date = CURDATE(), updated_at = NOW()
             WHERE quotation_id = ?`,
            [quotationId]
        );
        return res.json({ success: true, message: 'Quotation submitted to customer successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const updateCustomerResponse = async (req, res) => {
    try {
        await ensureQuotationSupport(connection.promise());
        const quotationId = req.body.quotation_id || req.params.quotation_id;
        const status = String(req.body.status || '').toUpperCase();
        if (!['ACCEPTED', 'CANCELLED', 'EXPIRED'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status must be ACCEPTED, CANCELLED, or EXPIRED' });
        }
        const [result] = await connection.promise().query(
            `UPDATE quotation_master SET quotation_status = ?, updated_at = NOW()
             WHERE quotation_id = ? AND quotation_status = 'SENT'`,
            [status, quotationId]
        );
        if (!result.affectedRows) return res.status(400).json({ success: false, message: 'Only sent quotations can receive a customer response' });
        return res.json({ success: true, message: `Quotation marked ${status.toLowerCase()}` });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const deleteQuotation = async (req, res) => {
    const conn = connection.promise();
    try {
        await ensureQuotationSupport(conn);
        const quotationId = req.body.quotation_id || req.params.quotation_id;
        await conn.beginTransaction();

        const [quotations] = await conn.query(
            'SELECT quotation_id FROM quotation_master WHERE quotation_id = ? FOR UPDATE',
            [quotationId]
        );
        if (quotations.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        const [pendingWorkflows] = await conn.query(
            `SELECT workflow_id
             FROM workflow_approvals
             WHERE module_name = 'QUOTATION'
               AND reference_id = ?
               AND workflow_status = 'PENDING'
             FOR UPDATE`,
            [quotationId]
        );
        if (pendingWorkflows.length > 0) {
            await conn.rollback();
            return res.status(409).json({
                success: false,
                message: 'Quotation cannot be deleted while workflow approval is pending'
            });
        }

        await conn.query(
            "DELETE FROM workflow_approvals WHERE module_name = 'QUOTATION' AND reference_id = ?",
            [quotationId]
        );
        await conn.query('DELETE FROM quotation_master WHERE quotation_id = ?', [quotationId]);
        await conn.commit();
        return res.json({ success: true, message: 'Quotation deleted successfully' });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getQuotations,
    getQuotationById,
    getNextQuotationNo,
    addQuotation,
    updateQuotation,
    approveQuotation,
    submitQuotation,
    updateCustomerResponse,
    deleteQuotation
};
