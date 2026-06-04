const connection = require('../connection');

const db = connection.promise();

const getProductColumnInfo = async () => {
    const [columns] = await db.query('SHOW COLUMNS FROM products');
    const columnNames = columns.map((column) => column.Field);
    return {
        hasProductCode: columnNames.includes('product_code'),
        hasUnit: columnNames.includes('unit'),
        hasReorderLevel: columnNames.includes('reorder_level'),
        hasPurchasePrice: columnNames.includes('purchase_price'),
        hasSellingPrice: columnNames.includes('selling_price'),
        hasPrice: columnNames.includes('price')
    };
};

const getStockSummary = async (req, res) => {
    try {
        const productColumns = await getProductColumnInfo();
        const purchasePriceSelect = productColumns.hasPurchasePrice ? 'p.purchase_price' : '0 AS purchase_price';
        const sellingPriceSelect = productColumns.hasSellingPrice
            ? 'p.selling_price'
            : productColumns.hasPrice
                ? 'p.price AS selling_price'
                : '0 AS selling_price';
        const productCodeSelect = productColumns.hasProductCode ? 'p.product_code' : 'NULL AS product_code';
        const unitSelect = productColumns.hasUnit ? 'p.unit' : "'PCS' AS unit";
        const minimumStockSelect = productColumns.hasReorderLevel
            ? 'COALESCE(sm.minimum_stock, p.reorder_level, 0) AS minimum_stock'
            : 'COALESCE(sm.minimum_stock, 0) AS minimum_stock';

        const [rows] = await db.query(
            `SELECT
                p.product_id,
                ${productCodeSelect},
                p.product_name,
                ${unitSelect},
                ${purchasePriceSelect},
                ${sellingPriceSelect},
                COALESCE(sm.available_qty, 0) AS available_qty,
                ${minimumStockSelect},
                sm.maximum_stock,
                sm.last_updated
             FROM products p
             LEFT JOIN stock_master sm ON sm.product_id = p.product_id
             ORDER BY p.product_name`
        );

        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch stock summary', error: error.message });
    }
};

const getStockLedger = async (req, res) => {
    try {
        const productColumns = await getProductColumnInfo();
        const productCodeSelect = productColumns.hasProductCode ? 'p.product_code' : 'NULL AS product_code';
        const values = [];
        let whereClause = '';

        if (req.query.product_id) {
            whereClause = 'WHERE sl.product_id = ?';
            values.push(req.query.product_id);
        }

        const [rows] = await db.query(
            `SELECT
                sl.*,
                p.product_name,
                ${productCodeSelect},
                u.username AS created_by_name
             FROM stock_ledger sl
             LEFT JOIN products p ON p.product_id = sl.product_id
             LEFT JOIN users u ON u.user_id = sl.created_by
             ${whereClause}
             ORDER BY sl.transaction_date DESC, sl.stock_ledger_id DESC`,
            values
        );

        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch stock ledger', error: error.message });
    }
};

module.exports = { getStockLedger, getStockSummary };
