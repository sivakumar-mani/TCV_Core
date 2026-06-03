const {
    db,
    generateDocumentNumber,
    updateStock
} = require('../services/workflowService');

const getPurchases = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT pm.*, s.supplier_name
             FROM purchase_master pm
             LEFT JOIN suppliers s ON s.supplier_id = pm.supplier_id
             ORDER BY pm.created_at DESC`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch purchases', error: error.message });
    }
};

const getPurchaseItems = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT pi.*, p.product_name, p.product_code, p.selling_price
             FROM purchase_items pi
             LEFT JOIN products p ON p.product_id = pi.product_id
             WHERE pi.purchase_id = ?
             ORDER BY pi.purchase_item_id DESC`,
            [req.params.purchase_id]
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch purchase items', error: error.message });
    }
};

const addPurchase = async (req, res) => {
    const {
        supplier_id,
        invoice_no,
        invoice_date,
        total_amount = 0,
        discount_amount = 0,
        tax_amount = 0,
        net_amount = 0,
        paid_amount = 0,
        balance_amount = 0,
        payment_status = 'PENDING',
        remarks
    } = req.body;

    if (!supplier_id) {
        return res.status(400).json({ success: false, message: 'supplier_id is required' });
    }

    try {
        const purchaseNo = req.body.purchase_no || await generateDocumentNumber('PURCHASE');

        const [result] = await db.query(
            `INSERT INTO purchase_master
                (purchase_no, supplier_id, invoice_no, invoice_date, total_amount, discount_amount, tax_amount, net_amount, paid_amount, balance_amount, purchase_status, payment_status, remarks)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?)`,
            [purchaseNo, supplier_id, invoice_no || null, invoice_date || null, total_amount, discount_amount, tax_amount, net_amount, paid_amount, balance_amount, payment_status, remarks || null]
        );

        return res.status(201).json({ success: true, message: 'Purchase created', purchase_id: result.insertId, purchase_no: purchaseNo });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create purchase', error: error.message });
    }
};

const addPurchaseItem = async (req, res) => {
    const purchaseId = req.body.purchase_id || req.params.purchase_id;
    const {
        product_id,
        qty,
        purchase_price,
        discount_amount = 0,
        tax_percent = 0,
        tax_amount = 0,
        amount,
        selling_price,
        remarks
    } = req.body;
    const createdBy = res.locals.user_id || res.locals.userId || null;

    if (!purchaseId || !product_id || !qty || !purchase_price) {
        return res.status(400).json({ success: false, message: 'purchase_id, product_id, qty and purchase_price are required' });
    }

    try {
        await db.beginTransaction();

        const [purchases] = await db.query(
            'SELECT purchase_id, purchase_no FROM purchase_master WHERE purchase_id = ? FOR UPDATE',
            [purchaseId]
        );

        if (purchases.length === 0) {
            await db.rollback();
            return res.status(404).json({ success: false, message: 'Purchase not found' });
        }

        const [products] = await db.query(
            'SELECT product_id, purchase_price, selling_price FROM products WHERE product_id = ? FOR UPDATE',
            [product_id]
        );

        if (products.length === 0) {
            await db.rollback();
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const itemAmount = amount !== undefined ? amount : (Number(qty) * Number(purchase_price)) + Number(tax_amount || 0) - Number(discount_amount || 0);

        const [itemResult] = await db.query(
            `INSERT INTO purchase_items
                (purchase_id, product_id, qty, purchase_price, discount_amount, tax_percent, tax_amount, amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [purchaseId, product_id, qty, purchase_price, discount_amount, tax_percent, tax_amount, itemAmount]
        );

        await updateStock({
            productId: product_id,
            transactionType: 'PURCHASE',
            transactionId: purchaseId,
            sourceTable: 'purchase_items',
            sourceItemId: itemResult.insertId,
            referenceNo: purchases[0].purchase_no,
            qtyIn: qty,
            remarks: remarks || 'Purchase item added',
            createdBy
        });

        let priceHistoryId = null;
        if (selling_price !== undefined && selling_price !== null && selling_price !== '') {
            const [priceResult] = await db.query(
                `INSERT INTO product_price_history
                    (product_id, purchase_item_id, old_purchase_price, new_purchase_price, old_selling_price, suggested_selling_price, approved_selling_price, approval_status, created_by, remarks)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
                [
                    product_id,
                    itemResult.insertId,
                    products[0].purchase_price || 0,
                    purchase_price,
                    products[0].selling_price || 0,
                    selling_price,
                    selling_price,
                    createdBy,
                    remarks || 'Manual selling price entered during purchase'
                ]
            );
            priceHistoryId = priceResult.insertId;
        }

        await db.commit();
        return res.status(201).json({
            success: true,
            message: 'Purchase item added and stock updated',
            purchase_item_id: itemResult.insertId,
            price_history_id: priceHistoryId
        });
    } catch (error) {
        await db.rollback();
        return res.status(500).json({ success: false, message: 'Failed to add purchase item', error: error.message });
    }
};

module.exports = {
    addPurchase,
    addPurchaseItem,
    getPurchaseItems,
    getPurchases
};
