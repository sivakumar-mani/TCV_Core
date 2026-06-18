ALTER TABLE customers
    ADD COLUMN salutation ENUM('Mr/Mrs/Ms','Mr.','Mrs.','Ms.','M/S') NOT NULL DEFAULT 'Mr/Mrs/Ms' AFTER customer_id,
    ADD INDEX idx_salutation (salutation);
