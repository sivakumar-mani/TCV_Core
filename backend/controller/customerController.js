const connection = require('../connection');
const { ensureCustomerSchema } = require('../utils/customerSchema');

const phoneRegex = /^[0-9]{10}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const customerTypes = ['RETAIL', 'WHOLESALE', 'DEALER', 'CORPORATE', 'SERVICE'];
const isAdmin = (req) => String(req.res?.locals?.role || '').toUpperCase() === 'ADMIN';
const currentUserId = (req) => Number(req.res?.locals?.userId || req.res?.locals?.user_id || req.res?.locals?.id) || null;
const currentEmployeeId = (req) => Number(req.res?.locals?.employee_id) || null;

const normalizeSalutation = (value) => {
    if (!value) return 'Mr/Mrs/Ms';

    const key = String(value).trim().toUpperCase().replace(/\./g, '');
    const map = {
        MRMRSMS: 'Mr/Mrs/Ms',
        'MR/MRS/MS': 'Mr/Mrs/Ms',
        MR: 'Mr.',
        MRS: 'Mrs.',
        MS: 'Ms.',
        'M/S': 'M/S'
    };

    return map[key] || null;
};

const toNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const validateCustomer = (payload) => {
    const errors = [];

    if (!payload.customer_name) errors.push('Customer name is required');
    if (payload.salutation && !normalizeSalutation(payload.salutation)) {
        errors.push('Invalid salutation');
    }
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
        await ensureCustomerSchema(connection.promise());
        const [rows] = await connection.promise().query(
            `SELECT c.customer_id, c.salutation, c.customer_name,
                    TRIM(CONCAT(COALESCE(c.salutation, ''), ' ', c.customer_name)) AS display_customer_name,
                    c.contact_person, c.phone, c.alternate_phone,
                    c.email, c.gst_no, c.customer_type, c.marketing_employee_id,
                    CONCAT_WS(' ', e.first_name, e.last_name) AS marketing_employee_name,
                    c.referral_details, c.address, c.city_district, c.state, c.pincode,
                    c.credit_limit, c.opening_balance, c.outstanding_balance, c.is_active,
                    c.is_active AS status, c.approval_status, c.created_at, c.updated_at
             FROM customers c
             LEFT JOIN employees e ON e.employee_id = c.marketing_employee_id
             ORDER BY c.customer_id DESC`
        );

        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getMarketingEmployees = async (_req, res) => {
  try {
    const [rows] = await connection.promise().query(
      `SELECT employee_id, employee_code,
              CONCAT_WS(' ', first_name, last_name) AS employee_name, is_active
       FROM employees
       WHERE is_active = 1
       ORDER BY first_name, last_name`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Marketing employee lookup failed', error: error.message });
  }
};

const getCustomerById = async (req, res) => {
    try {
        await ensureCustomerSchema(connection.promise());
        const { customer_id } = req.params;

        if (!customer_id) {
            return res.status(400).json({ success: false, message: 'customer_id is required' });
        }

        const [rows] = await connection.promise().query(
            `SELECT customer_id, salutation, customer_name,
                    TRIM(CONCAT(COALESCE(salutation, ''), ' ', customer_name)) AS display_customer_name,
                    contact_person, phone, alternate_phone,
                    email, gst_no, customer_type, marketing_employee_id,
                    referral_details, address, city_district, state, pincode,
                    credit_limit, opening_balance, outstanding_balance, is_active,
                    is_active AS status, approval_status, created_at, updated_at
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
    const db = connection.promise();
    try {
        await ensureCustomerSchema(db);
        const payload = req.body;
        const errors = validateCustomer(payload);

        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        const adminRequest = isAdmin(req);
        const approvalStatus = adminRequest ? 'APPROVED' : 'PENDING';
        const activeStatus = adminRequest ? (typeof payload.status !== 'undefined' ? Number(payload.status) : 1) : 0;
        await db.beginTransaction();
        const query = `
            INSERT INTO customers (
                salutation,
                customer_name,
                contact_person,
                phone,
                alternate_phone,
                email,
                gst_no,
                customer_type,
                marketing_employee_id,
                referral_details,
                address,
                city_district,
                state,
                pincode,
                credit_limit,
                opening_balance,
                outstanding_balance,
                is_active,
                approval_status,
                created_by_user_id,
                approved_by_user_id,
                approved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            normalizeSalutation(payload.salutation),
            payload.customer_name,
            payload.contact_person,
            payload.phone,
            payload.alternate_phone || null,
            payload.email || null,
            payload.gst_no || null,
            payload.customer_type || 'RETAIL',
            payload.marketing_employee_id || null,
            payload.referral_details || null,
            payload.address,
            payload.city_district,
            payload.state,
            payload.pincode || null,
            toNumber(payload.credit_limit),
            toNumber(payload.opening_balance),
            toNumber(payload.outstanding_balance),
            activeStatus,
            approvalStatus,
            currentUserId(req),
            adminRequest ? currentUserId(req) : null,
            adminRequest ? new Date() : null
        ];

        const [result] = await db.query(query, values);
        if (!adminRequest) {
            await db.query(
                `INSERT INTO workflow_approvals
                 (module_name, reference_id, reference_no, workflow_status, requested_by_employee_id, remarks)
                 VALUES ('CCTV_CUSTOMER', ?, ?, 'PENDING', ?, 'New CCTV customer approval')
                 ON DUPLICATE KEY UPDATE workflow_status='PENDING', requested_by_employee_id=VALUES(requested_by_employee_id), reviewed_at=NULL, remarks=VALUES(remarks)`,
                [result.insertId, `CCTV-${result.insertId}`, currentEmployeeId(req)]
            );
        }
        await db.commit();

        return res.status(201).json({
            success: true,
            message: adminRequest ? 'Customer added successfully' : 'Customer sent for administrator approval',
            customer_id: result.insertId,
            approval_status: approvalStatus
        });
    } catch (error) {
        try { await db.rollback(); } catch (_rollbackError) {}
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const updateCustomer = async (req, res) => {
    try {
        await ensureCustomerSchema(connection.promise());
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
                salutation = ?,
                customer_name = ?,
                contact_person = ?,
                phone = ?,
                alternate_phone = ?,
                email = ?,
                gst_no = ?,
                customer_type = ?,
                marketing_employee_id = ?,
                referral_details = ?,
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
            normalizeSalutation(payload.salutation),
            payload.customer_name,
            payload.contact_person,
            payload.phone,
            payload.alternate_phone || null,
            payload.email || null,
            payload.gst_no || null,
            payload.customer_type || 'RETAIL',
            payload.marketing_employee_id || null,
            payload.referral_details || null,
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
  getMarketingEmployees,
    getCustomers,
    getCustomerById,
    addCustomer,
    updateCustomer,
    deleteCustomer
};
