-- Internet subscriptions replacement from update-krishi-old-ledger.csv.
-- Select the VPS application database first. Export internet_subscriptions before APPLY.
-- Run while subscription editing/collection is paused. Requires CREATE ROUTINE permission.
-- Only internet_subscriptions is changed; cable TV, customer/package masters and accounts are untouched.
-- All old internet subscriptions (including inactive customers) are removed on APPLY.
-- CSV dates are DD/MM/YYYY; blank month/year use renewal date. Explicit month/year are preserved.
-- tcv_sathish_Murugan explicitly has December 2026 despite renewal December 2025; preserved pending clarification.
-- CSV coverage uses DAYS with inclusive day count; no payment collection date/mode is invented.
-- Other ACTIVE customers: one row per existing active package, original package_price, unpaid.
-- PREVIEW is the default: CALL with 0 rolls back. After reviewing, change CALL argument to 1 and rerun.
-- Any validation/SQL error rolls back before leaving the procedure. Do not use mysql --force.

DELIMITER $$
DROP PROCEDURE IF EXISTS rebuild_internet_ledger_20260911$$
CREATE PROCEDURE rebuild_internet_ledger_20260911(IN apply_changes BOOLEAN)
BEGIN
    DECLARE expected_csv INT DEFAULT 0;
    DECLARE expected_remaining INT DEFAULT 0;
    DECLARE old_rows INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    DROP TEMPORARY TABLE IF EXISTS tmp_internet_csv;
    DROP TEMPORARY TABLE IF EXISTS tmp_internet_new;
    CREATE TEMPORARY TABLE tmp_internet_csv (
        net_id VARCHAR(150) PRIMARY KEY, package_name VARCHAR(255) NOT NULL,
        subscription_month INT NOT NULL, subscription_year INT NOT NULL,
        start_date DATE NOT NULL, end_date DATE NOT NULL,
        amount DECIMAL(12,2) NOT NULL, payment_status VARCHAR(10) NOT NULL
    ) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    INSERT INTO tmp_internet_csv VALUES
