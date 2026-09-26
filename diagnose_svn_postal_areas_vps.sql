-- READ ONLY: run in the VPS application database and share the result rows.
-- Lists every SVN location, including inactive ones and spelling variants.
SELECT n.network_id,n.network_code,n.network_name,n.is_active AS network_active,
       l.location_id,l.location_name AS postal_area,l.city,l.pincode,
       a.area_id,a.area_name AS location,a.is_active AS location_active,
       (SELECT COUNT(*) FROM cable_streets s WHERE s.area_id=a.area_id) AS street_count,
       (SELECT COUNT(*) FROM cable_tv_customers c WHERE c.area_id=a.area_id) AS catv_customers,
       (SELECT COUNT(*) FROM internet_customers c WHERE c.area_id=a.area_id) AS internet_customers
FROM cable_network_master n
LEFT JOIN cable_areas a ON a.network_id=n.network_id
LEFT JOIN cable_locations l ON l.location_id=a.location_id
WHERE UPPER(TRIM(n.network_code))='SVN'
ORDER BY l.location_name,a.area_name,a.area_id;

-- Also detect whether the supplied names were stored as streets rather than locations,
-- or assigned to a different network. This query makes no corrections.
SELECT n.network_code,l.location_name AS postal_area,a.area_id,a.area_name AS location,
       a.is_active AS location_active,s.street_id,s.street_name,s.is_active AS street_active
FROM cable_areas a
LEFT JOIN cable_network_master n ON n.network_id=a.network_id
LEFT JOIN cable_locations l ON l.location_id=a.location_id
LEFT JOIN cable_streets s ON s.area_id=a.area_id
WHERE UPPER(a.area_name) LIKE '%SHANK%' OR UPPER(a.area_name) LIKE '%SANK%'
   OR UPPER(a.area_name) LIKE '%PRAS%'
   OR UPPER(s.street_name) LIKE '%SHANK%' OR UPPER(s.street_name) LIKE '%SANK%'
   OR UPPER(s.street_name) LIKE '%PRAS%'
ORDER BY n.network_code,l.location_name,a.area_id,s.street_id;
