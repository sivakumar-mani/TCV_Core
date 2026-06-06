-- =====================================================
-- TCV Core Consolidated Schema
-- Inventory, Purchase, Quotation, Work, Sales, Workflow
-- MySQL 8+
-- =====================================================

-- =====================================================
-- USERS / LOGIN
-- =====================================================

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(250) NOT NULL,
    email VARCHAR(100) NOT NULL,
    contact_number VARCHAR(50),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role ENUM('ADMIN','MANAGER','EMPLOYEE','SALES','SERVICE') DEFAULT 'ADMIN',
    status TINYINT(1) DEFAULT 1,
    date_registered DATE DEFAULT (CURRENT_DATE),
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_users_username (username),
    UNIQUE KEY uk_users_email (email)
);

INSERT INTO users (
    username,
    password,
    email,
    contact_number,
    first_name,
    last_name,
    date_registered,
    last_login,
    role,
    status
) VALUES (
    'tcvadmin',
    'Tcv@1234',
    'timecablevision@gmail.com',
    'sivakumar',
    'Siva',
    'Kumar',
    '2025-11-10',
    '2025-11-10 00:00:00',
    'ADMIN',
    1
);

-- =====================================================
-- EMPLOYEES
-- =====================================================

CREATE TABLE employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    employee_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    email VARCHAR(100),
    designation VARCHAR(100),
    department ENUM('ADMIN','SALES','PURCHASE','STORE','INSTALLATION','SERVICE','ACCOUNTS') DEFAULT 'SERVICE',
    joining_date DATE,
    salary DECIMAL(12,2) DEFAULT 0,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- BRANDS
-- =====================================================

CREATE TABLE brands (
    brand_id INT AUTO_INCREMENT PRIMARY KEY,
    brand_name VARCHAR(100) NOT NULL UNIQUE,
    brand_code VARCHAR(20),
    description VARCHAR(255),
    status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- CATEGORIES
-- =====================================================

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(150) NOT NULL,
    parent_id INT NULL,
    level INT DEFAULT 1,
    slug VARCHAR(200),
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_parent
        FOREIGN KEY (parent_id) REFERENCES categories(category_id)
        ON DELETE SET NULL
);

INSERT INTO categories (category_name, slug, level, parent_id, sort_order) VALUES
    ('CCTV', 'cctv', 1, NULL, 1),
    ('CATV', 'catv', 1, NULL, 2),
    ('Internet', 'internet', 1, NULL, 3),
    ('Solar', 'solar', 1, NULL, 4),
    ('Other', 'other', 1, NULL, 5);

-- =====================================================
-- PRODUCTS
-- =====================================================

CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    brand_id INT,
    category_id INT,
    product_code VARCHAR(100) UNIQUE,
    barcode VARCHAR(100),
    description TEXT,
    purchase_price DECIMAL(12,2) DEFAULT 0,
    selling_price DECIMAL(12,2) DEFAULT 0,
    gst_percent DECIMAL(5,2) DEFAULT 0,
    hsn_code VARCHAR(50),
    unit VARCHAR(20) DEFAULT 'PCS',
    reorder_level DECIMAL(10,2) DEFAULT 0,
    status ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_brand
        FOREIGN KEY (brand_id) REFERENCES brands(brand_id),
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- =====================================================
-- SUPPLIERS
-- =====================================================

CREATE TABLE suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    gst_no VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    opening_balance DECIMAL(12,2) DEFAULT 0,
    status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- CUSTOMERS
-- =====================================================

CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    email VARCHAR(100),
    gst_no VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    customer_type ENUM('RETAIL','WHOLESALE','DEALER','CORPORATE') DEFAULT 'RETAIL',
    credit_limit DECIMAL(12,2) DEFAULT 0,
    opening_balance DECIMAL(12,2) DEFAULT 0,
    status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- NUMBER SERIES
-- Common document number generator
-- =====================================================

CREATE TABLE number_series (
    series_id INT AUTO_INCREMENT PRIMARY KEY,
    module_code VARCHAR(30) NOT NULL,
    prefix VARCHAR(20) NOT NULL,
    financial_year VARCHAR(20),
    next_number INT NOT NULL DEFAULT 1,
    padding_length INT NOT NULL DEFAULT 5,
    status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_number_series_module_year (module_code, financial_year)
);

