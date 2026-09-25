-- VPS ONLY: Add 23 distinct supplied Internet packages.
-- Select the application database; internet_package_master must already exist.
-- Run the whole file while package master editing/imports are paused.
-- Assumption: all supplied plans belong to KRISHI.
-- price = final numeric underscore segment, ignoring _NF and [3]/[6].
-- Existing master convention: price BEFORE GST; 18% GST is added to the total.
-- Example: LTO_40M_650_NF => price 650.00, price_including_gst 767.00.
-- [3] and [6] remain separate names, each priced 650.00 (no multiplication).
-- The repeated LTO_40M_650_NF is included once; "Select Sub Package" is omitted.
-- No provider package codes were supplied, so package_code is NULL.
-- Existing matching names (including code-prefixed names and inactive rows) are skipped.
-- No existing masters, customer assignments or subscriptions are modified.
START TRANSACTION;

INSERT INTO internet_package_master (
  package_code, package_name, provider_category, price,
  gst_percent, price_including_gst, is_active
)
SELECT NULL, n.package_name, 'KRISHI', n.price,
       18.00, ROUND(n.price * 1.18, 2), 1
FROM (
  SELECT 'LTO_40M_650_NF' AS package_name, 650.00 AS price
  UNION ALL
  SELECT 'LTO_40M_650_NF [3]', 650.00
  UNION ALL
  SELECT 'LTO_40M_650_NF [6]', 650.00
  UNION ALL
  SELECT 'KRISHII_PrimeBlaze_150M_850', 850.00
  UNION ALL
  SELECT 'KRISHII_Hotflix_30M_500', 500.00
  UNION ALL
  SELECT 'KRISHII_CineFi_400M_1499', 1499.00
  UNION ALL
  SELECT 'LTO_200M_1050_NF', 1050.00
  UNION ALL
  SELECT 'KRISHII_BingeBlaze_150M_850', 850.00
  UNION ALL
  SELECT 'LTO_300M_1500_NF', 1500.00
  UNION ALL
  SELECT 'LTO_250M_1200_NF', 1200.00
  UNION ALL
  SELECT 'KRISHII_FiberFlix_500M_1799', 1799.00
  UNION ALL
  SELECT 'LTO_75M_750_NF', 750.00
  UNION ALL
  SELECT 'LTO_350M_1799_NF', 1799.00
  UNION ALL
  SELECT 'KRISHII_ShowMaxx_125M_750', 750.00
  UNION ALL
  SELECT 'KRISHII_Entert_Plus_50M_600', 600.00
  UNION ALL
  SELECT 'KRISHII_BINGE_75M_650', 650.00
  UNION ALL
  SELECT 'KRISHII_MegaStream_300M_1199', 1199.00
  UNION ALL
  SELECT 'KRISHII_StreamXpress_125M_750', 750.00
  UNION ALL
  SELECT 'KRISHII_BINGE100_100M_700', 700.00
  UNION ALL
  SELECT 'KRISHII_FLIX_PRIME_30M_500', 500.00
  UNION ALL
  SELECT 'KRISHII_SouthFlix_30M_500', 500.00
  UNION ALL
  SELECT 'LTO_100M_850_NF', 850.00
  UNION ALL
  SELECT 'KRISHII_PrimeStream_200M_999', 999.00
) n
WHERE NOT EXISTS (
  SELECT 1
  FROM internet_package_master p
  WHERE p.provider_category = 'KRISHI'
    AND (
      LOWER(TRIM(p.package_name)) COLLATE utf8mb4_unicode_ci =
        LOWER(CONVERT(n.package_name USING utf8mb4)) COLLATE utf8mb4_unicode_ci
      OR (
        p.package_code IS NOT NULL
        AND LOWER(TRIM(p.package_name)) COLLATE utf8mb4_unicode_ci =
          LOWER(CONCAT(TRIM(p.package_code), ' - ', CONVERT(n.package_name USING utf8mb4))) COLLATE utf8mb4_unicode_ci
      )
    )
);
SET @krishi_packages_inserted = ROW_COUNT();
COMMIT;

SELECT 23 AS requested_unique_packages,
       @krishi_packages_inserted AS inserted_packages,
       23 - @krishi_packages_inserted AS skipped_existing_packages;

