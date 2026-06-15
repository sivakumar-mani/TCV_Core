const connection = require('../connection');

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
        const [rows] = await connection.promise().query(
            `SELECT wa.workflow_id, wa.module_name, wa.reference_id, wa.reference_no,
                    wa.workflow_status, wa.requested_at, wa.reviewed_at, wa.remarks,
                    qm.quotation_status, qm.quotation_version, qm.quotation_date, qm.valid_until, qm.net_amount,
                    c.customer_name
             FROM workflow_approvals wa
             LEFT JOIN quotation_master qm
                ON wa.module_name = 'QUOTATION' AND qm.quotation_id = wa.reference_id
             LEFT JOIN customers c ON c.customer_id = qm.customer_id
             ORDER BY wa.workflow_status = 'PENDING' DESC, wa.requested_at DESC`
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
