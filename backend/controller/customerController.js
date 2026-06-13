const connection = require('../connection');

const phoneRegex = /^[0-9]{10}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const customerTypes = ['RETAIL', 'WHOLESALE', 'DEALER', 'CORPORATE', 'SERVICE'];

const toNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const validateCustomer = (payload) => {
    const errors = [];

    if (!payload.customer_name) errors.push('Customer name is required');
    if (!payload.contact_person) errors.push('Contact person is required');
    if (!payload.phone) errors.push('Phone is required');
    else if (!phoneRegex.test(String(payload.phone))) errors.push('Phone must be 10 digits');

    if (payload.alternate_phone && !phoneRegex.test(String(payload.alternate_phone))) {
        errors.push('Alternate phone must be 10 digits');
    }

    if (payload.email && !emailRegex.test(String(payload.email))) {
        errors.push('Valid email is required');
    }

    if (!payload.address) errors.push('Address is required');
    if (!payload.state) errors.push('State is required');
    if (!payload.city_district) errors.push('City/District is required');

    if (payload.customer_type && !customerTypes.includes(payload.customer_type)) {
        errors.push('Invalid customer type');
    }

    if (toNumber(payload.credit_limit) < 0) errors.push('Credit limit cannot be negative');

    return errors;
};

const getCustomers = async (req, res) => {
    try {
        const [rows] = await connection.promise().query(
            `SELECT customer_id, customer_name, contact_person, phone, alternate_phone,
                    email, gst_no, customer_type, address, city_district, state, pincode,
                    credit_limit, opening_balance, outstanding_balance, is_active,
                    is_active AS status, created_at, updated_at
             FROM customers
             ORDER BY customer_id DESC`
        );

        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getCustomerById = async (req, res) => {
    try {
        const { customer_id } = req.params;

        if (!customer_id) {
            return res.status(400).json({ success: false, message: 'customer_id is required' });
        }

        const [rows] = await connection.promise().query(
            `SELECT customer_id, customer_name, contact_person, phone, alternate_phone,
                    email, gst_no, customer_type, address, city_district, state, pincode,
                    credit_limit, opening_balance, outstanding_balance, is_active,
                    is_active AS status, created_at, updated_at
             FROM customers
             WHERE customer_id = ?`,
            [customer_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        return res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const addCustomer = async (req, res) => {
    try {
        const payload = req.body;
        const errors = validateCustomer(payload);

        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        const query = `
            INSERT INTO customers (
                customer_name,
                contact_person,
                phone,
                alternate_phone,
                email,
                gst_no,
                customer_type,
                address,
                city_district,
                state,
                pincode,
                credit_limit,
                opening_balance,
                outstanding_balance,
                is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            payload.customer_name,
            payload.contact_person,
            payload.phone,
            payload.alternate_phone || null,
            payload.email || null,
            payload.gst_no || null,
            payload.customer_type || 'RETAIL',
            payload.address,
            payload.city_district,
            payload.state,
            payload.pincode || null,
            toNumber(payload.credit_limit),
            toNumber(payload.opening_balance),
            toNumber(payload.outstanding_balance),
            typeof payload.status !== 'undefined' ? payload.status : 1
        ];

        const [result] = await connection.promise().query(query, values);

        return res.status(201).json({
            success: true,
            message: 'Customer added successfully',
            customer_id: result.insertId
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const updateCustomer = async (req, res) => {
    try {
        const payload = req.body;

        if (!payload.customer_id) {
            return res.status(400).json({ success: false, message: 'customer_id is required' });
        }

        const [existing] = await connection.promise().query(
            'SELECT customer_id FROM customers WHERE customer_id = ?',
            [payload.customer_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        const errors = validateCustomer(payload);
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        const query = `
            UPDATE customers SET
                customer_name = ?,
                contact_person = ?,
                phone = ?,
                alternate_phone = ?,
                email = ?,
                gst_no = ?,
                customer_type = ?,
                address = ?,
                city_district = ?,
                state = ?,
                pincode = ?,
                credit_limit = ?,
                opening_balance = ?,
                outstanding_balance = ?,
                is_active = ?,
                updated_at = NOW()
            WHERE customer_id = ?
        `;

        const values = [
            payload.customer_name,
            payload.contact_person,
            payload.phone,
            payload.alternate_phone || null,
            payload.email || null,
            payload.gst_no || null,
            payload.customer_type || 'RETAIL',
            payload.address,
            payload.city_district,
            payload.state,
            payload.pincode || null,
            toNumber(payload.credit_limit),
            toNumber(payload.opening_balance),
            toNumber(payload.outstanding_balance),
            typeof payload.status !== 'undefined' ? payload.status : 1,
            payload.customer_id
        ];

        await connection.promise().query(query, values);

        return res.json({ success: true, message: 'Customer updated successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const deleteCustomer = async (req, res) => {
    try {
        const { customer_id } = req.body;

        if (!customer_id) {
            return res.status(400).json({ success: false, message: 'customer_id is required' });
        }

        const [existing] = await connection.promise().query(
            'SELECT customer_id FROM customers WHERE customer_id = ?',
            [customer_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        await connection.promise().query('DELETE FROM customers WHERE customer_id = ?', [customer_id]);

        return res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getCustomers,
    getCustomerById,
    addCustomer,
    updateCustomer,
    deleteCustomer
};
