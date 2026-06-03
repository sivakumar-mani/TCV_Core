const connection = require('../connection');

const db = connection.promise();

const MODULE_CONFIG = {
    PURCHASE: {
        table: 'purchase_master',
        idColumn: 'purchase_id',
        statusColumn: 'purchase_status',
        numberColumn: 'purchase_no',
        prefix: 'PUR'
    },
    QUOTATION: {
        table: 'quotation_master',
        idColumn: 'quotation_id',
        statusColumn: 'quotation_status',
        numberColumn: 'quotation_no',
        prefix: 'QUO'
    },
    WORK_ORDER: {
        table: 'work_orders',
        idColumn: 'work_order_id',
        statusColumn: 'work_status',
        numberColumn: 'work_order_no',
        prefix: 'WO'
    },
    MATERIAL_ISSUE: {
        table: 'material_issue_master',
        idColumn: 'material_issue_id',
        statusColumn: 'issue_status',
        numberColumn: 'issue_no',
        prefix: 'MI'
    },
    MATERIAL_RETURN: {
        table: 'material_return_master',
        idColumn: 'material_return_id',
        statusColumn: 'return_status',
        numberColumn: 'return_no',
        prefix: 'MR'
    },
    SALES: {
        table: 'sales_master',
        idColumn: 'sales_id',
        statusColumn: 'sales_status',
        numberColumn: 'invoice_no',
        prefix: 'INV'
    },
    PRODUCT_PRICE: {
        table: 'product_price_history',
        idColumn: 'price_history_id',
        statusColumn: 'approval_status',
        prefix: 'PP'
    }
};

const getFinancialYear = (date = new Date()) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

const normalizeModule = (moduleName) => (moduleName || '').toUpperCase();

const getModuleConfig = (moduleName) => {
    const config = MODULE_CONFIG[normalizeModule(moduleName)];
    if (!config) {
        throw new Error('Invalid module_name');
    }
    return config;
};

const generateDocumentNumber = async (moduleName) => {
    const moduleCode = normalizeModule(moduleName);
    const config = getModuleConfig(moduleCode);
    const financialYear = getFinancialYear();

    await db.beginTransaction();
    try {
        const [rows] = await db.query(
            'SELECT * FROM number_series WHERE module_code = ? AND financial_year = ? FOR UPDATE',
            [moduleCode, financialYear]
        );

        let nextNumber = 1;
        let paddingLength = 5;
        let prefix = config.prefix;

        if (rows.length === 0) {
            await db.query(
                'INSERT INTO number_series (module_code, prefix, financial_year, next_number, padding_length) VALUES (?, ?, ?, ?, ?)',
                [moduleCode, prefix, financialYear, 2, paddingLength]
            );
        } else {
            nextNumber = rows[0].next_number;
            paddingLength = rows[0].padding_length;
            prefix = rows[0].prefix;
            await db.query(
                'UPDATE number_series SET next_number = next_number + 1 WHERE series_id = ?',
                [rows[0].series_id]
            );
        }

        await db.commit();
        return `${prefix}-${financialYear}-${String(nextNumber).padStart(paddingLength, '0')}`;
    } catch (error) {
        await db.rollback();
        throw error;
    }
};

const updateStock = async ({
    productId,
    transactionType,
    transactionId,
    sourceTable,
    sourceItemId,
    referenceNo,
    qtyIn = 0,
    qtyOut = 0,
    remarks = null,
    createdBy = null
}) => {
    const stockDelta = Number(qtyIn || 0) - Number(qtyOut || 0);

    const [stockRows] = await db.query(
        'SELECT available_qty FROM stock_master WHERE product_id = ? FOR UPDATE',
        [productId]
    );

    let balanceQty = stockDelta;

    if (stockRows.length === 0) {
        if (balanceQty < 0) {
            throw new Error('Insufficient stock');
        }
        await db.query(
            'INSERT INTO stock_master (product_id, available_qty, remarks) VALUES (?, ?, ?)',
            [productId, balanceQty, remarks]
        );
    } else {
        balanceQty = Number(stockRows[0].available_qty || 0) + stockDelta;
        if (balanceQty < 0) {
            throw new Error('Insufficient stock');
        }
        await db.query(
            'UPDATE stock_master SET available_qty = ?, remarks = ? WHERE product_id = ?',
            [balanceQty, remarks, productId]
        );
    }

    await db.query(
        `INSERT INTO stock_ledger
            (product_id, transaction_type, transaction_id, source_table, source_item_id, reference_no, qty_in, qty_out, balance_qty, remarks, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [productId, transactionType, transactionId, sourceTable, sourceItemId, referenceNo, qtyIn, qtyOut, balanceQty, remarks, createdBy]
    );

    return balanceQty;
};

module.exports = {
    MODULE_CONFIG,
    db,
    generateDocumentNumber,
    getModuleConfig,
    normalizeModule,
    updateStock
};
