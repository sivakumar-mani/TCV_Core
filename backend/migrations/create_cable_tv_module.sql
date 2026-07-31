-- =====================================================
-- Cable TV Module - Required Tables
-- Project: TCV Core
-- Prepared Date: 2026-07-01
-- Database: MySQL 8.0+
--
-- Notes:
-- 1. This script creates only Cable TV module-specific tables.
-- 2. Existing ERP tables reused by this module:
--    users, employees, products, material_master, stock_master,
--    stock_ledger, workflow_approvals, role_permissions, audit_log.
-- 3. Run this after the core ERP schema is available.
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. CABLE NETWORK MASTER
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_network_master (
    network_id INT AUTO_INCREMENT PRIMARY KEY,
    network_code VARCHAR(20) NOT NULL,
    network_name VARCHAR(100) NOT NULL,
    customer_no_start INT NULL,
    customer_no_end INT NULL,
    remarks VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_cable_network_code (network_code),
    INDEX idx_cable_network_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cable TV network master: TCV, PAMMAL, MURUGAN, SVN';

-- =====================================================
-- 2. CABLE LOCATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_locations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    location_name VARCHAR(150) NOT NULL,
    post_short_code VARCHAR(20) NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_cable_location_city (location_name, city),
    UNIQUE KEY uk_cable_location_short_code (post_short_code),
    UNIQUE KEY uk_cable_location_pincode (pincode),
    INDEX idx_cable_location_city (city),
    INDEX idx_cable_location_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cable TV location master';

-- =====================================================
-- 3. CABLE AREAS
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_areas (
    area_id INT AUTO_INCREMENT PRIMARY KEY,
    network_id INT NULL,
    location_id INT NOT NULL,
    area_name VARCHAR(150) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cable_areas_network
        FOREIGN KEY (network_id) REFERENCES cable_network_master(network_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cable_areas_location
        FOREIGN KEY (location_id) REFERENCES cable_locations(location_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    UNIQUE KEY uk_cable_network_location_area (network_id, location_id, area_name),
    INDEX idx_cable_area_network (network_id),
    INDEX idx_cable_area_location (location_id),
    INDEX idx_cable_area_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cable TV area master mapped to location';

-- =====================================================
-- 4. CABLE STREETS
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_streets (
    street_id INT AUTO_INCREMENT PRIMARY KEY,
    area_id INT NOT NULL,
    street_name VARCHAR(150) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cable_streets_area
        FOREIGN KEY (area_id) REFERENCES cable_areas(area_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    UNIQUE KEY uk_cable_area_street (area_id, street_name),
    INDEX idx_cable_street_area (area_id),
    INDEX idx_cable_street_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cable TV street master mapped to area';

-- =====================================================
-- 5. CABLE CONNECTION SOURCES
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_connection_sources (
    source_id INT AUTO_INCREMENT PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_cable_source_name (source_name),
    INDEX idx_cable_source_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cable TV source of connection master';

-- =====================================================
-- 6. CABLE MSO MASTER
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_mso_master (
    mso_id INT AUTO_INCREMENT PRIMARY KEY,
    mso_name VARCHAR(100) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_cable_mso_name (mso_name),
    INDEX idx_cable_mso_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='MSO/operator master for STB installed and exchange tracking';

-- =====================================================
-- 7. CABLE PACKAGE MASTER
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_package_master (
    package_id INT AUTO_INCREMENT PRIMARY KEY,
    package_name VARCHAR(150) NOT NULL,
    package_type ENUM('MSO_PACKAGE','ADDON','ALACARTE','BROADCAST') NOT NULL DEFAULT 'MSO_PACKAGE',
    price DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    description TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_cable_package_name_type (package_name, package_type),
    INDEX idx_cable_package_type (package_type),
    INDEX idx_cable_package_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cable TV package master with package type and price';

-- =====================================================
-- 8. CABLE APPROVAL GROUPS
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_approval_groups (
    approval_group_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    approval_group_no VARCHAR(50) NOT NULL,
    group_type ENUM('NEW_CUSTOMER_ONBOARDING','CUSTOMER_UPDATE','STB_UPDATE','CONNECTION_UPDATE','MATERIAL_UPDATE','PACKAGE_UPDATE','SUBSCRIPTION_UPDATE') NOT NULL,
    approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    requested_by_user_id INT NULL,
    approved_by_user_id INT NULL,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    rejected_reason TEXT NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cable_approval_groups_requested_by
        FOREIGN KEY (requested_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_approval_groups_approved_by
        FOREIGN KEY (approved_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    UNIQUE KEY uk_cable_approval_group_no (approval_group_no),
    INDEX idx_cable_approval_group_type (group_type),
    INDEX idx_cable_approval_group_status (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Groups Cable TV records for single workflow approval. New customer onboarding uses one group for customer, STB, connection, materials, package and subscription.';

-- =====================================================
-- 9. CABLE TV CUSTOMERS
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_tv_customers (
    cable_customer_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    approval_group_id BIGINT NULL,
    erp_customer_id INT NULL,
    network_id INT NOT NULL,
    network_type VARCHAR(20) NULL,
    customer_type ENUM('REGULAR','BUSINESS') NOT NULL DEFAULT 'REGULAR',
    legacy_customer_no VARCHAR(50) NULL,
    customer_code INT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    door_no VARCHAR(50) NOT NULL,
    location_id INT NOT NULL,
    area_id INT NOT NULL,
    street_id INT NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NULL,
    mobile_no VARCHAR(20) NOT NULL,
    aadhaar_no VARCHAR(12) NULL,
    alternate_mobile_no VARCHAR(20) NULL,
    source_id INT NULL,
    installed_by_employee_id INT NULL,
    labour_service_charge DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (labour_service_charge >= 0),
    status ENUM('ACTIVE','INACTIVE','DISCONNECTED','SHIFTED','TRANSFERRED','RETRIEVED','FAULT','UPGRADE') NOT NULL DEFAULT 'ACTIVE',
    approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    created_by_user_id INT NULL,
    approved_by_user_id INT NULL,
    approved_at TIMESTAMP NULL,
    rejected_reason TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cable_customers_approval_group
        FOREIGN KEY (approval_group_id) REFERENCES cable_approval_groups(approval_group_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_customers_erp_customer
        FOREIGN KEY (erp_customer_id) REFERENCES customers(customer_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_customers_network
        FOREIGN KEY (network_id) REFERENCES cable_network_master(network_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cable_customers_location
        FOREIGN KEY (location_id) REFERENCES cable_locations(location_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cable_customers_area
        FOREIGN KEY (area_id) REFERENCES cable_areas(area_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cable_customers_street
        FOREIGN KEY (street_id) REFERENCES cable_streets(street_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cable_customers_source
        FOREIGN KEY (source_id) REFERENCES cable_connection_sources(source_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_customers_installed_by
        FOREIGN KEY (installed_by_employee_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_customers_created_by_user
        FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_customers_approved_by_user
        FOREIGN KEY (approved_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    UNIQUE KEY uk_cable_customer_code (customer_code),
    UNIQUE KEY uk_cable_network_legacy_customer (network_id, legacy_customer_no),
    INDEX idx_cable_customer_approval_group (approval_group_id),
    INDEX idx_cable_customer_name (full_name),
    INDEX idx_cable_customer_mobile (mobile_no),
    INDEX idx_cable_customer_network (network_id),
    INDEX idx_cable_customer_type (customer_type),
    INDEX idx_cable_customer_location_area_street (location_id, area_id, street_id),
    INDEX idx_cable_customer_status (status),
    INDEX idx_cable_customer_approval_status (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Combined Cable TV customer table for all networks';

-- =====================================================
-- 10. CABLE STB MASTER
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_stb_master (
    stb_master_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stb_number VARCHAR(100) NOT NULL,
    box_type ENUM('HD','SD') NOT NULL DEFAULT 'HD',
    stock_type ENUM('NEW','SERVICED','RETURNED','FAULT') NOT NULL DEFAULT 'NEW',
    mso_id INT NULL,
    stb_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (stb_amount >= 0),
    full_set_amount DECIMAL(12,2) NOT NULL DEFAULT 800 CHECK (full_set_amount >= 0),
    assigned_employee_id INT NULL,
    status ENUM('AVAILABLE','NOT_AVAILABLE') NOT NULL DEFAULT 'AVAILABLE',
    updated_date DATE NOT NULL DEFAULT (CURDATE()),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cable_stb_master_mso
        FOREIGN KEY (mso_id) REFERENCES cable_mso_master(mso_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_stb_master_assigned_employee
        FOREIGN KEY (assigned_employee_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_cable_stb_master_number (stb_number),
    INDEX idx_cable_stb_master_status (status),
    INDEX idx_cable_stb_master_stock_type (stock_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Office STB stock master';

-- =====================================================
-- 11. CABLE CUSTOMER STBS
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_customer_stbs (
    customer_stb_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    approval_group_id BIGINT NULL,
    cable_customer_id BIGINT NOT NULL,
    stb_master_id BIGINT NULL,
    stb_type ENUM('NEW','SERVICED','RETURNED','FAULT','DAMAGED','UPGRADE','REPLACED','EXCHANGE','CUSTOMER_OWNED') NOT NULL DEFAULT 'NEW',
    issue_mode ENUM('FULL_SET','BOX_ONLY') NOT NULL DEFAULT 'BOX_ONLY',
    installed_mso_id INT NULL,
    exchange_original_mso_id INT NULL,
    stb_no VARCHAR(100) NOT NULL,
    stb_image_path VARCHAR(255) NULL,
    stb_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (stb_amount >= 0),
    stb_discount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (stb_discount >= 0),
    labour_service_charge DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (labour_service_charge >= 0),
    refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
    refund_payment_mode ENUM('CASH','ONLINE','BANK','UPI','OTHER') NOT NULL DEFAULT 'CASH',
    installed_by_employee_id INT NULL,
    entered_by_employee_id INT NULL,
    installed_date DATE NOT NULL DEFAULT (CURDATE()),
    updated_date DATE NULL,
    update_reason VARCHAR(50) NULL,
    reason_remarks VARCHAR(500) NULL,
    status ENUM('ACTIVE','RETRIEVED','FAULT','DISCONNECTED','UPGRADE','RETURNED','FAULTY','REPLACED') NOT NULL DEFAULT 'ACTIVE',
    approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    created_by_user_id INT NULL,
    approved_by_user_id INT NULL,
    approved_at TIMESTAMP NULL,
    rejected_reason TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cable_stbs_approval_group
        FOREIGN KEY (approval_group_id) REFERENCES cable_approval_groups(approval_group_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_stbs_customer
        FOREIGN KEY (cable_customer_id) REFERENCES cable_tv_customers(cable_customer_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cable_stbs_master
        FOREIGN KEY (stb_master_id) REFERENCES cable_stb_master(stb_master_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_stbs_installed_mso
        FOREIGN KEY (installed_mso_id) REFERENCES cable_mso_master(mso_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_stbs_exchange_mso
        FOREIGN KEY (exchange_original_mso_id) REFERENCES cable_mso_master(mso_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_stbs_installed_by
        FOREIGN KEY (installed_by_employee_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_stbs_created_by_user
        FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_stbs_approved_by_user
        FOREIGN KEY (approved_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_cable_stbs_approval_group (approval_group_id),
    INDEX idx_cable_stbs_customer (cable_customer_id),
    INDEX idx_cable_stbs_master (stb_master_id),
    INDEX idx_cable_stbs_type (stb_type),
    INDEX idx_cable_stbs_status (status),
    INDEX idx_cable_stbs_approval_status (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Customer STB details and exchange history';

-- =====================================================
-- 12. CABLE CUSTOMER STB ACCESSORIES
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_customer_stb_accessories (
    stb_accessory_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    approval_group_id BIGINT NULL,
    cable_customer_id BIGINT NOT NULL,
    customer_stb_id BIGINT NOT NULL,
    product_id INT NOT NULL,
    movement_type ENUM('ISSUE','RETURN') NOT NULL DEFAULT 'ISSUE',
    accessory_name VARCHAR(200) NOT NULL,
    qty DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    issued_by_employee_id INT NULL,
    issued_date DATE NULL,
    approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    created_by_user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cable_stb_accessories_group
        FOREIGN KEY (approval_group_id) REFERENCES cable_approval_groups(approval_group_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_stb_accessories_customer
        FOREIGN KEY (cable_customer_id) REFERENCES cable_tv_customers(cable_customer_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cable_stb_accessories_stb
        FOREIGN KEY (customer_stb_id) REFERENCES cable_customer_stbs(customer_stb_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cable_stb_accessories_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON UPDATE CASCADE,
    CONSTRAINT fk_cable_stb_accessories_employee
        FOREIGN KEY (issued_by_employee_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_cable_stb_accessories_customer (cable_customer_id),
    INDEX idx_cable_stb_accessories_stb (customer_stb_id),
    INDEX idx_cable_stb_accessories_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Accessories issued with or returned from customer STB installation';

-- =====================================================
-- 13. CABLE CONNECTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_connections (
    connection_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    approval_group_id BIGINT NULL,
    cable_customer_id BIGINT NOT NULL,
    connection_date DATE NOT NULL DEFAULT (CURDATE()),
    disconnection_date DATE NULL,
    connection_type ENUM('NEW','RECONNECTION','SHIFTED','TRANSFERRED') NOT NULL DEFAULT 'NEW',
    old_door_no VARCHAR(50) NULL,
    new_door_no VARCHAR(50) NULL,
    old_location_id INT NULL,
    old_area_id INT NULL,
    old_street_id INT NULL,
    new_location_id INT NULL,
    new_area_id INT NULL,
    new_street_id INT NULL,
    old_address VARCHAR(500) NULL,
    new_address VARCHAR(500) NULL,
    connected_by_employee_id INT NULL,
    entered_by_employee_id INT NULL,
    connection_charge DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (connection_charge >= 0),
    connection_discount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (connection_discount >= 0),
    labour_service_charge DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (labour_service_charge >= 0),
    status ENUM('ACTIVE','DISCONNECTED','SHIFTED','TRANSFERRED') NOT NULL DEFAULT 'ACTIVE',
    approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    remarks TEXT NULL,
    created_by_user_id INT NULL,
    approved_by_user_id INT NULL,
    approved_at TIMESTAMP NULL,
    rejected_reason TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cable_connections_approval_group
        FOREIGN KEY (approval_group_id) REFERENCES cable_approval_groups(approval_group_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_connections_customer
        FOREIGN KEY (cable_customer_id) REFERENCES cable_tv_customers(cable_customer_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cable_connections_connected_by
        FOREIGN KEY (connected_by_employee_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_connections_created_by_user
        FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_connections_approved_by_user
        FOREIGN KEY (approved_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_cable_connections_customer (cable_customer_id),
    INDEX idx_cable_connections_approval_group (approval_group_id),
    INDEX idx_cable_connections_date (connection_date),
    INDEX idx_cable_connections_type (connection_type),
    INDEX idx_cable_connections_status (status),
    INDEX idx_cable_connections_approval_status (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cable TV connection, disconnection, shifted and transferred history';

-- =====================================================
-- 12. CABLE CONNECTION MATERIALS
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_connection_materials (
    connection_material_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    approval_group_id BIGINT NULL,
    connection_id BIGINT NOT NULL,
    product_id INT NULL,
    material_id INT NULL,
    item_name VARCHAR(200) NOT NULL,
    qty DECIMAL(10,2) NOT NULL CHECK (qty > 0),
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    unit_rate DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (unit_rate >= 0),
    amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    issued_by_employee_id INT NULL,
    updated_by_employee_id INT NULL,
    updated_date DATE NULL,
    approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    created_by_user_id INT NULL,
    approved_by_user_id INT NULL,
    approved_at TIMESTAMP NULL,
    rejected_reason TEXT NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cable_materials_approval_group
        FOREIGN KEY (approval_group_id) REFERENCES cable_approval_groups(approval_group_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_materials_connection
        FOREIGN KEY (connection_id) REFERENCES cable_connections(connection_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cable_materials_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_materials_material_master
        FOREIGN KEY (material_id) REFERENCES material_master(material_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_materials_issued_by
        FOREIGN KEY (issued_by_employee_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_materials_created_by_user
        FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_materials_approved_by_user
        FOREIGN KEY (approved_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_cable_materials_connection (connection_id),
    INDEX idx_cable_materials_approval_group (approval_group_id),
    INDEX idx_cable_materials_product (product_id),
    INDEX idx_cable_materials_material (material_id),
    INDEX idx_cable_materials_approval_status (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Materials used for Cable TV connection, entered as add-row items';

-- =====================================================
-- 13. CABLE CUSTOMER PACKAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_customer_packages (
    customer_package_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    approval_group_id BIGINT NULL,
    cable_customer_id BIGINT NOT NULL,
    package_id INT NOT NULL,
    package_type ENUM('ADDON','ALACARTE','BROADCASTER') NOT NULL DEFAULT 'ADDON',
    package_price DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (package_price >= 0),
    start_date DATE NOT NULL DEFAULT (CURDATE()),
    end_date DATE NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    updated_by_employee_id INT NULL,
    approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    created_by_user_id INT NULL,
    approved_by_user_id INT NULL,
    approved_at TIMESTAMP NULL,
    rejected_reason TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cable_customer_packages_approval_group
        FOREIGN KEY (approval_group_id) REFERENCES cable_approval_groups(approval_group_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_customer_packages_customer
        FOREIGN KEY (cable_customer_id) REFERENCES cable_tv_customers(cable_customer_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cable_customer_packages_package
        FOREIGN KEY (package_id) REFERENCES cable_package_master(package_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cable_customer_packages_created_by_user
        FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_customer_packages_approved_by_user
        FOREIGN KEY (approved_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_customer_packages_updated_by
        FOREIGN KEY (updated_by_employee_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_cable_customer_packages_customer (cable_customer_id),
    INDEX idx_cable_customer_packages_approval_group (approval_group_id),
    INDEX idx_cable_customer_packages_package (package_id),
    INDEX idx_cable_customer_packages_type (package_type),
    INDEX idx_cable_customer_packages_active (is_active),
    INDEX idx_cable_customer_packages_updated_by (updated_by_employee_id),
    INDEX idx_cable_customer_packages_approval_status (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cable TV package assigned to customer with snapshot package price';

-- =====================================================
-- 14. CABLE SUBSCRIPTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_subscriptions (
    subscription_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    approval_group_id BIGINT NULL,
    cable_customer_id BIGINT NOT NULL,
    customer_package_id BIGINT NOT NULL,
    subscription_month TINYINT NOT NULL CHECK (subscription_month BETWEEN 1 AND 12),
    subscription_year SMALLINT NOT NULL CHECK (subscription_year >= 2000),
    days_in_month INT NOT NULL CHECK (days_in_month BETWEEN 28 AND 31),
    billing_basis ENUM('DAY','MONTH','YEAR') NOT NULL DEFAULT 'MONTH',
    number_of_days_or_months DECIMAL(8,2) NOT NULL DEFAULT 1 CHECK (number_of_days_or_months > 0),
    amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    collect_date DATE NULL,
    start_date DATE NULL,
    expiry_date DATE NULL,
    collected_by_employee_id INT NULL,
    payment_mapped_employee_id INT NULL,
    payment_mode ENUM('CASH','ONLINE','OFFICE','UPI','CARD','BANK','CHEQUE') NULL,
    payment_status ENUM('PENDING','PARTIAL','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING',
    approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    remarks TEXT NULL,
    created_by_user_id INT NULL,
    approved_by_user_id INT NULL,
    approved_at TIMESTAMP NULL,
    rejected_reason TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cable_subscriptions_approval_group
        FOREIGN KEY (approval_group_id) REFERENCES cable_approval_groups(approval_group_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_subscriptions_customer
        FOREIGN KEY (cable_customer_id) REFERENCES cable_tv_customers(cable_customer_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cable_subscriptions_customer_package
        FOREIGN KEY (customer_package_id) REFERENCES cable_customer_packages(customer_package_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cable_subscriptions_collected_by
        FOREIGN KEY (collected_by_employee_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_subscriptions_payment_mapped_employee
        FOREIGN KEY (payment_mapped_employee_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_subscriptions_created_by_user
        FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_cable_subscriptions_approved_by_user
        FOREIGN KEY (approved_by_user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    UNIQUE KEY uk_cable_subscription_customer_package_month (
        cable_customer_id,
        customer_package_id,
        subscription_month,
        subscription_year
    ),
    INDEX idx_cable_subscriptions_customer (cable_customer_id),
    INDEX idx_cable_subscriptions_approval_group (approval_group_id),
    INDEX idx_cable_subscriptions_package (customer_package_id),
    INDEX idx_cable_subscriptions_month_year (subscription_month, subscription_year),
    INDEX idx_cable_subscriptions_collect_date (collect_date),
    INDEX idx_cable_subscriptions_payment_status (payment_status),
    INDEX idx_cable_subscriptions_approval_status (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cable TV monthly/yearly subscription billing and collection';

-- =====================================================
-- 17. CABLE STB ISSUE MASTER
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_stb_issue_master (
    stb_issue_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stb_master_id BIGINT NOT NULL,
    cable_customer_id BIGINT NOT NULL,
    customer_stb_id BIGINT NULL,
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    issued_by_employee_id INT NULL,
    issue_status ENUM('ISSUED','RETURNED','CANCELLED') NOT NULL DEFAULT 'ISSUED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cable_stb_issue_master
        FOREIGN KEY (stb_master_id) REFERENCES cable_stb_master(stb_master_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_cable_stb_issue_customer
        FOREIGN KEY (cable_customer_id) REFERENCES cable_tv_customers(cable_customer_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_cable_stb_issue_customer_stb
        FOREIGN KEY (customer_stb_id) REFERENCES cable_customer_stbs(customer_stb_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_cable_stb_issue_employee
        FOREIGN KEY (issued_by_employee_id) REFERENCES employees(employee_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    INDEX idx_cable_stb_issue_customer (cable_customer_id),
    INDEX idx_cable_stb_issue_stb (stb_master_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='STB issue register for customer installations';

-- =====================================================
-- 18. CABLE CUSTOMER ACCOUNTS
-- =====================================================

CREATE TABLE IF NOT EXISTS cable_customer_accounts (
    account_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    approval_group_id BIGINT NOT NULL,
    cable_customer_id BIGINT NOT NULL,
    stb_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    connection_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    labor_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    material_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    material_discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    subscription_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    sub_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    overall_discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    customer_paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    office_received_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    office_balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    due_date DATE NULL,
    account_status ENUM('PENDING','PARTIAL','PAID','RECEIVED') NOT NULL DEFAULT 'PENDING',
    received_by_user_id INT NULL,
    received_by_employee_id INT NULL,
    received_at TIMESTAMP NULL,
    approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    created_by_user_id INT NULL,
    approved_by_user_id INT NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cable_accounts_approval_group
        FOREIGN KEY (approval_group_id) REFERENCES cable_approval_groups(approval_group_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_cable_accounts_customer
        FOREIGN KEY (cable_customer_id) REFERENCES cable_tv_customers(cable_customer_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    INDEX idx_cable_customer_accounts_customer (cable_customer_id),
    INDEX idx_cable_customer_accounts_status (account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Account handover totals for cable customer installation';

CREATE TABLE IF NOT EXISTS cable_customer_account_payments (
    payment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_id BIGINT NOT NULL,
    cash_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    online_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    received_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_date DATE NOT NULL,
    received_date DATE NOT NULL,
    due_date DATE NULL,
    balance_after_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_status ENUM('PARTIAL','PAID') NOT NULL,
    received_by_user_id INT NOT NULL,
    received_by_employee_id INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cable_account_payments_account (account_id),
    INDEX idx_cable_account_payments_paid_date (paid_date),
    CONSTRAINT fk_cable_account_payments_account FOREIGN KEY (account_id)
        REFERENCES cable_customer_accounts(account_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cable_subscription_payments (
    subscription_payment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    subscription_id BIGINT NOT NULL,
    cable_customer_id BIGINT NOT NULL,
    received_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    collected_date DATE NOT NULL,
    payment_mode VARCHAR(30) NULL,
    payment_reference VARCHAR(150) NULL,
    received_by_employee_id INT NULL,
    comments VARCHAR(500) NULL,
    balance_after_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_status ENUM('PARTIAL','PAID') NOT NULL,
    created_by_user_id INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cable_subscription_payment_subscription (subscription_id),
    INDEX idx_cable_subscription_payment_customer (cable_customer_id),
    INDEX idx_cable_subscription_payment_date (collected_date),
    CONSTRAINT fk_cable_subscription_payment_subscription FOREIGN KEY (subscription_id)
        REFERENCES cable_subscriptions(subscription_id) ON DELETE CASCADE,
    CONSTRAINT fk_cable_subscription_payment_customer FOREIGN KEY (cable_customer_id)
        REFERENCES cable_tv_customers(cable_customer_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Individual payments received against unpaid CATV subscription months';

-- =====================================================
-- INITIAL MASTER DATA
-- =====================================================

CREATE TABLE IF NOT EXISTS finance_transactions (
    finance_transaction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_date DATE NOT NULL,
    transaction_type ENUM('DEBIT','CREDIT') NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_mode ENUM('CASH','ONLINE','BANK','UPI','OTHER') NOT NULL DEFAULT 'CASH',
    reference_no VARCHAR(100) NULL,
    description VARCHAR(500) NULL,
    source_module VARCHAR(50) NULL,
    source_id BIGINT NULL,
    created_by_user_id INT NULL,
    created_by_employee_id INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_finance_transaction_date (transaction_date),
    INDEX idx_finance_transaction_type (transaction_type),
    UNIQUE KEY uk_finance_source (source_module, source_id),
    CONSTRAINT fk_finance_transaction_user FOREIGN KEY (created_by_user_id) REFERENCES users(user_id),
    CONSTRAINT fk_finance_transaction_employee FOREIGN KEY (created_by_employee_id) REFERENCES employees(employee_id)
);

INSERT IGNORE INTO cable_network_master
    (network_code, network_name, customer_no_start, customer_no_end, remarks)
VALUES
    ('TCV', 'TCV', 1001, NULL, 'TCV customer range: 1001-2000 and 6001 onward'),
    ('PAMMAL', 'Pammal', 101, 999, 'Legacy customer range: 101-999'),
    ('MURUGAN', 'Murugan', 101, 999, 'Legacy customer range: 101-999'),
    ('SVN', 'SVN', 3001, 6000, 'Legacy customer range: 3001-6000'),
    ('LO', 'LO', NULL, NULL, 'Local operator cable network'),
    ('LEASE', 'Lease', NULL, NULL, 'Lease cable network');

INSERT IGNORE INTO cable_connection_sources (source_name)
VALUES
    ('Direct'),
    ('Referral'),
    ('Field Canvassing'),
    ('Phone Call'),
    ('Existing Customer Reference'),
    ('Customer Approach Office'),
    ('Customer Approach Engineer');

INSERT IGNORE INTO cable_mso_master (mso_name)
VALUES
    ('VK'),
    ('DM'),
    ('ARISTO'),
    ('JAK'),
    ('SCV'),
    ('TCCL');

UPDATE cable_locations
SET location_name = 'Chromepet', post_short_code = COALESCE(post_short_code, 'CMP'), city = 'Chennai', pincode = '600044'
WHERE location_name IN ('Chromept', 'Chroempet');

UPDATE cable_locations
SET post_short_code = COALESCE(post_short_code, 'PAM'), city = 'Chennai', pincode = '600075'
WHERE location_name = 'Pammal';

INSERT IGNORE INTO cable_locations (location_name, post_short_code, city, pincode)
VALUES
    ('Chromepet', 'CMP', 'Chennai', '600044'),
    ('Pammal', 'PAM', 'Chennai', '600075');

CREATE TABLE IF NOT EXISTS cable_tv_complaints (
    complaint_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    complaint_no VARCHAR(30) NOT NULL,
    complainant_type ENUM('CATV','NET','CCTV','ANONYMOUS') NOT NULL DEFAULT 'CATV',
    cable_customer_id BIGINT NULL,
    service_customer_id INT NULL,
    anonymous_name VARCHAR(150) NULL,
    anonymous_mobile VARCHAR(20) NULL,
    reported_mobile VARCHAR(20) NULL,
    anonymous_address VARCHAR(500) NULL,
    nature_of_complaint VARCHAR(250) NOT NULL,
    complaint_description TEXT NULL,
    status ENUM('OPEN','IN_PROGRESS','HOLD','PENDING','COMPLETED') NOT NULL DEFAULT 'OPEN',
    assigned_employee_id INT NULL,
    registered_by_user_id INT NULL,
    registered_by_employee_id INT NULL,
    registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_cable_tv_complaint_no (complaint_no),
    INDEX idx_cable_tv_complaint_customer (cable_customer_id),
    INDEX idx_cable_tv_complaint_service_customer (service_customer_id),
    INDEX idx_cable_tv_complaint_status (status),
    INDEX idx_cable_tv_complaint_assigned (assigned_employee_id),
    CONSTRAINT fk_cable_tv_complaint_customer FOREIGN KEY (cable_customer_id) REFERENCES cable_tv_customers(cable_customer_id),
    CONSTRAINT fk_cable_tv_complaint_service_customer FOREIGN KEY (service_customer_id) REFERENCES customers(customer_id),
    CONSTRAINT fk_cable_tv_complaint_assigned FOREIGN KEY (assigned_employee_id) REFERENCES employees(employee_id)
);

CREATE TABLE IF NOT EXISTS cable_tv_complaint_attempts (
    complaint_attempt_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    complaint_id BIGINT NOT NULL,
    attempt_no INT NOT NULL,
    status ENUM('OPEN','IN_PROGRESS','HOLD','PENDING','COMPLETED') NOT NULL,
    assigned_employee_id INT NULL,
    start_time DATETIME NULL,
    end_time DATETIME NULL,
    reason TEXT NULL,
    remedy TEXT NULL,
    notes TEXT NULL,
    entered_by_user_id INT NULL,
    entered_by_employee_id INT NULL,
    entered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cable_tv_attempt_complaint (complaint_id),
    CONSTRAINT fk_cable_tv_attempt_complaint FOREIGN KEY (complaint_id) REFERENCES cable_tv_complaints(complaint_id),
    CONSTRAINT fk_cable_tv_attempt_employee FOREIGN KEY (assigned_employee_id) REFERENCES employees(employee_id)
);

CREATE TABLE IF NOT EXISTS technician_material_stock (
    technician_material_stock_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    product_id INT NOT NULL,
    available_qty DECIMAL(10,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_technician_product (employee_id, product_id),
    CONSTRAINT fk_technician_stock_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    CONSTRAINT fk_technician_stock_product FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE IF NOT EXISTS technician_material_movements (
    material_movement_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    movement_no VARCHAR(30) NOT NULL,
    movement_type ENUM('ISSUE','SALE','FAULT','RETURN') NOT NULL,
    employee_id INT NOT NULL,
    product_id INT NOT NULL,
    qty DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_status ENUM('PENDING','PARTIAL','PAID') NOT NULL DEFAULT 'PENDING',
    customer_type ENUM('CATV','NET','CCTV','ANONYMOUS') NULL,
    cable_customer_id BIGINT NULL,
    service_customer_id INT NULL,
    anonymous_name VARCHAR(150) NULL,
    anonymous_mobile VARCHAR(20) NULL,
    reason VARCHAR(500) NULL,
    remarks TEXT NULL,
    movement_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INT NULL,
    created_by_employee_id INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_material_movement_no (movement_no),
    INDEX idx_material_movement_employee (employee_id),
    INDEX idx_material_movement_product (product_id),
    INDEX idx_material_movement_date (movement_date),
    CONSTRAINT fk_material_movement_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    CONSTRAINT fk_material_movement_product FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT fk_material_movement_catv_customer FOREIGN KEY (cable_customer_id) REFERENCES cable_tv_customers(cable_customer_id),
    CONSTRAINT fk_material_movement_service_customer FOREIGN KEY (service_customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE IF NOT EXISTS technician_material_sale_payments (
    material_sale_payment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    material_movement_id BIGINT NOT NULL,
    cash_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    online_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    received_amount DECIMAL(12,2) NOT NULL,
    balance_after_payment DECIMAL(12,2) NOT NULL,
    payment_status ENUM('PARTIAL','PAID') NOT NULL,
    received_by_user_id INT NULL,
    received_by_employee_id INT NULL,
    received_date DATE NOT NULL,
    due_date DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_material_sale_payment_movement (material_movement_id),
    CONSTRAINT fk_material_sale_payment_movement FOREIGN KEY (material_movement_id)
        REFERENCES technician_material_movements(material_movement_id)
);

SET FOREIGN_KEY_CHECKS = 1;
