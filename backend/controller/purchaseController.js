const connection = require('../connection');

const finalStatuses = ['RECEIVED', 'COMPLETED'];
const purchaseStatuses = ['DRAFT', 'RECEIVED', 'COMPLETED', 'CANCELLED'];
const paymentStatuses = ['PENDING', 'PARTIAL', 'PAID'];

const toNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const toSqlDate = (value) => {
    if (!value) return null;
    return String(value).slice(0, 10);
};

const isFutureDate = (value) => {
    if (!value) return false;
    const input = new Date(`${toSqlDate(value)}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return input > today;
};

const calculateLine = (item) => {
    const qty = toNumber(item.qty);
    const purchasePrice = toNumber(item.purchase_price);
    const gross = qty * purchasePrice;
    const discountPercent = toNumber(item.discount_percent);
    const discountAmount = item.discount_amount !== undefined
        ? toNumber(item.discount_amount)
        : gross * discountPercent / 100;
    const taxable = Math.max(gross - discountAmount, 0);
    const taxPercent = toNumber(item.tax_percent);
    const taxAmount = item.tax_amount !== undefined
        ? toNumber(item.tax_amount)
        : taxable * taxPercent / 100;
    const amount = item.amount !== undefined
        ? toNumber(item.amount)
        : taxable + taxAmount;

    return {
        product_id: Number(item.product_id),
        qty,
        purchase_price: purchasePrice,
        discount_amount: discountAmount,
        discount_percent: discountPercent,
        tax_percent: taxPercent,
        tax_amount: taxAmount,
        amount,
        received_qty: item.received_qty !== undefined ? toNumber(item.received_qty) : qty,
        remarks: item.remarks || null
    };
};

const calculateSummary = (items, discountAmount = 0, discountPercent = 0, paidAmount = 0) => {
    const totalAmount = items.reduce((sum, item) => sum + item.qty * item.purchase_price, 0);
    const lineDiscount = items.reduce((sum, item) => sum + item.discount_amount, 0);
    const headerDiscount = toNumber(discountAmount) || (totalAmount * toNumber(discountPercent) / 100);
    const taxAmount = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const netAmount = Math.max(totalAmount - lineDiscount - headerDiscount + taxAmount, 0);
    const paid = toNumber(paidAmount);

    return {
        total_amount: totalAmount,
        discount_amount: headerDiscount,
        discount_percent: toNumber(discountPercent),
        tax_amount: taxAmount,
        net_amount: netAmount,
        paid_amount: paid,
        balance_amount: netAmount - paid,
        payment_status: paid <= 0 ? 'PENDING' : paid >= netAmount ? 'PAID' : 'PARTIAL'
    };
};

const validatePurchase = (payload, items) => {
    const errors = [];

    if (!payload.supplier_id) errors.push('Supplier is required');
    if (!payload.purchase_date) errors.push('Purchase date is required');
    if (isFutureDate(payload.purchase_date)) errors.push('Purchase date cannot be in future');
    if (payload.invoice_date && isFutureDate(payload.invoice_date)) errors.push('Invoice date cannot be in future');
    if (payload.received_date && isFutureDate(payload.received_date)) errors.push('Received date cannot be in future');

    if (payload.purchase_status && !purchaseStatuses.includes(payload.purchase_status)) {
        errors.push('Invalid purchase status');
    }

    if (payload.payment_status && !paymentStatuses.includes(payload.payment_status)) {
        errors.push('Invalid payment status');
    }

    if (!items.length) errors.push('At least one purchase item is required');

    items.forEach((item, index) => {
        if (!item.product_id) errors.push(`Product is required in item ${index + 1}`);
        if (item.qty <= 0) errors.push(`Quantity must be greater than 0 in item ${index + 1}`);
        if (item.purchase_price < 0) errors.push(`Purchase price cannot be negative in item ${index + 1}`);
    });

    return errors;
};

const ensureStockTables = async () => {
    const conn = connection.promise();

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
};

const getNextPurchaseNo = async (req, res) => {
    try {
        const prefix = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-`;
        const [rows] = await connection.promise().query(
            'SELECT purchase_no FROM purchase_master WHERE purchase_no LIKE ? ORDER BY purchase_no DESC LIMIT 1',
            [`${prefix}%`]
        );
        const last = rows[0]?.purchase_no || '';
        const nextNumber = String((Number(last.replace(prefix, '')) || 0) + 1).padStart(4, '0');

        return res.json({ success: true, purchase_no: `${prefix}${nextNumber}` });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const createPurchaseNo = async (conn) => {
    const prefix = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-`;
    const [rows] = await conn.query(
        'SELECT purchase_no FROM purchase_master WHERE purchase_no LIKE ? ORDER BY purchase_no DESC LIMIT 1',
        [`${prefix}%`]
    );
    const last = rows[0]?.purchase_no || '';
    const nextNumber = String((Number(last.replace(prefix, '')) || 0) + 1).padStart(4, '0');
    return `${prefix}${nextNumber}`;
};

const getPurchases = async (req, res) => {
    try {
        const [rows] = await connection.promise().query(
            `SELECT pm.purchase_id, pm.purchase_no, pm.supplier_id, s.supplier_name,
                    pm.invoice_no, pm.invoice_date, pm.purchase_date, pm.total_amount,
                    pm.discount_amount, pm.discount_percent, pm.tax_amount, pm.net_amount,
                    pm.paid_amount, pm.balance_amount, pm.purchase_status, pm.payment_status,
                    pm.remarks, pm.received_date, pm.created_by_employee_id, pm.created_at, pm.updated_at,
                    COALESCE(item_counts.item_count, 0) AS item_count,
                    COALESCE(item_counts.total_qty, 0) AS total_qty,
                    COALESCE(item_counts.total_received_qty, 0) AS total_received_qty
             FROM purchase_master pm
             JOIN suppliers s ON s.supplier_id = pm.supplier_id
             LEFT JOIN (
                SELECT purchase_id,
                       COUNT(*) AS item_count,
                       SUM(qty) AS total_qty,
                       SUM(received_qty) AS total_received_qty
                FROM purchase_items
                GROUP BY purchase_id
             ) item_counts ON item_counts.purchase_id = pm.purchase_id
             ORDER BY pm.purchase_id DESC`
        );

        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getPurchaseById = async (req, res) => {
    try {
        const { purchase_id } = req.params;

        const [purchases] = await connection.promise().query(
            `SELECT pm.*, s.supplier_name
             FROM purchase_master pm
             JOIN suppliers s ON s.supplier_id = pm.supplier_id
             WHERE pm.purchase_id = ?`,
            [purchase_id]
        );

        if (purchases.length === 0) {
            return res.status(404).json({ success: false, message: 'Purchase not found' });
        }

        const [items] = await connection.promise().query(
            `SELECT pi.*, p.product_name, p.product_code, p.gst_percent
             FROM purchase_items pi
             JOIN products p ON p.product_id = pi.product_id
             WHERE pi.purchase_id = ?
             ORDER BY pi.purchase_item_id`,
            [purchase_id]
        );

        return res.json({ success: true, data: { ...purchases[0], items } });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const applyStockReceipt = async (conn, purchaseId, purchaseNo, items, employeeId) => {
    const expectedByProduct = new Map();

    for (const item of items) {
        const receivedQty = toNumber(item.received_qty || item.qty);
        const current = expectedByProduct.get(item.product_id) || {
            product_id: item.product_id,
            received_qty: 0,
            purchase_price: item.purchase_price,
            remarks: item.remarks
        };
        current.received_qty += receivedQty;
        current.purchase_price = item.purchase_price;
        current.remarks = item.remarks;
        expectedByProduct.set(item.product_id, current);
    }

    const [postedRows] = await conn.query(
        `SELECT product_id, SUM(qty_in - qty_out) AS posted_qty
         FROM stock_ledger
         WHERE transaction_type = 'PURCHASE'
           AND transaction_id = ?
         GROUP BY product_id`,
        [purchaseId]
    );

    const postedByProduct = new Map(postedRows.map((row) => [
        Number(row.product_id),
        toNumber(row.posted_qty)
    ]));

    const productIds = new Set([
        ...expectedByProduct.keys(),
        ...postedByProduct.keys()
    ]);

    for (const productId of productIds) {
        const expected = expectedByProduct.get(productId) || {
            product_id: productId,
            received_qty: 0,
            purchase_price: null,
            remarks: null
        };
        const postedQty = postedByProduct.get(productId) || 0;
        const deltaQty = expected.received_qty - postedQty;

        if (Math.abs(deltaQty) < 0.0001) continue;

        const [existingStock] = await conn.query(
            'SELECT stock_id, available_qty FROM stock_master WHERE product_id = ? FOR UPDATE',
            [productId]
        );
        const currentQty = toNumber(existingStock[0]?.available_qty);
        const nextQty = currentQty + deltaQty;

        if (nextQty < 0) {
            throw new Error(`Stock cannot go negative for product ${productId}`);
        }

        if (existingStock.length === 0) {
            await conn.query(
                `INSERT INTO stock_master (product_id, available_qty, last_purchase_price, last_stock_check_date)
                 VALUES (?, ?, ?, CURDATE())`,
                [productId, nextQty, expected.purchase_price]
            );
        } else {
            await conn.query(
                `UPDATE stock_master
                 SET available_qty = ?, last_purchase_price = ?, last_stock_check_date = CURDATE(), last_updated = NOW()
                 WHERE product_id = ?`,
                [nextQty, expected.purchase_price, productId]
            );
        }

        await conn.query(
            `INSERT INTO stock_ledger (
                product_id, transaction_type, transaction_id, reference_no, qty_in,
                qty_out, balance_qty, unit_cost, remarks, recorded_by_employee_id
             ) VALUES (?, 'PURCHASE', ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                productId,
                purchaseId,
                purchaseNo,
                deltaQty > 0 ? deltaQty : 0,
                deltaQty < 0 ? Math.abs(deltaQty) : 0,
                nextQty,
                expected.purchase_price,
                expected.remarks || 'Purchase receipt reconciliation',
                employeeId || null
            ]
        );
    }
};

