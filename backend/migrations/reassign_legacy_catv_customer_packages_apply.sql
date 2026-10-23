/* MariaDB / MySQL: APPLY only after reviewing the separate preview and backing up.
   Pause customer/package edits while applying.
   Updates ALL matching customer assignments, including inactive/history.
   Only package_id changes. Prices, dates, status, approvals and Package List are preserved.
   Missing/ambiguous CATV targets of the same master type block ALL updates.
   Zero changed rows means blocked mappings or no remaining matching assignments.
   One atomic UPDATE on the existing InnoDB table; no CTE/procedure/temporary tables.
*/
UPDATE cable_customer_packages cp
JOIN (
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
) r ON r.old_package_id = cp.package_id
JOIN (
    SELECT COUNT(*) AS blocked_mappings
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
    ) validation_map
    WHERE validation_map.target_count <> 1
) guard_check ON guard_check.blocked_mappings = 0
SET cp.package_id = r.new_package_id,
    cp.updated_at = cp.updated_at
WHERE r.target_count = 1 AND cp.package_id <> r.new_package_id;
