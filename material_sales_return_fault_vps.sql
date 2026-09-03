-- Material Sales return/fault approval migration
-- Safe to run on the VPS database after taking the normal database backup.

SET @sale_status_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'technician_material_movements'
    AND COLUMN_NAME = 'sale_status'
);
SET @sale_status_sql := IF(
  @sale_status_exists = 0,
  "ALTER TABLE technician_material_movements ADD COLUMN sale_status ENUM('ISSUED','SOLD') NOT NULL DEFAULT 'SOLD' AFTER payment_status",
  'SELECT 1'
);
PREPARE sale_status_statement FROM @sale_status_sql;
EXECUTE sale_status_statement;
DEALLOCATE PREPARE sale_status_statement;

CREATE TABLE IF NOT EXISTS technician_material_sale_adjustments (
  material_sale_adjustment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  material_movement_id BIGINT NOT NULL,
  adjustment_type ENUM('RETURN','FAULT') NOT NULL,
  qty DECIMAL(10,2) NOT NULL,
  remarks TEXT NULL,
  approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  requested_by_user_id INT NULL,
  requested_by_employee_id INT NULL,
  reviewed_by_user_id INT NULL,
  reviewed_at DATETIME NULL,
  review_remarks TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_material_adjustment_sale (material_movement_id),
  INDEX idx_material_adjustment_status (approval_status),
  CONSTRAINT fk_material_adjustment_sale FOREIGN KEY (material_movement_id)
    REFERENCES technician_material_movements(material_movement_id)
);