('tcv_Archana','LTO_100M_850_NF',9,2026,'2026-09-02','2026-10-01',850,'PENDING'),
('tcv_elumalai','LTO_100M_850_NF',9,2026,'2026-09-06','2026-10-06',850,'PENDING'),
('tcv_sarangapani','KRISHII_StreamXpress_125M_750',9,2026,'2026-09-08','2026-10-07',750,'PENDING'),
('tcv_subaramani_subbaiya','LTO_75M_750_NF',8,2026,'2026-08-11','2026-09-10',750,'PENDING'),
('tcv_echos_above','KRISHII_STARTER_75M_500',8,2026,'2026-08-11','2027-01-15',6000,'PAID'),
('tcv_Sethu_G','KRISHII_HERO_125M_650',1,2026,'2026-01-06','2028-01-15',7800,'PAID'),
('tcvn_chithra_natarajan','KRISHII_STARTER_75M_500',7,2026,'2026-07-15','2027-02-15',3000,'PAID'),
('tcvn_saravanan_g','KRISHII_STARTER_75M_500',7,2026,'2026-07-16','2027-02-15',3000,'PAID'),
('tcvn_vinothkumar_s','KRISHII_STARTER_75M_500',7,2026,'2026-07-15','2027-02-15',3000,'PAID'),
('tcv_arunachalam_s','KRISHII_STARTER_75M_500',12,2025,'2025-12-18','2027-02-15',3000,'PAID'),
('tcv_pradeep_kumar','KRISHII_STARTER_75M_500',12,2025,'2025-12-06','2027-02-15',6000,'PAID'),
('tcv_ajithkumar','KRISHII_STARTER_75M_500',7,2026,'2026-07-17','2027-02-15',3000,'PAID'),
('sky_New_Apoorva','KRISHII_STARTER_75M_500',8,2026,'2026-08-14','2027-03-15',3000,'PAID'),
('sky_Purusothaman_A','KRISHII_HERO_125M_650',12,2025,'2025-12-03','2027-03-15',7800,'PAID'),
('sky_Shyamprasad_CS','KRISHII_HERO_125M_650',8,2026,'2026-08-15','2027-03-15',3900,'PAID'),
('tcvn_Bhaathi_S','KRISHII_STARTER_75M_500',8,2026,'2026-08-16','2027-03-15',3000,'PAID'),
('tcvn_bmc_nursing','KRISHII_MAXPRO_300M_1000',12,2025,'2025-12-11','2027-03-15',12000,'PAID'),
('tcvn_om_narayana','KRISHII_HERO-PLUS_175M_750',12,2025,'2025-12-11','2027-03-15',9000,'PAID'),
('tcvn_Palani_R','KRISHII_MAXPRO_300M_1000',12,2025,'2025-12-11','2027-03-15',12000,'PAID'),
('tcv_ramanathan_l','KRISHII_STARTER_75M_500',8,2026,'2026-08-15','2027-03-15',3000,'PAID'),
('tcv_Vijayakumar_B','KRISHII_STARTER_75M_500',8,2026,'2026-08-16','2027-03-15',3000,'PAID'),
('tcv_vasumathi','KRISHII_STARTER_75M_500',9,2026,'2026-09-05','2027-03-15',3000,'PAID'),
('tcvn_Pio_J','KRISHII_STARTER_75M_500',2,2026,'2026-02-15','2027-04-15',3000,'PAID'),
('tcv_enbarasan','KRISHII_HERO-PLUS_175M_750',9,2026,'2026-09-01','2027-04-15',4500,'PAID'),
('sky_Narasimhan_S','KRISHII_HERO_125M_650',1,2026,'2026-01-30','2027-05-15',7800,'PAID'),
('tcv_vijaya_g','KRISHII_STARTER_75M_500',2,2026,'2026-02-16','2027-05-15',6000,'PAID'),
('sky_Sumathisrini_TN','KRISHII_MAXPRO_300M_1000',12,2025,'2025-12-04','2028-06-15',12000,'PAID'),
('tcvn_nrkfreight','KRISHII_HERO_125M_650',5,2026,'2026-05-16','2027-08-15',7800,'PAID'),
('tcv_Venkatakrishnan','KRISHII_STARTER_75M_500',5,2026,'2026-05-15','2027-08-15',6000,'PAID'),
('tcvn_premier_party','KRISHII_STARTER_75M_500',3,2026,'2026-03-16','2026-10-15',3000,'PAID'),
('tcvn_sultan_pm','KRISHII_STARTER_75M_500',3,2026,'2026-03-16','2026-10-15',3000,'PAID'),
('tcvn_vallinayagam_a','KRISHII_STARTER_75M_500',3,2026,'2026-03-14','2026-10-15',3000,'PAID'),
('tcvn_vijayalakshmi_s','KRISHII_STARTER_75M_500',3,2026,'2026-03-15','2026-10-15',3000,'PAID'),
('tcv_Udaya_Kumar','KRISHII_MAXPRO_300M_1000',8,2026,'2026-08-31','2026-10-15',1000,'PAID'),
('tcv_umapathy_m','KRISHII_STARTER_75M_500',3,2026,'2026-03-15','2026-10-15',3000,'PAID'),
('tcv_vignesh_r','KRISHII_BINGE_75M_650',8,2026,'2026-08-17','2026-10-15',650,'PAID'),
('tcv_maria','KRISHII_STARTER_75M_500',8,2026,'2026-08-02','2026-10-15',1500,'PAID'),
('tcvn_Elayaraja_K','KRISHII_STARTER_75M_500',9,2026,'2026-09-06','2026-11-15',500,'PAID'),
('tcvn_malini_m','KRISHII_STARTER_75M_500',4,2026,'2026-04-10','2026-11-15',3000,'PAID'),
('tcvn_singaravelu_p','KRISHII_STARTER_75M_500',4,2026,'2026-04-13','2026-11-15',3000,'PAID'),
('tcv_kalaiselvi_a','KRISHII_BASIC_PLUS_50M_400',9,2026,'2026-09-05','2026-11-15',400,'PAID'),
('tcv_kamal_r','KRISHII_STARTER_75M_500',5,2026,'2026-05-09','2026-11-15',3000,'PAID'),
('tcvn_babu_s','KRISHII_HERO_125M_650',8,2026,'2026-08-15','2027-11-15',7800,'PAID'),
('sky_kirankumar','KRISHII_STARTER_75M_500',5,2026,'2026-05-14','2026-12-15',3000,'PAID'),
('sky_Vinoba_D','KRISHII_STARTER_75M_500',5,2026,'2026-05-14','2026-12-15',3000,'PAID'),
('tcvn_bmc_hos','KRISHII_ULTRA_350M_1200',12,2025,'2025-12-11','2026-12-15',14400,'PAID'),
('tcvn_bmc_hos2','KRISHII_ULTRA_350M_1200',12,2025,'2025-12-11','2026-12-15',14400,'PAID'),
('tcvn_bmc_hos4','KRISHII_ULTRA_350M_1200',12,2025,'2025-12-11','2026-12-15',14400,'PAID'),
('tcv_ramesh_s','KRISHII_STARTER_75M_500',5,2026,'2026-05-13','2026-12-15',3000,'PAID'),
('tcv_sathish_Murugan','KRISHII_HERO_125M_650',12,2026,'2025-12-11','2026-12-15',7800,'PAID'),
('tcv_Jothi','KRISHII_HERO-PLUS_175M_750',5,2026,'2026-05-16','2026-12-15',4500,'PAID'),
('tcv_diwakar','KRISHII_STARTER_75M_500',5,2026,'2026-05-29','2026-12-15',3000,'PAID'),
('tcv_rinkesh','KRISHII_BASIC_PLUS_50M_400',6,2026,'2026-06-11','2026-12-15',2400,'PAID'),
('tcvn_sathyamoorthy_b','LTO_100M_850_NF',8,2026,'2026-08-17','2026-09-16',850,'PAID'),
('tcv_purushothaman','LTO_40M_650_NF',8,2026,'2026-08-16','2026-09-16',650,'PAID'),
('tcv_jagadesh','LTO_75M_750_NF',8,2026,'2026-08-18','2026-09-17',750,'PAID'),
('tcv_madhan_raj','KRISHII_BINGE100_100M_700',8,2026,'2026-08-17','2026-09-19',700,'PAID'),
('tcv_eamimal_anusuya','KRISHII_StreamXpress_125M_750',8,2026,'2026-08-14','2026-09-20',750,'PAID'),
('tcv_daisy','KRISHII_StreamXpress_125M_750',8,2026,'2026-08-14','2026-09-21',750,'PAID'),
('tcv_thavaselvan','KRISHII_FLIX_PRIME_30M_500',8,2026,'2026-08-22','2026-09-21',500,'PAID'),
('tcv_roshun','KRISHII_BINGE_75M_650',8,2026,'2026-08-15','2026-09-27',650,'PAID'),
('tcv_demo2','KRISHII_STARTER_75M_500',8,2026,'2026-08-30','2026-09-29',500,'PAID');
    CREATE TEMPORARY TABLE tmp_internet_new LIKE internet_subscriptions;
    START TRANSACTION;
    SELECT COUNT(*) INTO old_rows FROM internet_subscriptions;
    SELECT COUNT(*) INTO expected_csv FROM tmp_internet_csv;

    -- Every CSV Net ID must resolve to exactly one active assigned package with the given name.
    SELECT t.net_id, t.package_name, COUNT(cp.internet_customer_package_id) AS matching_assignments
    FROM tmp_internet_csv t
    LEFT JOIN internet_customers c ON LOWER(TRIM(c.net_id))=LOWER(t.net_id)
    LEFT JOIN internet_customer_packages cp ON cp.internet_customer_id=c.internet_customer_id AND cp.is_active=1
      AND cp.package_id IN (SELECT pm.package_id FROM internet_package_master pm
                           WHERE LOWER(TRIM(pm.package_name))=LOWER(t.package_name))
    GROUP BY t.net_id,t.package_name HAVING COUNT(cp.internet_customer_package_id)<>1;
    IF EXISTS (
        SELECT t.net_id FROM tmp_internet_csv t
        LEFT JOIN internet_customers c ON LOWER(TRIM(c.net_id))=LOWER(t.net_id)
        LEFT JOIN internet_customer_packages cp ON cp.internet_customer_id=c.internet_customer_id AND cp.is_active=1
          AND cp.package_id IN (SELECT pm.package_id FROM internet_package_master pm
                               WHERE LOWER(TRIM(pm.package_name))=LOWER(t.package_name))
        GROUP BY t.net_id HAVING COUNT(cp.internet_customer_package_id)<>1
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='CSV Net ID/package missing or ambiguous. No subscriptions changed.';
    END IF;

    SELECT c.net_id AS active_customer_without_package FROM internet_customers c
    WHERE c.status='ACTIVE' AND NOT EXISTS (SELECT 1 FROM tmp_internet_csv t WHERE LOWER(t.net_id)=LOWER(TRIM(c.net_id)))
      AND NOT EXISTS (SELECT 1 FROM internet_customer_packages cp WHERE cp.internet_customer_id=c.internet_customer_id AND cp.is_active=1);
    IF EXISTS (SELECT 1 FROM internet_customers c WHERE c.status='ACTIVE'
        AND NOT EXISTS (SELECT 1 FROM tmp_internet_csv t WHERE LOWER(t.net_id)=LOWER(TRIM(c.net_id)))
        AND NOT EXISTS (SELECT 1 FROM internet_customer_packages cp WHERE cp.internet_customer_id=c.internet_customer_id AND cp.is_active=1)) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Active customer has no active package. No subscriptions changed.';
    END IF;

    INSERT INTO tmp_internet_new
      (internet_customer_id,internet_customer_package_id,subscription_month,subscription_year,
       billing_basis,period_value,period_count,start_date,end_date,amount,paid_amount,balance_amount,
       payment_status,approval_status,payment_mode)
    SELECT c.internet_customer_id,cp.internet_customer_package_id,t.subscription_month,t.subscription_year,
       'DAYS',DATEDIFF(t.end_date,t.start_date)+1,ROUND((DATEDIFF(t.end_date,t.start_date)+1)/DAY(LAST_DAY(t.start_date)),4),
       t.start_date,t.end_date,t.amount,IF(t.payment_status='PAID',t.amount,0),
       IF(t.payment_status='PAID',0,t.amount),t.payment_status,cp.approval_status,'DASHBOARD'
    FROM tmp_internet_csv t JOIN internet_customers c ON LOWER(TRIM(c.net_id))=LOWER(t.net_id)
    JOIN internet_customer_packages cp ON cp.internet_customer_id=c.internet_customer_id AND cp.is_active=1
    JOIN internet_package_master pm ON pm.package_id=cp.package_id AND LOWER(TRIM(pm.package_name))=LOWER(t.package_name);

    SELECT COUNT(*) INTO expected_remaining
    FROM internet_customers c JOIN internet_customer_packages cp ON cp.internet_customer_id=c.internet_customer_id AND cp.is_active=1
    WHERE c.status='ACTIVE' AND NOT EXISTS (SELECT 1 FROM tmp_internet_csv t WHERE LOWER(t.net_id)=LOWER(TRIM(c.net_id)));
    INSERT INTO tmp_internet_new
      (internet_customer_id,internet_customer_package_id,subscription_month,subscription_year,
       billing_basis,period_value,period_count,start_date,end_date,amount,paid_amount,balance_amount,
       payment_status,approval_status,payment_mode)
    SELECT c.internet_customer_id,cp.internet_customer_package_id,9,2026,'MONTH',1,1,'2026-09-16','2026-10-15',
       cp.package_price,0,cp.package_price,'PENDING',cp.approval_status,'DASHBOARD'
    FROM internet_customers c JOIN internet_customer_packages cp ON cp.internet_customer_id=c.internet_customer_id AND cp.is_active=1
    WHERE c.status='ACTIVE' AND NOT EXISTS (SELECT 1 FROM tmp_internet_csv t WHERE LOWER(t.net_id)=LOWER(TRIM(c.net_id)));
    IF (SELECT COUNT(*) FROM tmp_internet_new)<>expected_csv+expected_remaining THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Replacement count mismatch. No subscriptions changed.';
    END IF;

    SELECT old_rows AS rows_to_remove,expected_csv AS csv_rows,expected_remaining AS remaining_active_package_rows;
    SELECT c.net_id,n.subscription_month,n.subscription_year,n.start_date,n.end_date,n.amount,n.paid_amount,n.balance_amount,n.payment_status
    FROM tmp_internet_new n JOIN internet_customers c ON c.internet_customer_id=n.internet_customer_id ORDER BY c.net_id;

    IF apply_changes=1 THEN
        DELETE FROM internet_subscriptions;
        INSERT INTO internet_subscriptions
          (internet_customer_id,internet_customer_package_id,subscription_month,subscription_year,
           billing_basis,period_value,period_count,start_date,end_date,amount,paid_amount,balance_amount,
           payment_status,approval_status,payment_mode)
        SELECT internet_customer_id,internet_customer_package_id,subscription_month,subscription_year,
           billing_basis,period_value,period_count,start_date,end_date,amount,paid_amount,balance_amount,
           payment_status,approval_status,payment_mode FROM tmp_internet_new;
        IF (SELECT COUNT(*) FROM internet_subscriptions)<>expected_csv+expected_remaining THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Final count mismatch; replacement rolled back.';
        END IF;
        COMMIT;
        SELECT 'APPLIED' AS result;
    ELSE
        ROLLBACK;
        SELECT 'PREVIEW ONLY: no subscriptions changed. Rerun with CALL argument 1 to apply.' AS result;
    END IF;
    DROP TEMPORARY TABLE tmp_internet_new;
    DROP TEMPORARY TABLE tmp_internet_csv;
END$$
DELIMITER ;
CALL rebuild_internet_ledger_20260911(0);
DROP PROCEDURE rebuild_internet_ledger_20260911;
