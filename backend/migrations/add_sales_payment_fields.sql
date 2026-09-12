-- Select the application database used by the sales API before running.
-- Run these steps individually, not as one batch.
-- Existing invoice values are preserved; new fields default to NULL.
-- ALTER TABLE commits implicitly.

-- 1. Check which payment columns already exist.
SHOW COLUMNS FROM sales_master WHERE Field IN ('paid_date', 'payment_reference');

-- 2. Run ONLY if paid_date is absent from step 1.
ALTER TABLE sales_master ADD COLUMN paid_date DATE NULL AFTER payment_mode;

-- 3. Run ONLY if payment_reference is absent from step 1.
ALTER TABLE sales_master ADD COLUMN payment_reference VARCHAR(150) NULL AFTER paid_date;

-- 4. Verify both columns are present, then retry the invoice update.
SHOW COLUMNS FROM sales_master WHERE Field IN ('paid_date', 'payment_reference');
