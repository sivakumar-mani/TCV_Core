ALTER TABLE customers
    ADD COLUMN marketing_employee_id INT NULL AFTER customer_type,
    ADD COLUMN referral_details VARCHAR(255) NULL AFTER marketing_employee_id,
    ADD INDEX idx_marketing_employee_id (marketing_employee_id),
    ADD CONSTRAINT fk_customers_marketing_employee
        FOREIGN KEY (marketing_employee_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE;
