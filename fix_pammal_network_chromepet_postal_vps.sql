-- Select the VPS application database. Back up first and pause address editing,
-- imports and approvals. Run the WHOLE file in one session.
-- APPLY MODE: 1 saves the validated changes; 0 only previews and rolls back.
-- ONLY PAMMAL network: move all Chromepet locations to Pammal postal area.
-- Preserve the shared Chromepet master for SVN/TCV and other networks.
-- Obsolete merged areas/streets are deactivated; history and billing are retained.
-- Requires CREATE ROUTINE permission. No customer, street or area is deleted.
SET @apply_pammal_merge = 1;
SET @pammal_merge_result = 'NOT COMPLETED';
-- No result sets are emitted inside CALL (phpMyAdmin compatibility).
DROP PROCEDURE IF EXISTS tcv_fix_pammal_postal_20260926;
DELIMITER $$
CREATE PROCEDURE tcv_fix_pammal_postal_20260926(IN do_apply INT)
main: BEGIN
 DECLARE net INT;
 DECLARE chrom INT;
 DECLARE pam INT;
 DECLARE source_post INT;
 DECLARE target_post INT;
 DECLARE source_area INT;
 DECLARE target_area INT;
 DECLARE target_name VARCHAR(150);
 DECLARE found_count INT;
 DECLARE last_area INT DEFAULT 0;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; SET @pammal_merge_result='ROLLED BACK: no merge committed'; RESIGNAL; END;

 START TRANSACTION;
 SELECT COUNT(*),MIN(network_id) INTO found_count,net FROM cable_network_master
 WHERE UPPER(TRIM(network_code))='PAMMAL' AND is_active=1;
 IF found_count<>1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Expected one active PAMMAL network'; END IF;
 SELECT COUNT(*),MIN(location_id) INTO found_count,chrom FROM cable_locations
 WHERE UPPER(TRIM(location_name)) IN ('CHROMEPET','CHROMPET','CHROMEPT') AND is_active=1;
 IF found_count<>1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Chromepet postal master missing or ambiguous'; END IF;
 SELECT COUNT(*),MIN(location_id) INTO found_count,pam FROM cable_locations
 WHERE UPPER(TRIM(location_name))='PAMMAL' AND is_active=1;
 IF found_count<>1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Pammal postal master missing or ambiguous'; END IF;
 IF EXISTS (SELECT 1 FROM cable_locations WHERE location_id IN (chrom,pam)
   AND (NULLIF(TRIM(city),'') IS NULL OR NULLIF(TRIM(pincode),'') IS NULL))
 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Postal masters need city and pincode'; END IF;

 SET source_post=chrom;
 SET target_post=pam;
 area_loop: LOOP
   SELECT MIN(a.area_id) INTO source_area FROM cable_areas a
   WHERE a.network_id=net AND a.location_id=chrom AND a.area_id>last_area
     AND (a.is_active=1
       OR EXISTS (SELECT 1 FROM cable_tv_customers c WHERE c.area_id=a.area_id)
       OR EXISTS (SELECT 1 FROM internet_customers c WHERE c.area_id=a.area_id));
   IF source_area IS NULL THEN LEAVE area_loop; END IF;
   SET last_area=source_area;
   SELECT UPPER(TRIM(area_name)) INTO target_name FROM cable_areas WHERE area_id=source_area;
   IF target_name IS NULL OR target_name='' THEN
     SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Empty source location name; review IDs';
   END IF;
   SELECT COUNT(*),MIN(area_id) INTO found_count,target_area FROM cable_areas
   WHERE network_id=net AND location_id=target_post AND UPPER(TRIM(area_name))=target_name;
   IF found_count>1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Multiple destination areas in same postal area; exact IDs need review'; END IF;
   IF source_area IS NULL AND target_area IS NULL THEN
     SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Requested PAMMAL area name not found; check spelling';
   END IF;

   -- Retain row locks without emitting result sets from the procedure.
   SELECT COUNT(*) INTO found_count FROM cable_areas
   WHERE area_id IN (source_area,target_area) FOR UPDATE;
   SELECT COUNT(*) INTO found_count FROM cable_streets
   WHERE area_id IN (source_area,target_area) FOR UPDATE;
   SELECT COUNT(*) INTO found_count FROM cable_tv_customers
   WHERE area_id IN (source_area,target_area) FOR UPDATE;
   SELECT COUNT(*) INTO found_count FROM internet_customers
   WHERE area_id IN (source_area,target_area) FOR UPDATE;

   IF EXISTS (SELECT 1 FROM cable_tv_customers WHERE area_id IN (source_area,target_area)
     AND (network_id IS NULL OR network_id<>net))
   THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Other-network customers reference PAMMAL areas; review first'; END IF;
   IF EXISTS (SELECT 1 FROM cable_streets WHERE area_id IN (source_area,target_area)
     GROUP BY area_id,UPPER(TRIM(street_name)) HAVING COUNT(*)>1)
   THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Ambiguous duplicate street names within an area; review IDs'; END IF;
   IF EXISTS (SELECT 1 FROM cable_streets WHERE area_id IN (source_area,target_area)
     AND NULLIF(TRIM(street_name),'') IS NULL)
   THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Empty street name found'; END IF;
   IF EXISTS (SELECT 1 FROM cable_tv_customers c LEFT JOIN cable_streets s ON s.street_id=c.street_id
     WHERE (c.area_id IN (source_area,target_area) OR s.area_id IN (source_area,target_area))
     AND (s.street_id IS NULL OR c.area_id IS NULL OR c.area_id<>s.area_id))
     OR EXISTS (SELECT 1 FROM internet_customers c LEFT JOIN cable_streets s ON s.street_id=c.street_id
     WHERE (c.area_id IN (source_area,target_area) OR s.area_id IN (source_area,target_area))
     AND (s.street_id IS NULL OR c.area_id IS NULL OR c.area_id<>s.area_id))
   THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Customer area/street mismatch found; review before merging'; END IF;
   IF EXISTS (SELECT 1 FROM cable_connections co JOIN cable_tv_customers c ON c.cable_customer_id=co.cable_customer_id
     WHERE co.connection_type='SHIFTED' AND co.approval_status='PENDING'
     AND (c.area_id IN (source_area,target_area) OR co.new_area_id IN (source_area,target_area)))
     OR EXISTS (SELECT 1 FROM workflow_approvals w JOIN internet_customers c ON c.internet_customer_id=w.reference_id
     WHERE w.module_name='INTERNET_CUSTOMER_UPDATE' AND w.workflow_status='PENDING' AND c.area_id IN (source_area,target_area))
   THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Pending address/customer updates found; resolve before merging'; END IF;

   IF do_apply=1 THEN
     IF target_area IS NULL THEN
       -- No duplicate destination: move existing area and retain all street IDs.
       UPDATE cable_areas SET location_id=target_post WHERE area_id=source_area;
       SET target_area=source_area;
     ELSEIF source_area IS NOT NULL THEN
       -- Reuse matching destination streets and copy only missing ones.
       INSERT INTO cable_streets(area_id,street_name,is_active)
       SELECT target_area,s.street_name,s.is_active FROM cable_streets s
       LEFT JOIN cable_streets d ON d.area_id=target_area AND UPPER(TRIM(d.street_name))=UPPER(TRIM(s.street_name))
       WHERE s.area_id=source_area AND d.street_id IS NULL;
       UPDATE cable_streets d JOIN cable_streets s
         ON UPPER(TRIM(s.street_name))=UPPER(TRIM(d.street_name))
       SET d.is_active=1 WHERE d.area_id=target_area AND s.area_id=source_area AND s.is_active=1;
       UPDATE cable_tv_customers c JOIN cable_streets s ON s.street_id=c.street_id
       JOIN cable_streets d ON d.area_id=target_area AND UPPER(TRIM(d.street_name))=UPPER(TRIM(s.street_name))
       SET c.area_id=target_area,c.street_id=d.street_id WHERE c.area_id=source_area;
       UPDATE internet_customers c JOIN cable_streets s ON s.street_id=c.street_id
       JOIN cable_streets d ON d.area_id=target_area AND UPPER(TRIM(d.street_name))=UPPER(TRIM(s.street_name))
       SET c.area_id=target_area,c.street_id=d.street_id WHERE c.area_id=source_area;
       IF EXISTS (SELECT 1 FROM cable_tv_customers WHERE area_id=source_area)
          OR EXISTS (SELECT 1 FROM internet_customers WHERE area_id=source_area)
       THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Not all customers remapped; rolling back'; END IF;
       UPDATE cable_streets SET is_active=0 WHERE area_id=source_area;
       UPDATE cable_areas SET is_active=0 WHERE area_id=source_area;
     END IF;
     UPDATE cable_areas SET is_active=1 WHERE area_id=target_area;
     UPDATE cable_tv_customers c JOIN cable_locations l ON l.location_id=target_post
     SET c.location_id=l.location_id,c.city=l.city,c.pincode=l.pincode WHERE c.area_id=target_area;
     UPDATE internet_customers c JOIN cable_locations l ON l.location_id=target_post
     SET c.location_id=l.location_id,c.city=l.city,c.pincode=l.pincode WHERE c.area_id=target_area;
     IF EXISTS (SELECT 1 FROM cable_tv_customers c JOIN cable_streets s ON s.street_id=c.street_id
       WHERE c.area_id=target_area AND (c.location_id<>target_post OR s.area_id<>target_area))
       OR EXISTS (SELECT 1 FROM internet_customers c JOIN cable_streets s ON s.street_id=c.street_id
       WHERE c.area_id=target_area AND (c.location_id<>target_post OR s.area_id<>target_area))
     THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Post-update address verification failed'; END IF;
   END IF;
 END LOOP;
 IF do_apply=1 THEN
   IF EXISTS (SELECT 1 FROM cable_areas WHERE network_id=net AND location_id=chrom AND is_active=1)
     OR EXISTS (SELECT 1 FROM cable_tv_customers WHERE network_id=net AND location_id=chrom)
     OR EXISTS (SELECT 1 FROM internet_customers c JOIN cable_areas a ON a.area_id=c.area_id
       WHERE a.network_id=net AND c.location_id=chrom)
   THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Pammal customers still reference Chromepet; rolled back for review'; END IF;
 END IF;
 IF do_apply=1 THEN
   COMMIT;
   SET @pammal_merge_result = 'COMMITTED: PAMMAL Location Info, CATV and Internet customer addresses updated';
 ELSE
   ROLLBACK;
   SET @pammal_merge_result = 'PREVIEW ONLY: review IDs, set @apply_pammal_merge=1 and rerun WHOLE file';
 END IF;
