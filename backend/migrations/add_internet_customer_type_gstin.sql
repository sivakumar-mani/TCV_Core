-- Apply once to the VPS database before deploying the updated backend.
-- Existing customers default to B2C; GSTIN remains optional.
ALTER TABLE internet_customers
    ADD COLUMN customer_type ENUM('B2C','B2B') NOT NULL DEFAULT 'B2C',
    ADD COLUMN gstin VARCHAR(15) NULL;
