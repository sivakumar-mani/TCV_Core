const CUSTOMER_SALUTATION_DDL =
    "ENUM('Mr/Mrs/Ms','Mr.','Mrs.','Ms.','M/S') NOT NULL DEFAULT 'Mr/Mrs/Ms'";

const columnExists = async (conn, columnName) => {
    const [columns] = await conn.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'customers'
           AND COLUMN_NAME = ?`,
        [columnName]
    );

    return columns.length > 0;
};

const indexExists = async (conn, indexName) => {
    const [indexes] = await conn.query(
        `SELECT INDEX_NAME
         FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'customers'
           AND INDEX_NAME = ?`,
        [indexName]
    );

    return indexes.length > 0;
};

const constraintExists = async (conn, constraintName) => {
    const [constraints] = await conn.query(
        `SELECT CONSTRAINT_NAME
         FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'customers'
           AND CONSTRAINT_NAME = ?`,
        [constraintName]
    );

    return constraints.length > 0;
};

const ensureCustomerSalutationColumn = async (conn) => {
    const [columns] = await conn.query(
        `SELECT COLUMN_NAME, COLUMN_TYPE
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'customers'
           AND COLUMN_NAME = 'salutation'`
    );

    if (columns.length === 0) {
        await conn.query(
            `ALTER TABLE customers
             ADD COLUMN salutation ${CUSTOMER_SALUTATION_DDL} AFTER customer_id`
        );
    } else if (!String(columns[0].COLUMN_TYPE).includes('Mr/Mrs/Ms')) {
        await conn.query(
            `ALTER TABLE customers
             MODIFY COLUMN salutation ${CUSTOMER_SALUTATION_DDL}`
        );
    }

    if (!await indexExists(conn, 'idx_salutation')) {
        await conn.query('ALTER TABLE customers ADD INDEX idx_salutation (salutation)');
    }
};

const ensureCustomerReferenceColumns = async (conn) => {
    if (!await columnExists(conn, 'marketing_employee_id')) {
        await conn.query(
            `ALTER TABLE customers
             ADD COLUMN marketing_employee_id INT NULL AFTER customer_type`
        );
    }

    if (!await columnExists(conn, 'referral_details')) {
        await conn.query(
            `ALTER TABLE customers
             ADD COLUMN referral_details VARCHAR(255) NULL AFTER marketing_employee_id`
        );
    }

    if (!await indexExists(conn, 'idx_marketing_employee_id')) {
        await conn.query('ALTER TABLE customers ADD INDEX idx_marketing_employee_id (marketing_employee_id)');
    }

    if (!await constraintExists(conn, 'fk_customers_marketing_employee')) {
        await conn.query(
            `ALTER TABLE customers
             ADD CONSTRAINT fk_customers_marketing_employee
             FOREIGN KEY (marketing_employee_id) REFERENCES employees(employee_id)
             ON DELETE SET NULL ON UPDATE CASCADE`
        );
    }
};

const ensureCustomerApprovalColumns = async (conn) => {
    if (!await columnExists(conn, 'approval_status')) {
        await conn.query(
            "ALTER TABLE customers ADD COLUMN approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'APPROVED' AFTER is_active"
        );
    }
    if (!await columnExists(conn, 'created_by_user_id')) {
        await conn.query('ALTER TABLE customers ADD COLUMN created_by_user_id INT NULL AFTER approval_status');
    }
    if (!await columnExists(conn, 'approved_by_user_id')) {
        await conn.query('ALTER TABLE customers ADD COLUMN approved_by_user_id INT NULL AFTER created_by_user_id');
    }
    if (!await columnExists(conn, 'approved_at')) {
        await conn.query('ALTER TABLE customers ADD COLUMN approved_at TIMESTAMP NULL AFTER approved_by_user_id');
    }
    if (!await indexExists(conn, 'idx_customers_approval_status')) {
        await conn.query('ALTER TABLE customers ADD INDEX idx_customers_approval_status (approval_status)');
    }
};

const ensureCustomerSchema = async (conn) => {
    await ensureCustomerSalutationColumn(conn);
    await ensureCustomerReferenceColumns(conn);
    await ensureCustomerApprovalColumns(conn);
};

module.exports = {
    ensureCustomerSalutationColumn,
    ensureCustomerReferenceColumns,
    ensureCustomerApprovalColumns,
    ensureCustomerSchema
};
