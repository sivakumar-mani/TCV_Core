const {
    db,
    generateDocumentNumber,
    updateStock
} = require('../services/workflowService');

const hasPostedLedger = async (sourceTable, transactionId) => {
    const [rows] = await db.query(
        'SELECT stock_ledger_id FROM stock_ledger WHERE source_table = ? AND transaction_id = ? AND transaction_status = ? LIMIT 1',
        [sourceTable, transactionId, 'POSTED']
    );
    return rows.length > 0;
};

const getMaterialIssues = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT mim.*, wo.work_order_no, e.employee_name AS received_by_employee_name, u.username AS issued_by_name
             FROM material_issue_master mim
             LEFT JOIN work_orders wo ON wo.work_order_id = mim.work_order_id
             LEFT JOIN employees e ON e.employee_id = mim.received_by_employee_id
             LEFT JOIN users u ON u.user_id = mim.issued_by
             ORDER BY mim.created_at DESC`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch material issues', error: error.message });
    }
};

const addMaterialIssue = async (req, res) => {
    const {
        issue_date,
        work_order_id,
        received_by_employee_id,
        remarks,
        items = []
    } = req.body;
    const issuedBy = res.locals.user_id || res.locals.userId || req.body.issued_by || null;

    if (!issue_date || !work_order_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'issue_date, work_order_id and items are required' });
    }

    try {
        const issueNo = req.body.issue_no || await generateDocumentNumber('MATERIAL_ISSUE');
        await db.beginTransaction();

        const [masterResult] = await db.query(
            `INSERT INTO material_issue_master
                (issue_no, issue_date, work_order_id, issued_by, received_by_employee_id, issue_status, remarks)
             VALUES (?, ?, ?, ?, ?, 'DRAFT', ?)`,
            [issueNo, issue_date, work_order_id, issuedBy, received_by_employee_id || null, remarks || null]
        );

        for (const item of items) {
            await db.query(
                `INSERT INTO material_issue_items
                    (material_issue_id, product_id, requested_qty, issued_qty, unit, remarks)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [masterResult.insertId, item.product_id, item.requested_qty || 0, item.issued_qty, item.unit || 'PCS', item.remarks || null]
            );
        }

        await db.commit();
        return res.status(201).json({ success: true, message: 'Material issue created', material_issue_id: masterResult.insertId, issue_no: issueNo });
    } catch (error) {
        await db.rollback();
        return res.status(500).json({ success: false, message: 'Failed to create material issue', error: error.message });
    }
};

const updateMaterialIssueStatus = async (req, res) => {
    const materialIssueId = req.params.material_issue_id;
    const status = (req.body.issue_status || '').toUpperCase();
    const createdBy = res.locals.user_id || res.locals.userId || null;

    if (!['DRAFT', 'SUBMITTED', 'APPROVED', 'ISSUED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid issue_status' });
    }

    try {
        await db.beginTransaction();

        const [masters] = await db.query(
            'SELECT * FROM material_issue_master WHERE material_issue_id = ? FOR UPDATE',
            [materialIssueId]
        );

        if (masters.length === 0) {
            await db.rollback();
            return res.status(404).json({ success: false, message: 'Material issue not found' });
        }

        await db.query(
            'UPDATE material_issue_master SET issue_status = ? WHERE material_issue_id = ?',
            [status, materialIssueId]
        );

        if (status === 'ISSUED' && !(await hasPostedLedger('material_issue_items', materialIssueId))) {
            const [items] = await db.query(
                'SELECT * FROM material_issue_items WHERE material_issue_id = ?',
                [materialIssueId]
            );

            for (const item of items) {
                await updateStock({
                    productId: item.product_id,
                    transactionType: 'MATERIAL_ISSUE',
                    transactionId: materialIssueId,
                    sourceTable: 'material_issue_items',
                    sourceItemId: item.material_issue_item_id,
                    referenceNo: masters[0].issue_no,
                    qtyOut: item.issued_qty,
                    remarks: item.remarks || 'Material issued to work order',
                    createdBy
                });
            }
        }

        await db.commit();
        return res.json({ success: true, message: 'Material issue status updated' });
    } catch (error) {
        await db.rollback();
        return res.status(500).json({ success: false, message: 'Failed to update material issue status', error: error.message });
    }
};

