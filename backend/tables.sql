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


-- Brand Master
CREATE TABLE brands (
    brand_id INT AUTO_INCREMENT PRIMARY KEY,
    brand_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),   
    created_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     status TINYINT(1) DEFAULT 1,
     UNIQUE(brand_name)
);

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE,  -- For SEO-friendly URLs, e.g., 'cctv', 'ahd-camera'
    parent_id INT NULL DEFAULT NULL,
    status TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_parent (parent_id),
    FOREIGN KEY (parent_id) REFERENCES categories(category_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- slug VARCHAR(100) UNIQUE,  -- For SEO-friendly URLs, e.g., 'cctv', 'ahd-camera'
CREATE TABLE categories (
    category_id   INT AUTO_INCREMENT PRIMARY KEY,
    parent_id     INT NULL,                        
    name          VARCHAR(100) NOT NULL,
    slug          VARCHAR(100) NOT NULL UNIQUE,     
    level         TINYINT UNSIGNED NOT NULL DEFAULT 0, 
    sort_order    INT NOT NULL DEFAULT 0,
    status        TINYINT(1) NOT NULL DEFAULT 1,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_category_parent
        FOREIGN KEY (parent_id) REFERENCES categories(category_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    UNIQUE KEY uq_name_per_parent (parent_id, name)
);
-- https://claude.ai/share/bb14ef7f-5aa9-4777-8c9d-de131f258068
CREATE TABLE categories (
    category_id   INT AUTO_INCREMENT PRIMARY KEY,
    parent_id     INT NULL,                          -- NULL = top-level category
    name          VARCHAR(100) NOT NULL,
    slug          VARCHAR(100) NOT NULL UNIQUE,      -- URL-friendly name
    level         TINYINT UNSIGNED NOT NULL DEFAULT 0, -- 0=parent, 1=sub, 2=child
    sort_order    INT NOT NULL DEFAULT 0,
    status        TINYINT(1) NOT NULL DEFAULT 1,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_category_parent
        FOREIGN KEY (parent_id) REFERENCES categories(category_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- Same name is allowed under DIFFERENT parents, but not the same parent
    UNIQUE KEY uq_name_per_parent (parent_id, name)
);

sql-- Level 0: Top-level (parent_id = NULL)
INSERT INTO categories (parent_id, name, slug, level) VALUES
(NULL, 'CCTV', 'cctv', 0);

-- Level 1: Sub-category under CCTV (parent_id = 1)
INSERT INTO categories (parent_id, name, slug, level) VALUES
(1, 'Camera', 'cctv-camera', 1);

-- Level 2: Child categories under Camera (parent_id = 2)
INSERT INTO categories (parent_id, name, slug, level) VALUES
(2, 'AHD',  'cctv-camera-ahd',  2),
(2, 'IP',   'cctv-camera-ip',   2),
(2, 'WiFi', 'cctv-camera-wifi', 2);

-- Fetching the full tree (MySQL 8+)
sqlWITH RECURSIVE category_tree AS (
    -- Anchor: start from top-level
    SELECT category_id, parent_id, name, level,
           CAST(name AS CHAR(500)) AS full_path
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive: join children
    SELECT c.category_id, c.parent_id, c.name, c.level,
           CONCAT(ct.full_path, ' > ', c.name)
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.category_id
)

CCTV
CCTV > Camera
CCTV > Camera > AHD
CCTV > Camera > IP
CCTV > Camera > WiFi

SELECT * FROM category_tree ORDER BY full_path;
CREATE TABLE categories (
    category_id   INT AUTO_INCREMENT PRIMARY KEY,
    parent_id     INT NULL,                          -- NULL = top-level category
    name          VARCHAR(100) NOT NULL,
    slug          VARCHAR(100) NOT NULL UNIQUE,      -- URL-friendly name
    level         TINYINT UNSIGNED NOT NULL DEFAULT 0, -- 0=parent, 1=sub, 2=child
    sort_order    INT NOT NULL DEFAULT 0,
    status        TINYINT(1) NOT NULL DEFAULT 1,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_category_parent
        FOREIGN KEY (parent_id) REFERENCES categories(category_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    -- Same name is allowed under DIFFERENT parents, but not the same parent
    UNIQUE KEY uq_name_per_parent (parent_id, name)
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


1. Item Brands Table (Master Table)

This table stores all brand details.

CREATE TABLE brands (
    brand_id INT AUTO_INCREMENT PRIMARY KEY,
    brand_name VARCHAR(100) NOT NULL,
    brand_code VARCHAR(50)  UNIQUE,
    description TEXT,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',  //(restricted not accept other words except ACTIVE AND INACTIVE)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
🔑 Required Fields

brand_id → Primary key (used for mapping)

brand_name → Required & unique (e.g., Nike, Samsung)

🟡 Optional Fields

brand_code → Short code (useful for internal reference)

description → Brand details

status → Active/Inactive control

✅ 2. Products Table (Child Table)

This table references the brand.

CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(150) NOT NULL,
    brand_id INT NOT NULL,
    category_id INT,
    price DECIMAL(10,2),
    stock INT DEFAULT 0,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_brand
        FOREIGN KEY (brand_id)
        REFERENCES item_brands(brand_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);
🔗 Relationship

One Brand → Many Products

Mapping:

item_brands.brand_id  →  products.brand_id
✅ 3. Example Data
Brands
INSERT INTO item_brands (brand_name) VALUES
('Apple'),
('Samsung'),
('Nike');
Products
INSERT INTO products (product_name, brand_id, price) VALUES
('iPhone 15', 1, 79999),
('Galaxy S24', 2, 69999),
('Nike Shoes', 3, 4999);
✅ 4. Best Practices

✔ Always use brand_id (not brand_name) in products
✔ Keep brand_name unique
✔ Use foreign key constraint to maintain integrity
✔ Add index on brand_id for performance

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