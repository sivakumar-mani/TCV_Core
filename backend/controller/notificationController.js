const connection = require('../connection');

const managedTypes = [
    'SUPPLIER_BALANCE', 'CUSTOMER_BALANCE', 'CUSTOMER_OVERDUE',
    'OUT_OF_STOCK', 'LOW_STOCK', 'WORKFLOW_PENDING', 'QUOTATION_EXPIRED',
    'CABLE_TV_ACCOUNT_DUE'
];

const isAdmin = (req) => String(req.res?.locals?.role || '').toUpperCase() === 'ADMIN';
const currentUserId = (req) => Number(req.res?.locals?.userId || req.res?.locals?.user_id || req.res?.locals?.id) || 0;

const ensureNotificationTable = async (conn) => {
    await conn.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            notification_id INT AUTO_INCREMENT PRIMARY KEY,
            source_key VARCHAR(180) NOT NULL UNIQUE,
            notification_type VARCHAR(50) NOT NULL,
            title VARCHAR(180) NOT NULL,
            message VARCHAR(500) NOT NULL,
            severity ENUM('INFO','WARNING','CRITICAL') NOT NULL DEFAULT 'INFO',
            reference_type VARCHAR(50),
            reference_id INT,
            reference_no VARCHAR(100),
            navigation_url VARCHAR(500),
            target_user_id INT NULL,
            is_read TINYINT(1) NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            resolved_at TIMESTAMP NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_active_read (is_active, is_read),
            INDEX idx_type_active (notification_type, is_active),
            INDEX idx_severity (severity)
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    const [[targetColumn]] = await conn.query(
        `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'target_user_id'`
    );
    if (!targetColumn.count) {
        await conn.query('ALTER TABLE notifications ADD COLUMN target_user_id INT NULL AFTER navigation_url');
        await conn.query('ALTER TABLE notifications ADD INDEX idx_notification_target (target_user_id, is_active)');
    }
};

const upsertNotification = async (conn, item) => {
    await conn.query(
        `INSERT INTO notifications (
            source_key, notification_type, title, message, severity,
            reference_type, reference_id, reference_no, navigation_url, target_user_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            is_read = IF(is_active = 0, 0, is_read), is_active = 1, resolved_at = NULL,
            title = VALUES(title), message = VALUES(message), severity = VALUES(severity),
            notification_type = VALUES(notification_type),
            reference_type = VALUES(reference_type), reference_id = VALUES(reference_id),
            reference_no = VALUES(reference_no), navigation_url = VALUES(navigation_url),
            target_user_id = VALUES(target_user_id),
            updated_at = NOW()`,
        [item.key, item.type, item.title, item.message, item.severity,
            item.referenceType, item.referenceId, item.referenceNo, item.url, item.targetUserId || null]
    );
};

