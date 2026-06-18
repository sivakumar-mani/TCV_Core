const connection = require('../connection');
const { ensurePaymentTables } = require('../utils/businessModuleSchema');

const paymentModes = ['CASH', 'CARD', 'UPI', 'BANK', 'CHEQUE', 'ONLINE'];

const toNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const validatePayment = (payload, type) => {
    if (type === 'customer' && !payload.customer_id) return 'Customer is required';
    if (type === 'supplier' && !payload.supplier_id) return 'Supplier is required';
    if (type === 'supplier' && !payload.purchase_id) return 'Purchase no is required';
    if (toNumber(payload.amount) <= 0) return 'Amount must be greater than zero';
    if (!payload.payment_date) return 'Payment date is required';
    if (!payload.payment_mode || !paymentModes.includes(payload.payment_mode)) return 'Valid payment mode is required';
    return null;
};

const getPaymentStatus = (paid, net) => {
    if (paid <= 0) return 'PENDING';
    return paid >= net ? 'PAID' : 'PARTIAL';
};

const recalculatePurchasePaymentStatus = async (conn, purchaseId) => {
    if (!purchaseId) return;

    const [rows] = await conn.query(
        'SELECT net_amount FROM purchase_master WHERE purchase_id = ? FOR UPDATE',
        [purchaseId]
    );
    if (!rows.length) return;

    const netAmount = toNumber(rows[0].net_amount);
    const [paymentRows] = await conn.query(
        'SELECT COALESCE(SUM(amount), 0) AS paid_amount FROM supplier_payments WHERE purchase_id = ?',
        [purchaseId]
    );
    const cappedPaid = Math.min(Math.max(toNumber(paymentRows[0].paid_amount), 0), netAmount);
    const balance = Math.max(netAmount - cappedPaid, 0);

    await conn.query(
        `UPDATE purchase_master
         SET paid_amount = ?, balance_amount = ?, payment_status = ?, updated_at = NOW()
         WHERE purchase_id = ?`,
        [cappedPaid, balance, getPaymentStatus(cappedPaid, netAmount), purchaseId]
    );
};

