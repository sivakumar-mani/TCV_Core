-- Add VK Tamil package (300.00) without modifying existing customer packages.
-- Safe to run more than once: active approved VK Tamil rows are not duplicated.

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS vk_tamil_target_customers;
CREATE TEMPORARY TABLE vk_tamil_target_customers (
  customer_code VARCHAR(50) NOT NULL,
  legacy_customer_no VARCHAR(50) NOT NULL,
  PRIMARY KEY (customer_code, legacy_customer_no)
);

INSERT INTO vk_tamil_target_customers (customer_code, legacy_customer_no) VALUES
('1324','1148'),('3094','2918'),('3826','3546'),('3958','3678'),
('4679','4399'),('4732','4452'),('5324','5044'),('3483','3203'),
('3479','3199'),('3851','3571'),('3965','3685'),('4743','4463'),
('3088','2912'),('3253','6078'),('3255','6080'),('3267','6092'),
('3270','6095'),('3272','6097'),('5358','5078'),('5371','5091'),
('5372','5092'),('5373','5093'),('5377','5097'),('5383','5103'),
('5385','5105'),('1080','180'),('5679','364'),('1829','1653'),
('2113','1937'),('3159','2983'),('3259','6084'),('3825','3545'),
('4758','4478'),('5072','4792'),('1149','249'),('1311','1135'),
('1590','1414'),('1693','1517'),('1820','1644'),('1995','1819'),
('2028','1852'),('2169','1993'),('2197','2021'),('2256','2080'),
('2311','2135'),('3037','2861'),('3231','6056'),('3418','3138'),
('3520','3240'),('3585','3305'),('3623','3343'),('3741','3461'),
('3799','3519'),('3813','3533'),('3860','3580'),('3913','3633'),
('3961','3681'),('4106','3826'),('4237','3957'),('4458','4178'),
('4599','4319'),('4658','4378'),('4733','4453'),('4918','4638'),
('4927','4647'),('4942','4662'),('5056','4776'),('5109','4829'),
('5141','4861'),('5185','4905'),('5269','4989'),('5698','383'),
('1749','1573'),('3351','3071'),('4978','4698'),('5333','5053'),
('2417','2241'),('2948','2772'),('3827','3547'),('4974','4694'),
('5255','4975'),('3211','6036');

-- Review this result before COMMIT: it should return no rows.
SELECT target.customer_code AS unmatched_c_no,
       target.legacy_customer_no AS unmatched_old_c_no
FROM vk_tamil_target_customers target
LEFT JOIN cable_tv_customers customer
  ON CAST(customer.customer_code AS CHAR) = target.customer_code
 AND TRIM(COALESCE(customer.legacy_customer_no, '')) = target.legacy_customer_no
WHERE customer.cable_customer_id IS NULL;

-- Verify that the required package exists and is active.
SELECT package_id, package_name, package_type, price, is_active
FROM cable_package_master
WHERE LOWER(TRIM(package_name)) = 'vk tamil'
ORDER BY is_active DESC, package_id DESC;

INSERT INTO cable_customer_packages (
  cable_customer_id,
  package_id,
  package_type,
  package_price,
  start_date,
  end_date,
  is_active,
  approval_status,
  approved_at
)
SELECT customer.cable_customer_id,
       package.package_id,
       'ADDON',
       300.00,
       CURDATE(),
       DATE_ADD(CURDATE(), INTERVAL 1 YEAR),
       1,
       'APPROVED',
       NOW()
FROM vk_tamil_target_customers target
INNER JOIN cable_tv_customers customer
  ON CAST(customer.customer_code AS CHAR) = target.customer_code
 AND TRIM(COALESCE(customer.legacy_customer_no, '')) = target.legacy_customer_no
INNER JOIN (
  SELECT package_id
  FROM cable_package_master
  WHERE LOWER(TRIM(package_name)) = 'vk tamil'
    AND is_active = 1
  ORDER BY CASE WHEN package_type = 'ADDON' THEN 0 ELSE 1 END, package_id DESC
  LIMIT 1
) package
WHERE NOT EXISTS (
  SELECT 1
  FROM cable_customer_packages existing_package
  INNER JOIN cable_package_master existing_master
    ON existing_master.package_id = existing_package.package_id
  WHERE existing_package.cable_customer_id = customer.cable_customer_id
    AND existing_package.is_active = 1
    AND existing_package.approval_status = 'APPROVED'
    AND LOWER(TRIM(existing_master.package_name)) = 'vk tamil'
);

SELECT ROW_COUNT() AS inserted_customer_packages;

-- Final verification for all requested customers.
SELECT customer.customer_code AS c_no,
       customer.legacy_customer_no AS old_c_no,
       customer.full_name AS customer_name,
       package_master.package_name,
       customer_package.package_price,
       customer_package.start_date,
       customer_package.end_date,
       customer_package.approval_status
FROM vk_tamil_target_customers target
INNER JOIN cable_tv_customers customer
  ON CAST(customer.customer_code AS CHAR) = target.customer_code
 AND TRIM(COALESCE(customer.legacy_customer_no, '')) = target.legacy_customer_no
INNER JOIN cable_customer_packages customer_package
  ON customer_package.cable_customer_id = customer.cable_customer_id
 AND customer_package.is_active = 1
 AND customer_package.approval_status = 'APPROVED'
INNER JOIN cable_package_master package_master
  ON package_master.package_id = customer_package.package_id
 AND LOWER(TRIM(package_master.package_name)) = 'vk tamil'
ORDER BY CAST(customer.customer_code AS UNSIGNED);

COMMIT;

DROP TEMPORARY TABLE IF EXISTS vk_tamil_target_customers;
