-- Apply once before deploying the package form/API change.
-- Existing packages start with MSO Price 0; their LCO Share equals Price.
ALTER TABLE cable_package_master
    ADD COLUMN mso_price DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER price,
    ADD COLUMN lco_share DECIMAL(12,2)
        GENERATED ALWAYS AS (price - mso_price) STORED AFTER mso_price;
