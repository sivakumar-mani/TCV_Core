const ensureEmployeeAttendanceTable = async (conn) => {
    await conn.query(`
        CREATE TABLE IF NOT EXISTS employee_attendance (
            attendance_id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            attendance_date DATE NOT NULL,
            status ENUM('PRESENT','ABSENT','HALF_DAY','LEAVE','HOLIDAY') NOT NULL DEFAULT 'PRESENT',
            check_in TIME NULL,
            check_out TIME NULL,
            remarks TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE ON UPDATE CASCADE,
            UNIQUE KEY uk_employee_attendance_date (employee_id, attendance_date),
            INDEX idx_attendance_date (attendance_date),
            INDEX idx_attendance_status (status)
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

const ensureSalesTable = async (conn) => {
    await conn.query(`
        CREATE TABLE IF NOT EXISTS sales_master (
            sales_id INT AUTO_INCREMENT PRIMARY KEY,
            invoice_no VARCHAR(50) NOT NULL UNIQUE,
            invoice_date DATE NOT NULL DEFAULT (CURDATE()),
            customer_id INT NOT NULL,
            quotation_id INT NULL,
            work_order_id INT NULL,
            total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            discount_percent DECIMAL(5,2) DEFAULT 0,
            tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            net_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            payment_mode ENUM('CASH','CARD','UPI','BANK','CHEQUE','CREDIT') DEFAULT 'CREDIT',
            payment_status ENUM('PENDING','PARTIAL','PAID','OVERDUE') NOT NULL DEFAULT 'PENDING',
            sales_status ENUM('DRAFT','COMPLETED','CANCELLED','RETURNED') NOT NULL DEFAULT 'DRAFT',
            due_date DATE NULL,
            remarks TEXT,
            created_by_employee_id INT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON UPDATE CASCADE,
            FOREIGN KEY (quotation_id) REFERENCES quotation_master(quotation_id) ON DELETE SET NULL,
            FOREIGN KEY (work_order_id) REFERENCES work_orders(work_order_id) ON DELETE SET NULL,
            FOREIGN KEY (created_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
            INDEX idx_customer_id (customer_id),
            INDEX idx_invoice_date (invoice_date),
            INDEX idx_sales_status (sales_status),
            INDEX idx_payment_status (payment_status),
            INDEX idx_due_date (due_date)
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

const ensurePaymentTables = async (conn) => {
    await ensureSalesTable(conn);

    await conn.query(`
        CREATE TABLE IF NOT EXISTS customer_payments (
            payment_id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT NOT NULL,
            sales_id INT NULL,
            amount DECIMAL(12,2) NOT NULL,
            payment_date DATE NOT NULL DEFAULT (CURDATE()),
            payment_mode ENUM('CASH','CARD','UPI','BANK','CHEQUE','ONLINE') NOT NULL,
            reference_no VARCHAR(100) NULL,
            payment_against ENUM('INVOICE','ADVANCE','ADJUSTMENT') DEFAULT 'INVOICE',
            narration TEXT,
            received_by_employee_id INT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON UPDATE CASCADE,
            FOREIGN KEY (sales_id) REFERENCES sales_master(sales_id) ON DELETE SET NULL,
            FOREIGN KEY (received_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
            INDEX idx_customer_id (customer_id),
            INDEX idx_sales_id (sales_id),
            INDEX idx_payment_date (payment_date),
            INDEX idx_reference_no (reference_no)
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
        CREATE TABLE IF NOT EXISTS supplier_payments (
            payment_id INT AUTO_INCREMENT PRIMARY KEY,
            supplier_id INT NOT NULL,
            purchase_id INT NULL,
            amount DECIMAL(12,2) NOT NULL,
            payment_date DATE NOT NULL DEFAULT (CURDATE()),
            payment_mode ENUM('CASH','CARD','UPI','BANK','CHEQUE','ONLINE') NOT NULL,
            reference_no VARCHAR(100) NULL,
            narration TEXT,
            paid_by_employee_id INT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON UPDATE CASCADE,
            FOREIGN KEY (purchase_id) REFERENCES purchase_master(purchase_id) ON DELETE SET NULL,
            FOREIGN KEY (paid_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
            INDEX idx_supplier_id (supplier_id),
            INDEX idx_purchase_id (purchase_id),
            INDEX idx_payment_date (payment_date),
            INDEX idx_reference_no (reference_no)
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

const ensureServiceTicketTable = async (conn) => {
    await ensureSalesTable(conn);

    await conn.query(`
        CREATE TABLE IF NOT EXISTS service_tickets (
            service_ticket_id INT AUTO_INCREMENT PRIMARY KEY,
            ticket_no VARCHAR(50) NOT NULL UNIQUE,
            customer_id INT NOT NULL,
            product_id INT NULL,
            sales_id INT NULL,
            assigned_to_employee_id INT NULL,
            complaint_details TEXT NOT NULL,
            service_status ENUM('OPEN','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED','CANCELLED') NOT NULL DEFAULT 'OPEN',
            priority ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
            opened_date DATE NOT NULL DEFAULT (CURDATE()),
            closed_date DATE NULL,
            resolution_notes TEXT,
            resolution_time_hours INT NULL,
            created_by_employee_id INT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON UPDATE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL,
            FOREIGN KEY (sales_id) REFERENCES sales_master(sales_id) ON DELETE SET NULL,
            FOREIGN KEY (assigned_to_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
            FOREIGN KEY (created_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
            INDEX idx_customer_id (customer_id),
            INDEX idx_service_status (service_status),
            INDEX idx_priority (priority),
            INDEX idx_opened_date (opened_date),
            INDEX idx_assigned_to (assigned_to_employee_id)
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

const ensureWarrantyTable = async (conn) => {
    await ensureSalesTable(conn);

    await conn.query(`
        CREATE TABLE IF NOT EXISTS warranty_master (
            warranty_id INT AUTO_INCREMENT PRIMARY KEY,
            warranty_no VARCHAR(50) NOT NULL UNIQUE,
            customer_id INT NOT NULL,
            sales_id INT NULL,
            product_id INT NOT NULL,
            serial_no VARCHAR(100) NULL,
            warranty_start_date DATE NOT NULL DEFAULT (CURDATE()),
            warranty_end_date DATE NOT NULL,
            warranty_type ENUM('MANUFACTURER','EXTENDED','VOID') DEFAULT 'MANUFACTURER',
            warranty_status ENUM('ACTIVE','EXPIRED','CLAIMED','VOID') NOT NULL DEFAULT 'ACTIVE',
            coverage_type VARCHAR(100) NULL,
            warranty_cost DECIMAL(12,2) DEFAULT 0,
            claims_count INT DEFAULT 0,
            remarks TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON UPDATE CASCADE,
            FOREIGN KEY (sales_id) REFERENCES sales_master(sales_id) ON DELETE SET NULL,
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON UPDATE CASCADE,
            UNIQUE KEY uk_serial_no (serial_no),
            INDEX idx_customer_id (customer_id),
            INDEX idx_warranty_status (warranty_status),
            INDEX idx_warranty_end_date (warranty_end_date),
            INDEX idx_product_id (product_id)
        ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
};

module.exports = {
    ensureEmployeeAttendanceTable,
    ensureSalesTable,
    ensurePaymentTables,
    ensureServiceTicketTable,
    ensureWarrantyTable
};
