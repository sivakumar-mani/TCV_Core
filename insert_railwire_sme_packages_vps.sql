-- VPS: select the application database; internet_package_master must exist.
-- Back up and pause package editing/imports. Run the WHOLE file in one session.
-- 36 RAILWIRE packages. First bracket = code; final bracket = supplied price.
-- Following existing import convention, supplied prices are BEFORE 18% GST.
-- Example: 1699.00 becomes 2004.82 including GST.
-- x3/x6/x10/x12 remain part of the name; prices are NOT multiplied.
-- Existing RailWire codes or matching names (including inactive rows) are skipped.
-- No existing packages, customer assignments or subscriptions are changed.
DROP TEMPORARY TABLE IF EXISTS tmp_railwire_packages;
CREATE TEMPORARY TABLE tmp_railwire_packages (
 package_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY,
 package_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
 price DECIMAL(12,2) NOT NULL
) ENGINE=InnoDB;
INSERT INTO tmp_railwire_packages(package_code,package_name,price) VALUES
('500','SME_2Mbps_UL',1699.00),
('501','SME_4Mbps_UL',2999.00),
('502','SME_8Mbps_UL',5799.00),
('503','SME_16Mbps_UL',9999.00),
('504','SME_20Mbps_UL',12999.00),
('511','SME_100Mbps UL',55000.00),
('20004','SME_10MpbsFUP_200GB',4650.00),
('509','SME_20MpbsFUP_500GB',9999.00),
('650099','MSMEFUP25Mbps-5Mbps 2TB',599.00),
('510','SME_40MpbsFUP_1.0TB',14999.00),
('650100','MSMEFUP50Mbps-5Mbps 2.5TB',799.00),
('650102','MSMEFUP100Mbps-5Mbps 3.5TB',1199.00),
('800192','SME PM-WANIPremiumPlan100Mbps-2Mbps2.5TB ipv6',1299.00),
('800252','MSMEFUP200Mbps-5Mbps 3500GB',1999.00),
('800825','MSMEFUP300Mbps-5Mbps 4500GB',2799.00),
('20151','SME_4Mbps_UL x6',2999.00),
('20152','SME_4Mbps_UL x10',2999.00),
('20154','SME_8Mbps_UL x6',5799.00),
('20155','SME_8Mbps_UL x10',5799.00),
('20158','SME_16Mbps_UL x10',9999.00),
('20171','SME_50Mbps UL x3',28999.00),
('20164','SME_20MpbsFUP_500GB x10',9999.00),
('801128','MSMEFUP50Mbps-5Mbps 2.5TB x6',799.00),
('801127','MSMEFUP50Mbps-5Mbps 2.5TB x3',799.00),
('801129','MSMEFUP50Mbps-5Mbps 2.5TB x10',799.00),
('801130','MSMEFUP75Mbps-5Mbps 3TB x3',999.00),
('801132','MSMEFUP75Mbps-5Mbps 3TB x10',999.00),
('801131','MSMEFUP75Mbps-5Mbps 3TB x6',999.00),
('801134','MSMEFUP100Mbps-5Mbps 3.5TB x6',1199.00),
('800414','MSMEFUP100Mbps-5Mbps 3.5TB x10',1199.00),
('801133','MSMEFUP100Mbps-5Mbps 3.5TB x3',1199.00),
('801136','MSMEFUP200Mbps-5Mbps 3500GB x6',1999.00),
('801135','MSMEFUP200Mbps-5Mbps 3500GB x3',1999.00),
('800826','MSMEFUP300Mbps-5Mbps 4500GB x3',2799.00),
('800828','MSMEFUP300Mbps-5Mbps 4500GB x12',2799.00),
('800827','MSMEFUP300Mbps-5Mbps 4500GB x6',2799.00);

START TRANSACTION;
INSERT INTO internet_package_master
 (package_code,package_name,provider_category,price,gst_percent,price_including_gst,is_active)
SELECT n.package_code,n.package_name,'RAILWIRE',n.price,18.00,ROUND(n.price*1.18,2),1
FROM tmp_railwire_packages n
WHERE NOT EXISTS (
 SELECT 1 FROM internet_package_master p
 WHERE p.provider_category='RAILWIRE' AND (
   TRIM(CONVERT(p.package_code USING utf8mb4)) COLLATE utf8mb4_unicode_ci=n.package_code
   OR TRIM(CONVERT(p.package_name USING utf8mb4)) COLLATE utf8mb4_unicode_ci=n.package_name
   OR TRIM(CONVERT(p.package_name USING utf8mb4)) COLLATE utf8mb4_unicode_ci=CONCAT(n.package_code,' - ',n.package_name)
   OR (p.package_code IS NOT NULL AND
       TRIM(CONVERT(p.package_name USING utf8mb4)) COLLATE utf8mb4_unicode_ci=
       CONCAT(TRIM(CONVERT(p.package_code USING utf8mb4)),' - ',n.package_name) COLLATE utf8mb4_unicode_ci)
 )
);
SET @railwire_inserted=ROW_COUNT();
COMMIT;
SELECT 36 AS requested_packages,@railwire_inserted AS inserted_packages,
       36-@railwire_inserted AS skipped_existing_packages;
DROP TEMPORARY TABLE tmp_railwire_packages;
