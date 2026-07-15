const connection = require('../connection');
const { ensureCustomerSchema } = require('../utils/customerSchema');

const ensureWorkflowTable = async () => {
    await connection.promise().query(`
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
    const conn = connection.promise();
    const ensureColumn = async (table, column, definition) => {
        const [tables] = await conn.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
            [table]
        );
        if (!tables.length) return;
        const [columns] = await conn.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [table, column]
        );
        if (!columns.length) await conn.query(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
    };
    await ensureColumn('work_orders', 'approval_status', "approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING' AFTER work_status");
    await ensureColumn('work_order_material_issues', 'approval_status', "approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING' AFTER remarks");
    await ensureColumn('work_order_material_issues', 'approved_by_employee_id', 'approved_by_employee_id INT NULL AFTER approval_status');
    await ensureColumn('work_order_material_issues', 'approved_at', 'approved_at TIMESTAMP NULL AFTER approved_by_employee_id');
    await ensureColumn('purchase_master', 'approval_status', "approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING' AFTER payment_status");
    await ensureColumn('purchase_master', 'approved_by_employee_id', 'approved_by_employee_id INT NULL AFTER approval_status');
    await ensureColumn('purchase_master', 'approved_at', 'approved_at TIMESTAMP NULL AFTER approved_by_employee_id');
};

const getWorkflowApprovals = async (req, res) => {
    try {
        await ensureWorkflowTable();
        await ensureCustomerSchema(connection.promise());
        const [rows] = await connection.promise().query(
            `SELECT wa.workflow_id, wa.module_name, wa.reference_id, wa.reference_no,
                    wa.workflow_status, wa.requested_at, wa.reviewed_at, wa.remarks,
                    qm.quotation_status, qm.quotation_version, qm.quotation_date, qm.valid_until, qm.net_amount,
                    NULL AS supplier_id,
                    TRIM(CONCAT(COALESCE(c.salutation, ''), ' ', c.customer_name)) AS customer_name,
                    NULL AS supplier_name,
                    NULL AS purchase_date,
                    NULL AS balance_amount,
                    NULL AS work_order_status, NULL AS approval_status, NULL AS work_order_id
             FROM workflow_approvals wa
             LEFT JOIN quotation_master qm
                ON wa.module_name = 'QUOTATION' AND qm.quotation_id = wa.reference_id
             LEFT JOIN customers c ON c.customer_id = qm.customer_id
             WHERE wa.module_name = 'QUOTATION'
             UNION ALL
             SELECT NULL AS workflow_id, 'SUPPLIER_PAYMENT' AS module_name, pm.purchase_id AS reference_id,
                    pm.purchase_no AS reference_no, pm.payment_status AS workflow_status,
                    pm.created_at AS requested_at, NULL AS reviewed_at,
                    'Supplier payment balance pending' AS remarks,
                    NULL AS quotation_status, NULL AS quotation_version, NULL AS quotation_date,
                    NULL AS valid_until, pm.net_amount, pm.supplier_id,
                    NULL AS customer_name, s.supplier_name, pm.purchase_date, pm.balance_amount,
                    NULL AS work_order_status, NULL AS approval_status, NULL AS work_order_id
             FROM purchase_master pm
             JOIN suppliers s ON s.supplier_id = pm.supplier_id
             WHERE pm.approval_status = 'PENDING'
               AND pm.purchase_status <> 'CANCELLED'
             UNION ALL
             SELECT wa.workflow_id, wa.module_name, wa.reference_id, wa.reference_no,
                    wa.workflow_status, wa.requested_at, wa.reviewed_at, wa.remarks,
                    NULL, NULL, wo.start_date, wo.completion_date, NULL,
                    NULL, TRIM(CONCAT(COALESCE(c.salutation, ''), ' ', c.customer_name)), NULL,
                    NULL, NULL, wo.work_status, wo.approval_status, wo.work_order_id
             FROM workflow_approvals wa
             JOIN work_orders wo ON wa.module_name = 'WORK_ORDER' AND wo.work_order_id = wa.reference_id
             JOIN customers c ON c.customer_id = wo.customer_id
             UNION ALL
             SELECT wa.workflow_id, wa.module_name, wa.reference_id, wa.reference_no,
                    wa.workflow_status, wa.requested_at, wa.reviewed_at, wa.remarks,
                    NULL, NULL, mi.issued_date, NULL, NULL,
                    NULL, TRIM(CONCAT(COALESCE(c.salutation, ''), ' ', c.customer_name)), NULL,
                    NULL, NULL, wo.work_status, 'PENDING', wo.work_order_id
             FROM workflow_approvals wa
             JOIN work_orders wo ON wa.module_name = 'MATERIAL_ISSUE' AND wo.work_order_id = wa.reference_id
             JOIN (
                SELECT work_order_id, MIN(issued_date) AS issued_date
                FROM work_order_material_issues
                WHERE approval_status = 'PENDING'
                GROUP BY work_order_id
             ) mi ON mi.work_order_id = wo.work_order_id
             JOIN customers c ON c.customer_id = wo.customer_id
             UNION ALL
             SELECT CONCAT('CTV-', cag.approval_group_id) AS workflow_id, 'CABLE_TV_CUSTOMER' AS module_name,
                    c.cable_customer_id AS reference_id, CAST(c.customer_code AS CHAR) AS reference_no,
                    cag.approval_status AS workflow_status, cag.requested_at, cag.approved_at AS reviewed_at,
                    cag.group_type AS remarks,
                    NULL, NULL, c.created_at, NULL, ca.grand_total,
                    NULL, c.full_name, NULL,
                    NULL, ca.balance_amount, c.status, c.approval_status, NULL
             FROM cable_approval_groups cag
             JOIN cable_tv_customers c ON c.approval_group_id = cag.approval_group_id
             LEFT JOIN cable_customer_accounts ca ON ca.account_id = (
                SELECT MAX(account_id) FROM cable_customer_accounts WHERE cable_customer_id = c.cable_customer_id
             )
             WHERE cag.approval_status = 'PENDING'
             ORDER BY workflow_status = 'PENDING' DESC, requested_at DESC`
        );
        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const approveWorkflow = async (req, res) => {
    const conn = connection.promise();
    try {
        await ensureWorkflowTable();
        await conn.beginTransaction();
        const workflowId = String(req.params.workflow_id || '');
        if (workflowId.startsWith('CTV-')) {
            const approvalGroupId = Number(workflowId.replace('CTV-', ''));
            if (!approvalGroupId) throw new Error('Workflow request not found');
            const [groups] = await conn.query('SELECT * FROM cable_approval_groups WHERE approval_group_id = ? FOR UPDATE', [approvalGroupId]);
            if (!groups.length) throw new Error('Workflow request not found');
            if (groups[0].approval_status === 'APPROVED') throw new Error('Workflow request is already approved');
            const approvedBy = req.body.approved_by_employee_id || req.res?.locals?.userId || req.res?.locals?.user_id || null;
            const approvalTables = [
                'cable_tv_customers',
                'cable_customer_stbs',
                'cable_connections',
                'cable_connection_materials',
                'cable_customer_packages',
                'cable_subscriptions',
                'cable_customer_accounts',
                'cable_customer_stb_accessories'
            ];
            for (const table of approvalTables) {
                await conn.query(
                    `UPDATE ${table}
                     SET approval_status = 'APPROVED'
                     WHERE approval_group_id = ? AND approval_status = 'PENDING'`,
                    [approvalGroupId]
                );
            }
            await conn.query(
                `UPDATE cable_tv_customers
                 SET approved_by_user_id = ?, approved_at = NOW()
                 WHERE approval_group_id = ?`,
                [approvedBy, approvalGroupId]
            );
            await conn.query(
                `UPDATE cable_customer_accounts
                 SET approved_by_user_id = ?, approved_at = NOW()
                 WHERE approval_group_id = ?`,
                [approvedBy, approvalGroupId]
            );
            await conn.query(
                `UPDATE cable_approval_groups
                 SET approval_status = 'APPROVED', approved_by_user_id = ?, approved_at = NOW()
                 WHERE approval_group_id = ?`,
                [approvedBy, approvalGroupId]
            );
            await conn.commit();
            return res.json({ success: true, message: 'Cable TV customer approved successfully' });
        }
        const [rows] = await conn.query('SELECT * FROM workflow_approvals WHERE workflow_id = ? FOR UPDATE', [req.params.workflow_id]);
        if (!rows.length) throw new Error('Workflow request not found');
        const workflow = rows[0];
        if (workflow.workflow_status === 'APPROVED') throw new Error('Workflow request is already approved');
        const approvedBy = req.body.approved_by_employee_id || null;

        if (workflow.module_name === 'WORK_ORDER') {
            await conn.query("UPDATE work_orders SET approval_status = 'APPROVED', updated_at = NOW() WHERE work_order_id = ?", [workflow.reference_id]);
        } else if (workflow.module_name === 'MATERIAL_ISSUE') {
            const [issues] = await conn.query('SELECT * FROM work_order_material_issues WHERE issue_id = ? FOR UPDATE', [workflow.reference_id]);
            if (!issues.length) throw new Error('Material issue not found');
            const issue = issues[0];
            const [stock] = await conn.query('SELECT available_qty FROM stock_master WHERE product_id = ? FOR UPDATE', [issue.product_id]);
            const currentQty = Number(stock[0]?.available_qty || 0);
            const issuedQty = Number(issue.issued_qty || 0);
            if (currentQty < issuedQty) throw new Error('Insufficient stock to approve this material issue');
            await conn.query('UPDATE stock_master SET available_qty = available_qty - ?, last_stock_check_date = CURDATE() WHERE product_id = ?', [issuedQty, issue.product_id]);
            await conn.query(
                `INSERT INTO stock_ledger (product_id, transaction_type, transaction_id, reference_no, qty_in, qty_out, balance_qty, remarks, recorded_by_employee_id)
                 VALUES (?, 'INSTALLATION', ?, ?, 0, ?, ?, ?, ?)`,
                [issue.product_id, issue.issue_id, issue.issue_no, issuedQty, currentQty - issuedQty, issue.remarks || 'Approved material issue', approvedBy]
            );
            await conn.query("UPDATE work_order_material_issues SET approval_status = 'APPROVED', approved_by_employee_id = ?, approved_at = NOW() WHERE issue_id = ?", [approvedBy, issue.issue_id]);
        } else {
            throw new Error('Use the module review screen to approve this request');
        }

        await conn.query("UPDATE workflow_approvals SET workflow_status = 'APPROVED', approved_by_employee_id = ?, reviewed_at = NOW(), remarks = ? WHERE workflow_id = ?", [approvedBy, req.body.remarks || 'Approved', workflow.workflow_id]);
        await conn.commit();
        return res.json({ success: true, message: 'Workflow approved successfully' });
    } catch (error) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: error.message || 'Server error' });
    }
};

module.exports = {
    getWorkflowApprovals,
    approveWorkflow
};
