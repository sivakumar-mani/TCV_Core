-- VPS: select the application database. Back up and pause location/customer
-- editing, imports and approvals. Run the WHOLE file in one session.
-- Lists mapped customer numbers first. Deactivates only when ALL checks pass.
-- No customer is moved or deleted. No billing/history records are modified.
START TRANSACTION;
SET @tcv_legacy_postal_id = NULL;
SET @tcv_legacy_area_id = NULL;
SET @tcv_legacy_network_id = NULL;

-- Exact matching only; missing/duplicate mappings cause a safe no-op.
SET @tcv_legacy_network_id = (
 SELECT CASE WHEN COUNT(*)=1 THEN MIN(network_id) ELSE NULL END
 FROM cable_network_master WHERE UPPER(TRIM(network_code))='TCV'
);
SET @tcv_legacy_postal_id = (
 SELECT CASE WHEN COUNT(*)=1 THEN MIN(location_id) ELSE NULL END
 FROM cable_locations WHERE UPPER(TRIM(location_name))='TCV LEGACY'
);
SET @tcv_legacy_area_id = (
 SELECT CASE WHEN COUNT(*)=1 THEN MIN(area_id) ELSE NULL END
 FROM cable_areas WHERE network_id=@tcv_legacy_network_id
 AND location_id=@tcv_legacy_postal_id AND UPPER(TRIM(area_name))='TCV LEGACY'
);

SELECT a.area_id,a.area_name,a.is_active AS area_active,l.location_id,l.location_name,
 s.street_id,s.street_name,s.is_active AS street_active
FROM cable_areas a JOIN cable_locations l ON l.location_id=a.location_id
LEFT JOIN cable_streets s ON s.area_id=a.area_id
WHERE a.area_id=@tcv_legacy_area_id;

-- Include references via postal area OR area OR street, even if inconsistent.
SELECT 'CATV' AS customer_type,c.cable_customer_id AS customer_id,
 COALESCE(NULLIF(TRIM(c.legacy_customer_no),''),CAST(c.customer_code AS CHAR)) AS cust_no,
 c.customer_code AS internal_code,c.full_name,c.mobile_no,c.network_id,
 c.location_id,c.area_id,c.street_id,s.street_name
FROM cable_tv_customers c LEFT JOIN cable_streets s ON s.street_id=c.street_id
WHERE c.location_id=@tcv_legacy_postal_id OR c.area_id=@tcv_legacy_area_id
 OR s.area_id=@tcv_legacy_area_id
ORDER BY c.customer_code;

SELECT 'INTERNET' AS customer_type,c.internet_customer_id AS customer_id,
 COALESCE(NULLIF(TRIM(c.legacy_customer_no),''),
 CAST(CASE WHEN c.customer_code>=2464 THEN c.customer_code-1900 ELSE c.customer_code END AS CHAR)) AS cust_no,
 c.customer_code AS internal_code,c.full_name,c.net_id,c.mobile_no,c.network_type,
 c.location_id,c.area_id,c.street_id,s.street_name
FROM internet_customers c LEFT JOIN cable_streets s ON s.street_id=c.street_id
WHERE c.location_id=@tcv_legacy_postal_id OR c.area_id=@tcv_legacy_area_id
 OR s.area_id=@tcv_legacy_area_id
ORDER BY c.customer_code;

SET @tcv_legacy_catv_count = (
 SELECT COUNT(*) FROM cable_tv_customers c LEFT JOIN cable_streets s ON s.street_id=c.street_id
 WHERE c.location_id=@tcv_legacy_postal_id OR c.area_id=@tcv_legacy_area_id OR s.area_id=@tcv_legacy_area_id
);
SET @tcv_legacy_internet_count = (
 SELECT COUNT(*) FROM internet_customers c LEFT JOIN cable_streets s ON s.street_id=c.street_id
 WHERE c.location_id=@tcv_legacy_postal_id OR c.area_id=@tcv_legacy_area_id OR s.area_id=@tcv_legacy_area_id
);
SET @tcv_legacy_pending_shifts = (
 SELECT COUNT(*) FROM cable_connections co
 LEFT JOIN cable_streets s ON s.street_id=co.new_street_id
 WHERE co.approval_status='PENDING' AND co.connection_type='SHIFTED'
 AND (co.new_location_id=@tcv_legacy_postal_id OR co.new_area_id=@tcv_legacy_area_id OR s.area_id=@tcv_legacy_area_id)
);
-- Do not retire a postal master that also holds other locations/networks.
SET @tcv_legacy_other_areas = (
 SELECT COUNT(*) FROM cable_areas WHERE location_id=@tcv_legacy_postal_id
 AND area_id<>@tcv_legacy_area_id
);
SET @tcv_legacy_safe = (
 @tcv_legacy_network_id IS NOT NULL AND @tcv_legacy_postal_id IS NOT NULL
 AND @tcv_legacy_area_id IS NOT NULL AND @tcv_legacy_catv_count=0
 AND @tcv_legacy_internet_count=0 AND @tcv_legacy_pending_shifts=0
 AND @tcv_legacy_other_areas=0
);

UPDATE cable_streets SET is_active=0
WHERE area_id=@tcv_legacy_area_id AND is_active=1 AND @tcv_legacy_safe=1;
SET @tcv_legacy_streets_disabled=ROW_COUNT();
UPDATE cable_areas SET is_active=0
WHERE area_id=@tcv_legacy_area_id AND is_active=1 AND @tcv_legacy_safe=1;
SET @tcv_legacy_areas_disabled=ROW_COUNT();
UPDATE cable_locations SET is_active=0
WHERE location_id=@tcv_legacy_postal_id AND is_active=1 AND @tcv_legacy_safe=1;
SET @tcv_legacy_postals_disabled=ROW_COUNT();
COMMIT;

SELECT @tcv_legacy_catv_count AS mapped_catv_customers,
 @tcv_legacy_internet_count AS mapped_internet_customers,
 @tcv_legacy_pending_shifts AS pending_location_changes,
 @tcv_legacy_other_areas AS other_locations_using_postal_master,
 @tcv_legacy_streets_disabled AS streets_deactivated,
 @tcv_legacy_areas_disabled AS locations_deactivated,
 @tcv_legacy_postals_disabled AS postal_areas_deactivated,
 CASE WHEN @tcv_legacy_safe=1 THEN 'Unused TCV Legacy entries inactive. Refresh Location Info.'
 ELSE 'NOT REMOVED: review customer lists, pending changes or ambiguous/shared master IDs.' END AS result;