const getMaterialReturns = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT mrm.*, wo.work_order_no, e.employee_name AS returned_by_employee_name, u.username AS received_by_name
             FROM material_return_master mrm
             LEFT JOIN work_orders wo ON wo.work_order_id = mrm.work_order_id
             LEFT JOIN employees e ON e.employee_id = mrm.returned_by_employee_id
             LEFT JOIN users u ON u.user_id = mrm.received_by
             ORDER BY mrm.created_at DESC`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch material returns', error: error.message });
    }
};

const addMaterialReturn = async (req, res) => {
    const {
        return_date,
        work_order_id,
        material_issue_id,
        returned_by_employee_id,
        remarks,
        items = []
    } = req.body;
    const receivedBy = res.locals.user_id || res.locals.userId || req.body.received_by || null;

    if (!return_date || !work_order_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'return_date, work_order_id and items are required' });
    }

    try {
        const returnNo = req.body.return_no || await generateDocumentNumber('MATERIAL_RETURN');
        await db.beginTransaction();

        const [masterResult] = await db.query(
            `INSERT INTO material_return_master
                (return_no, return_date, work_order_id, material_issue_id, returned_by_employee_id, received_by, return_status, remarks)
             VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?)`,
            [returnNo, return_date, work_order_id, material_issue_id || null, returned_by_employee_id || null, receivedBy, remarks || null]
        );

        for (const item of items) {
            await db.query(
                `INSERT INTO material_return_items
                    (material_return_id, product_id, returned_qty, damaged_qty, consumed_qty, unit, remarks)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [masterResult.insertId, item.product_id, item.returned_qty || 0, item.damaged_qty || 0, item.consumed_qty || 0, item.unit || 'PCS', item.remarks || null]
            );
        }

        await db.commit();
        return res.status(201).json({ success: true, message: 'Material return created', material_return_id: masterResult.insertId, return_no: returnNo });
    } catch (error) {
        await db.rollback();
        return res.status(500).json({ success: false, message: 'Failed to create material return', error: error.message });
    }
};

const updateMaterialReturnStatus = async (req, res) => {
    const materialReturnId = req.params.material_return_id;
    const status = (req.body.return_status || '').toUpperCase();
    const createdBy = res.locals.user_id || res.locals.userId || null;

    if (!['DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid return_status' });
    }

    try {
        await db.beginTransaction();

        const [masters] = await db.query(
            'SELECT * FROM material_return_master WHERE material_return_id = ? FOR UPDATE',
            [materialReturnId]
        );

        if (masters.length === 0) {
            await db.rollback();
            return res.status(404).json({ success: false, message: 'Material return not found' });
        }

        await db.query(
            'UPDATE material_return_master SET return_status = ? WHERE material_return_id = ?',
            [status, materialReturnId]
        );

        if (status === 'RETURNED' && !(await hasPostedLedger('material_return_items', materialReturnId))) {
            const [items] = await db.query(
                'SELECT * FROM material_return_items WHERE material_return_id = ?',
                [materialReturnId]
            );

            for (const item of items) {
                await updateStock({
                    productId: item.product_id,
                    transactionType: 'MATERIAL_RETURN',
                    transactionId: materialReturnId,
                    sourceTable: 'material_return_items',
                    sourceItemId: item.material_return_item_id,
                    referenceNo: masters[0].return_no,
                    qtyIn: item.returned_qty,
                    remarks: item.remarks || 'Material returned from work order',
                    createdBy
                });
            }
        }

        await db.commit();
        return res.json({ success: true, message: 'Material return status updated' });
    } catch (error) {
        await db.rollback();
        return res.status(500).json({ success: false, message: 'Failed to update material return status', error: error.message });
    }
};

module.exports = {
    addMaterialIssue,
    addMaterialReturn,
    getMaterialIssues,
    getMaterialReturns,
    updateMaterialIssueStatus,
    updateMaterialReturnStatus
};