const getCustomerPayments = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensurePaymentTables(conn);
        const [rows] = await conn.query(
            `SELECT cp.*, c.customer_name, sm.invoice_no,
                    CONCAT_WS(' ', e.first_name, e.last_name) AS received_by_employee_name
             FROM customer_payments cp
             JOIN customers c ON c.customer_id = cp.customer_id
             LEFT JOIN sales_master sm ON sm.sales_id = cp.sales_id
             LEFT JOIN employees e ON e.employee_id = cp.received_by_employee_id
             ORDER BY cp.payment_date DESC, cp.payment_id DESC`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const addCustomerPayment = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensurePaymentTables(conn);
        const payload = req.body;
        const error = validatePayment(payload, 'customer');
        if (error) return res.status(400).json({ success: false, message: error });

        const [result] = await conn.query(
            `INSERT INTO customer_payments
                (customer_id, sales_id, amount, payment_date, payment_mode, reference_no, payment_against, narration, received_by_employee_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                payload.customer_id,
                payload.sales_id || null,
                toNumber(payload.amount),
                String(payload.payment_date).slice(0, 10),
                payload.payment_mode,
                payload.reference_no || null,
                payload.payment_against || 'INVOICE',
                payload.narration || null,
                payload.received_by_employee_id || null
            ]
        );
        return res.status(201).json({ success: true, message: 'Customer payment added successfully', payment_id: result.insertId });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const updateCustomerPayment = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensurePaymentTables(conn);
        const payload = req.body;
        if (!payload.payment_id) return res.status(400).json({ success: false, message: 'payment_id is required' });
        const error = validatePayment(payload, 'customer');
        if (error) return res.status(400).json({ success: false, message: error });

        await conn.query(
            `UPDATE customer_payments SET
                customer_id = ?, sales_id = ?, amount = ?, payment_date = ?, payment_mode = ?,
                reference_no = ?, payment_against = ?, narration = ?, received_by_employee_id = ?
             WHERE payment_id = ?`,
            [
                payload.customer_id,
                payload.sales_id || null,
                toNumber(payload.amount),
                String(payload.payment_date).slice(0, 10),
                payload.payment_mode,
                payload.reference_no || null,
                payload.payment_against || 'INVOICE',
                payload.narration || null,
                payload.received_by_employee_id || null,
                payload.payment_id
            ]
        );
        return res.json({ success: true, message: 'Customer payment updated successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const deleteCustomerPayment = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensurePaymentTables(conn);
        if (!req.body.payment_id) return res.status(400).json({ success: false, message: 'payment_id is required' });
        await conn.query('DELETE FROM customer_payments WHERE payment_id = ?', [req.body.payment_id]);
        return res.json({ success: true, message: 'Customer payment deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getSupplierPayments = async (req, res) => {
    try {
        const conn = connection.promise();
        await ensurePaymentTables(conn);
        const [rows] = await conn.query(
            `SELECT sp.*, s.supplier_name, pm.purchase_no, pm.net_amount, pm.paid_amount,
                    pm.balance_amount, pm.payment_status,
                    CONCAT_WS(' ', e.first_name, e.last_name) AS paid_by_employee_name
             FROM supplier_payments sp
             JOIN suppliers s ON s.supplier_id = sp.supplier_id
             LEFT JOIN purchase_master pm ON pm.purchase_id = sp.purchase_id
             LEFT JOIN employees e ON e.employee_id = sp.paid_by_employee_id
             ORDER BY sp.payment_date DESC, sp.payment_id DESC`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const addSupplierPayment = async (req, res) => {
    const conn = connection.promise();
    try {
        await ensurePaymentTables(conn);
        const payload = req.body;
        const error = validatePayment(payload, 'supplier');
        if (error) return res.status(400).json({ success: false, message: error });

        await conn.beginTransaction();
        const [purchaseRows] = await conn.query(
            'SELECT balance_amount FROM purchase_master WHERE purchase_id = ? AND supplier_id = ? FOR UPDATE',
            [payload.purchase_id, payload.supplier_id]
        );
        if (!purchaseRows.length) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'Selected purchase no does not belong to this supplier' });
        }
        if (toNumber(purchaseRows[0].balance_amount) <= 0) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'Selected purchase no has no pending balance' });
        }
        if (toNumber(payload.amount) > toNumber(purchaseRows[0].balance_amount)) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: 'Payment amount exceeds selected purchase balance' });
        }

        const [result] = await conn.query(
            `INSERT INTO supplier_payments
                (supplier_id, purchase_id, amount, payment_date, payment_mode, reference_no, narration, paid_by_employee_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                payload.supplier_id,
                payload.purchase_id || null,
                toNumber(payload.amount),
                String(payload.payment_date).slice(0, 10),
                payload.payment_mode,
                payload.reference_no || null,
                payload.narration || null,
                payload.paid_by_employee_id || null
            ]
        );
        await recalculatePurchasePaymentStatus(conn, payload.purchase_id);
        await conn.commit();
        return res.status(201).json({
            success: true,
            message: 'Supplier payment added successfully',
            payment_id: result.insertId
        });
    } catch (error) {
        await conn.rollback();
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const updateSupplierPayment = async (req, res) => {
    const conn = connection.promise();
    try {
        await ensurePaymentTables(conn);
        const payload = req.body;
        if (!payload.payment_id) return res.status(400).json({ success: false, message: 'payment_id is required' });
        const error = validatePayment(payload, 'supplier');
        if (error) return res.status(400).json({ success: false, message: error });

        await conn.beginTransaction();
        const [existing] = await conn.query('SELECT purchase_id, amount FROM supplier_payments WHERE payment_id = ? FOR UPDATE', [payload.payment_id]);
        if (!existing.length) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Supplier payment not found' });
        }
        const oldPurchaseId = existing[0].purchase_id;

        await conn.query(
            `UPDATE supplier_payments SET
                supplier_id = ?, purchase_id = ?, amount = ?, payment_date = ?, payment_mode = ?,
                reference_no = ?, narration = ?, paid_by_employee_id = ?
             WHERE payment_id = ?`,
            [
                payload.supplier_id,
                payload.purchase_id || null,
                toNumber(payload.amount),
                String(payload.payment_date).slice(0, 10),
                payload.payment_mode,
                payload.reference_no || null,
                payload.narration || null,
                payload.paid_by_employee_id || null,
                payload.payment_id
            ]
        );
        await recalculatePurchasePaymentStatus(conn, oldPurchaseId);
        await recalculatePurchasePaymentStatus(conn, payload.purchase_id);
        await conn.commit();
        return res.json({ success: true, message: 'Supplier payment updated successfully' });
    } catch (error) {
        await conn.rollback();
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const deleteSupplierPayment = async (req, res) => {
    const conn = connection.promise();
    try {
        await ensurePaymentTables(conn);
        if (!req.body.payment_id) return res.status(400).json({ success: false, message: 'payment_id is required' });
        await conn.beginTransaction();
        const [existing] = await conn.query('SELECT purchase_id, amount FROM supplier_payments WHERE payment_id = ? FOR UPDATE', [req.body.payment_id]);
        const purchaseId = existing[0]?.purchase_id;
        await conn.query('DELETE FROM supplier_payments WHERE payment_id = ?', [req.body.payment_id]);
        await recalculatePurchasePaymentStatus(conn, purchaseId);
        await conn.commit();
        return res.json({ success: true, message: 'Supplier payment deleted successfully' });
    } catch (error) {
        await conn.rollback();
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getCustomerPayments,
    addCustomerPayment,
    updateCustomerPayment,
    deleteCustomerPayment,
    getSupplierPayments,
    addSupplierPayment,
    updateSupplierPayment,
    deleteSupplierPayment
};
