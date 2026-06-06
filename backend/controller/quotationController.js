const {
    db,
    generateDocumentNumber
} = require('../services/workflowService');

const getProductCodeSelect = async () => {
    const [columns] = await db.query('SHOW COLUMNS FROM products');
    const columnNames = columns.map((column) => column.Field);
    return columnNames.includes('product_code') ? 'p.product_code' : 'NULL AS product_code';
};

const toNumber = (value) => Number(value || 0);

const normalizeItems = (body) => {
    const rows = Array.isArray(body.items) ? body.items : (body.item ? [body.item] : []);

    return rows
        .filter((item) => item && (item.product_id || item.item_name || item.description))
        .map((item) => {
            const qty = toNumber(item.qty);
            const sellingPrice = toNumber(item.selling_price);
            const discountAmount = toNumber(item.discount_amount);
            const taxPercent = toNumber(item.tax_percent);
            const calculatedTax = ((qty * sellingPrice) - discountAmount) * (taxPercent / 100);
            const taxAmount = item.tax_amount === undefined || item.tax_amount === null || item.tax_amount === ''
                ? calculatedTax
                : toNumber(item.tax_amount);
            const amount = item.amount === undefined || item.amount === null || item.amount === ''
                ? (qty * sellingPrice) + taxAmount - discountAmount
                : toNumber(item.amount);

            return {
                product_id: item.product_id || null,
                item_name: item.item_name || null,
                description: item.description || null,
                qty,
                selling_price: sellingPrice,
                discount_amount: discountAmount,
                tax_percent: taxPercent,
                tax_amount: taxAmount,
                amount
            };
        });
};

const calculateTotals = (items, body) => {
    const itemTotal = items.reduce((sum, item) => sum + (item.qty * item.selling_price), 0);
    const discountAmount = items.reduce((sum, item) => sum + item.discount_amount, 0);
    const taxAmount = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const netAmount = items.reduce((sum, item) => sum + item.amount, 0);

    return {
        total_amount: items.length ? itemTotal : toNumber(body.total_amount),
        discount_amount: items.length ? discountAmount : toNumber(body.discount_amount),
        tax_amount: items.length ? taxAmount : toNumber(body.tax_amount),
        net_amount: items.length ? netAmount : toNumber(body.net_amount)
    };
};

