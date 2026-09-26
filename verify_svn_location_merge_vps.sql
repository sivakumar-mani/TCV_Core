-- READ ONLY. Run in a fresh phpMyAdmin session after selecting the database.
-- Expected active masters: SHANKAR NAGAR only in PAMMAL;
-- PRASANTHI NAGAR only in CHROMEPET. Old merged masters may remain inactive.
SELECT n.network_code,l.location_name AS postal_area,a.area_id,a.area_name,
       a.is_active,
       (SELECT COUNT(*) FROM cable_streets s WHERE s.area_id=a.area_id AND s.is_active=1) AS active_streets,
       (SELECT COUNT(*) FROM cable_tv_customers c WHERE c.area_id=a.area_id) AS catv_customers,
       (SELECT COUNT(*) FROM internet_customers c WHERE c.area_id=a.area_id) AS internet_customers,
       (SELECT COUNT(*) FROM cable_tv_customers c LEFT JOIN cable_streets s ON s.street_id=c.street_id
        WHERE c.area_id=a.area_id AND (NOT(c.location_id <=> a.location_id)
          OR NOT(s.area_id <=> a.area_id) OR NOT(c.city <=> l.city) OR NOT(c.pincode <=> l.pincode))) AS catv_address_mismatches,
       (SELECT COUNT(*) FROM internet_customers c LEFT JOIN cable_streets s ON s.street_id=c.street_id
        WHERE c.area_id=a.area_id AND (NOT(c.location_id <=> a.location_id)
          OR NOT(s.area_id <=> a.area_id) OR NOT(c.city <=> l.city) OR NOT(c.pincode <=> l.pincode))) AS internet_address_mismatches
FROM cable_areas a
JOIN cable_network_master n ON n.network_id=a.network_id
JOIN cable_locations l ON l.location_id=a.location_id
WHERE UPPER(TRIM(n.network_code))='SVN'
  AND UPPER(TRIM(a.area_name)) IN ('SHANKAR NAGAR','PRASANTHI NAGAR')
ORDER BY a.area_name,a.is_active DESC,a.area_id;