-- =====================================================
-- APPROVAL WORKFLOW
-- One approval screen for top management
-- =====================================================

CREATE TABLE approval_requests (
    approval_request_id INT AUTO_INCREMENT PRIMARY KEY,
    module_name ENUM(
        'PURCHASE',
        'QUOTATION',
        'WORK_ORDER',
        'MATERIAL_ISSUE',
        'MATERIAL_RETURN',
        'SALES',
        'PRODUCT_PRICE'
    ) NOT NULL,
    record_id INT NOT NULL,
    request_no VARCHAR(50),
    approval_status ENUM('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED') DEFAULT 'SUBMITTED',
    requested_by INT,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_by INT,
    approved_at DATETIME,
    rejected_by INT,
    rejected_at DATETIME,
    remarks TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_approval_requested_by
        FOREIGN KEY (requested_by) REFERENCES users(user_id),
    CONSTRAINT fk_approval_approved_by
        FOREIGN KEY (approved_by) REFERENCES users(user_id),
    CONSTRAINT fk_approval_rejected_by
        FOREIGN KEY (rejected_by) REFERENCES users(user_id),
    INDEX idx_approval_module_record (module_name, record_id),
    INDEX idx_approval_status (approval_status)
);

CREATE TABLE approval_history (
    approval_history_id INT AUTO_INCREMENT PRIMARY KEY,
    approval_request_id INT NOT NULL,
    action ENUM('SUBMITTED','APPROVED','REJECTED','CANCELLED','REOPENED') NOT NULL,
    action_by INT,
    action_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    CONSTRAINT fk_approval_history_request
        FOREIGN KEY (approval_request_id) REFERENCES approval_requests(approval_request_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_approval_history_user
        FOREIGN KEY (action_by) REFERENCES users(user_id)
);

-- =====================================================
-- PURCHASE MASTER
-- =====================================================

CREATE TABLE purchase_master (
    purchase_id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_no VARCHAR(50) UNIQUE,
    supplier_id INT NOT NULL,
    invoice_no VARCHAR(50),
    invoice_date DATE,
    total_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    balance_amount DECIMAL(12,2) DEFAULT 0,
    purchase_status ENUM('DRAFT','SUBMITTED','APPROVED','COMPLETED','CANCELLED') DEFAULT 'DRAFT',
    payment_status ENUM('PENDING','PARTIAL','PAID') DEFAULT 'PENDING',
    approval_request_id INT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchase_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
    CONSTRAINT fk_purchase_approval FOREIGN KEY (approval_request_id) REFERENCES approval_requests(approval_request_id)
);

-- =====================================================
-- PURCHASE ITEMS
-- =====================================================

CREATE TABLE purchase_items (
    purchase_item_id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT NOT NULL,
    product_id INT NOT NULL,
    qty DECIMAL(10,2) NOT NULL,
    purchase_price DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    amount DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_purchase_items_purchase FOREIGN KEY (purchase_id) REFERENCES purchase_master(purchase_id) ON DELETE CASCADE,
    CONSTRAINT fk_purchase_items_product FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- =====================================================
-- PRODUCT PRICE HISTORY
-- Track purchase-based selling price changes
-- =====================================================

CREATE TABLE product_price_history (
    price_history_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    purchase_item_id INT,
    old_purchase_price DECIMAL(12,2) DEFAULT 0,
    new_purchase_price DECIMAL(12,2) DEFAULT 0,
    old_selling_price DECIMAL(12,2) DEFAULT 0,
    suggested_selling_price DECIMAL(12,2) DEFAULT 0,
    approved_selling_price DECIMAL(12,2) DEFAULT 0,
    margin_percent DECIMAL(5,2) DEFAULT 0,
    approval_status ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
    approved_by INT,
    approved_at DATETIME,
    remarks TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_price_history_product
        FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT fk_price_history_purchase_item
        FOREIGN KEY (purchase_item_id) REFERENCES purchase_items(purchase_item_id),
    CONSTRAINT fk_price_history_approved_by
        FOREIGN KEY (approved_by) REFERENCES users(user_id),
    CONSTRAINT fk_price_history_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- =====================================================
-- STOCK MASTER
-- =====================================================

CREATE TABLE stock_master (
    product_id INT PRIMARY KEY,
    available_qty DECIMAL(10,2) DEFAULT 0,
    minimum_stock DECIMAL(10,2) DEFAULT 0,
    maximum_stock DECIMAL(10,2) DEFAULT 0,
    remarks TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_master_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- =====================================================
-- STOCK LEDGER
-- =====================================================

CREATE TABLE stock_ledger (
    stock_ledger_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    transaction_type ENUM(
        'PURCHASE',
        'SALE',
        'MATERIAL_ISSUE',
        'MATERIAL_RETURN',
        'RETURN',
        'ADJUSTMENT',
        'INSTALLATION'
    ) NOT NULL,
    transaction_id INT,
    source_table VARCHAR(50),
    source_item_id INT,
    reference_no VARCHAR(100),
    qty_in DECIMAL(10,2) DEFAULT 0,
    qty_out DECIMAL(10,2) DEFAULT 0,
    balance_qty DECIMAL(10,2) DEFAULT 0,
    remarks TEXT,
    created_by INT,
    transaction_status ENUM('POSTED','REVERSED','CANCELLED') DEFAULT 'POSTED',
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_ledger_product
        FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT fk_stock_ledger_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- =====================================================
-- QUOTATION MASTER
-- Customer requirement is entered here first.
-- After approval, create a work order/install job.
-- After work completion, create the sales invoice.
-- =====================================================

CREATE TABLE quotation_master (
    quotation_id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_no VARCHAR(50) NOT NULL UNIQUE,
    quotation_date DATE NOT NULL,
    valid_until DATE,
    customer_id INT NOT NULL,
    prepared_by_employee_id INT,
    requirement_details TEXT,
    total_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) DEFAULT 0,
    quotation_status ENUM('DRAFT','SUBMITTED','APPROVED','REJECTED','EXPIRED','CONVERTED') DEFAULT 'DRAFT',
    approval_request_id INT,
    revised_from_quotation_id INT,
    revision_no INT DEFAULT 0,
    approved_date DATE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_quotation_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_quotation_prepared_by
        FOREIGN KEY (prepared_by_employee_id) REFERENCES employees(employee_id),
    CONSTRAINT fk_quotation_approval
        FOREIGN KEY (approval_request_id) REFERENCES approval_requests(approval_request_id),
    INDEX idx_quotation_revision (revised_from_quotation_id, revision_no)
);

-- =====================================================
-- QUOTATION ITEMS
-- =====================================================

CREATE TABLE quotation_items (
    quotation_item_id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT NOT NULL,
    product_id INT,
    item_name VARCHAR(200),
    description TEXT,
    qty DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    amount DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_quotation_items_quotation
        FOREIGN KEY (quotation_id) REFERENCES quotation_master(quotation_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_quotation_items_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- =====================================================
-- WORK ORDERS / INSTALLATION
-- =====================================================

CREATE TABLE work_orders (
    work_order_id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_no VARCHAR(50) NOT NULL UNIQUE,
    quotation_id INT,
    customer_id INT NOT NULL,
    work_type ENUM('INSTALLATION','SERVICE','REPAIR','MAINTENANCE','OTHER') DEFAULT 'INSTALLATION',
    work_status ENUM('PENDING','SUBMITTED','APPROVED','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED') DEFAULT 'PENDING',
    approval_request_id INT,
    start_date DATE,
    completion_date DATE,
    site_address TEXT,
    work_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_work_orders_quotation
        FOREIGN KEY (quotation_id) REFERENCES quotation_master(quotation_id),
    CONSTRAINT fk_work_orders_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_work_orders_approval
        FOREIGN KEY (approval_request_id) REFERENCES approval_requests(approval_request_id)
);

CREATE TABLE work_order_employees (
    work_order_employee_id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    employee_id INT NOT NULL,
    assigned_date DATE DEFAULT (CURRENT_DATE),
    role_in_work VARCHAR(100),
    status ENUM('ASSIGNED','STARTED','COMPLETED','REMOVED') DEFAULT 'ASSIGNED',
    remarks TEXT,
    CONSTRAINT fk_work_order_employees_work_order
        FOREIGN KEY (work_order_id) REFERENCES work_orders(work_order_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_work_order_employees_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- =====================================================
-- MATERIAL ISSUE
-- Issue stock to work order
-- =====================================================

CREATE TABLE material_issue_master (
    material_issue_id INT AUTO_INCREMENT PRIMARY KEY,
    issue_no VARCHAR(50) NOT NULL UNIQUE,
    issue_date DATE NOT NULL,
    work_order_id INT NOT NULL,
    issued_by INT,
    received_by_employee_id INT,
    issue_status ENUM('DRAFT','SUBMITTED','APPROVED','ISSUED','CANCELLED') DEFAULT 'DRAFT',
    approval_request_id INT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_material_issue_work_order
        FOREIGN KEY (work_order_id) REFERENCES work_orders(work_order_id),
    CONSTRAINT fk_material_issue_issued_by
        FOREIGN KEY (issued_by) REFERENCES users(user_id),
    CONSTRAINT fk_material_issue_received_by
        FOREIGN KEY (received_by_employee_id) REFERENCES employees(employee_id),
    CONSTRAINT fk_material_issue_approval
        FOREIGN KEY (approval_request_id) REFERENCES approval_requests(approval_request_id)
);

CREATE TABLE material_issue_items (
    material_issue_item_id INT AUTO_INCREMENT PRIMARY KEY,
    material_issue_id INT NOT NULL,
    product_id INT NOT NULL,
    requested_qty DECIMAL(10,2) DEFAULT 0,
    issued_qty DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'PCS',
    remarks TEXT,
    CONSTRAINT fk_material_issue_items_master
        FOREIGN KEY (material_issue_id) REFERENCES material_issue_master(material_issue_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_material_issue_items_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- =====================================================
-- MATERIAL RETURN
-- Return unused/damaged stock from work order
-- =====================================================

CREATE TABLE material_return_master (
    material_return_id INT AUTO_INCREMENT PRIMARY KEY,
    return_no VARCHAR(50) NOT NULL UNIQUE,
    return_date DATE NOT NULL,
    work_order_id INT NOT NULL,
    material_issue_id INT,
    returned_by_employee_id INT,
    received_by INT,
    return_status ENUM('DRAFT','SUBMITTED','APPROVED','RETURNED','CANCELLED') DEFAULT 'DRAFT',
    approval_request_id INT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_material_return_work_order
        FOREIGN KEY (work_order_id) REFERENCES work_orders(work_order_id),
    CONSTRAINT fk_material_return_issue
        FOREIGN KEY (material_issue_id) REFERENCES material_issue_master(material_issue_id),
    CONSTRAINT fk_material_return_returned_by
        FOREIGN KEY (returned_by_employee_id) REFERENCES employees(employee_id),
    CONSTRAINT fk_material_return_received_by
        FOREIGN KEY (received_by) REFERENCES users(user_id),
    CONSTRAINT fk_material_return_approval
        FOREIGN KEY (approval_request_id) REFERENCES approval_requests(approval_request_id)
);

CREATE TABLE material_return_items (
    material_return_item_id INT AUTO_INCREMENT PRIMARY KEY,
    material_return_id INT NOT NULL,
    product_id INT NOT NULL,
    returned_qty DECIMAL(10,2) DEFAULT 0,
    damaged_qty DECIMAL(10,2) DEFAULT 0,
    consumed_qty DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'PCS',
    remarks TEXT,
    CONSTRAINT fk_material_return_items_master
        FOREIGN KEY (material_return_id) REFERENCES material_return_master(material_return_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_material_return_items_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- =====================================================
-- SALES MASTER / INVOICE
-- Invoice can be created directly or from quotation/work order.
-- =====================================================

CREATE TABLE sales_master (
    sales_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_no VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    customer_id INT NOT NULL,
    quotation_id INT,
    work_order_id INT,
    total_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    balance_amount DECIMAL(12,2) DEFAULT 0,
    payment_mode ENUM('CASH','CARD','UPI','BANK','CHEQUE','CREDIT'),
    payment_status ENUM('PENDING','PARTIAL','PAID') DEFAULT 'PENDING',
    sales_status ENUM('DRAFT','SUBMITTED','APPROVED','COMPLETED','CANCELLED') DEFAULT 'DRAFT',
    approval_request_id INT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sales_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_sales_quotation
        FOREIGN KEY (quotation_id) REFERENCES quotation_master(quotation_id),
    CONSTRAINT fk_sales_work_order
        FOREIGN KEY (work_order_id) REFERENCES work_orders(work_order_id),
    CONSTRAINT fk_sales_approval
        FOREIGN KEY (approval_request_id) REFERENCES approval_requests(approval_request_id)
);

-- =====================================================
-- SALES ITEMS
-- =====================================================

CREATE TABLE sales_items (
    sales_item_id INT AUTO_INCREMENT PRIMARY KEY,
    sales_id INT NOT NULL,
    product_id INT,
    item_name VARCHAR(200),
    description TEXT,
    qty DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    amount DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_sales_items_sales
        FOREIGN KEY (sales_id) REFERENCES sales_master(sales_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_sales_items_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- =====================================================
-- CUSTOMER PAYMENTS
-- =====================================================

CREATE TABLE customer_payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    sales_id INT,
    amount DECIMAL(12,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_mode ENUM('CASH','CARD','UPI','BANK','CHEQUE') NOT NULL,
    reference_no VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_payments_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_customer_payments_sales
        FOREIGN KEY (sales_id) REFERENCES sales_master(sales_id)
);

-- =====================================================
-- SUPPLIER PAYMENTS
-- =====================================================

CREATE TABLE supplier_payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    purchase_id INT,
    amount DECIMAL(12,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_mode ENUM('CASH','CARD','UPI','BANK','CHEQUE') NOT NULL,
    reference_no VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_supplier_payments_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
    CONSTRAINT fk_supplier_payments_purchase
        FOREIGN KEY (purchase_id) REFERENCES purchase_master(purchase_id)
);

-- =====================================================
-- SERVICE TICKETS
-- =====================================================

CREATE TABLE service_tickets (
    service_ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_no VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    product_id INT,
    assigned_employee_id INT,
    complaint_details TEXT NOT NULL,
    service_status ENUM('OPEN','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED','CANCELLED') DEFAULT 'OPEN',
    priority ENUM('LOW','MEDIUM','HIGH','URGENT') DEFAULT 'MEDIUM',
    opened_date DATE NOT NULL,
    closed_date DATE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_service_tickets_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_service_tickets_product
        FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT fk_service_tickets_employee
        FOREIGN KEY (assigned_employee_id) REFERENCES employees(employee_id)
);

-- =====================================================
-- WARRANTY MASTER
-- =====================================================

CREATE TABLE warranty_master (
    warranty_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    sales_id INT,
    product_id INT NOT NULL,
    serial_no VARCHAR(100),
    warranty_start_date DATE,
    warranty_end_date DATE,
    warranty_status ENUM('ACTIVE','EXPIRED','VOID') DEFAULT 'ACTIVE',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_warranty_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_warranty_sales
        FOREIGN KEY (sales_id) REFERENCES sales_master(sales_id),
    CONSTRAINT fk_warranty_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- =====================================================
-- AUDIT LOG
-- General change tracking for important records
-- =====================================================

CREATE TABLE audit_log (
    audit_log_id INT AUTO_INCREMENT PRIMARY KEY,
    module_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    action ENUM('CREATE','UPDATE','DELETE','APPROVE','REJECT','LOGIN','LOGOUT') NOT NULL,
    old_values JSON,
    new_values JSON,
    action_by INT,
    action_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    CONSTRAINT fk_audit_log_user
        FOREIGN KEY (action_by) REFERENCES users(user_id),
    INDEX idx_audit_module_record (module_name, record_id)
);

-- =====================================================
-- RECOMMENDED WORKFLOW
-- =====================================================
-- 1. Create customer requirement in quotation_master and quotation_items.
-- 2. Submit quotation for approval using approval_requests.
-- 3. When quote is approved, create work_orders.
-- 4. Issue material to work_orders using material_issue_master/items.
-- 5. Material issue inserts stock_ledger OUT rows and reduces stock_master.
-- 6. Return unused material using material_return_master/items.
-- 7. Material return inserts stock_ledger IN rows and increases stock_master.
-- 8. On work completion, create sales_master and sales_items invoice.
-- 9. Sales completion inserts stock_ledger OUT rows and reduces stock_master.
-- 10. Purchase completion inserts stock_ledger IN rows and increases stock_master.
