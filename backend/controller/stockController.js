const connection = require('../connection');

const transactionTypes = ['PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'INSTALLATION', 'SCRAP'];

const toNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
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

const getStock = async (req, res) => {
    try {
        await ensureStockTables();

        const [rows] = await connection.promise().query(
            `SELECT sm.stock_id, sm.product_id, p.product_name, p.product_code, p.unit,
                    p.brand_id, b.brand_name, p.category_id,
                    sm.available_qty, sm.reserved_qty,
                    (sm.available_qty - sm.reserved_qty) AS free_qty,
                    sm.minimum_stock, sm.maximum_stock, sm.reorder_qty,
                    sm.last_purchase_price, sm.last_sale_price, sm.last_stock_check_date,
                    sm.remarks, sm.last_updated,
                    CASE
                        WHEN sm.available_qty <= sm.minimum_stock THEN 'LOW'
                        WHEN sm.maximum_stock > 0 AND sm.available_qty >= sm.maximum_stock THEN 'OVER'
                        ELSE 'OK'
                    END AS stock_status
             FROM stock_master sm
             JOIN products p ON p.product_id = sm.product_id
             LEFT JOIN brands b ON b.brand_id = p.brand_id
             ORDER BY p.product_name`
        );

        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getLedger = async (req, res) => {
    try {
        await ensureStockTables();

        const { product_id } = req.query;
        const params = [];
        let whereClause = '';

        if (product_id) {
            whereClause = 'WHERE sl.product_id = ?';
            params.push(product_id);
        }

        const [rows] = await connection.promise().query(
            `SELECT sl.stock_ledger_id, sl.product_id, p.product_name, p.product_code,
                    sl.transaction_type, sl.transaction_id, sl.reference_no,
                    sl.qty_in, sl.qty_out, sl.balance_qty, sl.unit_cost,
                    sl.remarks, sl.recorded_by_employee_id, sl.transaction_date, sl.created_at
             FROM stock_ledger sl
             JOIN products p ON p.product_id = sl.product_id
             ${whereClause}
             ORDER BY sl.stock_ledger_id DESC
             LIMIT 500`,
            params
        );

        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const upsertStockSettings = async (req, res) => {
    try {
        await ensureStockTables();

        const {
            product_id,
            minimum_stock,
            maximum_stock,
            reorder_qty,
            reserved_qty,
            remarks
        } = req.body;

        if (!product_id) {
            return res.status(400).json({ success: false, message: 'product_id is required' });
        }

        await connection.promise().query(
            `INSERT INTO stock_master (
                product_id, available_qty, reserved_qty, minimum_stock, maximum_stock, reorder_qty,
                remarks, last_stock_check_date
             ) VALUES (?, 0, ?, ?, ?, ?, ?, CURDATE())
             ON DUPLICATE KEY UPDATE
                reserved_qty = VALUES(reserved_qty),
                minimum_stock = VALUES(minimum_stock),
                maximum_stock = VALUES(maximum_stock),
                reorder_qty = VALUES(reorder_qty),
                remarks = VALUES(remarks),
                last_stock_check_date = CURDATE(),
                last_updated = NOW()`,
            [
                product_id,
                toNumber(reserved_qty),
                toNumber(minimum_stock),
                toNumber(maximum_stock),
                toNumber(reorder_qty),
                remarks || null
            ]
        );

        return res.json({ success: true, message: 'Stock settings updated successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const adjustStock = async (req, res) => {
    const conn = connection.promise();

    try {
        await ensureStockTables();

        const {
            product_id,
            transaction_type = 'ADJUSTMENT',
            qty_in,
            qty_out,
            unit_cost,
            reference_no,
            remarks,
            recorded_by_employee_id
        } = req.body;

        if (!product_id) {
            return res.status(400).json({ success: false, message: 'Product is required' });
        }

        if (!transactionTypes.includes(transaction_type)) {
            return res.status(400).json({ success: false, message: 'Invalid transaction type' });
        }

        const inQty = toNumber(qty_in);
        const outQty = toNumber(qty_out);

        if (inQty <= 0 && outQty <= 0) {
            return res.status(400).json({ success: false, message: 'Enter stock in or stock out quantity' });
        }

        if (inQty > 0 && outQty > 0) {
            return res.status(400).json({ success: false, message: 'Use either stock in or stock out, not both' });
        }

        if (!remarks) {
            return res.status(400).json({ success: false, message: 'Adjustment reason is required' });
        }

        await conn.beginTransaction();

        await conn.query(
            `INSERT INTO stock_master (product_id, available_qty, last_stock_check_date)
             VALUES (?, 0, CURDATE())
             ON DUPLICATE KEY UPDATE last_stock_check_date = CURDATE()`,
            [product_id]
        );

        const [stockRows] = await conn.query(
            'SELECT stock_id, available_qty FROM stock_master WHERE product_id = ? FOR UPDATE',
            [product_id]
        );

        const currentQty = toNumber(stockRows[0]?.available_qty);
        const nextQty = currentQty + inQty - outQty;

        if (nextQty < 0) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'Stock cannot go negative' });
        }

        await conn.query(
            `UPDATE stock_master
             SET available_qty = ?, last_purchase_price = COALESCE(?, last_purchase_price),
                 last_stock_check_date = CURDATE(), last_updated = NOW()
             WHERE product_id = ?`,
            [nextQty, unit_cost || null, product_id]
        );

        await conn.query(
            `INSERT INTO stock_ledger (
                product_id, transaction_type, transaction_id, reference_no,
                qty_in, qty_out, balance_qty, unit_cost, remarks, recorded_by_employee_id
             ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
            [
                product_id,
                transaction_type,
                reference_no || null,
                inQty,
                outQty,
                nextQty,
                unit_cost || null,
                remarks,
                recorded_by_employee_id || null
            ]
        );

        await conn.commit();
        return res.json({ success: true, message: 'Stock adjusted successfully' });
    } catch (error) {
        await conn.rollback();
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getStock,
    getLedger,
    upsertStockSettings,
    adjustStock
};
