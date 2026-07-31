const connection = require('../connection');
const { ensureTransactionTable } = require('./transactionController');
const { ensureCustomerSchema } = require('../utils/customerSchema');
const { customerStatusForStbStatus, synchronizeLatestCustomerStbStatus, applyApprovedLocationChange } = require('../utils/cableTvStatus');

const ensureUsedAccessoryProduct = async (conn, sourceProductId) => {
    const [[source]] = await conn.query(
        `SELECT product_id, product_name, product_code, brand_id, description, product_type,
                purchase_price, selling_price, gst_percent, hsn_code, unit, reorder_level
         FROM products WHERE product_id = ? LIMIT 1`,
        [sourceProductId]
    );
    if (!source) throw new Error(`Returned accessory product ${sourceProductId} was not found`);
    const [[catv]] = await conn.query(
        "SELECT category_id, level FROM categories WHERE LOWER(category_name) = 'catv' AND is_active = 1 LIMIT 1"
    );
    if (!catv) throw new Error('CATV category was not found for returned accessory stock');
    let [[usedCategory]] = await conn.query(
        "SELECT category_id FROM categories WHERE parent_id = ? AND LOWER(category_name) = 'used accessories' LIMIT 1",
        [catv.category_id]
    );
    if (!usedCategory) {
        const [categoryResult] = await conn.query(
            `INSERT INTO categories (category_name, parent_id, level, slug, description, is_active)
             VALUES ('Used Accessories', ?, ?, 'catv-used-accessories', 'Returned CATV accessories available as used stock', 1)`,
            [catv.category_id, Number(catv.level || 1) + 1]
        );
        usedCategory = { category_id: categoryResult.insertId };
    }
    const usedName = `Used ${String(source.product_name || '').replace(/\s*STB\s+Accessories\s*/i, ' ').replace(/\s+/g, ' ').trim()}`;
    const usedCode = `USED-${source.product_code || source.product_id}`.slice(0, 100);
    let [[usedProduct]] = await conn.query(
        `SELECT product_id FROM products
         WHERE category_id = ? AND (product_code = ? OR LOWER(product_name) = LOWER(?)) LIMIT 1`,
        [usedCategory.category_id, usedCode, usedName]
    );
    if (!usedProduct) {
        const [productResult] = await conn.query(
            `INSERT INTO products (
                product_name, product_code, brand_id, category_id, description, product_type,
                purchase_price, selling_price, gst_percent, hsn_code, unit, reorder_level, status
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
            [
                usedName, usedCode, source.brand_id, usedCategory.category_id,
                `Returned used stock for ${source.product_name}`, source.product_type || 'MATERIAL',
                Number(source.purchase_price || 0), Number(source.selling_price || 0), Number(source.gst_percent || 0),
                source.hsn_code, source.unit || 'PCS', Number(source.reorder_level || 0)
            ]
        );
        usedProduct = { product_id: productResult.insertId };
    }
    return { ...source, used_product_id: usedProduct.product_id, used_product_name: usedName };
};

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
    await ensureColumn('cable_customer_stb_accessories', 'movement_type', "movement_type ENUM('ISSUE','RETURN') NOT NULL DEFAULT 'ISSUE' AFTER product_id");
};

const getWorkflowApprovals = async (req, res) => {
    try {
        await ensureWorkflowTable();
        await ensureCustomerSchema(connection.promise());
        const [rows] = await connection.promise().query(
            `SELECT wa.workflow_id, wa.module_name, wa.reference_id, wa.reference_no,
                    wa.workflow_status, wa.requested_at, wa.reviewed_at, wa.remarks,
                    'Quotation' AS subject,
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
                    'Supplier Payment' AS subject,
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
                    'Work Order' AS subject,
                    NULL, NULL, wo.start_date, wo.completion_date, NULL,
                    NULL, TRIM(CONCAT(COALESCE(c.salutation, ''), ' ', c.customer_name)), NULL,
                    NULL, NULL, wo.work_status, wo.approval_status, wo.work_order_id
             FROM workflow_approvals wa
             JOIN work_orders wo ON wa.module_name = 'WORK_ORDER' AND wo.work_order_id = wa.reference_id
             JOIN customers c ON c.customer_id = wo.customer_id
             UNION ALL
             SELECT wa.workflow_id, wa.module_name, wa.reference_id, wa.reference_no,
                    wa.workflow_status, wa.requested_at, wa.reviewed_at, wa.remarks,
                    'Material Issue' AS subject,
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
                    CONCAT_WS(' • ',
                      CASE cag.group_type
                        WHEN 'NEW_CUSTOMER_ONBOARDING' THEN 'New Connection'
                        WHEN 'CONNECTION_UPDATE' THEN COALESCE((
                          SELECT CASE UPPER(conn.connection_type)
                            WHEN 'SHIFTED' THEN 'Location Change'
                            WHEN 'RECONNECTION' THEN 'Reconnection'
                            WHEN 'NEW' THEN 'New Connection'
                            ELSE 'Connection Update' END
                          FROM cable_connections conn
                          WHERE conn.approval_group_id = cag.approval_group_id
                          ORDER BY conn.connection_id DESC LIMIT 1
                        ), 'Connection Update')
                        WHEN 'STB_UPDATE' THEN COALESCE((
                          SELECT CASE UPPER(stb.update_reason)
                            WHEN 'REACTIVATE' THEN 'STB - Reactivate'
                            WHEN 'RETURNED' THEN 'STB - Returned'
                            WHEN 'REPLACED' THEN 'STB - Replaced'
                            WHEN 'DISCONNECT' THEN 'STB - Disconnect'
                            WHEN 'FAULT' THEN 'STB - Fault'
                            WHEN 'DAMAGED' THEN 'STB - Damaged'
                            WHEN 'BROKEN' THEN 'STB - Damaged'
                            WHEN 'BURNT' THEN 'STB - Burnt'
                            WHEN 'VACATED' THEN 'STB - Vacated'
                            WHEN 'STB_LOST' THEN 'STB - Lost'
                            WHEN 'OUTSTATION' THEN 'STB - Outstation'
                            ELSE 'STB - Update' END
                          FROM cable_customer_stbs stb
                          WHERE stb.approval_group_id = cag.approval_group_id
                          ORDER BY stb.customer_stb_id DESC LIMIT 1
                        ), 'STB Update')
                        WHEN 'PACKAGE_UPDATE' THEN 'Package Update'
                        WHEN 'SUBSCRIPTION_UPDATE' THEN 'Subscription Update'
                        ELSE 'Customer Update'
                      END,
                      CASE WHEN COALESCE(ca.discount, 0) + COALESCE(ca.overall_discount, 0) + COALESCE(ca.material_discount, 0) > 0
                        THEN 'Discount' END
                    ) AS subject,
                    NULL, NULL, c.created_at, NULL, ca.grand_total,
                    NULL, c.full_name, NULL,
                    NULL, ca.balance_amount, c.status, c.approval_status, NULL
             FROM cable_approval_groups cag
             JOIN (
                SELECT approval_group_id, MAX(cable_customer_id) AS cable_customer_id
                FROM (
                   SELECT approval_group_id, cable_customer_id FROM cable_tv_customers WHERE approval_group_id IS NOT NULL
                   UNION ALL
                   SELECT approval_group_id, cable_customer_id FROM cable_connections WHERE approval_group_id IS NOT NULL
                   UNION ALL
                   SELECT approval_group_id, cable_customer_id FROM cable_customer_stbs WHERE approval_group_id IS NOT NULL
                   UNION ALL
                   SELECT approval_group_id, cable_customer_id FROM cable_customer_packages WHERE approval_group_id IS NOT NULL
                   UNION ALL
                   SELECT approval_group_id, cable_customer_id FROM cable_subscriptions WHERE approval_group_id IS NOT NULL
                   UNION ALL
                   SELECT approval_group_id, cable_customer_id FROM cable_customer_accounts WHERE approval_group_id IS NOT NULL
                ) cable_group_references
                GROUP BY approval_group_id
             ) cgr ON cgr.approval_group_id = cag.approval_group_id
             JOIN cable_tv_customers c ON c.cable_customer_id = cgr.cable_customer_id
             LEFT JOIN cable_customer_accounts ca ON ca.approval_group_id = cag.approval_group_id
             WHERE cag.approval_status = 'PENDING'
               AND cag.group_type <> 'SUBSCRIPTION_UPDATE'
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
        await ensureTransactionTable(conn);
        await conn.beginTransaction();
        const workflowId = String(req.params.workflow_id || '');
        if (workflowId.startsWith('CTV-')) {
            if (String(req.res?.locals?.role || '').toUpperCase() !== 'ADMIN') {
                await conn.rollback();
                return res.status(403).json({ success: false, message: 'Administrator approval is required' });
            }
            const approvalGroupId = Number(workflowId.replace('CTV-', ''));
            if (!approvalGroupId) throw new Error('Workflow request not found');
            const [groups] = await conn.query('SELECT * FROM cable_approval_groups WHERE approval_group_id = ? FOR UPDATE', [approvalGroupId]);
            if (!groups.length) throw new Error('Workflow request not found');
            if (groups[0].approval_status === 'APPROVED') throw new Error('Workflow request is already approved');
            const approvedBy = req.body.approved_by_employee_id || req.res?.locals?.userId || req.res?.locals?.user_id || null;
            const [[pendingAccount]] = await conn.query(
                `SELECT COUNT(*) AS count
                 FROM cable_customer_accounts
                 WHERE approval_group_id = ? AND account_status = 'PENDING'`,
                [approvalGroupId]
            );
            const waitForAccountReceipt = Number(pendingAccount.count) > 0;

            const [pendingAccessories] = waitForAccountReceipt ? [[]] : await conn.query(
                `SELECT acc.stb_accessory_id, acc.customer_stb_id, acc.product_id, acc.accessory_name,
                        acc.qty, acc.issued_by_employee_id, acc.movement_type, p.purchase_price
                 FROM cable_customer_stb_accessories acc
                 JOIN products p ON p.product_id = acc.product_id
                 WHERE acc.approval_group_id = ? AND acc.approval_status = 'PENDING'
                 FOR UPDATE`,
                [approvalGroupId]
            );
            for (const accessory of pendingAccessories) {
                const isReturn = String(accessory.movement_type || 'ISSUE').toUpperCase() === 'RETURN';
                const returnedProduct = isReturn
                    ? await ensureUsedAccessoryProduct(conn, accessory.product_id)
                    : null;
                const stockProductId = returnedProduct?.used_product_id || accessory.product_id;
                await conn.query(
                    `INSERT INTO stock_master (product_id, available_qty, last_stock_check_date)
                     VALUES (?, 0, CURDATE())
                     ON DUPLICATE KEY UPDATE last_stock_check_date = CURDATE()`,
                    [stockProductId]
                );
                const [stockRows] = await conn.query(
                    'SELECT available_qty FROM stock_master WHERE product_id = ? FOR UPDATE',
                    [stockProductId]
                );
                const availableQty = Number(stockRows[0]?.available_qty || 0);
                const issuedQty = Number(accessory.qty || 0);
                if (!isReturn && availableQty < issuedQty) {
                    throw new Error(`Insufficient stock for ${accessory.accessory_name}. Available: ${availableQty}, required: ${issuedQty}`);
                }
                const balanceQty = isReturn ? availableQty + issuedQty : availableQty - issuedQty;
                await conn.query(
                    `UPDATE stock_master
                     SET available_qty = ?, last_stock_check_date = CURDATE(), last_updated = NOW()
                     WHERE product_id = ?`,
                    [balanceQty, stockProductId]
                );
                await conn.query(
                    `INSERT INTO stock_ledger (
                        product_id, transaction_type, transaction_id, reference_no,
                        qty_in, qty_out, balance_qty, unit_cost, remarks, recorded_by_employee_id
                     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        stockProductId, isReturn ? 'RETURN' : 'INSTALLATION', accessory.stb_accessory_id,
                        `CTV-STB-${accessory.customer_stb_id}`, isReturn ? issuedQty : 0,
                        isReturn ? 0 : issuedQty, balanceQty,
                        Number(accessory.purchase_price || 0),
                        isReturn
                            ? `CATV returned accessory approved into used stock`
                            : `CATV STB accessory approved for issue`,
                        accessory.issued_by_employee_id || approvedBy
                    ]
                );
            }

            const [pendingStbs] = await conn.query(
                `SELECT customer_stb_id, cable_customer_id, stb_master_id, stb_no, status, update_reason,
                        refund_amount, refund_payment_mode, updated_date, entered_by_employee_id, created_by_user_id
                 FROM cable_customer_stbs
                 WHERE approval_group_id = ? AND approval_status = 'PENDING'
                 FOR UPDATE`,
                [approvalGroupId]
            );
            for (const stb of pendingStbs) {
                const desiredStatus = String(stb.status || 'DISCONNECTED').toUpperCase();
                const reason = String(stb.update_reason || '').toUpperCase();
                if (['FAULT', 'DAMAGED', 'BROKEN', 'BURNT'].includes(reason) && stb.stb_master_id) {
                    await conn.query(
                        "UPDATE cable_stb_master SET stock_type = 'FAULT', status = 'NOT_AVAILABLE', updated_at = NOW() WHERE stb_master_id = ?",
                        [stb.stb_master_id]
                    );
                }
                const [previousActive] = await conn.query(
                    `SELECT customer_stb_id, stb_master_id
                     FROM cable_customer_stbs
                     WHERE cable_customer_id = ? AND customer_stb_id <> ? AND approval_status = 'APPROVED'
                     ORDER BY customer_stb_id DESC, COALESCE(updated_date, installed_date) DESC, updated_at DESC
                     LIMIT 1 FOR UPDATE`,
                    [stb.cable_customer_id, stb.customer_stb_id]
                );
                if (reason === 'RETURNED' || reason === 'REPLACED') {
                    const returnedMasterIds = (reason === 'RETURNED'
                        ? [stb.stb_master_id, ...previousActive.map((item) => item.stb_master_id)]
                        : previousActive.map((item) => item.stb_master_id)
                    ).filter(Boolean);
                    if (returnedMasterIds.length) {
                        await conn.query(
                            `UPDATE cable_stb_master
                             SET stock_type = CASE WHEN ? = 'RETURNED' THEN 'RETURNED' ELSE stock_type END,
                                 status = 'AVAILABLE', assigned_employee_id = NULL, updated_at = NOW()
                             WHERE stb_master_id IN (?)`,
                            [reason, returnedMasterIds]
                        );
                        await conn.query(
                            `UPDATE cable_stb_issue_master SET issue_status = 'RETURNED'
                             WHERE stb_master_id IN (?) AND cable_customer_id = ? AND issue_status = 'ISSUED'`,
                            [returnedMasterIds, stb.cable_customer_id]
                        );
                    }
                }
                if (reason === 'RETURNED' && Number(stb.refund_amount || 0) > 0) {
                    await conn.query(
                        `INSERT INTO finance_transactions (
                            transaction_date, transaction_type, category, amount, payment_mode,
                            reference_no, description, source_module, source_id,
                            created_by_user_id, created_by_employee_id
                         ) VALUES (?, 'DEBIT', 'STB Return Refund', ?, ?, ?, ?, 'CATV_STB_RETURN', ?, ?, ?)
                         ON DUPLICATE KEY UPDATE finance_transaction_id = finance_transaction_id`,
                        [
                            stb.updated_date || new Date(), Number(stb.refund_amount), stb.refund_payment_mode || 'CASH',
                            `CTV-STB-${stb.customer_stb_id}`, `Refund paid for returned STB ${stb.stb_no || ''}`,
                            stb.customer_stb_id, stb.created_by_user_id || approvedBy,
                            stb.entered_by_employee_id || approvedBy
                        ]
                    );
                }
                await conn.query(
                    'UPDATE cable_tv_customers SET status = ?, updated_at = NOW() WHERE cable_customer_id = ?',
                    [customerStatusForStbStatus(desiredStatus), stb.cable_customer_id]
                );
            }
            const approvalTables = [
                'cable_tv_customers',
                'cable_customer_accounts',
                ...(!waitForAccountReceipt ? [
                    'cable_connections',
                    'cable_connection_materials',
                    'cable_customer_stbs',
                    'cable_customer_packages',
                    'cable_subscriptions',
                    'cable_customer_stb_accessories'
                ] : [])
            ];
            for (const table of approvalTables) {
                await conn.query(
                    `UPDATE ${table}
                     SET approval_status = 'APPROVED'
                     WHERE approval_group_id = ? AND approval_status = 'PENDING'`,
                    [approvalGroupId]
                );
            }
            if (!waitForAccountReceipt) await applyApprovedLocationChange(conn, approvalGroupId);
            const affectedCustomerIds = [...new Set(pendingStbs.map((item) => Number(item.cable_customer_id)).filter(Boolean))];
            if (affectedCustomerIds.length) {
                await synchronizeLatestCustomerStbStatus(conn, affectedCustomerIds);
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
