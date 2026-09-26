-- READ ONLY. No session variables needed. Run and share the result rows.
SELECT n.network_id,n.network_code,l.location_id,l.location_name,
 l.is_active AS postal_active,a.area_id,a.area_name,a.is_active AS area_active,
 s.street_id,s.street_name,s.is_active AS street_active,
 (SELECT COUNT(*) FROM cable_tv_customers c
  WHERE c.location_id=l.location_id OR c.area_id=a.area_id
    OR c.street_id IN (SELECT x.street_id FROM cable_streets x WHERE x.area_id=a.area_id)) AS linked_catv,
 (SELECT COUNT(*) FROM internet_customers c
  WHERE c.location_id=l.location_id OR c.area_id=a.area_id
    OR c.street_id IN (SELECT x.street_id FROM cable_streets x WHERE x.area_id=a.area_id)) AS linked_internet,
 (SELECT COUNT(*) FROM cable_areas x WHERE x.location_id=l.location_id AND x.area_id<>a.area_id) AS other_areas_in_postal,
 (SELECT COUNT(*) FROM cable_connections co
  WHERE co.approval_status='PENDING' AND co.connection_type='SHIFTED'
    AND (co.new_location_id=l.location_id OR co.new_area_id=a.area_id
      OR co.new_street_id IN (SELECT x.street_id FROM cable_streets x WHERE x.area_id=a.area_id))) AS pending_shifts
FROM cable_areas a
LEFT JOIN cable_network_master n ON n.network_id=a.network_id
LEFT JOIN cable_locations l ON l.location_id=a.location_id
LEFT JOIN cable_streets s ON s.area_id=a.area_id
WHERE UPPER(COALESCE(l.location_name,'')) LIKE '%LEGACY%'
   OR UPPER(a.area_name) LIKE '%LEGACY%'
   OR UPPER(COALESCE(s.street_name,'')) LIKE '%LEGACY%'
ORDER BY n.network_code,l.location_id,a.area_id,s.street_id;