const addPurchase = async (req, res) => {
    const conn = connection.promise();

    try {
        const payload = req.body;
        const items = (payload.items || []).map(calculateLine);
        const errors = validatePurchase(payload, items);

        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        if (finalStatuses.includes(payload.purchase_status || 'DRAFT')) {
            await ensureStockTables();
        }

        await conn.beginTransaction();

        const purchaseNo = payload.purchase_no || await createPurchaseNo(conn);
        const summary = calculateSummary(items, payload.discount_amount, payload.discount_percent, payload.paid_amount);
        const purchaseStatus = payload.purchase_status || 'DRAFT';
        const receivedDate = payload.received_date || (finalStatuses.includes(purchaseStatus) ? toSqlDate(new Date().toISOString()) : null);

        const [result] = await conn.query(
            `INSERT INTO purchase_master (
                purchase_no, supplier_id, invoice_no, invoice_date, purchase_date,
                total_amount, discount_amount, discount_percent, tax_amount, net_amount,
                paid_amount, balance_amount, purchase_status, payment_status, remarks,
                received_date, created_by_employee_id
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                purchaseNo,
                payload.supplier_id,
                payload.invoice_no || null,
                toSqlDate(payload.invoice_date),
                toSqlDate(payload.purchase_date),
                summary.total_amount,
                summary.discount_amount,
                summary.discount_percent,
                summary.tax_amount,
                summary.net_amount,
                summary.paid_amount,
                summary.balance_amount,
                purchaseStatus,
                payload.payment_status || summary.payment_status,
                payload.remarks || null,
                toSqlDate(receivedDate),
                payload.created_by_employee_id || null
            ]
        );

        for (const item of items) {
            await conn.query(
                `INSERT INTO purchase_items (
                    purchase_id, product_id, qty, purchase_price, discount_amount,
                    discount_percent, tax_percent, tax_amount, amount, received_qty, remarks
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    result.insertId,
                    item.product_id,
                    item.qty,
                    item.purchase_price,
                    item.discount_amount,
                    item.discount_percent,
                    item.tax_percent,
                    item.tax_amount,
                    item.amount,
                    item.received_qty,
                    item.remarks
                ]
            );
        }

        if (finalStatuses.includes(purchaseStatus)) {
            await applyStockReceipt(conn, result.insertId, purchaseNo, items, payload.created_by_employee_id);
        }

        await conn.commit();
        return res.status(201).json({ success: true, message: 'Purchase added successfully', purchase_id: result.insertId, purchase_no: purchaseNo });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    } finally {
    }
};

