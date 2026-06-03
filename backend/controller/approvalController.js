const {
    db,
    generateDocumentNumber,
    getModuleConfig,
    normalizeModule
} = require('../services/workflowService');

const getApprovalRequests = async (req, res) => {
    try {
        const status = req.query.status;
        const moduleName = req.query.module_name ? normalizeModule(req.query.module_name) : null;
        const filters = [];
        const values = [];

        if (status) {
            filters.push('ar.approval_status = ?');
            values.push(status.toUpperCase());
        }

        if (moduleName) {
            filters.push('ar.module_name = ?');
            values.push(moduleName);
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const [rows] = await db.query(
            `SELECT
                ar.*,
                requested.username AS requested_by_name,
                approved.username AS approved_by_name,
                rejected.username AS rejected_by_name
             FROM approval_requests ar
             LEFT JOIN users requested ON requested.user_id = ar.requested_by
             LEFT JOIN users approved ON approved.user_id = ar.approved_by
             LEFT JOIN users rejected ON rejected.user_id = ar.rejected_by
             ${whereClause}
             ORDER BY ar.requested_at DESC`,
            values
        );

        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch approval requests', error: error.message });
    }
};

const getApprovalHistory = async (req, res) => {
    try {
        const approvalRequestId = req.params.approval_request_id;
        const [rows] = await db.query(
            `SELECT ah.*, u.username AS action_by_name
             FROM approval_history ah
             LEFT JOIN users u ON u.user_id = ah.action_by
             WHERE ah.approval_request_id = ?
             ORDER BY ah.action_at DESC`,
            [approvalRequestId]
        );

        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch approval history', error: error.message });
    }
};

const submitApprovalRequest = async (req, res) => {
    const moduleName = normalizeModule(req.body.module_name);
    const recordId = req.body.record_id;
    const remarks = req.body.remarks || null;
    const requestedBy = res.locals.user_id || res.locals.userId || req.body.requested_by || null;

    if (!moduleName || !recordId) {
        return res.status(400).json({ success: false, message: 'module_name and record_id are required' });
    }

    let config;
    try {
        config = getModuleConfig(moduleName);
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }

    try {
        const requestNo = req.body.request_no || await generateDocumentNumber(`${moduleName}`);

        await db.beginTransaction();

        const [existing] = await db.query(
            `SELECT approval_request_id
             FROM approval_requests
             WHERE module_name = ? AND record_id = ? AND approval_status IN ('DRAFT','SUBMITTED')`,
            [moduleName, recordId]
        );

        if (existing.length > 0) {
            await db.rollback();
            return res.status(409).json({ success: false, message: 'Approval request already pending' });
        }

        const [insertResult] = await db.query(
            `INSERT INTO approval_requests
                (module_name, record_id, request_no, approval_status, requested_by, remarks)
             VALUES (?, ?, ?, 'SUBMITTED', ?, ?)`,
            [moduleName, recordId, requestNo, requestedBy, remarks]
        );

        const approvalRequestId = insertResult.insertId;

        await db.query(
            'INSERT INTO approval_history (approval_request_id, action, action_by, remarks) VALUES (?, ?, ?, ?)',
            [approvalRequestId, 'SUBMITTED', requestedBy, remarks]
        );

        if (moduleName !== 'PRODUCT_PRICE') {
            await db.query(
                `UPDATE ${config.table}
                 SET ${config.statusColumn} = 'SUBMITTED', approval_request_id = ?
                 WHERE ${config.idColumn} = ?`,
                [approvalRequestId, recordId]
            );
        }

        await db.commit();
        return res.status(201).json({ success: true, message: 'Approval request submitted', approval_request_id: approvalRequestId, request_no: requestNo });
    } catch (error) {
        await db.rollback();
        return res.status(500).json({ success: false, message: 'Failed to submit approval request', error: error.message });
    }
};

const approveRequest = async (req, res) => {
    const approvalRequestId = req.params.approval_request_id;
    const userId = res.locals.user_id || res.locals.userId || null;
    const remarks = req.body.remarks || null;

    try {
        await db.beginTransaction();

        const [requests] = await db.query(
            'SELECT * FROM approval_requests WHERE approval_request_id = ? FOR UPDATE',
            [approvalRequestId]
        );

        if (requests.length === 0) {
            await db.rollback();
            return res.status(404).json({ success: false, message: 'Approval request not found' });
        }

        const approvalRequest = requests[0];
        const moduleName = normalizeModule(approvalRequest.module_name);
        const config = getModuleConfig(moduleName);

        await db.query(
            `UPDATE approval_requests
             SET approval_status = 'APPROVED',
                 approved_by = ?,
                 approved_at = NOW(),
                 remarks = COALESCE(?, remarks)
             WHERE approval_request_id = ?`,
            [userId, remarks, approvalRequestId]
        );

        await db.query(
            'INSERT INTO approval_history (approval_request_id, action, action_by, remarks) VALUES (?, ?, ?, ?)',
            [approvalRequestId, 'APPROVED', userId, remarks]
        );

        if (moduleName === 'PRODUCT_PRICE') {
            if (req.body.approved_selling_price !== undefined) {
                await db.query(
                    'UPDATE product_price_history SET approved_selling_price = ? WHERE price_history_id = ?',
                    [req.body.approved_selling_price, approvalRequest.record_id]
                );
            }

            const [priceRows] = await db.query(
                'SELECT * FROM product_price_history WHERE price_history_id = ? FOR UPDATE',
                [approvalRequest.record_id]
            );

            if (priceRows.length === 0) {
                throw new Error('Product price history not found');
            }

            const price = priceRows[0];
            await db.query(
                `UPDATE product_price_history
                 SET approval_status = 'APPROVED', approved_by = ?, approved_at = NOW()
                 WHERE price_history_id = ?`,
                [userId, approvalRequest.record_id]
            );
            await db.query(
                'UPDATE products SET purchase_price = ?, selling_price = ? WHERE product_id = ?',
                [price.new_purchase_price, price.approved_selling_price, price.product_id]
            );
        } else {
            await db.query(
                `UPDATE ${config.table}
                 SET ${config.statusColumn} = 'APPROVED'
                 WHERE ${config.idColumn} = ?`,
                [approvalRequest.record_id]
            );
        }

        await db.commit();
        return res.json({ success: true, message: 'Approval request approved' });
    } catch (error) {
        await db.rollback();
        return res.status(500).json({ success: false, message: 'Failed to approve request', error: error.message });
    }
};

const rejectRequest = async (req, res) => {
    const approvalRequestId = req.params.approval_request_id;
    const userId = res.locals.user_id || res.locals.userId || null;
    const rejectionReason = req.body.rejection_reason || req.body.remarks || null;

    try {
        await db.beginTransaction();

        const [requests] = await db.query(
            'SELECT * FROM approval_requests WHERE approval_request_id = ? FOR UPDATE',
            [approvalRequestId]
        );

        if (requests.length === 0) {
            await db.rollback();
            return res.status(404).json({ success: false, message: 'Approval request not found' });
        }

        const approvalRequest = requests[0];

        await db.query(
            `UPDATE approval_requests
             SET approval_status = 'REJECTED',
                 rejected_by = ?,
                 rejected_at = NOW(),
                 rejection_reason = ?
             WHERE approval_request_id = ?`,
            [userId, rejectionReason, approvalRequestId]
        );

        await db.query(
            'INSERT INTO approval_history (approval_request_id, action, action_by, remarks) VALUES (?, ?, ?, ?)',
            [approvalRequestId, 'REJECTED', userId, rejectionReason]
        );

        if (approvalRequest.module_name === 'PRODUCT_PRICE') {
            await db.query(
                "UPDATE product_price_history SET approval_status = 'REJECTED' WHERE price_history_id = ?",
                [approvalRequest.record_id]
            );
        } else if (approvalRequest.module_name === 'QUOTATION') {
            await db.query(
                "UPDATE quotation_master SET quotation_status = 'REJECTED' WHERE quotation_id = ?",
                [approvalRequest.record_id]
            );
        }

        await db.commit();
        return res.json({ success: true, message: 'Approval request rejected' });
    } catch (error) {
        await db.rollback();
        return res.status(500).json({ success: false, message: 'Failed to reject request', error: error.message });
    }
};

module.exports = {
    approveRequest,
    getApprovalHistory,
    getApprovalRequests,
    rejectRequest,
    submitApprovalRequest
};