const money = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const syncNotifications = async (conn) => {
    await ensureNotificationTable(conn);
    await conn.beginTransaction();
    try {
        const activeKeys = [];
        const save = async (item) => {
            activeKeys.push(item.key);
            await upsertNotification(conn, item);
        };

        const [supplierBalances] = await conn.query(
            `SELECT pm.purchase_id, pm.purchase_no, pm.balance_amount, pm.supplier_id, s.supplier_name
             FROM purchase_master pm JOIN suppliers s ON s.supplier_id = pm.supplier_id
             WHERE pm.balance_amount > 0 AND pm.payment_status IN ('PENDING','PARTIAL')`
        );
        for (const row of supplierBalances) {
            await save({
                key: `supplier-balance:${row.purchase_id}`, type: 'SUPPLIER_BALANCE', severity: 'WARNING',
                title: 'Supplier payment pending',
                message: `${money(row.balance_amount)} is payable to ${row.supplier_name} for ${row.purchase_no}.`,
                referenceType: 'PURCHASE', referenceId: row.purchase_id, referenceNo: row.purchase_no,
                url: `/supplier-payments?supplierId=${row.supplier_id}&purchaseId=${row.purchase_id}`
            });
        }

        const [customerBalances] = await conn.query(
            `SELECT sm.sales_id, sm.invoice_no, sm.balance_amount, sm.customer_id, sm.due_date, c.customer_name,
                    CASE WHEN sm.due_date IS NOT NULL AND sm.due_date < CURDATE() THEN 1 ELSE 0 END AS overdue
             FROM sales_master sm JOIN customers c ON c.customer_id = sm.customer_id
             WHERE sm.balance_amount > 0 AND sm.payment_status IN ('PENDING','PARTIAL','OVERDUE')`
        );
        for (const row of customerBalances) {
            const overdue = Boolean(row.overdue);
            await save({
                key: `customer-balance:${row.sales_id}`, type: overdue ? 'CUSTOMER_OVERDUE' : 'CUSTOMER_BALANCE',
                severity: overdue ? 'CRITICAL' : 'WARNING',
                title: overdue ? 'Customer payment overdue' : 'Customer payment pending',
                message: `${row.customer_name} needs to pay ${money(row.balance_amount)} for ${row.invoice_no}${row.due_date ? ` (due ${String(row.due_date).slice(0, 10)})` : ''}.`,
                referenceType: 'SALE', referenceId: row.sales_id, referenceNo: row.invoice_no,
                url: `/customer-payments?customerId=${row.customer_id}&salesId=${row.sales_id}`
            });
        }

        const [cableTvDueAccounts] = await conn.query(
            `SELECT ca.account_id, ca.cable_customer_id, ca.office_balance_amount AS balance_amount, ca.account_status,
                    DATE_FORMAT(ca.due_date, '%Y-%m-%d') AS due_date_text,
                    ca.due_date < CURDATE() AS overdue,
                    ca.created_by_user_id, c.customer_code, c.full_name
             FROM cable_customer_accounts ca
             JOIN cable_tv_customers c ON c.cable_customer_id = ca.cable_customer_id
             WHERE ca.account_status IN ('PENDING', 'PARTIAL') AND ca.office_balance_amount > 0 AND ca.due_date IS NOT NULL`
        );
        for (const row of cableTvDueAccounts) {
            const dueDate = row.due_date_text;
            const overdue = Boolean(row.overdue);
            await save({
                key: `cable-tv-account-due:${row.account_id}`,
                type: 'CABLE_TV_ACCOUNT_DUE', severity: overdue ? 'CRITICAL' : 'WARNING',
                title: overdue ? 'Cable TV payment overdue' : 'Cable TV payment due',
                message: `${row.full_name} (${row.customer_code}) has ${money(row.balance_amount)} balance due on ${dueDate}.`,
                referenceType: 'CABLE_TV_ACCOUNT', referenceId: row.account_id, referenceNo: row.customer_code,
                url: `/cable-tv-account-pending?status=${row.account_status}&name=${encodeURIComponent(row.customer_code)}`,
                targetUserId: row.created_by_user_id
            });
        }

        const [stockAlerts] = await conn.query(
            `SELECT sm.stock_id, sm.product_id, sm.available_qty, sm.minimum_stock, p.product_code, p.product_name
             FROM stock_master sm JOIN products p ON p.product_id = sm.product_id
             WHERE sm.available_qty <= 0 OR (sm.minimum_stock > 0 AND sm.available_qty <= sm.minimum_stock)`
        );
        for (const row of stockAlerts) {
            const out = Number(row.available_qty) <= 0;
            await save({
                key: `stock:${row.product_id}`, type: out ? 'OUT_OF_STOCK' : 'LOW_STOCK',
                severity: out ? 'CRITICAL' : 'WARNING', title: out ? 'Product out of stock' : 'Low stock alert',
                message: `${row.product_code} - ${row.product_name} has ${Number(row.available_qty)} available${out ? '' : ` (minimum ${Number(row.minimum_stock)})`}.`,
                referenceType: 'PRODUCT', referenceId: row.product_id, referenceNo: row.product_code,
                url: `/stock?productId=${row.product_id}`
            });
        }

        const [workflows] = await conn.query(
            `SELECT workflow_id, module_name, reference_id, reference_no, remarks
             FROM workflow_approvals WHERE workflow_status = 'PENDING'`
        );
        for (const row of workflows) {
            const urls = {
                QUOTATION: `/quotations/preview/${row.reference_id}`,
                WORK_ORDER: `/work-orders/preview/${row.reference_id}`,
                MATERIAL_ISSUE: `/work-orders/material-issue/${row.reference_id}?preview=true&workflow=true`
            };
            await save({
                key: `workflow:${row.workflow_id}`, type: 'WORKFLOW_PENDING', severity: 'INFO',
                title: `${String(row.module_name).replaceAll('_', ' ')} approval pending`,
                message: `${row.reference_no} is waiting for admin review${row.remarks ? `: ${row.remarks}` : '.'}`,
                referenceType: row.module_name, referenceId: row.reference_id, referenceNo: row.reference_no,
                url: urls[row.module_name] || '/workflow-approval'
            });
        }

        const [expiredQuotes] = await conn.query(
            `SELECT quotation_id, quotation_no, valid_until FROM quotation_master
             WHERE quotation_status = 'SENT' AND valid_until IS NOT NULL AND valid_until < CURDATE()`
        );
        for (const row of expiredQuotes) {
            await save({
                key: `quotation-expired:${row.quotation_id}`, type: 'QUOTATION_EXPIRED', severity: 'WARNING',
                title: 'Quotation response overdue',
                message: `${row.quotation_no} passed its valid-until date without a customer response.`,
                referenceType: 'QUOTATION', referenceId: row.quotation_id, referenceNo: row.quotation_no,
                url: `/quotations/preview/${row.quotation_id}`
            });
        }
        if (activeKeys.length) {
            await conn.query(
                `UPDATE notifications SET is_active = 0, resolved_at = COALESCE(resolved_at, NOW())
                 WHERE is_active = 1 AND notification_type IN (?) AND source_key NOT IN (?)`,
                [managedTypes, activeKeys]
            );
        } else {
            await conn.query(
                `UPDATE notifications SET is_active = 0, resolved_at = COALESCE(resolved_at, NOW())
                 WHERE is_active = 1 AND notification_type IN (?)`,
                [managedTypes]
            );
        }
        await conn.commit();
    } catch (error) {
        await conn.rollback();
        throw error;
    }
};