END$$
DELIMITER ;
CALL tcv_fix_pammal_postal_20260926(@apply_pammal_merge);
DROP PROCEDURE tcv_fix_pammal_postal_20260926;

-- Ordinary result queries outside CALL avoid nested/multiple procedure results.
SELECT @pammal_merge_result AS result;
SELECT n.network_code,l.location_name AS postal_area,a.area_id,a.area_name,a.is_active,
       'PAMMAL' AS intended_postal_area,
       s.street_id,s.street_name,s.is_active AS street_active
FROM cable_areas a JOIN cable_network_master n ON n.network_id=a.network_id
JOIN cable_locations l ON l.location_id=a.location_id
LEFT JOIN cable_streets s ON s.area_id=a.area_id
WHERE UPPER(TRIM(n.network_code))='PAMMAL'
ORDER BY a.area_id,s.street_id;
SELECT 'CATV' AS customer_type,c.cable_customer_id AS customer_id,c.customer_code,c.full_name,
       c.location_id,c.area_id,c.street_id,c.city,c.pincode
FROM cable_tv_customers c JOIN cable_areas a ON a.area_id=c.area_id
JOIN cable_network_master n ON n.network_id=a.network_id
WHERE UPPER(TRIM(n.network_code))='PAMMAL'
UNION ALL
SELECT 'INTERNET',c.internet_customer_id,c.customer_code,c.full_name,c.location_id,c.area_id,c.street_id,c.city,c.pincode
FROM internet_customers c JOIN cable_areas a ON a.area_id=c.area_id
JOIN cable_network_master n ON n.network_id=a.network_id
WHERE UPPER(TRIM(n.network_code))='PAMMAL';
