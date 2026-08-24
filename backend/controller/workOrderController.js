const connection = require('../connection');
const { ensureCustomerSchema } = require('../utils/customerSchema');

const toNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const toSqlDate = (value) => {
    if (!value) return null;
    return String(value).slice(0, 10);
};

const ensureProductTypeColumn = async (conn) => {
    const [columns] = await conn.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'products'
           AND COLUMN_NAME = 'product_type'`
    );

    if (columns.length === 0) {
        await conn.query(
            `ALTER TABLE products
             ADD COLUMN product_type ENUM('MATERIAL','SERVICE','LABOR') NOT NULL DEFAULT 'MATERIAL'
             AFTER description`
        );
    }
};

const ensureWorkOrderSupport = async (conn) => {
    await ensureCustomerSchema(conn);
    await ensureProductTypeColumn(conn);

    const ensureColumn = async (table, column, definition) => {
        const [columns] = await conn.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [table, column]
        );
        if (columns.length === 0) await conn.query(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
    };

    await ensureColumn('work_orders', 'approval_status', "approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING' AFTER work_status");
    await conn.query(`
        CREATE TABLE IF NOT EXISTS workflow_approvals (
            workflow_id INT AUTO_INCREMENT PRIMARY KEY,
            module_name VARCHAR(50) NOT NULL,
            reference_id INT NOT NULL,
            reference_no VARCHAR(50) NOT NULL,
            workflow_status ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
            requested_by_employee_id INT, approved_by_employee_id INT,
            requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP NULL, remarks TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_workflow_reference (module_name, reference_id),
            INDEX idx_module_status (module_name, workflow_status)
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
        CREATE TABLE IF NOT EXISTS stock_master (
            stock_id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL UNIQUE,
            available_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
            reserved_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
            minimum_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
            maximum_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
            reorder_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
            last_purchase_price DECIMAL(12,2),
            last_sale_price DECIMAL(12,2),
            last_stock_check_date DATE,
            remarks TEXT,
            last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE ON UPDATE CASCADE,
            INDEX idx_available_qty (available_qty),
            INDEX idx_below_minimum (available_qty, minimum_stock),
            INDEX idx_last_updated (last_updated)
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
        CREATE TABLE IF NOT EXISTS stock_ledger (
            stock_ledger_id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT NOT NULL,
            transaction_type ENUM('PURCHASE','SALE','RETURN','ADJUSTMENT','INSTALLATION','SCRAP') NOT NULL,
            transaction_id INT,
            reference_no VARCHAR(100),
            qty_in DECIMAL(10,2) NOT NULL DEFAULT 0,
            qty_out DECIMAL(10,2) NOT NULL DEFAULT 0,
            balance_qty DECIMAL(10,2) NOT NULL,
            unit_cost DECIMAL(12,2),
            remarks TEXT,
            recorded_by_employee_id INT,
            transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON UPDATE CASCADE,
            FOREIGN KEY (recorded_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
            INDEX idx_product_id (product_id),
            INDEX idx_transaction_type (transaction_type),
            INDEX idx_transaction_date (transaction_date),
            INDEX idx_product_date (product_id, transaction_date),
            INDEX idx_reference (reference_no)
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
        CREATE TABLE IF NOT EXISTS work_order_items (
            work_order_item_id INT AUTO_INCREMENT PRIMARY KEY,
            work_order_id INT NOT NULL,
            quotation_item_id INT,
            product_id INT,
            item_name VARCHAR(200) NOT NULL,
            description TEXT,
            qty DECIMAL(10,2) NOT NULL,
            selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
            discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            discount_percent DECIMAL(5,2) DEFAULT 0,
            tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
            tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            line_no SMALLINT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (work_order_id) REFERENCES work_orders(work_order_id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (quotation_item_id) REFERENCES quotation_items(quotation_item_id) ON DELETE SET NULL,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL ON UPDATE CASCADE,
            INDEX idx_work_order_id (work_order_id),
            INDEX idx_product_id (product_id),
            INDEX idx_quotation_item_id (quotation_item_id)
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
        CREATE TABLE IF NOT EXISTS material_master (
            material_id INT AUTO_INCREMENT PRIMARY KEY,
            product_id INT,
            material_code VARCHAR(50) NOT NULL UNIQUE,
            material_name VARCHAR(200) NOT NULL,
            description TEXT,
            unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
            standard_rate DECIMAL(12,2) NOT NULL DEFAULT 0,
            gst_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL ON UPDATE CASCADE,
            INDEX idx_material_code (material_code),
            INDEX idx_material_name (material_name),
            INDEX idx_active (is_active)
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
        CREATE TABLE IF NOT EXISTS work_order_material_issues (
            issue_id INT AUTO_INCREMENT PRIMARY KEY,
            issue_no VARCHAR(50) NOT NULL UNIQUE,
            work_order_id INT NOT NULL,
            material_id INT,
            product_id INT,
            issued_qty DECIMAL(10,2) NOT NULL,
            issued_date DATE NOT NULL DEFAULT (CURDATE()),
            issued_to_employee_id INT,
            issued_by_employee_id INT,
            remarks TEXT,
            approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
            approved_by_employee_id INT,
            approved_at TIMESTAMP NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (work_order_id) REFERENCES work_orders(work_order_id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (material_id) REFERENCES material_master(material_id) ON DELETE SET NULL,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL ON UPDATE CASCADE,
            FOREIGN KEY (issued_to_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
            FOREIGN KEY (issued_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
            INDEX idx_work_order_id (work_order_id),
            INDEX idx_material_id (material_id),
            INDEX idx_product_id (product_id),
            INDEX idx_issued_date (issued_date)
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await ensureColumn('work_order_material_issues', 'approval_status', "approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING' AFTER remarks");
    await ensureColumn('work_order_material_issues', 'approved_by_employee_id', 'approved_by_employee_id INT NULL AFTER approval_status');
    await ensureColumn('work_order_material_issues', 'approved_at', 'approved_at TIMESTAMP NULL AFTER approved_by_employee_id');

    await conn.query(`
        CREATE TABLE IF NOT EXISTS work_order_material_returns (
            return_id INT AUTO_INCREMENT PRIMARY KEY,
            return_no VARCHAR(50) NOT NULL UNIQUE,
            issue_id INT,
            work_order_id INT NOT NULL,
            material_id INT,
            product_id INT,
            returned_qty DECIMAL(10,2) NOT NULL,
            return_date DATE NOT NULL DEFAULT (CURDATE()),
            returned_by_employee_id INT,
            received_by_employee_id INT,
            condition_status ENUM('GOOD','DAMAGED','SCRAP') NOT NULL DEFAULT 'GOOD',
            remarks TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (issue_id) REFERENCES work_order_material_issues(issue_id) ON DELETE SET NULL,
            FOREIGN KEY (work_order_id) REFERENCES work_orders(work_order_id) ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY (material_id) REFERENCES material_master(material_id) ON DELETE SET NULL,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL ON UPDATE CASCADE,
            FOREIGN KEY (returned_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
            FOREIGN KEY (received_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
            INDEX idx_issue_id (issue_id),
            INDEX idx_work_order_id (work_order_id),
            INDEX idx_return_date (return_date)
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
        INSERT INTO material_master (product_id, material_code, material_name, description, unit, standard_rate, gst_percent, is_active)
        SELECT p.product_id, p.product_code, p.product_name, p.description, p.unit, p.selling_price, p.gst_percent,
               CASE WHEN p.status = 'ACTIVE' THEN 1 ELSE 0 END
        FROM products p
        WHERE p.product_type = 'MATERIAL'
        ON DUPLICATE KEY UPDATE
            product_id = VALUES(product_id),
            material_name = VALUES(material_name),
            description = VALUES(description),
            unit = VALUES(unit),
            standard_rate = VALUES(standard_rate),
            gst_percent = VALUES(gst_percent),
            is_active = VALUES(is_active)
    `);
};

const resolveProductId = async (conn, materialId, productId) => {
    if (productId) return Number(productId);
    if (!materialId) return null;

    const [materials] = await conn.query('SELECT product_id FROM material_master WHERE material_id = ?', [materialId]);
    return materials[0]?.product_id || null;
};

const resolveMaterialId = async (conn, materialId, productId) => {
    if (materialId) return Number(materialId);
    if (!productId) return null;

    const [materials] = await conn.query(
        'SELECT material_id FROM material_master WHERE product_id = ? LIMIT 1',
        [productId]
    );
    return materials[0]?.material_id || null;
};

const isMaterialProduct = async (conn, productId) => {
    if (!productId) return false;
    const [rows] = await conn.query(
        `SELECT product_type FROM products WHERE product_id = ?`,
        [productId]
    );
    return (rows[0]?.product_type || 'MATERIAL') === 'MATERIAL';
};

const postStockMovement = async (conn, {
    productId,
    transactionType,
    transactionId,
    referenceNo,
    qtyIn = 0,
    qtyOut = 0,
    unitCost = null,
    remarks = null,
    employeeId = null
}) => {
    if (!productId) return;
    if (!(await isMaterialProduct(conn, productId))) return;

    const inQty = toNumber(qtyIn);
    const outQty = toNumber(qtyOut);
    if (inQty <= 0 && outQty <= 0) return;

    await conn.query(
        `INSERT INTO stock_master (product_id, available_qty, last_stock_check_date)
         VALUES (?, 0, CURDATE())
         ON DUPLICATE KEY UPDATE last_stock_check_date = CURDATE()`,
        [productId]
    );

    const [stockRows] = await conn.query(
        'SELECT available_qty FROM stock_master WHERE product_id = ? FOR UPDATE',
        [productId]
    );
    const currentQty = toNumber(stockRows[0]?.available_qty);
    const nextQty = currentQty + inQty - outQty;

    if (nextQty < 0) {
        throw new Error(`Stock cannot go negative for product ${productId}`);
    }

    await conn.query(
        `UPDATE stock_master
         SET available_qty = ?, last_stock_check_date = CURDATE(), last_updated = NOW()
         WHERE product_id = ?`,
        [nextQty, productId]
    );

    await conn.query(
        `INSERT INTO stock_ledger (
            product_id, transaction_type, transaction_id, reference_no,
            qty_in, qty_out, balance_qty, unit_cost, remarks, recorded_by_employee_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [productId, transactionType, transactionId || null, referenceNo || null, inQty, outQty, nextQty, unitCost, remarks, employeeId]
    );
};

const createSequenceNo = async (conn, tableName, columnName, prefix) => {
    const fullPrefix = `${prefix}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-`;
    const [rows] = await conn.query(
        `SELECT ${columnName} AS sequence_no FROM ${tableName} WHERE ${columnName} LIKE ? ORDER BY ${columnName} DESC LIMIT 1`,
        [`${fullPrefix}%`]
    );
    const last = rows[0]?.sequence_no || '';
    const nextNumber = String((Number(last.replace(fullPrefix, '')) || 0) + 1).padStart(4, '0');
    return `${fullPrefix}${nextNumber}`;
};

const normalizeWorkItem = (item, index) => {
    const qty = toNumber(item.qty);
    const price = toNumber(item.selling_price);
    const gross = qty * price;
    const discountAmount = item.discount_amount !== undefined ? toNumber(item.discount_amount) : gross * toNumber(item.discount_percent) / 100;
    const taxable = Math.max(gross - discountAmount, 0);
    const taxAmount = taxable * toNumber(item.tax_percent) / 100;

    return {
        quotation_item_id: item.quotation_item_id || null,
        product_id: item.product_id || null,
        item_name: item.item_name || item.product_name || `Work Item ${index + 1}`,
        description: item.description || null,
        qty,
        selling_price: price,
        discount_amount: discountAmount,
        discount_percent: toNumber(item.discount_percent),
        tax_percent: toNumber(item.tax_percent),
        tax_amount: taxAmount,
        amount: taxable + taxAmount,
        line_no: index + 1
    };
};

const calculateSummary = (items) => {
    const totalAmount = items.reduce((sum, item) => sum + item.qty * item.selling_price, 0);
    const discountAmount = items.reduce((sum, item) => sum + item.discount_amount, 0);
    const taxAmount = items.reduce((sum, item) => sum + item.tax_amount, 0);
    return {
        total_amount: totalAmount,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        net_amount: Math.max(totalAmount - discountAmount, 0) + taxAmount
    };
};

const getQuoteItems = async (conn, quotationId) => {
    const [items] = await conn.query(
        `SELECT quotation_item_id, product_id, item_name, description, qty, selling_price,
                discount_amount, discount_percent, tax_percent, tax_amount, amount, line_no
         FROM quotation_items
         WHERE quotation_id = ?
         ORDER BY line_no, quotation_item_id`,
        [quotationId]
    );
    return items.map(normalizeWorkItem);
};

const getMaterials = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureWorkOrderSupport(conn);
        const [rows] = await conn.query(
            `SELECT mm.*, p.product_code, p.product_name, p.product_type,
                    COALESCE(sm.available_qty, 0) AS available_qty
             FROM material_master mm
             LEFT JOIN products p ON p.product_id = mm.product_id
             LEFT JOIN stock_master sm ON sm.product_id = mm.product_id
             WHERE COALESCE(p.product_type, 'MATERIAL') = 'MATERIAL'
             ORDER BY mm.material_name`
        );
        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getNextWorkOrderNo = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureWorkOrderSupport(conn);
        const workOrderNo = await createSequenceNo(conn, 'work_orders', 'work_order_no', 'WO');
        return res.json({ success: true, work_order_no: workOrderNo });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getWorkOrders = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureWorkOrderSupport(conn);
        const [rows] = await conn.query(
            `SELECT wo.*, TRIM(CONCAT(COALESCE(c.salutation, ''), ' ', c.customer_name)) AS customer_name,
                    qm.quotation_no,
                    ae.employee_code AS assigned_employee_code,
                    CONCAT_WS(' ', ae.first_name, ae.last_name) AS assigned_employee_name,
                    COALESCE(item_counts.item_count, 0) AS item_count,
                    COALESCE(issue_counts.issue_count, 0) AS issue_count,
                    sm.invoice_no
             FROM work_orders wo
             JOIN customers c ON c.customer_id = wo.customer_id
             LEFT JOIN quotation_master qm ON qm.quotation_id = wo.quotation_id
             LEFT JOIN employees ae ON ae.employee_id = wo.assigned_to_employee_id
             LEFT JOIN (
                SELECT work_order_id, COUNT(*) AS item_count FROM work_order_items GROUP BY work_order_id
             ) item_counts ON item_counts.work_order_id = wo.work_order_id
             LEFT JOIN (
                SELECT work_order_id, COUNT(*) AS issue_count FROM work_order_material_issues GROUP BY work_order_id
             ) issue_counts ON issue_counts.work_order_id = wo.work_order_id
             LEFT JOIN sales_master sm ON sm.work_order_id = wo.work_order_id
             ORDER BY wo.work_order_id DESC`
        );
        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getWorkOrderById = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensureWorkOrderSupport(conn);
        const { work_order_id } = req.params;
        const [orders] = await conn.query(
            `SELECT wo.*, TRIM(CONCAT(COALESCE(c.salutation, ''), ' ', c.customer_name)) AS customer_name,
                    c.address, c.phone, c.email, qm.quotation_no,
                    ae.employee_code AS assigned_employee_code,
                    CONCAT_WS(' ', ae.first_name, ae.last_name) AS assigned_employee_name,
                    sm.sales_id, sm.invoice_no
             FROM work_orders wo
             JOIN customers c ON c.customer_id = wo.customer_id
             LEFT JOIN quotation_master qm ON qm.quotation_id = wo.quotation_id
             LEFT JOIN employees ae ON ae.employee_id = wo.assigned_to_employee_id
             LEFT JOIN sales_master sm ON sm.work_order_id = wo.work_order_id
             WHERE wo.work_order_id = ?`,
            [work_order_id]
        );
        if (orders.length === 0) return res.status(404).json({ success: false, message: 'Work order not found' });

        const [items] = await conn.query('SELECT * FROM work_order_items WHERE work_order_id = ? ORDER BY line_no, work_order_item_id', [work_order_id]);
        const [issues] = await conn.query(
            `SELECT mi.*, mm.material_code, mm.material_name,
                    CONCAT_WS(' ', issued_to.first_name, issued_to.last_name) AS issued_to_employee_name,
                    CONCAT_WS(' ', issued_by.first_name, issued_by.last_name) AS issued_by_employee_name
             FROM work_order_material_issues mi
             LEFT JOIN material_master mm ON mm.material_id = mi.material_id
             LEFT JOIN employees issued_to ON issued_to.employee_id = mi.issued_to_employee_id
             LEFT JOIN employees issued_by ON issued_by.employee_id = mi.issued_by_employee_id
             WHERE mi.work_order_id = ?
             ORDER BY mi.issue_id`,
            [work_order_id]
        );
        const [returns] = await conn.query(
            `SELECT mr.*, mm.material_code, mm.material_name,
                    CONCAT_WS(' ', returned_by.first_name, returned_by.last_name) AS returned_by_employee_name,
                    CONCAT_WS(' ', received_by.first_name, received_by.last_name) AS received_by_employee_name
             FROM work_order_material_returns mr
             LEFT JOIN material_master mm ON mm.material_id = mr.material_id
             LEFT JOIN employees returned_by ON returned_by.employee_id = mr.returned_by_employee_id
             LEFT JOIN employees received_by ON received_by.employee_id = mr.received_by_employee_id
             WHERE mr.work_order_id = ?
             ORDER BY mr.return_id`,
            [work_order_id]
        );

        return res.json({ success: true, data: { ...orders[0], items, material_issues: issues, material_returns: returns } });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const addWorkOrder = async (req, res) => {
    const conn = connection.promise();
    try {
        await ensureWorkOrderSupport(conn);
        const payload = req.body;
        await conn.beginTransaction();

        let quote = null;
        if (payload.quotation_id) {
            const [quotes] = await conn.query('SELECT * FROM quotation_master WHERE quotation_id = ? FOR UPDATE', [payload.quotation_id]);
            if (quotes.length === 0) throw new Error('Quotation not found');
            quote = quotes[0];
            if (quote.quotation_status !== 'ACCEPTED') {
                throw new Error('Only customer-accepted quotations can be converted to work order');
            }
        }

        const workOrderNo = payload.work_order_no || await createSequenceNo(conn, 'work_orders', 'work_order_no', 'WO');
        const customerId = payload.customer_id || quote?.customer_id;
        if (!customerId) throw new Error('Customer is required');

        const [result] = await conn.query(
            `INSERT INTO work_orders (
                work_order_no, quotation_id, customer_id, work_type, work_status, priority,
                start_date, completion_date, site_address, site_contact_person,
                site_contact_phone, work_notes, assigned_to_employee_id, supervisor_id,
                created_by_employee_id, completion_remarks
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                workOrderNo,
                payload.quotation_id || null,
                customerId,
                payload.work_type || 'INSTALLATION',
                payload.work_status || 'PENDING',
                payload.priority || 'MEDIUM',
                toSqlDate(payload.start_date),
                toSqlDate(payload.completion_date),
                payload.site_address || payload.address || 'Customer site',
                payload.site_contact_person || null,
                payload.site_contact_phone || null,
                payload.work_notes || quote?.requirement_details || null,
                payload.assigned_to_employee_id || null,
                payload.supervisor_id || null,
                payload.created_by_employee_id || null,
                payload.completion_remarks || null
            ]
        );
        const workOrderId = result.insertId;

        if (payload.assigned_to_employee_id) {
            await conn.query(
                `INSERT INTO work_order_employees (work_order_id, employee_id, role_in_work, status, remarks)
                 VALUES (?, ?, ?, 'ASSIGNED', ?)`,
                [workOrderId, payload.assigned_to_employee_id, payload.role_in_work || 'Technician', payload.assignment_remarks || null]
            );
        }

        const items = (payload.items?.length ? payload.items.map(normalizeWorkItem) : (quote ? await getQuoteItems(conn, quote.quotation_id) : []));
        if (items.length === 0) throw new Error('At least one work item is required');

        for (const item of items) {
            await conn.query(
                `INSERT INTO work_order_items (
                    work_order_id, quotation_item_id, product_id, item_name, description, qty,
                    selling_price, discount_amount, discount_percent, tax_percent, tax_amount, amount, line_no
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [workOrderId, item.quotation_item_id, item.product_id, item.item_name, item.description, item.qty, item.selling_price, item.discount_amount, item.discount_percent, item.tax_percent, item.tax_amount, item.amount, item.line_no]
            );
        }

        await conn.query(
            `INSERT INTO workflow_approvals (module_name, reference_id, reference_no, workflow_status, requested_by_employee_id, remarks)
             VALUES ('WORK_ORDER', ?, ?, 'PENDING', ?, 'Work order awaiting approval')
             ON DUPLICATE KEY UPDATE workflow_status = 'PENDING', requested_at = NOW(), reviewed_at = NULL,
                 approved_by_employee_id = NULL, remarks = VALUES(remarks)`,
            [workOrderId, workOrderNo, payload.created_by_employee_id || null]
        );

        const materialIssues = payload.material_issues || [];
        if (materialIssues.length) throw new Error('Approve the work order before adding material issues');
        for (const issue of materialIssues) {
            if (!issue.material_id && !issue.product_id) continue;
            const issueNo = issue.issue_no || await createSequenceNo(conn, 'work_order_material_issues', 'issue_no', 'MI');
            const issueProductId = await resolveProductId(conn, issue.material_id, issue.product_id);
            if (!(await isMaterialProduct(conn, issueProductId))) {
                throw new Error('Only material products can be issued from stock');
            }
            const issuedQty = toNumber(issue.issued_qty || issue.qty);
            const [issueResult] = await conn.query(
                `INSERT INTO work_order_material_issues (
                    issue_no, work_order_id, material_id, product_id, issued_qty,
                    issued_date, issued_to_employee_id, issued_by_employee_id, remarks
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [issueNo, workOrderId, issue.material_id || null, issueProductId, issuedQty, toSqlDate(issue.issued_date) || toSqlDate(new Date().toISOString()), issue.issued_to_employee_id || payload.assigned_to_employee_id || null, issue.issued_by_employee_id || payload.created_by_employee_id || null, issue.remarks || null]
            );
            await postStockMovement(conn, {
                productId: issueProductId,
                transactionType: 'INSTALLATION',
                transactionId: issueResult.insertId,
                referenceNo: issueNo,
                qtyOut: issuedQty,
                remarks: issue.remarks || `Material issued for ${workOrderNo}`,
                employeeId: issue.issued_by_employee_id || payload.created_by_employee_id || null
            });
        }

        if (quote) {
            await conn.query("UPDATE quotation_master SET quotation_status = 'CONVERTED', updated_at = NOW() WHERE quotation_id = ?", [quote.quotation_id]);
        }

        await conn.commit();
        return res.status(201).json({ success: true, message: 'Work order created successfully', work_order_id: workOrderId, work_order_no: workOrderNo });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};

const updateWorkOrder = async (req, res) => {
    const conn = connection.promise();
    try {
        await ensureWorkOrderSupport(conn);
        const payload = req.body;
        const workOrderId = payload.work_order_id || req.params.work_order_id;
        if (!workOrderId) return res.status(400).json({ success: false, message: 'work_order_id is required' });

        await conn.beginTransaction();
        const [existing] = await conn.query('SELECT * FROM work_orders WHERE work_order_id = ? FOR UPDATE', [workOrderId]);
        if (existing.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Work order not found' });
        }

        await conn.query(
            `UPDATE work_orders SET
                customer_id = ?, work_type = ?, work_status = ?, priority = ?,
                start_date = ?, completion_date = ?, site_address = ?, site_contact_person = ?,
                site_contact_phone = ?, work_notes = ?, assigned_to_employee_id = ?,
                supervisor_id = ?, created_by_employee_id = ?, completion_remarks = ?,
                approval_status = 'PENDING', updated_at = NOW()
             WHERE work_order_id = ?`,
            [
                payload.customer_id,
                payload.work_type || 'INSTALLATION',
                payload.work_status || 'PENDING',
                payload.priority || 'MEDIUM',
                toSqlDate(payload.start_date),
                toSqlDate(payload.completion_date),
                payload.site_address || 'Customer site',
                payload.site_contact_person || null,
                payload.site_contact_phone || null,
                payload.work_notes || null,
                payload.assigned_to_employee_id || null,
                payload.supervisor_id || null,
                payload.created_by_employee_id || null,
                payload.completion_remarks || null,
                workOrderId
            ]
        );

        await conn.query('DELETE FROM work_order_items WHERE work_order_id = ?', [workOrderId]);
        const items = (payload.items || []).map(normalizeWorkItem);
        for (const item of items) {
            await conn.query(
                `INSERT INTO work_order_items (
                    work_order_id, quotation_item_id, product_id, item_name, description, qty,
                    selling_price, discount_amount, discount_percent, tax_percent, tax_amount, amount, line_no
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [workOrderId, item.quotation_item_id, item.product_id, item.item_name, item.description, item.qty, item.selling_price, item.discount_amount, item.discount_percent, item.tax_percent, item.tax_amount, item.amount, item.line_no]
            );
        }


        await conn.query(
            `INSERT INTO workflow_approvals (module_name, reference_id, reference_no, workflow_status, requested_by_employee_id, remarks)
             VALUES ('WORK_ORDER', ?, ?, 'PENDING', ?, 'Updated work order awaiting review')
             ON DUPLICATE KEY UPDATE workflow_status = 'PENDING', requested_by_employee_id = VALUES(requested_by_employee_id),
                 requested_at = NOW(), reviewed_at = NULL, approved_by_employee_id = NULL, remarks = VALUES(remarks)`,
            [workOrderId, existing[0].work_order_no, payload.created_by_employee_id || existing[0].created_by_employee_id || null]
        );

        await conn.commit();
        return res.json({ success: true, message: 'Work order updated successfully' });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};

const reviewWorkOrder = async (req, res) => {
    const conn = connection.promise();
    try {
        await ensureWorkOrderSupport(conn);
        const workOrderId = req.params.work_order_id || req.body.work_order_id;
        const action = String(req.body.action || '').toUpperCase();
        if (!['IN_PROGRESS', 'COMPLETED', 'REJECTED'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Select a valid work order review action' });
        }
        await conn.beginTransaction();
        const [orders] = await conn.query('SELECT * FROM work_orders WHERE work_order_id = ? FOR UPDATE', [workOrderId]);
        if (!orders.length) throw new Error('Work order not found');
        if (orders[0].approval_status !== 'PENDING') throw new Error('Only pending work orders can be reviewed');

        if (action === 'COMPLETED') {
            if (orders[0].work_status !== 'COMPLETED') {
                throw new Error('Only a completed work order can receive completion approval');
            }
            await conn.query(
                "UPDATE work_orders SET approval_status = 'APPROVED', updated_at = NOW() WHERE work_order_id = ?",
                [workOrderId]
            );
        } else if (action === 'IN_PROGRESS') {
            await conn.query(
                "UPDATE work_orders SET approval_status = 'APPROVED', work_status = 'IN_PROGRESS', updated_at = NOW() WHERE work_order_id = ?",
                [workOrderId]
            );
        } else {
            await conn.query(
                "UPDATE work_orders SET approval_status = 'REJECTED', work_status = 'PENDING', updated_at = NOW() WHERE work_order_id = ?",
                [workOrderId]
            );
        }
        await conn.query("DELETE FROM workflow_approvals WHERE module_name = 'WORK_ORDER' AND reference_id = ?", [workOrderId]);
        await conn.commit();
        return res.json({
            success: true,
            message: action === 'COMPLETED'
                ? 'Completed work order approved successfully.'
                : action === 'IN_PROGRESS'
                    ? 'Work order moved to in progress. Material issue is now enabled.'
                    : 'Work order rejected and returned for update.'
        });
    } catch (error) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: error.message || 'Server error' });
    }
};

const addMaterialIssue = async (req, res) => {
    const conn = connection.promise();
    try {
        await ensureWorkOrderSupport(conn);
        const payload = req.body;
        const workOrderId = payload.work_order_id || req.params.work_order_id;
        if (!workOrderId) return res.status(400).json({ success: false, message: 'work_order_id is required' });

        await conn.beginTransaction();

        const [orders] = await conn.query(
            'SELECT work_order_id, work_order_no, assigned_to_employee_id, created_by_employee_id, approval_status, work_status FROM work_orders WHERE work_order_id = ? FOR UPDATE',
            [workOrderId]
        );
        if (orders.length === 0) throw new Error('Work order not found');
        if (orders[0].approval_status !== 'APPROVED' || orders[0].work_status !== 'IN_PROGRESS') {
            throw new Error('Work order must be moved to in progress before material can be issued');
        }

        const issueProductId = await resolveProductId(conn, payload.material_id, payload.product_id);
        if (!issueProductId) throw new Error('Material is required');
        if (!(await isMaterialProduct(conn, issueProductId))) {
            throw new Error('Only material products can be issued from stock');
        }

        const issueMaterialId = await resolveMaterialId(conn, payload.material_id, issueProductId);
        if (!issueMaterialId) throw new Error('Material master entry not found for selected product');

        const issuedQty = toNumber(payload.issued_qty);
        if (issuedQty <= 0) throw new Error('Issued quantity is required');

        const [stock] = await conn.query('SELECT available_qty FROM stock_master WHERE product_id = ?', [issueProductId]);
        if (toNumber(stock[0]?.available_qty) <= 0) throw new Error('Material is out of stock');
        if (issuedQty > toNumber(stock[0]?.available_qty)) throw new Error('Issued quantity exceeds available stock');

        const issueNo = payload.issue_no || await createSequenceNo(conn, 'work_order_material_issues', 'issue_no', 'MI');
        const [issueResult] = await conn.query(
            `INSERT INTO work_order_material_issues (
                issue_no, work_order_id, material_id, product_id, issued_qty,
                issued_date, issued_to_employee_id, issued_by_employee_id, remarks
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                issueNo,
                workOrderId,
                issueMaterialId,
                issueProductId,
                issuedQty,
                toSqlDate(payload.issued_date) || toSqlDate(new Date().toISOString()),
                payload.issued_to_employee_id || orders[0].assigned_to_employee_id || null,
                payload.issued_by_employee_id || payload.created_by_employee_id || orders[0].created_by_employee_id || null,
                payload.remarks || null
            ]
        );

        await conn.query(
            `INSERT INTO workflow_approvals (module_name, reference_id, reference_no, workflow_status, requested_by_employee_id, remarks)
             VALUES ('MATERIAL_ISSUE', ?, ?, 'PENDING', ?, 'Material issue awaiting approval')
             ON DUPLICATE KEY UPDATE workflow_status = 'PENDING', requested_at = NOW(), reviewed_at = NULL,
                 approved_by_employee_id = NULL, remarks = VALUES(remarks)`,
            [workOrderId, `MI-${orders[0].work_order_no}`, payload.issued_by_employee_id || payload.created_by_employee_id || orders[0].created_by_employee_id || null]
        );

        await conn.commit();
        return res.status(201).json({ success: true, message: 'Material issue submitted for approval', issue_id: issueResult.insertId, issue_no: issueNo });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};

const submitMaterialIssueList = async (req, res) => {
    const conn = connection.promise();
    try {
        await ensureWorkOrderSupport(conn);
        const workOrderId = req.params.work_order_id || req.body.work_order_id;
        const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
        if (!rows.length) return res.status(400).json({ success: false, message: 'At least one material is required' });
        await conn.beginTransaction();
        const [orders] = await conn.query(
            'SELECT * FROM work_orders WHERE work_order_id = ? FOR UPDATE',
            [workOrderId]
        );
        if (!orders.length) throw new Error('Work order not found');
        const order = orders[0];
        if (order.approval_status !== 'APPROVED' || order.work_status !== 'IN_PROGRESS') {
            throw new Error('Work order must be in progress before submitting materials');
        }
        const [pending] = await conn.query(
            "SELECT COUNT(*) AS count FROM work_order_material_issues WHERE work_order_id = ? AND approval_status = 'PENDING'",
            [workOrderId]
        );
        if (Number(pending[0]?.count)) throw new Error('A material list is already awaiting admin review');

        for (const row of rows) {
            const productId = await resolveProductId(conn, row.material_id, row.product_id);
            const materialId = await resolveMaterialId(conn, row.material_id, productId);
            const qty = toNumber(row.issued_qty);
            if (!productId || !materialId || qty <= 0 || !(await isMaterialProduct(conn, productId))) {
                throw new Error('Every row requires a valid material and quantity');
            }
            const [stock] = await conn.query('SELECT available_qty FROM stock_master WHERE product_id = ?', [productId]);
            if (qty > toNumber(stock[0]?.available_qty)) throw new Error('A material quantity exceeds available stock');
            const issueNo = await createSequenceNo(conn, 'work_order_material_issues', 'issue_no', 'MI');
            await conn.query(
                `INSERT INTO work_order_material_issues (
                    issue_no, work_order_id, material_id, product_id, issued_qty, issued_date,
                    issued_to_employee_id, issued_by_employee_id, remarks, approval_status
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
                [issueNo, workOrderId, materialId, productId, qty,
                    toSqlDate(row.issued_date) || toSqlDate(new Date().toISOString()),
                    row.issued_to_employee_id || order.assigned_to_employee_id || null,
                    row.issued_by_employee_id || order.created_by_employee_id || null,
                    row.remarks || null]
            );
        }

        await conn.query(
            `INSERT INTO workflow_approvals (module_name, reference_id, reference_no, workflow_status, requested_by_employee_id, remarks)
             VALUES ('MATERIAL_ISSUE', ?, ?, 'PENDING', ?, 'Material issue list awaiting approval')
             ON DUPLICATE KEY UPDATE workflow_status = 'PENDING', requested_at = NOW(), reviewed_at = NULL,
                 approved_by_employee_id = NULL, remarks = VALUES(remarks)`,
            [workOrderId, `MI-${order.work_order_no}`, req.body.issued_by_employee_id || order.created_by_employee_id || null]
        );
        await conn.commit();
        return res.status(201).json({ success: true, message: 'Material list submitted for admin review' });
    } catch (error) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: error.message || 'Server error' });
    }
};

const reviewMaterialIssueList = async (req, res) => {
    const conn = connection.promise();
    try {
        await ensureWorkOrderSupport(conn);
        const workOrderId = req.params.work_order_id || req.body.work_order_id;
        const action = String(req.body.action || '').toUpperCase();
        if (!['ACCEPTED', 'REJECTED'].includes(action)) return res.status(400).json({ success: false, message: 'Invalid review action' });
        await conn.beginTransaction();
        const [issues] = await conn.query(
            "SELECT * FROM work_order_material_issues WHERE work_order_id = ? AND approval_status = 'PENDING' ORDER BY issue_id FOR UPDATE",
            [workOrderId]
        );
        if (!issues.length) throw new Error('No pending material list found');

        if (action === 'ACCEPTED') {
            for (const issue of issues) {
                const [stock] = await conn.query('SELECT available_qty FROM stock_master WHERE product_id = ? FOR UPDATE', [issue.product_id]);
                const currentQty = toNumber(stock[0]?.available_qty);
                const qty = toNumber(issue.issued_qty);
                if (currentQty < qty) throw new Error(`Insufficient stock for ${issue.issue_no}`);
                await conn.query('UPDATE stock_master SET available_qty = available_qty - ?, last_stock_check_date = CURDATE() WHERE product_id = ?', [qty, issue.product_id]);
                await conn.query(
                    `INSERT INTO stock_ledger (product_id, transaction_type, transaction_id, reference_no, qty_in, qty_out, balance_qty, remarks, recorded_by_employee_id)
                     VALUES (?, 'INSTALLATION', ?, ?, 0, ?, ?, ?, ?)`,
                    [issue.product_id, issue.issue_id, issue.issue_no, qty, currentQty - qty, issue.remarks || 'Material issue accepted', req.body.reviewed_by_employee_id || null]
                );
            }
            await conn.query(
                "UPDATE work_order_material_issues SET approval_status = 'APPROVED', approved_by_employee_id = ?, approved_at = NOW() WHERE work_order_id = ? AND approval_status = 'PENDING'",
                [req.body.reviewed_by_employee_id || null, workOrderId]
            );
        } else {
            await conn.query("DELETE FROM work_order_material_issues WHERE work_order_id = ? AND approval_status = 'PENDING'", [workOrderId]);
        }
        await conn.query("DELETE FROM workflow_approvals WHERE module_name = 'MATERIAL_ISSUE' AND reference_id = ?", [workOrderId]);
        await conn.commit();
        return res.json({ success: true, message: action === 'ACCEPTED' ? 'Material list accepted and stock issued' : 'Material list rejected for correction' });
    } catch (error) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: error.message || 'Server error' });
    }
};

const deleteWorkOrder = async (req, res) => {
    const conn = connection.promise();
    try {
        await ensureWorkOrderSupport(conn);
        const workOrderId = req.params.work_order_id || req.body.work_order_id;
        const [issues] = await conn.query("SELECT COUNT(*) AS count FROM work_order_material_issues WHERE work_order_id = ? AND approval_status = 'APPROVED'", [workOrderId]);
        if (Number(issues[0]?.count)) return res.status(400).json({ success: false, message: 'Work order with approved material issues cannot be deleted' });
        await conn.beginTransaction();
        await conn.query("DELETE FROM workflow_approvals WHERE (module_name = 'WORK_ORDER' AND reference_id = ?) OR (module_name = 'MATERIAL_ISSUE' AND reference_id IN (SELECT issue_id FROM work_order_material_issues WHERE work_order_id = ?))", [workOrderId, workOrderId]);
        const [result] = await conn.query('DELETE FROM work_orders WHERE work_order_id = ?', [workOrderId]);
        if (!result.affectedRows) throw new Error('Work order not found');
        await conn.commit();
        return res.json({ success: true, message: 'Work order deleted successfully' });
    } catch (error) {
        await conn.rollback();
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};

const addMaterialReturn = async (req, res) => {
    const conn = connection.promise();
    try {
        await ensureWorkOrderSupport(conn);
        const payload = req.body;
        const workOrderId = payload.work_order_id || req.params.work_order_id;
        await conn.beginTransaction();

        let issue = null;
        if (payload.issue_id) {
            const [issues] = await conn.query(
                'SELECT * FROM work_order_material_issues WHERE issue_id = ? AND work_order_id = ?',
                [payload.issue_id, workOrderId]
            );
            issue = issues[0] || null;
        }

        const returnNo = payload.return_no || await createSequenceNo(conn, 'work_order_material_returns', 'return_no', 'MR');
        const returnProductId = await resolveProductId(
            conn,
            payload.material_id || issue?.material_id,
            payload.product_id || issue?.product_id
        );
        const returnedQty = toNumber(payload.returned_qty);
        const [returnResult] = await conn.query(
            `INSERT INTO work_order_material_returns (
                return_no, issue_id, work_order_id, material_id, product_id, returned_qty,
                return_date, returned_by_employee_id, received_by_employee_id, condition_status, remarks
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [returnNo, payload.issue_id || null, workOrderId, payload.material_id || issue?.material_id || null, returnProductId, returnedQty, toSqlDate(payload.return_date) || toSqlDate(new Date().toISOString()), payload.returned_by_employee_id || null, payload.received_by_employee_id || null, payload.condition_status || 'GOOD', payload.remarks || null]
        );
        await postStockMovement(conn, {
            productId: returnProductId,
            transactionType: 'RETURN',
            transactionId: returnResult.insertId,
            referenceNo: returnNo,
            qtyIn: returnedQty,
            remarks: payload.remarks || `Material returned for work order ${workOrderId}`,
            employeeId: payload.received_by_employee_id || null
        });

        await conn.commit();
        return res.status(201).json({ success: true, message: 'Material return recorded successfully', return_no: returnNo });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};

const createInvoiceFromWorkOrder = async (req, res) => {
    const conn = connection.promise();
    try {
        await ensureWorkOrderSupport(conn);
        const workOrderId = req.body.work_order_id || req.params.work_order_id;
        await conn.beginTransaction();

        const [orders] = await conn.query('SELECT * FROM work_orders WHERE work_order_id = ? FOR UPDATE', [workOrderId]);
        if (orders.length === 0) throw new Error('Work order not found');
        if (orders[0].work_status !== 'COMPLETED' || orders[0].approval_status !== 'APPROVED') {
            throw new Error('Invoice can be created only after the completed work order is approved');
        }

        const [existingInvoice] = await conn.query('SELECT sales_id, invoice_no FROM sales_master WHERE work_order_id = ? LIMIT 1', [workOrderId]);
        if (existingInvoice.length > 0) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: `Invoice already created: ${existingInvoice[0].invoice_no}` });
        }

        const [items] = await conn.query('SELECT * FROM work_order_items WHERE work_order_id = ? ORDER BY line_no, work_order_item_id', [workOrderId]);
        if (items.length === 0) throw new Error('Work order has no invoice items');

        const summary = calculateSummary(items.map(normalizeWorkItem));
        const invoiceNo = req.body.invoice_no || await createSequenceNo(conn, 'sales_master', 'invoice_no', 'INV');

        const [invoice] = await conn.query(
            `INSERT INTO sales_master (
                invoice_no, invoice_date, customer_id, quotation_id, work_order_id,
                total_amount, discount_amount, discount_percent, tax_amount, net_amount,
                paid_amount, balance_amount, payment_mode, payment_status, sales_status,
                due_date, remarks, created_by_employee_id
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [invoiceNo, toSqlDate(req.body.invoice_date) || toSqlDate(new Date().toISOString()), orders[0].customer_id, orders[0].quotation_id || null, workOrderId, summary.total_amount, summary.discount_amount, 0, summary.tax_amount, summary.net_amount, 0, summary.net_amount, req.body.payment_mode || 'CREDIT', 'PENDING', 'DRAFT', toSqlDate(req.body.due_date), req.body.remarks || null, req.body.created_by_employee_id || null]
        );

        for (const item of items.map(normalizeWorkItem)) {
            await conn.query(
                `INSERT INTO sales_items (
                    sales_id, product_id, item_name, description, qty, selling_price,
                    discount_amount, discount_percent, tax_percent, tax_amount, amount, line_no
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [invoice.insertId, item.product_id, item.item_name, item.description, item.qty, item.selling_price, item.discount_amount, item.discount_percent, item.tax_percent, item.tax_amount, item.amount, item.line_no]
            );
        }

        await conn.commit();
        return res.status(201).json({ success: true, message: 'Invoice created from work order successfully', sales_id: invoice.insertId, invoice_no: invoiceNo });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });
    }
};

module.exports = {
    getMaterials,
    getNextWorkOrderNo,
    getWorkOrders,
    getWorkOrderById,
    addWorkOrder,
    updateWorkOrder,
    reviewWorkOrder,
    deleteWorkOrder,
    addMaterialIssue,
    submitMaterialIssueList,
    reviewMaterialIssueList,
    addMaterialReturn,
    createInvoiceFromWorkOrder
};