const getNotifications = async (req, res) => {
    try {
        const conn = connection.promise();
        await syncNotifications(conn);
        const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
        const unreadOnly = String(req.query.unread || '') === 'true';
        const userId = currentUserId(req);
        const visibility = isAdmin(req)
            ? ''
            : `AND (target_user_id = ? OR (target_user_id IS NULL AND notification_type <> 'CABLE_TV_ACCOUNT_DUE'))`;
        const values = isAdmin(req) ? [] : [userId];
        const [rows] = await conn.query(
            `SELECT * FROM notifications WHERE is_active = 1 ${unreadOnly ? 'AND is_read = 0' : ''} ${visibility}
             ORDER BY FIELD(severity, 'CRITICAL','WARNING','INFO'), is_read, updated_at DESC LIMIT ?`,
            [...values, limit]
        );
        const [count] = await conn.query(
            `SELECT COUNT(*) AS unread_count FROM notifications
             WHERE is_active = 1 AND is_read = 0 ${visibility}`,
            values
        );
        return res.json({ success: true, data: rows, unread_count: Number(count[0].unread_count) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Unable to load notifications', error: error.message });
    }
};

const markNotificationRead = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureNotificationTable(conn);
        const visibility = isAdmin(req)
            ? ''
            : `AND (target_user_id = ? OR (target_user_id IS NULL AND notification_type <> 'CABLE_TV_ACCOUNT_DUE'))`;
        await conn.query(
            `UPDATE notifications SET is_read = 1, updated_at = NOW() WHERE notification_id = ? ${visibility}`,
            isAdmin(req) ? [req.params.notification_id] : [req.params.notification_id, currentUserId(req)]
        );
        return res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Unable to update notification', error: error.message });
    }
};

const markAllNotificationsRead = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureNotificationTable(conn);
        const visibility = isAdmin(req)
            ? ''
            : `AND (target_user_id = ? OR (target_user_id IS NULL AND notification_type <> 'CABLE_TV_ACCOUNT_DUE'))`;
        await conn.query(
            `UPDATE notifications SET is_read = 1, updated_at = NOW()
             WHERE is_active = 1 AND is_read = 0 ${visibility}`,
            isAdmin(req) ? [] : [currentUserId(req)]
        );
        return res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Unable to update notifications', error: error.message });
    }
};

module.exports = { ensureNotificationTable, getNotifications, markNotificationRead, markAllNotificationsRead };
