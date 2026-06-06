const connection = require('../connection');

const db = connection.promise();

const getLookupSuppliers = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT supplier_id AS value, supplier_name AS label FROM suppliers WHERE status = 1 ORDER BY supplier_name'
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch suppliers', error: error.message });
    }
};

const getLookupCustomers = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT customer_id AS value, customer_name AS label FROM customers WHERE status = 1 ORDER BY customer_name'
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch customers', error: error.message });
    }
};

const getLookupProducts = async (req, res) => {
    try {
        const [columns] = await db.query('SHOW COLUMNS FROM products');
        const columnNames = columns.map((column) => column.Field);
        const hasProductCode = columnNames.includes('product_code');
        const hasUnit = columnNames.includes('unit');
        const hasStatus = columnNames.includes('status');
        const hasSellingPrice = columnNames.includes('selling_price');
        const hasPrice = columnNames.includes('price');
        const productCodeSelect = hasProductCode ? 'product_code' : 'NULL AS product_code';
        const unitSelect = hasUnit ? 'unit' : "'PCS' AS unit";
        const sellingPriceSelect = hasSellingPrice ? 'selling_price' : (hasPrice ? 'price AS selling_price' : '0 AS selling_price');
        const labelCode = hasProductCode ? 'COALESCE(product_code, product_id)' : 'product_id';
        const whereClause = hasStatus ? "WHERE status IN (1, '1', 'ACTIVE')" : '';

        const [rows] = await db.query(
            `SELECT
                product_id AS value,
                CONCAT(${labelCode}, ' - ', product_name) AS label,
                product_id,
                product_name,
                ${productCodeSelect},
                ${unitSelect},
                ${sellingPriceSelect}
             FROM products
             ${whereClause}
             ORDER BY product_name`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch products', error: error.message });
    }
};

const getLookupEmployees = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT
                employee_id AS value,
                CONCAT(employee_code, ' - ', employee_name) AS label
             FROM employees
             WHERE status = 1
             ORDER BY employee_name`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch employees', error: error.message });
    }
};

const getLookupWorkOrders = async (req, res) => {
    try {
        const [columns] = await db.query('SHOW COLUMNS FROM work_orders');
        const columnNames = columns.map((column) => column.Field);
        const hasWorkStatus = columnNames.includes('work_status');
        const statusSelect = hasWorkStatus ? 'wo.work_status' : "'PENDING' AS work_status";
        const whereClause = hasWorkStatus ? "WHERE wo.work_status <> 'CANCELLED'" : '';

        const [rows] = await db.query(
            `SELECT
                wo.work_order_id AS value,
                CONCAT_WS(' - ', wo.work_order_no, c.customer_name) AS label,
                wo.work_order_id,
                wo.work_order_no,
                ${statusSelect}
             FROM work_orders wo
             LEFT JOIN customers c ON c.customer_id = wo.customer_id
             ${whereClause}
             ORDER BY wo.work_order_id DESC`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch work orders', error: error.message });
    }
};

const getLookupMaterialIssues = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT
                material_issue_id AS value,
                issue_no AS label,
                material_issue_id,
                work_order_id,
                issue_status
             FROM material_issue_master
             WHERE issue_status = 'ISSUED'
             ORDER BY material_issue_id DESC`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch material issues', error: error.message });
    }
};

module.exports = {
    getLookupCustomers,
    getLookupEmployees,
    getLookupMaterialIssues,
    getLookupProducts,
    getLookupSuppliers,
    getLookupWorkOrders
};
