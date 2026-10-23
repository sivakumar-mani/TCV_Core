/* MariaDB / MySQL: PREVIEW ONLY. Run in time_tcvcore.
   No CTE, procedure, delimiter, or foreign-key setting is required.
   Export the preview and back up the database before applying.
   Every target must already exist in CATV with the same master package type.
   Any BLOCKED mapping prevents the entire apply script from updating.
   UNUSED means the source master exists but has no customer assignments.
*/
SELECT r.old_name, r.master_type, r.new_name, r.old_package_id, r.new_package_id,
       r.target_count,
       CASE WHEN r.target_count = 0 THEN 'BLOCKED: target missing'
            WHEN r.target_count > 1 THEN 'BLOCKED: target ambiguous'
            WHEN cp.customer_package_id IS NULL THEN 'UNUSED'
            ELSE 'READY' END AS migration_status,
       cp.customer_package_id, cp.cable_customer_id,
       cp.package_price AS preserved_customer_price, cp.is_active, cp.approval_status
FROM (
    SELECT old_pkg.package_id AS old_package_id,
           old_pkg.package_name AS old_name,
           old_pkg.package_type AS master_type,
           m.new_name,
           MIN(target.package_id) AS new_package_id,
           COUNT(target.package_id) AS target_count
    FROM cable_package_master old_pkg
    JOIN (
        SELECT 'VK TAMIL SILVER PACK NEW' AS old_name, 'DM Tamil Rural Pack' AS new_name
        UNION ALL
        SELECT 'VK TAMIL', 'DM Tamil Silver Pack'
        UNION ALL
        SELECT 'VK ONE', 'DM TAMIL BRONZE'
        UNION ALL
        SELECT 'VK MEGA HD PACK OLD', 'DM SUPER HD old'
        UNION ALL
        SELECT 'VK MEGA HD PACK', 'DM SUPER HD'
        UNION ALL
        SELECT 'VK MAX', 'DM Tamil Platinum Pack'
        UNION ALL
        SELECT 'K HINDI BUDGET', 'DM HINDI PACK'
        UNION ALL
        SELECT 'K Hindi Prime HD', 'DM HINDI PACK'
        UNION ALL
        SELECT 'K Hindi Prime SD', 'DM HINDI PACK'
        UNION ALL
        SELECT 'K Hindi Tamil Prime HD', 'DM TAMIL HINDI SD'
        UNION ALL
        SELECT 'K Hindi Tamil Prime SD', 'DM TAMIL HINDI SD'
        UNION ALL
        SELECT 'K Malayalam Tamil Prime HD', 'DM TAMIL MALAYALAM'
        UNION ALL
        SELECT 'K Malayalam Tamil Prime SD', 'DM TAMIL MALAYALAM'
        UNION ALL
        SELECT 'K Telugu Tamil Prime HD', 'DM TAMIL TELUGU hD'
        UNION ALL
        SELECT 'K Telugu Tamil Prime SD', 'DM TAMIL TELUGU SD'
        UNION ALL
        SELECT 'K Telugu Tamil Prime SD + POWER', 'DM TAMIL TELUGU SD + POWER'
    ) m ON CAST(LOWER(TRIM(old_pkg.package_name)) AS BINARY)
         = CAST(LOWER(m.old_name) AS BINARY)
    LEFT JOIN cable_package_master target
      ON CAST(LOWER(TRIM(target.package_name)) AS BINARY)
       = CAST(LOWER(m.new_name) AS BINARY)
      AND target.service_category = 'CATV'
      AND target.package_type = old_pkg.package_type
    WHERE old_pkg.service_category = 'CATV'
    GROUP BY old_pkg.package_id, old_pkg.package_name, old_pkg.package_type, m.new_name
) r
LEFT JOIN cable_customer_packages cp ON cp.package_id = r.old_package_id
ORDER BY r.old_name, cp.cable_customer_id, cp.customer_package_id;