const insertQuotationItems = async (quotationId, items) => {
    for (const item of items) {
        await db.query(
            `INSERT INTO quotation_items
                (quotation_id, product_id, item_name, description, qty, selling_price,
                 discount_amount, tax_percent, tax_amount, amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                quotationId,
                item.product_id,
                item.item_name,
                item.description,
                item.qty,
                item.selling_price,
                item.discount_amount,
                item.tax_percent,
                item.tax_amount,
                item.amount
            ]
        );
    }
};

const insertQuotationMaster = async ({
    quotationNo,
    quotation_date,
    valid_until,
    customer_id,
    prepared_by_employee_id,
    requirement_details,
    totals,
    remarks,
    revised_from_quotation_id = null,
    revision_no = 0
}) => db.query(
    `INSERT INTO quotation_master
        (quotation_no, quotation_date, valid_until, customer_id, prepared_by_employee_id,
         requirement_details, total_amount, discount_amount, tax_amount, net_amount,
         quotation_status, approval_request_id, revised_from_quotation_id, revision_no, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', NULL, ?, ?, ?)`,
    [
        quotationNo,
        quotation_date,
        valid_until || null,
        customer_id,
        prepared_by_employee_id || null,
        requirement_details || null,
        totals.total_amount,
        totals.discount_amount,
        totals.tax_amount,
        totals.net_amount,
        revised_from_quotation_id,
        revision_no,
        remarks || null
    ]
);

const getQuotations = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT qm.*, c.customer_name, e.employee_name AS prepared_by_employee_name
             FROM quotation_master qm
             LEFT JOIN customers c ON c.customer_id = qm.customer_id
             LEFT JOIN employees e ON e.employee_id = qm.prepared_by_employee_id
             ORDER BY qm.created_at DESC`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch quotations', error: error.message });
    }
};

const getQuotationById = async (req, res) => {
    try {
        const [headers] = await db.query(
            `SELECT qm.*, c.customer_name, e.employee_name AS prepared_by_employee_name
             FROM quotation_master qm
             LEFT JOIN customers c ON c.customer_id = qm.customer_id
             LEFT JOIN employees e ON e.employee_id = qm.prepared_by_employee_id
             WHERE qm.quotation_id = ?`,
            [req.params.quotation_id]
        );
        if (headers.length === 0) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        const productCodeSelect = await getProductCodeSelect();
        const [items] = await db.query(
            `SELECT qi.*, p.product_name, ${productCodeSelect}
             FROM quotation_items qi
             LEFT JOIN products p ON p.product_id = qi.product_id
             WHERE qi.quotation_id = ?
             ORDER BY qi.quotation_item_id`,
            [req.params.quotation_id]
        );

        return res.json({ success: true, data: { ...headers[0], items } });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch quotation', error: error.message });
    }
};

const addQuotation = async (req, res) => {
    const {
        quotation_date,
        valid_until,
        customer_id,
        prepared_by_employee_id,
        requirement_details,
        remarks
    } = req.body;

    if (!quotation_date || !customer_id) {
        return res.status(400).json({ success: false, message: 'quotation_date and customer_id are required' });
    }

    try {
        const quotationNo = req.body.quotation_no || await generateDocumentNumber('QUOTATION');
        await db.beginTransaction();

        const items = normalizeItems(req.body);
        const totals = calculateTotals(items, req.body);

        const [result] = await insertQuotationMaster({
            quotationNo,
            quotation_date,
            valid_until,
            customer_id,
            prepared_by_employee_id,
            requirement_details,
            totals,
            remarks
        });

        await insertQuotationItems(result.insertId, items);

        await db.commit();
        return res.status(201).json({ success: true, message: 'Quotation created', quotation_id: result.insertId, quotation_no: quotationNo });
    } catch (error) {
        await db.rollback();
        return res.status(500).json({ success: false, message: 'Failed to create quotation', error: error.message });
    }
};

const updateQuotation = async (req, res) => {
    const {
        quotation_id,
        quotation_date,
        valid_until,
        customer_id,
        prepared_by_employee_id,
        requirement_details,
        remarks
    } = req.body;

    if (!quotation_id) {
        return res.status(400).json({ success: false, message: 'quotation_id is required' });
    }

    try {
        const [existingRows] = await db.query(
            'SELECT * FROM quotation_master WHERE quotation_id = ?',
            [quotation_id]
        );
        if (existingRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        const existingQuotation = existingRows[0];
        const shouldCreateRevision = String(existingQuotation.quotation_status || '').toUpperCase() === 'APPROVED';
        const revisionQuotationNo = shouldCreateRevision ? await generateDocumentNumber('QUOTATION') : null;

        await db.beginTransaction();
        const items = normalizeItems(req.body);
        const totals = calculateTotals(items, req.body);

        if (shouldCreateRevision) {
            const revisedFromQuotationId = existingQuotation.revised_from_quotation_id || existingQuotation.quotation_id;
            const revisionNo = Number(existingQuotation.revision_no || 0) + 1;

            await db.query(
                `UPDATE quotation_master
                 SET quotation_status = 'REJECTED',
                     remarks = ?,
                     updated_at = NOW()
                 WHERE quotation_id = ?`,
                [
                    remarks
                        ? `${existingQuotation.remarks || ''}${existingQuotation.remarks ? '\n' : ''}Revised: ${remarks}`
                        : existingQuotation.remarks,
                    quotation_id
                ]
            );

            const [approvedApprovalRows] = await db.query(
                `SELECT approval_request_id
                 FROM approval_requests
                 WHERE module_name = 'QUOTATION'
                   AND record_id = ?
                   AND approval_status = 'APPROVED'`,
                [quotation_id]
            );

            await db.query(
                `UPDATE approval_requests
                 SET approval_status = 'REJECTED',
                     rejected_at = NOW(),
                     rejection_reason = ?
                 WHERE module_name = 'QUOTATION'
                   AND record_id = ?
                   AND approval_status = 'APPROVED'`,
                ['Quotation revised. Previous approved quotation rejected automatically.', quotation_id]
            );

            for (const approvalRow of approvedApprovalRows) {
                await db.query(
                    'INSERT INTO approval_history (approval_request_id, action, remarks) VALUES (?, ?, ?)',
                    [
                        approvalRow.approval_request_id,
                        'REJECTED',
                        'Quotation revised. Previous approved quotation rejected automatically.'
                    ]
                );
            }

            const [revisionResult] = await insertQuotationMaster({
                quotationNo: revisionQuotationNo,
                quotation_date,
                valid_until,
                customer_id,
                prepared_by_employee_id,
                requirement_details,
                totals,
                remarks,
                revised_from_quotation_id: revisedFromQuotationId,
                revision_no: revisionNo
            });

            await insertQuotationItems(revisionResult.insertId, items);
            await db.commit();
            return res.status(201).json({
                success: true,
                message: 'Approved quotation revised. Previous quotation rejected and new draft quotation created.',
                quotation_id: revisionResult.insertId,
                quotation_no: revisionQuotationNo,
                revised_from_quotation_id: quotation_id
            });
        }

        const statusToSave = req.body.quotation_status || existingQuotation.quotation_status || 'DRAFT';

        await db.query(
            `UPDATE quotation_master SET
                quotation_date = ?, valid_until = ?, customer_id = ?, prepared_by_employee_id = ?,
                requirement_details = ?, total_amount = ?, discount_amount = ?, tax_amount = ?,
                net_amount = ?, quotation_status = ?, remarks = ?, updated_at = NOW()
             WHERE quotation_id = ?`,
            [
                quotation_date,
                valid_until || null,
                customer_id,
                prepared_by_employee_id || null,
                requirement_details || null,
                totals.total_amount,
                totals.discount_amount,
                totals.tax_amount,
                totals.net_amount,
                statusToSave,
                remarks || null,
                quotation_id
            ]
        );

        await db.query('DELETE FROM quotation_items WHERE quotation_id = ?', [quotation_id]);
        await insertQuotationItems(quotation_id, items);

        await db.commit();
        return res.json({ success: true, message: 'Quotation updated successfully' });
    } catch (error) {
        await db.rollback();
        return res.status(500).json({ success: false, message: 'Failed to update quotation', error: error.message });
    }
};

const deleteQuotation = async (req, res) => {
    try {
        const { quotation_id } = req.body;
        if (!quotation_id) {
            return res.status(400).json({ success: false, message: 'quotation_id is required' });
        }
        await db.query('DELETE FROM quotation_master WHERE quotation_id = ?', [quotation_id]);
        return res.json({ success: true, message: 'Quotation deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete quotation', error: error.message });
    }
};

module.exports = {
    addQuotation,
    deleteQuotation,
    getQuotationById,
    getQuotations,
    updateQuotation
};
