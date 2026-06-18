-- =====================================================
-- TCV CORE - Enhanced Database Schema
-- MySQL 8.0+
-- For: Inventory, Purchase, Quotation, Sales & Service Management
-- =====================================================
-- Version: 2.0
-- Last Updated: 2026-06-07
-- =====================================================

-- =====================================================
-- 1. USERS / AUTHENTICATION
-- =====================================================

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
    email VARCHAR(100) NOT NULL UNIQUE,
    contact_number VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    role ENUM('ADMIN','MANAGER','EMPLOYEE','SALES','SERVICE') NOT NULL DEFAULT 'EMPLOYEE',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=Active, 0=Inactive',
    date_registered DATE NOT NULL DEFAULT (CURDATE()),
    last_login DATETIME,
    login_attempt_count INT DEFAULT 0 COMMENT 'For lockout mechanism',
    locked_until DATETIME COMMENT 'Account lock timestamp',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_active_date (is_active, date_registered)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User authentication and role management';
INSERT INTO users (username, password, email, contact_number, first_name, last_name, role, is_active)
VALUES ('admin', 'Tcv@1234', 'timecablevision@gmail.com', '9876543210', 'Siva', 'Kumar', 'ADMIN', 1);
-- =====================================================
-- 2. EMPLOYEES
-- =====================================================

CREATE TABLE employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL UNIQUE COMMENT 'Auto generated employee code, e.g. TCV1',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    designation VARCHAR(100) NOT NULL,
    department ENUM('ADMIN','ENGINEER','TECHNICAL','STAFF','SALES','PURCHASE','STORE','INSTALLATION','SERVICE','ACCOUNTS')
               NOT NULL DEFAULT 'SERVICE',
    date_of_birth DATE,
    qualification VARCHAR(150),
    photo_file_name VARCHAR(255) COMMENT 'Uploaded photo file name',
    photo_path VARCHAR(255) COMMENT 'Uploaded photo relative path or URL',
    spouse_or_parent_name VARCHAR(150) COMMENT 'Name of spouse or parent',
    relationship VARCHAR(50) COMMENT 'Relationship to spouse/parent',
    kids_details TEXT COMMENT 'Children names and details',
    id_proof_type ENUM('AADHAAR','PAN','VOTER_ID','PASSPORT','DRIVING_LICENSE','RATION_CARD','NREGA_JOB_CARD','BANK_PASSBOOK','POST_OFFICE_PASSBOOK','GOVERNMENT_EMPLOYEE_ID','DEFENCE_ID','PENSIONER_CARD','BIRTH_CERTIFICATE','OTHER') COMMENT 'Accepted Indian identification proof type',
    id_proof_name VARCHAR(150) COMMENT 'Name on identification proof',
    id_proof_number VARCHAR(100) COMMENT 'Identification proof number',
    joining_date DATE NOT NULL,
    permanent_address TEXT,
    permanent_city_district VARCHAR(100),
    permanent_state VARCHAR(100),
    permanent_pincode VARCHAR(10),
    temporary_address TEXT,
    temporary_city_district VARCHAR(100),
    temporary_state VARCHAR(100),
    temporary_pincode VARCHAR(10),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_employee_code (employee_code),
    INDEX idx_department (department),
    INDEX idx_email (email),
    INDEX idx_active (is_active),
    INDEX idx_joining_date (joining_date)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Employee master data with department assignment';

