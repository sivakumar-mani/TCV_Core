-- VPS: select the application database, back up, and pause STB editing/assignments.
-- Run the WHOLE file. Applies to ALL existing masters, including inactive rows.
-- Keeps box type, stock type, MSO, is_active and customer/issue records unchanged.
-- Selects the first active ADMIN with an active linked employee by user_id.
-- Requires CREATE ROUTINE permission. No result sets inside CALL.
SET @stb_bulk_result = 'NOT COMPLETED';
SET @stb_bulk_updated = 0;
SET @stb_bulk_employee_id = NULL;
DROP PROCEDURE IF EXISTS tcv_update_all_stb_prices_admin;
DELIMITER $$
CREATE PROCEDURE tcv_update_all_stb_prices_admin()
BEGIN
 DECLARE admin_employee INT DEFAULT NULL;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION
 BEGIN
   ROLLBACK;
   SET @stb_bulk_result = 'ROLLED BACK';
   RESIGNAL;
 END;

 START TRANSACTION;
 SET admin_employee = (
   SELECT u.employee_id FROM users u
   JOIN employees e ON e.employee_id=u.employee_id
   WHERE u.role='ADMIN' AND u.is_active=1 AND e.is_active=1
   ORDER BY u.user_id LIMIT 1
 );
 IF admin_employee IS NULL THEN
   SIGNAL SQLSTATE '45000'
     SET MESSAGE_TEXT='No active ADMIN has an active linked employee; no STBs updated';
 END IF;
 SET @stb_bulk_employee_id = admin_employee;

 UPDATE cable_stb_master
 SET stb_amount=500.00,
     full_set_amount=800.00,
     assigned_employee_id=admin_employee,
     status='AVAILABLE',
     updated_date=CURDATE(),
     updated_at=NOW();
 SET @stb_bulk_updated = ROW_COUNT();

 IF EXISTS (
   SELECT 1 FROM cable_stb_master
   WHERE NOT(stb_amount <=> 500.00) OR NOT(full_set_amount <=> 800.00)
      OR NOT(assigned_employee_id <=> admin_employee)
      OR NOT(status <=> 'AVAILABLE')
 ) THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='STB verification failed; rolled back';
 END IF;
 COMMIT;
 SET @stb_bulk_result = 'COMMITTED';
END$$
DELIMITER ;
CALL tcv_update_all_stb_prices_admin();
DROP PROCEDURE tcv_update_all_stb_prices_admin;

SELECT @stb_bulk_result AS result, @stb_bulk_updated AS changed_rows,
       @stb_bulk_employee_id AS assigned_employee_id;
SELECT u.username AS assigned_admin,e.employee_id,e.employee_code,
       e.first_name,e.last_name
FROM users u JOIN employees e ON e.employee_id=u.employee_id
WHERE e.employee_id=@stb_bulk_employee_id;
SELECT COUNT(*) AS total_masters,
       COALESCE(SUM(stb_amount=500 AND full_set_amount=800
         AND assigned_employee_id=@stb_bulk_employee_id AND status='AVAILABLE'),0) AS matching_masters,
       COALESCE(SUM(stock_type IN ('FAULT','DAMAGED','BURNT','NOT_SERVICEABLE')),0) AS stock_condition_status_overrides
FROM cable_stb_master;
-- The application derives a different displayed status for FAULT/DAMAGED/BURNT/
-- NOT_SERVICEABLE stock. This script preserves those stock conditions.