const updatePurchase = async (req, res) => {
    const conn = connection.promise();

    try {
        const payload = req.body;
        const purchaseId = payload.purchase_id;
        const items = (payload.items || []).map(calculateLine);

        if (!purchaseId) {
            return res.status(400).json({ success: false, message: 'purchase_id is required' });
        }

        const errors = validatePurchase(payload, items);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        if (finalStatuses.includes(payload.purchase_status)) {
            await ensureStockTables();
        }

        await conn.beginTransaction();

        const [existing] = await conn.query('SELECT * FROM purchase_master WHERE purchase_id = ? FOR UPDATE', [purchaseId]);
        if (existing.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Purchase not found' });
        }

        const purchaseStatus = payload.purchase_status || existing[0].purchase_status;
        const summary = calculateSummary(items, payload.discount_amount, payload.discount_percent, payload.paid_amount);
        const receivedDate = payload.received_date || (finalStatuses.includes(purchaseStatus) ? toSqlDate(new Date().toISOString()) : null);

        await conn.query(
            `UPDATE purchase_master SET
                supplier_id = ?, invoice_no = ?, invoice_date = ?, purchase_date = ?,
                total_amount = ?, discount_amount = ?, discount_percent = ?, tax_amount = ?,
                net_amount = ?, paid_amount = ?, balance_amount = ?, purchase_status = ?,
                payment_status = ?, remarks = ?, received_date = ?, created_by_employee_id = ?,
                updated_at = NOW()
             WHERE purchase_id = ?`,
            [
                payload.supplier_id,
                payload.invoice_no || null,
                toSqlDate(payload.invoice_date),
                toSqlDate(payload.purchase_date),
                summary.total_amount,
                summary.discount_amount,
                summary.discount_percent,
                summary.tax_amount,
                summary.net_amount,
                summary.paid_amount,
                summary.balance_amount,
                purchaseStatus,
                payload.payment_status || summary.payment_status,
                payload.remarks || null,
                toSqlDate(receivedDate),
                payload.created_by_employee_id || null,
                purchaseId
            ]
        );

        await conn.query('DELETE FROM purchase_items WHERE purchase_id = ?', [purchaseId]);

        for (const item of items) {
            await conn.query(
                `INSERT INTO purchase_items (
                    purchase_id, product_id, qty, purchase_price, discount_amount,
                    discount_percent, tax_percent, tax_amount, amount, received_qty, remarks
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    purchaseId,
                    item.product_id,
                    item.qty,
                    item.purchase_price,
                    item.discount_amount,
                    item.discount_percent,
                    item.tax_percent,
                    item.tax_amount,
                    item.amount,
                    item.received_qty,
                    item.remarks
                ]
            );
        }

        if (finalStatuses.includes(purchaseStatus)) {
            await applyStockReceipt(conn, purchaseId, existing[0].purchase_no, items, payload.created_by_employee_id);
        }

        await conn.commit();
        return res.json({ success: true, message: 'Purchase updated successfully' });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    } finally {
    }
};

const deletePurchase = async (req, res) => {
    try {
        const { purchase_id } = req.body;
        if (!purchase_id) return res.status(400).json({ success: false, message: 'purchase_id is required' });

        await ensureStockTables();

        const [ledger] = await connection.promise().query(
            'SELECT stock_ledger_id FROM stock_ledger WHERE transaction_type = ? AND transaction_id = ? LIMIT 1',
            ['PURCHASE', purchase_id]
        );

        if (ledger.length > 0) {
            return res.status(400).json({ success: false, message: 'Received purchases cannot be deleted after stock update' });
        }

        await connection.promise().query('DELETE FROM purchase_master WHERE purchase_id = ?', [purchase_id]);
        return res.json({ success: true, message: 'Purchase deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getPurchases,
    getPurchaseById,
    getNextPurchaseNo,
    addPurchase,
    updatePurchase,
    deletePurchase
};
