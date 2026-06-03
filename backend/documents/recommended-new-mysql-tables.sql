-- =====================================================
-- Recommended Additional Tables
-- For Workflow, Pricing, Material Issue/Return, Audit
-- MySQL 8+
-- =====================================================

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
-- OPTIONAL STOCK LEDGER ENHANCEMENT
-- Add these columns to stock_ledger if detailed traceability is needed
-- =====================================================

-- ALTER TABLE stock_ledger
--     MODIFY transaction_type ENUM(
--         'PURCHASE',
--         'SALE',
--         'MATERIAL_ISSUE',
--         'MATERIAL_RETURN',
--         'RETURN',
--         'ADJUSTMENT',
--         'INSTALLATION'
--     ) NOT NULL,
--     ADD COLUMN source_table VARCHAR(50) AFTER transaction_id,
--     ADD COLUMN source_item_id INT AFTER source_table,
--     ADD COLUMN created_by INT AFTER remarks,
--     ADD COLUMN transaction_status ENUM('POSTED','REVERSED','CANCELLED') DEFAULT 'POSTED' AFTER created_by;

-- =====================================================
-- OPTIONAL AUDIT LOG
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
