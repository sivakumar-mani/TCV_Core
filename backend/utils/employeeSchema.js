const EMPLOYEE_DEPARTMENT_DDL =
    "ENUM('ADMIN','ENGINEER','TECHNICAL','STAFF','SALES','PURCHASE','STORE','INSTALLATION','SERVICE','ACCOUNTS') NOT NULL DEFAULT 'SERVICE'";

const ensureEmployeeDepartmentColumn = async (conn) => {
    const [columns] = await conn.query(
        `SELECT COLUMN_TYPE
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'employees'
           AND COLUMN_NAME = 'department'`
    );

    if (columns.length > 0 && !String(columns[0].COLUMN_TYPE).includes('ENGINEER')) {
        await conn.query(`ALTER TABLE employees MODIFY COLUMN department ${EMPLOYEE_DEPARTMENT_DDL}`);
    }
};

module.exports = {
    ensureEmployeeDepartmentColumn
};