CREATE TABLE employee_salary (
    salary_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    company_name VARCHAR(150) NOT NULL DEFAULT 'TCV',
    salary_month TINYINT NOT NULL CHECK (salary_month BETWEEN 1 AND 12),
    salary_year SMALLINT NOT NULL CHECK (salary_year >= 2000),
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    salary_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (salary_amount >= 0),
    earnings_total DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (earnings_total >= 0),
    deductions_total DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (deductions_total >= 0),
    net_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
    status ENUM('DRAFT','FINAL') NOT NULL DEFAULT 'FINAL',
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    UNIQUE KEY uk_employee_salary_month (employee_id, salary_month, salary_year),
    INDEX idx_employee_id (employee_id),
    INDEX idx_salary_period (salary_year, salary_month),
    INDEX idx_period_start_date (period_start_date)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Employee monthly salary slip header';

CREATE TABLE employee_salary_items (
    salary_item_id INT AUTO_INCREMENT PRIMARY KEY,
    salary_id INT NOT NULL,
    item_type ENUM('EARNING','DEDUCTION') NOT NULL DEFAULT 'EARNING',
    line_no SMALLINT NOT NULL,
    description VARCHAR(200) NOT NULL,
    qty DECIMAL(10,2) NOT NULL DEFAULT 1 CHECK (qty >= 0),
    price DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    total DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (salary_id) REFERENCES employee_salary(salary_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_salary_id (salary_id),
    INDEX idx_item_type (item_type)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Employee salary slip earning and deduction lines';

CREATE TABLE employee_attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('PRESENT','ABSENT','HALF_DAY','LEAVE','HOLIDAY') NOT NULL DEFAULT 'PRESENT',
    check_in TIME,
    check_out TIME,
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    UNIQUE KEY uk_employee_attendance_date (employee_id, attendance_date),
    INDEX idx_attendance_date (attendance_date),
    INDEX idx_attendance_status (status)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Daily employee attendance records';

-- =====================================================
-- 3. BRANDS
-- =====================================================

CREATE TABLE brands (
    brand_id INT AUTO_INCREMENT PRIMARY KEY,
    brand_name VARCHAR(100) NOT NULL UNIQUE,
    brand_code VARCHAR(20) UNIQUE,
    description VARCHAR(255),
    logo_url VARCHAR(255),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_brand_name (brand_name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Product brands master';

-- =====================================================
-- 4. CATEGORIES (Hierarchical)
-- =====================================================

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(150) NOT NULL,
    parent_id INT COMMENT 'For hierarchical categories (NULL for root)',
    level INT NOT NULL DEFAULT 1 COMMENT '1=Root, 2=Sub-category, etc.',
    slug VARCHAR(200) UNIQUE COMMENT 'URL-friendly identifier',
    sort_order SMALLINT NOT NULL DEFAULT 0,
    description TEXT,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES categories(category_id) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX idx_parent_id (parent_id),
    INDEX idx_level (level),
    INDEX idx_slug (slug),
    INDEX idx_active (is_active),
    INDEX idx_parent_active (parent_id, is_active)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Hierarchical product categories';

-- =====================================================
-- 5. PRODUCTS
-- =====================================================

CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    product_code VARCHAR(100) NOT NULL UNIQUE COMMENT 'SKU/Product code',
    brand_id INT COMMENT 'Brand foreign key',
    category_id INT COMMENT 'Category foreign key',
    barcode VARCHAR(100) UNIQUE,
    description TEXT,
    product_type ENUM('MATERIAL','SERVICE','LABOR') NOT NULL DEFAULT 'MATERIAL' COMMENT 'MATERIAL affects stock; SERVICE/LABOR are billable only',
    purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
    selling_price DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
    gst_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (gst_percent >= 0 AND gst_percent <= 100),
    hsn_code VARCHAR(50) COMMENT 'GST HSN code',
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS' COMMENT 'Unit of measurement (PCS, BOX, etc.)',
    reorder_level DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    status ENUM('ACTIVE','INACTIVE','DISCONTINUED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (brand_id) REFERENCES brands(brand_id) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    
    UNIQUE KEY uk_product_code (product_code),
    INDEX idx_brand_id (brand_id),
    INDEX idx_category_id (category_id),
    INDEX idx_product_code (product_code),
    INDEX idx_status (status),
    INDEX idx_reorder (reorder_level, status)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Product catalog with pricing and classification';

-- =====================================================
-- 6. SUPPLIERS
-- =====================================================

CREATE TABLE suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL UNIQUE,
    contact_person VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    email VARCHAR(100),
    gst_no VARCHAR(15) COMMENT 'GST registration number',
    pan_no VARCHAR(10),
    address TEXT NOT NULL,
     state VARCHAR(100) NOT NULL,
    city_district VARCHAR(100) NOT NULL,       
    pincode VARCHAR(10),
    opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Supplier credit balance',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    payment_terms VARCHAR(100) COMMENT 'e.g., Net 30, 2/10 Net 30',
    bank_account_no VARCHAR(20),
    bank_name VARCHAR(100),
    ifsc_code VARCHAR(11),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_supplier_name (supplier_name),
    INDEX idx_gst_no (gst_no),
    INDEX idx_city (city_district),
    INDEX idx_active (is_active),
    INDEX idx_email (email)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Supplier master data with payment terms';

-- =====================================================
-- 7. CUSTOMERS
-- =====================================================

CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    salutation ENUM('Mr/Mrs/Ms','Mr.','Mrs.','Ms.','M/S') NOT NULL DEFAULT 'Mr/Mrs/Ms',
    customer_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    email VARCHAR(100),
    gst_no VARCHAR(15),
    customer_type ENUM('RETAIL','WHOLESALE','DEALER','CORPORATE','SERVICE') NOT NULL DEFAULT 'RETAIL',
    marketing_employee_id INT COMMENT 'Employee who canvassed or brought this customer account',
    referral_details VARCHAR(255) COMMENT 'Referral person name and contact number',
    address TEXT NOT NULL,
    city_district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10),
    credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
    opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Customer credit balance',
    outstanding_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (marketing_employee_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX idx_customer_name (customer_name),
    INDEX idx_salutation (salutation),
    INDEX idx_customer_type (customer_type),
    INDEX idx_marketing_employee_id (marketing_employee_id),
    INDEX idx_city (city_district),
    INDEX idx_active (is_active),
    INDEX idx_email (email),
    INDEX idx_phone (phone)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Customer master data with credit management';

-- =====================================================
-- 8. PURCHASE MASTER
-- =====================================================

CREATE TABLE purchase_master (
    purchase_id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_no VARCHAR(50) NOT NULL UNIQUE COMMENT 'Purchase order number',
    supplier_id INT NOT NULL,
    invoice_no VARCHAR(50) COMMENT 'Supplier invoice number',
    invoice_date DATE,
    purchase_date DATE NOT NULL DEFAULT (CURDATE()),
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    net_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    purchase_status ENUM('DRAFT','RECEIVED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
    payment_status ENUM('PENDING','PARTIAL','PAID') NOT NULL DEFAULT 'PENDING',
    remarks TEXT,
    received_date DATE,
    created_by_employee_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON UPDATE CASCADE,
    FOREIGN KEY (created_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    
    UNIQUE KEY uk_purchase_no (purchase_no),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_purchase_date (purchase_date),
    INDEX idx_purchase_status (purchase_status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_supplier_status (supplier_id, purchase_status)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Purchase order header from suppliers';

-- =====================================================
-- 9. PURCHASE ITEMS
-- =====================================================

CREATE TABLE purchase_items (
    purchase_item_id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT NOT NULL,
    product_id INT NOT NULL,
    qty DECIMAL(10,2) NOT NULL CHECK (qty > 0),
    purchase_price DECIMAL(12,2) NOT NULL CHECK (purchase_price >= 0),
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (tax_percent >= 0),
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0) COMMENT 'Line total',
    received_qty DECIMAL(10,2) DEFAULT 0 COMMENT 'Actual qty received',
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (purchase_id) REFERENCES purchase_master(purchase_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON UPDATE CASCADE,
    
    INDEX idx_purchase_id (purchase_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Line items for each purchase order';

-- =====================================================
-- 10. STOCK MASTER
-- =====================================================

CREATE TABLE stock_master (
    stock_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL UNIQUE,
    available_qty DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (available_qty >= 0),
    reserved_qty DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Qty in work orders',
    minimum_stock DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
    maximum_stock DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (maximum_stock >= 0),
    reorder_qty DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Suggest purchase qty',
    last_purchase_price DECIMAL(12,2),
    last_sale_price DECIMAL(12,2),
    last_stock_check_date DATE,
    remarks TEXT,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(product_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    INDEX idx_available_qty (available_qty),
    INDEX idx_below_minimum (available_qty, minimum_stock),
    INDEX idx_last_updated (last_updated)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Current stock levels for each product';

-- =====================================================
-- 11. STOCK LEDGER
-- =====================================================

CREATE TABLE stock_ledger (
    stock_ledger_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Immutable audit trail',
    product_id INT NOT NULL,
    transaction_type ENUM('PURCHASE','SALE','RETURN','ADJUSTMENT','INSTALLATION','SCRAP') NOT NULL,
    transaction_id INT COMMENT 'Reference to source document ID',
    reference_no VARCHAR(100) COMMENT 'PO#, Invoice#, etc.',
    qty_in DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (qty_in >= 0),
    qty_out DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (qty_out >= 0),
    balance_qty DECIMAL(10,2) NOT NULL COMMENT 'Stock after this transaction',
    unit_cost DECIMAL(12,2),
    remarks TEXT,
    recorded_by_employee_id INT,
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON UPDATE CASCADE,
    FOREIGN KEY (recorded_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    
    INDEX idx_product_id (product_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_product_date (product_id, transaction_date),
    INDEX idx_reference (reference_no)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Immutable stock transaction history';

-- =====================================================
-- 12. QUOTATION MASTER
-- =====================================================

CREATE TABLE quotation_master (
    quotation_id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_no VARCHAR(50) NOT NULL UNIQUE,
    quotation_version INT NOT NULL DEFAULT 1 COMMENT 'Incremented whenever quotation is revised',
    quotation_date DATE NOT NULL DEFAULT (CURDATE()),
    valid_until DATE COMMENT 'Quote expiry date',
    customer_id INT NOT NULL,
    prepared_by_employee_id INT,
    approved_by_employee_id INT,
    requirement_details TEXT COMMENT 'Customer requirements/site details',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    discount_percent DECIMAL(5,2) DEFAULT 0,
    cgst_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (cgst_percent >= 0),
    sgst_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (sgst_percent >= 0),
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    net_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
    quotation_status ENUM('DRAFT','SENT','APPROVED','REJECTED','EXPIRED','CONVERTED') NOT NULL DEFAULT 'DRAFT',
    sent_date DATE,
    approved_date DATE,
    rejected_reason TEXT,
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON UPDATE CASCADE,
    FOREIGN KEY (prepared_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    
    UNIQUE KEY uk_quotation_no (quotation_no),
    INDEX idx_customer_id (customer_id),
    INDEX idx_quotation_date (quotation_date),
    INDEX idx_status (quotation_status),
    INDEX idx_valid_until (valid_until),
    INDEX idx_customer_status (customer_id, quotation_status)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Customer quotations/proposals';

-- =====================================================
-- 13. QUOTATION ITEMS
-- =====================================================

CREATE TABLE quotation_items (
    quotation_item_id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT NOT NULL,
    product_id INT COMMENT 'NULL for custom items',
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    qty DECIMAL(10,2) NOT NULL CHECK (qty > 0),
    selling_price DECIMAL(12,2) NOT NULL CHECK (selling_price >= 0),
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (tax_percent >= 0),
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    notes TEXT,
    line_no SMALLINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (quotation_id) REFERENCES quotation_master(quotation_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX idx_quotation_id (quotation_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Line items in each quotation';

-- =====================================================
-- 14. WORKFLOW APPROVALS
-- =====================================================

CREATE TABLE workflow_approvals (
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

    FOREIGN KEY (requested_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,

    UNIQUE KEY uk_workflow_reference (module_name, reference_id),
    INDEX idx_module_status (module_name, workflow_status),
    INDEX idx_reference_no (reference_no)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Approval queue for draft business documents such as quotations';

-- =====================================================
-- 15. WORK ORDERS / INSTALLATION
-- =====================================================

CREATE TABLE work_orders (
    work_order_id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_no VARCHAR(50) NOT NULL UNIQUE,
    quotation_id INT COMMENT 'Source quotation',
    customer_id INT NOT NULL,
    work_type ENUM('INSTALLATION','SERVICE','REPAIR','MAINTENANCE','OTHER') NOT NULL DEFAULT 'INSTALLATION',
    work_status ENUM('PENDING','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
    priority ENUM('LOW','MEDIUM','HIGH','URGENT') DEFAULT 'MEDIUM',
    start_date DATE,
    completion_date DATE,
    site_address TEXT NOT NULL,
    site_contact_person VARCHAR(100),
    site_contact_phone VARCHAR(20),
    work_notes TEXT COMMENT 'Work description and special instructions',
    assigned_to_employee_id INT,
    supervisor_id INT COMMENT 'Field supervisor',
    created_by_employee_id INT,
    completion_remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (quotation_id) REFERENCES quotation_master(quotation_id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON UPDATE CASCADE,
    FOREIGN KEY (assigned_to_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    FOREIGN KEY (supervisor_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    
    UNIQUE KEY uk_work_order_no (work_order_no),
    INDEX idx_quotation_id (quotation_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_work_status (work_status),
    INDEX idx_start_date (start_date),
    INDEX idx_work_type_status (work_type, work_status)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Installation and service work orders';

-- =====================================================
-- 15. WORK ORDER EMPLOYEES
-- =====================================================

CREATE TABLE work_order_employees (
    work_order_employee_id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    employee_id INT NOT NULL,
    assigned_date DATE NOT NULL DEFAULT (CURDATE()),
    role_in_work VARCHAR(100) COMMENT 'Technician, Helper, Supervisor, etc.',
    status ENUM('ASSIGNED','STARTED','COMPLETED','REMOVED') NOT NULL DEFAULT 'ASSIGNED',
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES work_orders(work_order_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON UPDATE CASCADE,
    
    UNIQUE KEY uk_work_order_employee (work_order_id, employee_id),
    INDEX idx_work_order_id (work_order_id),
    INDEX idx_employee_id (employee_id),
    INDEX idx_status (status)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Employee assignment to work orders';

-- =====================================================
-- 16. WORK ORDER ITEMS
-- =====================================================

CREATE TABLE work_order_items (
    work_order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    quotation_item_id INT COMMENT 'Source quotation item if created from quotation',
    product_id INT COMMENT 'NULL for custom work items',
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    qty DECIMAL(10,2) NOT NULL CHECK (qty > 0),
    selling_price DECIMAL(12,2) NOT NULL CHECK (selling_price >= 0),
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (tax_percent >= 0),
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    line_no SMALLINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (work_order_id) REFERENCES work_orders(work_order_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (quotation_item_id) REFERENCES quotation_items(quotation_item_id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_work_order_id (work_order_id),
    INDEX idx_product_id (product_id),
    INDEX idx_quotation_item_id (quotation_item_id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Billable work items used to create invoices after work completion';

-- =====================================================
-- 17. MATERIAL MASTER
-- =====================================================

CREATE TABLE material_master (
    material_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT COMMENT 'Optional linked inventory product',
    material_code VARCHAR(50) NOT NULL UNIQUE,
    material_name VARCHAR(200) NOT NULL,
    description TEXT,
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    standard_rate DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (standard_rate >= 0),
    gst_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (gst_percent >= 0),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_material_code (material_code),
    INDEX idx_material_name (material_name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Material catalog for work order issue and return';

-- =====================================================
-- 18. WORK ORDER MATERIAL ISSUES
-- =====================================================

CREATE TABLE work_order_material_issues (
    issue_id INT AUTO_INCREMENT PRIMARY KEY,
    issue_no VARCHAR(50) NOT NULL UNIQUE,
    work_order_id INT NOT NULL,
    material_id INT,
    product_id INT COMMENT 'Inventory product issued',
    issued_qty DECIMAL(10,2) NOT NULL CHECK (issued_qty > 0),
    issued_date DATE NOT NULL DEFAULT (CURDATE()),
    issued_to_employee_id INT,
    issued_by_employee_id INT,
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (work_order_id) REFERENCES work_orders(work_order_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (material_id) REFERENCES material_master(material_id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (issued_to_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    FOREIGN KEY (issued_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,

    INDEX idx_work_order_id (work_order_id),
    INDEX idx_material_id (material_id),
    INDEX idx_product_id (product_id),
    INDEX idx_issued_date (issued_date)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Materials issued against work orders';

-- =====================================================
-- 19. WORK ORDER MATERIAL RETURNS
-- =====================================================

CREATE TABLE work_order_material_returns (
    return_id INT AUTO_INCREMENT PRIMARY KEY,
    return_no VARCHAR(50) NOT NULL UNIQUE,
    issue_id INT,
    work_order_id INT NOT NULL,
    material_id INT,
    product_id INT,
    returned_qty DECIMAL(10,2) NOT NULL CHECK (returned_qty > 0),
    return_date DATE NOT NULL DEFAULT (CURDATE()),
    returned_by_employee_id INT,
    received_by_employee_id INT,
    condition_status ENUM('GOOD','DAMAGED','SCRAP') NOT NULL DEFAULT 'GOOD',
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (issue_id) REFERENCES work_order_material_issues(issue_id) ON DELETE SET NULL,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(work_order_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (material_id) REFERENCES material_master(material_id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (returned_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    FOREIGN KEY (received_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,

    INDEX idx_issue_id (issue_id),
    INDEX idx_work_order_id (work_order_id),
    INDEX idx_return_date (return_date)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Returned material tracking after work completion';

-- =====================================================
-- 20. SALES MASTER (INVOICES)
-- =====================================================

CREATE TABLE sales_master (
    sales_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_no VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL DEFAULT (CURDATE()),
    customer_id INT NOT NULL,
    quotation_id INT COMMENT 'Source quotation (if any)',
    work_order_id INT COMMENT 'Associated work order (if any)',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    net_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_mode ENUM('CASH','CARD','UPI','BANK','CHEQUE','CREDIT') DEFAULT 'CREDIT',
    payment_status ENUM('PENDING','PARTIAL','PAID','OVERDUE') NOT NULL DEFAULT 'PENDING',
    sales_status ENUM('DRAFT','COMPLETED','CANCELLED','RETURNED') NOT NULL DEFAULT 'DRAFT',
    due_date DATE COMMENT 'Payment due date',
    remarks TEXT,
    created_by_employee_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON UPDATE CASCADE,
    FOREIGN KEY (quotation_id) REFERENCES quotation_master(quotation_id) ON DELETE SET NULL,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(work_order_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    
    UNIQUE KEY uk_invoice_no (invoice_no),
    INDEX idx_customer_id (customer_id),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_sales_status (sales_status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_due_date (due_date),
    INDEX idx_customer_status (customer_id, sales_status),
    INDEX idx_invoice_date_status (invoice_date, payment_status)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Sales invoices';

-- =====================================================
-- 17. SALES ITEMS
-- =====================================================

CREATE TABLE sales_items (
    sales_item_id INT AUTO_INCREMENT PRIMARY KEY,
    sales_id INT NOT NULL,
    product_id INT COMMENT 'NULL for custom items',
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    qty DECIMAL(10,2) NOT NULL CHECK (qty > 0),
    selling_price DECIMAL(12,2) NOT NULL CHECK (selling_price >= 0),
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (tax_percent >= 0),
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    line_no SMALLINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sales_id) REFERENCES sales_master(sales_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX idx_sales_id (sales_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Line items in each sales invoice';

-- =====================================================
-- 18. CUSTOMER PAYMENTS
-- =====================================================

CREATE TABLE customer_payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    sales_id INT COMMENT 'Against which invoice',
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT (CURDATE()),
    payment_mode ENUM('CASH','CARD','UPI','BANK','CHEQUE','ONLINE') NOT NULL,
    reference_no VARCHAR(100) COMMENT 'Cheque/Receipt/Transaction number',
    payment_against ENUM('INVOICE','ADVANCE','ADJUSTMENT') DEFAULT 'INVOICE',
    narration TEXT,
    received_by_employee_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON UPDATE CASCADE,
    FOREIGN KEY (sales_id) REFERENCES sales_master(sales_id) ON DELETE SET NULL,
    FOREIGN KEY (received_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    
    INDEX idx_customer_id (customer_id),
    INDEX idx_sales_id (sales_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_reference_no (reference_no)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Customer payment records';

-- =====================================================
-- 19. SUPPLIER PAYMENTS
-- =====================================================

CREATE TABLE supplier_payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    purchase_id INT COMMENT 'Against which PO',
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT (CURDATE()),
    payment_mode ENUM('CASH','CARD','UPI','BANK','CHEQUE','ONLINE') NOT NULL,
    reference_no VARCHAR(100) COMMENT 'Cheque/Transaction number',
    narration TEXT,
    paid_by_employee_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON UPDATE CASCADE,
    FOREIGN KEY (purchase_id) REFERENCES purchase_master(purchase_id) ON DELETE SET NULL,
    FOREIGN KEY (paid_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_purchase_id (purchase_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_reference_no (reference_no)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Supplier payment records';

-- =====================================================
-- 20. SERVICE TICKETS
-- =====================================================

CREATE TABLE service_tickets (
    service_ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_no VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    product_id INT COMMENT 'Product under service',
    sales_id INT COMMENT 'Related sales invoice',
    assigned_to_employee_id INT,
    complaint_details TEXT NOT NULL,
    service_status ENUM('OPEN','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED','CANCELLED') NOT NULL DEFAULT 'OPEN',
    priority ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
    opened_date DATE NOT NULL DEFAULT (CURDATE()),
    closed_date DATE,
    resolution_notes TEXT,
    resolution_time_hours INT COMMENT 'Time to resolve',
    created_by_employee_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON UPDATE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL,
    FOREIGN KEY (sales_id) REFERENCES sales_master(sales_id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL,
    
    UNIQUE KEY uk_ticket_no (ticket_no),
    INDEX idx_customer_id (customer_id),
    INDEX idx_service_status (service_status),
    INDEX idx_priority (priority),
    INDEX idx_opened_date (opened_date),
    INDEX idx_assigned_to (assigned_to_employee_id),
    INDEX idx_status_priority (service_status, priority)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Customer service tickets';

-- =====================================================
-- 21. WARRANTY MASTER
-- =====================================================

CREATE TABLE warranty_master (
    warranty_id INT AUTO_INCREMENT PRIMARY KEY,
    warranty_no VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    sales_id INT,
    product_id INT NOT NULL,
    serial_no VARCHAR(100) COMMENT 'Product serial number',
    warranty_start_date DATE NOT NULL DEFAULT (CURDATE()),
    warranty_end_date DATE NOT NULL,
    warranty_type ENUM('MANUFACTURER','EXTENDED','VOID') DEFAULT 'MANUFACTURER',
    warranty_status ENUM('ACTIVE','EXPIRED','CLAIMED','VOID') NOT NULL DEFAULT 'ACTIVE',
    coverage_type VARCHAR(100) COMMENT 'Parts, Labor, Both',
    warranty_cost DECIMAL(12,2) DEFAULT 0,
    claims_count INT DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON UPDATE CASCADE,
    FOREIGN KEY (sales_id) REFERENCES sales_master(sales_id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON UPDATE CASCADE,
    
    UNIQUE KEY uk_warranty_no (warranty_no),
    UNIQUE KEY uk_serial_no (serial_no),
    INDEX idx_customer_id (customer_id),
    INDEX idx_warranty_status (warranty_status),
    INDEX idx_warranty_end_date (warranty_end_date),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Product warranty tracking';

-- =====================================================
-- 22. AUDIT LOG (Optional but Recommended)
-- =====================================================

CREATE TABLE audit_log (
    audit_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Immutable audit trail',
    user_id INT,
    module VARCHAR(100) COMMENT 'e.g., SALES, PURCHASE, INVENTORY',
    action VARCHAR(50) COMMENT 'CREATE, UPDATE, DELETE',
    table_name VARCHAR(100),
    record_id INT,
    old_values JSON COMMENT 'Previous values as JSON',
    new_values JSON COMMENT 'Updated values as JSON',
    ip_address VARCHAR(45),
    browser_info VARCHAR(255),
    change_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_module (module),
    INDEX idx_table_name (table_name),
    INDEX idx_created_at (created_at),
    INDEX idx_record (table_name, record_id)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Audit trail for regulatory compliance';

-- =====================================================
-- INDEX SUMMARY FOR PERFORMANCE
-- =====================================================
-- Total Indexes: 80+ covering all major queries
-- Key index strategies:
-- 1. Primary key on all tables
-- 2. Foreign key indexes on all relationships
-- 3. Status/state columns indexed for filtering
-- 4. Date columns indexed for reporting
-- 5. Composite indexes for common filters
-- 6. Search columns (name, code) indexed
-- =====================================================

-- =====================================================
-- SAMPLE DATA (Optional)
-- =====================================================

-- Insert Admin User
INSERT IGNORE INTO users (username, password, email, first_name, last_name, role, is_active)
VALUES ('admin', '$2b$10$', 'admin@tcv.com', 'Admin', 'User', 'ADMIN', 1);

-- Category parent options are handled by the frontend dropdown:
-- CCTV, CATV, Internet, Solar, Other.
-- The selected parent is inserted on first category save if it is not already available.

-- =====================================================
-- DATABASE CONSTRAINTS SUMMARY
-- =====================================================
-- CHECK Constraints:
--   - All price/amount fields >= 0
--   - Tax percentages 0-100
--   - Quantities > 0
-- 
-- FOREIGN KEY Constraints:
--   - Hierarchical: categories → categories
--   - Transactional: purchase_items → purchase_master + products
--   - Relational: All entities linked to customers/suppliers
--   - Audit: transactions linked to employees
--
-- UNIQUE Constraints:
--   - Business identifiers: username, email, product_code, etc.
--   - Document numbers: invoice_no, purchase_no, ticket_no, etc.
--
-- ENUM Constraints:
--   - Predefined statuses and categories
--   - Prevents invalid state values
-- =====================================================

-- =====================================================
-- WORKFLOW BUSINESS LOGIC NOTES
-- =====================================================
-- 
-- 1. QUOTATION TO SALES WORKFLOW:
--    quotation_master (APPROVED) 
--    → work_orders (create if needed)
--    → sales_master (COMPLETED)
--    → stock_ledger (OUT)
--    → stock_master (reduce)
--
-- 2. PURCHASE WORKFLOW:
--    purchase_master (RECEIVED)
--    → purchase_items (receive)
--    → stock_master (increase)
--    → stock_ledger (IN)
--    → supplier_payments (record)
--
-- 3. SERVICE WORKFLOW:
--    service_tickets (OPEN)
--    → work_order_employees (assign)
--    → service_tickets (RESOLVED)
--    → warranty_master (if applicable)
--
-- 4. PAYMENT WORKFLOWS:
--    customer_payments → update sales_master.paid_amount
--    supplier_payments → update purchase_master.paid_amount
--
-- 5. STOCK MANAGEMENT:
--    - Stock cannot go negative
--    - Adjustments require approval
--    - Ledger is immutable (audit trail)
-- =====================================================

-- End of Database Schema Definition
