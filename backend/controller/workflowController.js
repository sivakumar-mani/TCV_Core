const connection = require('../connection');
const { ensureCustomerSchema } = require('../utils/customerSchema');

const ensureWorkflowTable = async () => {
    await connection.promise().query(`
        CREATE TABLE IF NOT EXISTS workflow_approvals (
            workflow_id INT AUTO_INCREMENT PRIMARY KEY,
            module_name VARCHAR(50) NOT NULL,
            reference_id INT NOT NULL,
            reference_no VARCHAR(50) NOT NULL,
            workflow_status ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
            requested_by_employee_id INT,
            approved_by_employee_id INT,
            requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP NULL,
            remarks TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_workflow_reference (module_name, reference_id),
            INDEX idx_module_status (module_name, workflow_status),
            INDEX idx_reference_no (reference_no),
            FOREIGN KEY (requested_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
            FOREIGN KEY (approved_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

const getWorkflowApprovals = async (req, res) => {
    try {
        await ensureWorkflowTable();
        await ensureCustomerSchema(connection.promise());
        const [rows] = await connection.promise().query(
            `SELECT wa.workflow_id, wa.module_name, wa.reference_id, wa.reference_no,
                    wa.workflow_status, wa.requested_at, wa.reviewed_at, wa.remarks,
                    qm.quotation_status, qm.quotation_version, qm.quotation_date, qm.valid_until, qm.net_amount,
                    NULL AS supplier_id,
                    TRIM(CONCAT(COALESCE(c.salutation, ''), ' ', c.customer_name)) AS customer_name,
                    NULL AS supplier_name,
                    NULL AS purchase_date,
                    NULL AS balance_amount
             FROM workflow_approvals wa
             LEFT JOIN quotation_master qm
                ON wa.module_name = 'QUOTATION' AND qm.quotation_id = wa.reference_id
             LEFT JOIN customers c ON c.customer_id = qm.customer_id
             UNION ALL
             SELECT NULL AS workflow_id, 'SUPPLIER_PAYMENT' AS module_name, pm.purchase_id AS reference_id,
                    pm.purchase_no AS reference_no, pm.payment_status AS workflow_status,
                    pm.created_at AS requested_at, NULL AS reviewed_at,
                    'Supplier payment balance pending' AS remarks,
                    NULL AS quotation_status, NULL AS quotation_version, NULL AS quotation_date,
                    NULL AS valid_until, pm.net_amount, pm.supplier_id,
                    NULL AS customer_name, s.supplier_name, pm.purchase_date, pm.balance_amount
             FROM purchase_master pm
             JOIN suppliers s ON s.supplier_id = pm.supplier_id
             WHERE pm.balance_amount > 0
               AND pm.payment_status IN ('PENDING', 'PARTIAL')
             ORDER BY workflow_status = 'PENDING' DESC, requested_at DESC`
        );
        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

module.exports = {
    getWorkflowApprovals
};
