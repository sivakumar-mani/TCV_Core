const connection = require('../connection');

const db = connection.promise();

const getCustomers = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT customer_id, customer_name, contact_person, phone, alternate_phone, email,
                    gst_no, address, city, state, pincode, customer_type, credit_limit,
                    opening_balance, status, created_at, updated_at
             FROM customers
             ORDER BY customer_id DESC`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch customers', error: error.message });
    }
};

const getCustomerById = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM customers WHERE customer_id = ?', [req.params.customer_id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        return res.json({ success: true, data: rows[0] });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch customer', error: error.message });
    }
};

const addCustomer = async (req, res) => {
    try {
        const {
            customer_name,
            contact_person,
            phone,
            alternate_phone,
            email,
            gst_no,
            address,
            city,
            state,
            pincode,
            customer_type = 'RETAIL',
            credit_limit = 0,
            opening_balance = 0,
            status = 1
        } = req.body;

        if (!customer_name) {
            return res.status(400).json({ success: false, message: 'Customer name is required' });
        }

        const [result] = await db.query(
            `INSERT INTO customers
                (customer_name, contact_person, phone, alternate_phone, email, gst_no, address,
                 city, state, pincode, customer_type, credit_limit, opening_balance, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                customer_name,
                contact_person || null,
                phone || null,
                alternate_phone || null,
                email || null,
                gst_no || null,
                address || null,
                city || null,
                state || null,
                pincode || null,
                customer_type,
                credit_limit,
                opening_balance,
                status
            ]
        );

        return res.status(201).json({ success: true, message: 'Customer added successfully', customer_id: result.insertId });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to add customer', error: error.message });
    }
};

const updateCustomer = async (req, res) => {
    try {
        const {
            customer_id,
            customer_name,
            contact_person,
            phone,
            alternate_phone,
            email,
            gst_no,
            address,
            city,
            state,
            pincode,
            customer_type = 'RETAIL',
            credit_limit = 0,
            opening_balance = 0,
            status = 1
        } = req.body;

        if (!customer_id) {
            return res.status(400).json({ success: false, message: 'customer_id is required' });
        }

        const [existing] = await db.query('SELECT customer_id FROM customers WHERE customer_id = ?', [customer_id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        await db.query(
            `UPDATE customers SET
                customer_name = ?, contact_person = ?, phone = ?, alternate_phone = ?,
                email = ?, gst_no = ?, address = ?, city = ?, state = ?, pincode = ?,
                customer_type = ?, credit_limit = ?, opening_balance = ?, status = ?,
                updated_at = NOW()
             WHERE customer_id = ?`,
            [
                customer_name,
                contact_person || null,
                phone || null,
                alternate_phone || null,
                email || null,
                gst_no || null,
                address || null,
                city || null,
                state || null,
                pincode || null,
                customer_type,
                credit_limit,
                opening_balance,
                status,
                customer_id
            ]
        );

        return res.json({ success: true, message: 'Customer updated successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update customer', error: error.message });
    }
};

const deleteCustomer = async (req, res) => {
    try {
        const { customer_id } = req.body;
        if (!customer_id) {
            return res.status(400).json({ success: false, message: 'customer_id is required' });
        }

        await db.query('DELETE FROM customers WHERE customer_id = ?', [customer_id]);
        return res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete customer', error: error.message });
    }
};

module.exports = {
    addCustomer,
    deleteCustomer,
    getCustomerById,
    getCustomers,
    updateCustomer
};
