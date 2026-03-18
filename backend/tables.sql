-- user table
create table user (
    userId int primary key AUTO_INCREMENT,
    userName varchar(250),
    password varchar(250),
    email varchar(100),
    contactNumber varchar(50),
    firstName varchar(100),
    lastName varchar(100),
    dateRegistered date, 
    lastLogin DATETIME, 
    role  varchar(20),
    Status varchar(20),
    UNIQUE(userName,email)
)

insert into user ( username, password, email,contactNumber, firstName, lastName, dateRegistered,lastLogin,role,Status )
values ('tcvadmin','Tcv@1234','timecablevision@gmail.com','sivakumar','m','2025-11-10', '2025-11-10', 'admin','true' );

-- create table brand {
--     brandid int primary key AUTO_INCREMENT,
--     brandName varchar(100),
--     brandCode varchar(100),
--     desription varchar(1000),
--      UNIQUE(brandName)
-- }

-- CREATE TABLE product_brand (
--     brand_id INT AUTO_INCREMENT PRIMARY KEY,
--     brand_code VARCHAR(50),
--     brand_name VARCHAR(150) NOT NULL,
--     manufacturer VARCHAR(150),
--     country_origin VARCHAR(100),
--     description TEXT,
--     website VARCHAR(255),
--     status TINYINT(1) DEFAULT 1,
--     created_by INT,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--     UNIQUE(brandName)
-- );
-- Brand Master
CREATE TABLE brands (
    brand_id INT AUTO_INCREMENT PRIMARY KEY,
    brand_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),   
    created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     status TINYINT(1) DEFAULT 1,
     UNIQUE(brand_name)
);
-- Category Master (Recommended)
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    status TINYINT(1) DEFAULT 1
);

-- Product Master
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    brand_id INT,
    category_id INT,
    unit VARCHAR(20),             -- Nos, Kg, Ltr
    reorder_level INT DEFAULT 0,
    status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (brand_id) REFERENCES brands(brand_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);
-- Supplier Master
CREATE TABLE suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    gst_no VARCHAR(20),
    status TINYINT(1) DEFAULT 1
);

-- Purchase Master (Header)
CREATE TABLE purchase_master (
    purchase_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    invoice_no VARCHAR(50),
    invoice_date DATE,
    total_amount DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

-- Purchase Details (Line Items)
CREATE TABLE purchase_items (
    purchase_item_id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT NOT NULL,
    product_id INT NOT NULL,
    qty DECIMAL(10,2),
    rate DECIMAL(10,2),
    amount DECIMAL(12,2),

    FOREIGN KEY (purchase_id) REFERENCES purchase_master(purchase_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Stock Master (Current Stock)
CREATE TABLE stock_master (
    product_id INT PRIMARY KEY,
    available_qty DECIMAL(10,2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
-- Stock Ledger (Stock Movement)

CREATE TABLE stock_ledger (
    stock_ledger_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    transaction_type ENUM('PURCHASE','SALE','RETURN','ADJUSTMENT'),
    transaction_id INT,
    qty_in DECIMAL(10,2) DEFAULT 0,
    qty_out DECIMAL(10,2) DEFAULT 0,
    balance_qty DECIMAL(10,2),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Sales Master (Invoice Header)
CREATE TABLE sales_master (
    sales_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_no VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    customer_name VARCHAR(150),          -- or customer_id (recommended)
    total_amount DECIMAL(12,2),
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2),
    payment_mode ENUM('CASH','CARD','UPI','CREDIT'),
    status TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Items (Invoice Line Items)
CREATE TABLE sales_items (
    sales_item_id INT AUTO_INCREMENT PRIMARY KEY,
    sales_id INT NOT NULL,
    product_id INT NOT NULL,
    qty DECIMAL(10,2) NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    amount DECIMAL(12,2) NOT NULL,

    FOREIGN KEY (sales_id) REFERENCES sales_master(sales_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);