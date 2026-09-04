-- Safe, one-time VPS schema change for Supplier Website Address.
SET @supplier_website_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'suppliers'
    AND COLUMN_NAME = 'website_address'
);
SET @supplier_website_sql := IF(
  @supplier_website_exists = 0,
  'ALTER TABLE suppliers ADD COLUMN website_address VARCHAR(255) NULL AFTER email',
  'SELECT 1'
);
PREPARE supplier_website_statement FROM @supplier_website_sql;
EXECUTE supplier_website_statement;
DEALLOCATE PREPARE supplier_website_statement;
