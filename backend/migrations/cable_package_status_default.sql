-- The existing package schema already has is_active. No new status column is needed.
-- Preserve existing inactive packages; set the default for new packages to Active.
ALTER TABLE cable_package_master
    MODIFY COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;
