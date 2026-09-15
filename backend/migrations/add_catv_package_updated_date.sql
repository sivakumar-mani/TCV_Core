-- Select the application database. Run the check first.
SHOW COLUMNS FROM cable_customer_packages LIKE 'updated_date';
-- Run only if the check returns no rows. Existing package dates are preserved.
ALTER TABLE cable_customer_packages ADD COLUMN updated_date DATE NULL;
