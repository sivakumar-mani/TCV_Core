-- Reset Cable TV customer enrollment and transaction data.
-- Keeps master/setup data: networks, locations, areas, streets, sources, MSOs,
-- packages, STB master stock, users, employees and permissions.

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM cable_stb_issue_master;
DELETE FROM cable_customer_accounts;
DELETE FROM cable_subscriptions;
DELETE FROM cable_connection_materials;
DELETE FROM cable_customer_packages;
DELETE FROM cable_connections;
DELETE FROM cable_customer_stbs;
DELETE FROM cable_tv_customers;
DELETE FROM cable_approval_groups;

ALTER TABLE cable_stb_issue_master AUTO_INCREMENT = 1;
ALTER TABLE cable_customer_accounts AUTO_INCREMENT = 1;
ALTER TABLE cable_subscriptions AUTO_INCREMENT = 1;
ALTER TABLE cable_connection_materials AUTO_INCREMENT = 1;
ALTER TABLE cable_customer_packages AUTO_INCREMENT = 1;
ALTER TABLE cable_connections AUTO_INCREMENT = 1;
ALTER TABLE cable_customer_stbs AUTO_INCREMENT = 1;
ALTER TABLE cable_tv_customers AUTO_INCREMENT = 1;
ALTER TABLE cable_approval_groups AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- Release STBs that were locked by deleted customer issue records.
UPDATE cable_stb_master
SET status = 'AVAILABLE', updated_at = NOW()
WHERE is_active = 1;
