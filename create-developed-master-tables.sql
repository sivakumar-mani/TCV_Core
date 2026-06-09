-- =====================================================
-- TCV Core - Developed Master Module Tables
-- Run this file in MySQL Workbench if these tables are
-- missing from the application database.
-- =====================================================
-- Modules:
--   /api/product/*
--   /api/brand/*
--   /api/category/*
--   /api/supplier/*
-- =====================================================

CREATE DATABASE IF NOT EXISTS tcvonedb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tcvonedb;

-- =====================================================
-- BRANDS
-- =====================================================

CREATE TABLE IF NOT EXISTS brands (
    brand_id INT AUTO_INCREMENT PRIMARY KEY,
    brand_name VARCHAR(100) NOT NULL UNIQUE,
    brand_code VARCHAR(20) UNIQUE,
    description VARCHAR(255),
    status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_brands_name (brand_name),
    INDEX idx_brands_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- CATEGORIES
-- =====================================================

CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(150) NOT NULL,
    parent_id INT NULL,
    level INT NOT NULL DEFAULT 1,
    slug VARCHAR(200) UNIQUE,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_categories_parent
        FOREIGN KEY (parent_id) REFERENCES categories(category_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    INDEX idx_categories_parent_id (parent_id),
    INDEX idx_categories_level (level),
    INDEX idx_categories_slug (slug),
    INDEX idx_categories_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO categories (category_name, slug, level, parent_id, sort_order, status)
VALUES
    ('CCTV', 'cctv', 1, NULL, 1, 1),
    ('CATV', 'catv', 1, NULL, 2, 1),
    ('Internet', 'internet', 1, NULL, 3, 1),
    ('Solar', 'solar', 1, NULL, 4, 1),
    ('Other', 'other', 1, NULL, 5, 1);

-- =====================================================
-- SUPPLIERS
-- =====================================================

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL UNIQUE,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    gst_no VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_suppliers_name (supplier_name),
    INDEX idx_suppliers_gst_no (gst_no),
    INDEX idx_suppliers_city (city),
    INDEX idx_suppliers_status (status),
    INDEX idx_suppliers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PRODUCTS
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    brand_id INT NULL,
    category_id INT NULL,
    product_code VARCHAR(100) UNIQUE,
    barcode VARCHAR(100) UNIQUE,
    description TEXT,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
    purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    gst_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    hsn_code VARCHAR(50),
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    reorder_level DECIMAL(10,2) NOT NULL DEFAULT 0,
    status ENUM('ACTIVE','INACTIVE','DISCONTINUED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_products_brand
        FOREIGN KEY (brand_id) REFERENCES brands(brand_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    INDEX idx_products_brand_id (brand_id),
    INDEX idx_products_category_id (category_id),
    INDEX idx_products_code (product_code),
    INDEX idx_products_status (status),
    INDEX idx_products_stock_qty (stock_qty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- QUICK CHECK
-- =====================================================

SHOW TABLES LIKE 'brands';
SHOW TABLES LIKE 'categories';
SHOW TABLES LIKE 'suppliers';
SHOW TABLES LIKE 'products';
