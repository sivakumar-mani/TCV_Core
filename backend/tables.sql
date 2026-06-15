-- =====================================================
-- Inventory, Purchase, Quotation, Work and Sales Schema
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
    product_type ENUM('MATERIAL','SERVICE','LABOR') NOT NULL DEFAULT 'MATERIAL',
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
-- PURCHASE MASTER
-- =====================================================

CREATE TABLE purchase_master (
    purchase_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    purchase_no VARCHAR(50) UNIQUE,
    invoice_no VARCHAR(50),
    invoice_date DATE,
    total_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    balance_amount DECIMAL(12,2) DEFAULT 0,
    purchase_status ENUM('DRAFT','COMPLETED','CANCELLED') DEFAULT 'COMPLETED',
    payment_status ENUM('PENDING','PARTIAL','PAID') DEFAULT 'PENDING',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchase_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
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
    CONSTRAINT fk_purchase_items_purchase
        FOREIGN KEY (purchase_id) REFERENCES purchase_master(purchase_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_purchase_items_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
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
    transaction_type ENUM('PURCHASE','SALE','RETURN','ADJUSTMENT','INSTALLATION') NOT NULL,
    transaction_id INT,
    reference_no VARCHAR(100),
    qty_in DECIMAL(10,2) DEFAULT 0,
    qty_out DECIMAL(10,2) DEFAULT 0,
    balance_qty DECIMAL(10,2) DEFAULT 0,
    remarks TEXT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_ledger_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- =====================================================
-- QUOTATION MASTER
-- Customer requirement is entered here first.
-- After approval, create a work_order/install job.
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
    quotation_status ENUM('DRAFT','SENT','APPROVED','REJECTED','EXPIRED','CONVERTED') DEFAULT 'DRAFT',
    approved_date DATE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_quotation_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_quotation_prepared_by
        FOREIGN KEY (prepared_by_employee_id) REFERENCES employees(employee_id)
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
-- Approved quotation becomes a work order before invoice.
-- =====================================================

CREATE TABLE work_orders (
    work_order_id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_no VARCHAR(50) NOT NULL UNIQUE,
    quotation_id INT,
    customer_id INT NOT NULL,
    work_type ENUM('INSTALLATION','SERVICE','REPAIR','MAINTENANCE','OTHER') DEFAULT 'INSTALLATION',
    work_status ENUM('PENDING','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED') DEFAULT 'PENDING',
    start_date DATE,
    completion_date DATE,
    site_address TEXT,
    work_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_work_orders_quotation
        FOREIGN KEY (quotation_id) REFERENCES quotation_master(quotation_id),
    CONSTRAINT fk_work_orders_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
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
    sales_status ENUM('DRAFT','COMPLETED','CANCELLED') DEFAULT 'COMPLETED',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sales_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_sales_quotation
        FOREIGN KEY (quotation_id) REFERENCES quotation_master(quotation_id),
    CONSTRAINT fk_sales_work_order
        FOREIGN KEY (work_order_id) REFERENCES work_orders(work_order_id)
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
-- RECOMMENDED WORKFLOW
-- =====================================================
-- 1. Create customer requirement in quotation_master and quotation_items.
-- 2. When quote is approved, set quotation_status = 'APPROVED'.
-- 3. Create work_orders from approved quotation and assign employees.
-- 4. On work completion, create sales_master and sales_items invoice.
-- 5. Sales completion should insert stock_ledger OUT rows and reduce stock_master.
-- 6. Purchase completion should insert stock_ledger IN rows and increase stock_master.
