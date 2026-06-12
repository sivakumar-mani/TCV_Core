const connection = require('../connection');

const getSuppliers = async (req, res) => {
    try {
        const [rows] = await connection.promise().query(
            `SELECT supplier_id, supplier_name, contact_person, phone, alternate_phone,
                    email, gst_no, pan_no, address, city, state, pincode,
                    opening_balance, is_active, is_active AS status, payment_terms, bank_account_no,
                    bank_name, ifsc_code, created_at, updated_at
             FROM suppliers
             ORDER BY supplier_id DESC`
        );

        return res.json(rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const addSupplier = async (req, res) => {
    try {
        const {
            supplier_name,
            contact_person,
            phone,
            alternate_phone,
            email,
            gst_no,
            pan_no,
            address,
            city,
            state,
            pincode,
            opening_balance,
            status,
            payment_terms,
            bank_account_no,
            bank_name,
            ifsc_code
        } = req.body;

        if (!supplier_name) {
            return res.status(400).json({ success: false, message: 'Supplier name is required' });
        }

        const query = `
            INSERT INTO suppliers (
                supplier_name,
                contact_person,
                phone,
                alternate_phone,
                email,
                gst_no,
                pan_no,
                address,
                city,
                state,
                pincode,
                opening_balance,
                is_active,
                payment_terms,
                bank_account_no,
                bank_name,
                ifsc_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            supplier_name,
            contact_person || null,
            phone || null,
            alternate_phone || null,
            email || null,
            gst_no || null,
            pan_no || null,
            address || null,
            city || null,
            state || null,
            pincode || null,
            opening_balance ?? 0,
            typeof status !== 'undefined' ? status : 1,
            payment_terms || null,
            bank_account_no || null,
            bank_name || null,
            ifsc_code || null
        ];

        const [result] = await connection.promise().query(query, values);

        return res.status(201).json({ success: true, message: 'Supplier added successfully', supplier_id: result.insertId });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const updateSupplier = async (req, res) => {
    try {
        const {
            supplier_id,
            supplier_name,
            contact_person,
            phone,
            alternate_phone,
            email,
            gst_no,
            pan_no,
            address,
            city,
            state,
            pincode,
            opening_balance,
            status,
            payment_terms,
            bank_account_no,
            bank_name,
            ifsc_code
        } = req.body;

        if (!supplier_id) {
            return res.status(400).json({ success: false, message: 'supplier_id is required' });
        }

        if (!supplier_name) {
            return res.status(400).json({ success: false, message: 'Supplier name is required' });
        }

        const [existing] = await connection.promise().query('SELECT supplier_id FROM suppliers WHERE supplier_id = ?', [supplier_id]);

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Supplier not found' });
        }

        const query = `
            UPDATE suppliers SET
                supplier_name = ?,
                contact_person = ?,
                phone = ?,
                alternate_phone = ?,
                email = ?,
                gst_no = ?,
                pan_no = ?,
                address = ?,
                city = ?,
                state = ?,
                pincode = ?,
                opening_balance = ?,
                is_active = ?,
                payment_terms = ?,
                bank_account_no = ?,
                bank_name = ?,
                ifsc_code = ?,
                updated_at = NOW()
            WHERE supplier_id = ?
        `;

        const values = [
            supplier_name,
            contact_person || null,
            phone || null,
            alternate_phone || null,
            email || null,
            gst_no || null,
            pan_no || null,
            address || null,
            city || null,
            state || null,
            pincode || null,
            opening_balance ?? 0,
            typeof status !== 'undefined' ? status : 1,
            payment_terms || null,
            bank_account_no || null,
            bank_name || null,
            ifsc_code || null,
            supplier_id
        ];

        await connection.promise().query(query, values);

        return res.json({ success: true, message: 'Supplier updated successfully' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const deleteSupplier = async (req, res) => {
    try {
        const { supplier_id } = req.body;

        if (!supplier_id) {
            return res.status(400).json({ success: false, message: 'supplier_id is required' });
        }

        const [existing] = await connection.promise().query('SELECT supplier_id FROM suppliers WHERE supplier_id = ?', [supplier_id]);

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Supplier not found' });
        }

        await connection.promise().query('DELETE FROM suppliers WHERE supplier_id = ?', [supplier_id]);

        return res.json({ success: true, message: 'Supplier deleted successfully' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

const getSupplierById = async (req, res) => {
    try {
        const supplier_id = req.params.supplier_id;

        if (!supplier_id) {
            return res.status(400).json({ success: false, message: 'supplier_id is required' });
        }

        const [rows] = await connection.promise().query(
            `SELECT supplier_id, supplier_name, contact_person, phone, alternate_phone,
                    email, gst_no, pan_no, address, city, state, pincode,
                    opening_balance, is_active, is_active AS status, payment_terms, bank_account_no,
                    bank_name, ifsc_code, created_at, updated_at
             FROM suppliers
             WHERE supplier_id = ?`,
            [supplier_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Supplier not found' });
        }

        return res.json({ success: true, data: rows[0] });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = { addSupplier, updateSupplier, deleteSupplier, getSupplierById, getSuppliers };
