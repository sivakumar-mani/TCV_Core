-- Select the application database. Run in one session.
-- Updates only exact Net ID + start/end-date matches. No inserts or deletes.
-- Blank CSV month/year are left unchanged pending clarification.
-- Paid sets paid_amount=existing amount and balance=0; Unpaid does the reverse.
-- Dates, packages and charge amounts are not modified.
START TRANSACTION;
DROP TEMPORARY TABLE IF EXISTS tmp_net_period_csv;
CREATE TEMPORARY TABLE tmp_net_period_csv (
 net_id VARCHAR(150) PRIMARY KEY, period_month INT NULL, period_year INT NULL,
 start_date DATE NOT NULL, end_date DATE NOT NULL, payment_status VARCHAR(10) NOT NULL
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO tmp_net_period_csv VALUES
('tcv_Archana','9','2026','2026-09-02','2026-10-01','PENDING'),
('tcv_elumalai','9','2026','2026-09-06','2026-10-06','PENDING'),
('tcv_sarangapani','9','2026','2026-09-08','2026-10-07','PENDING'),
('tcv_subaramani_subbaiya','8','2026','2026-08-11','2026-09-10','PENDING'),
('tcv_echos_above','8','2026','2026-08-11','2027-01-15','PAID'),
('tcv_Sethu_G','1','2026','2026-01-06','2028-01-15','PAID'),
('tcvn_chithra_natarajan','7','2026','2026-07-15','2027-02-15','PAID'),
('tcvn_saravanan_g','7','2026','2026-07-16','2027-02-15','PAID'),
('tcvn_vinothkumar_s','7','2026','2026-07-15','2027-02-15','PAID'),
('tcv_arunachalam_s','12','2025','2025-12-18','2027-02-15','PAID'),
('tcv_pradeep_kumar','12','2025','2025-12-06','2027-02-15','PAID'),
('tcv_ajithkumar','7','2026','2026-07-17','2027-02-15','PAID'),
('sky_New_Apoorva','8','2026','2026-08-14','2027-03-15','PAID'),
('sky_Purusothaman_A','12','2025','2025-12-03','2027-03-15','PAID'),
('sky_Shyamprasad_CS','8','2026','2026-08-15','2027-03-15','PAID'),
('tcvn_Bhaathi_S','8','2026','2026-08-16','2027-03-15','PAID'),
('tcvn_bmc_nursing','12','2025','2025-12-11','2027-03-15','PAID'),
('tcvn_om_narayana','12','2025','2025-12-11','2027-03-15','PAID'),
('tcvn_Palani_R','12','2025','2025-12-11','2027-03-15','PAID'),
('tcv_ramanathan_l','8','2026','2026-08-15','2027-03-15','PAID'),
('tcv_Vijayakumar_B','8','2026','2026-08-16','2027-03-15','PAID'),
('tcv_vasumathi','9','2026','2026-09-05','2027-03-15','PAID'),
('tcvn_Pio_J','2','2026','2026-02-15','2027-04-15','PAID'),
('tcv_enbarasan','9','2026','2026-09-01','2027-04-15','PAID'),
('sky_Narasimhan_S','1','2026','2026-01-30','2027-05-15','PAID'),
('tcv_vijaya_g','2','2026','2026-02-16','2027-05-15','PAID'),
('sky_Sumathisrini_TN','12','2025','2025-12-04','2028-06-15','PAID'),
('tcvn_nrkfreight','5','2026','2026-05-16','2027-08-15','PAID'),
('tcv_Venkatakrishnan','5','2026','2026-05-15','2027-08-15','PAID'),
('tcvn_premier_party','3','2026','2026-03-16','2026-10-15','PAID'),
('tcvn_sultan_pm','3','2026','2026-03-16','2026-10-15','PAID'),
('tcvn_vallinayagam_a','3','2026','2026-03-14','2026-10-15','PAID'),
('tcvn_vijayalakshmi_s','3','2026','2026-03-15','2026-10-15','PAID'),
('tcv_Udaya_Kumar',NULL,NULL,'2026-08-31','2026-10-15','PAID'),
('tcv_umapathy_m','3','2026','2026-03-15','2026-10-15','PAID'),
('tcv_vignesh_r',NULL,NULL,'2026-08-17','2026-10-15','PAID'),
('tcv_maria',NULL,NULL,'2026-08-02','2026-10-15','PAID'),
('tcvn_Elayaraja_K',NULL,NULL,'2026-09-06','2026-11-15','PAID'),
('tcvn_malini_m','4','2026','2026-04-10','2026-11-15','PAID'),
('tcvn_singaravelu_p','4','2026','2026-04-13','2026-11-15','PAID'),
('tcv_kalaiselvi_a',NULL,NULL,'2026-09-05','2026-11-15','PAID'),
('tcv_kamal_r',NULL,NULL,'2026-05-09','2026-11-15','PAID'),
('tcvn_babu_s','8','2026','2026-08-15','2027-11-15','PAID'),
('sky_kirankumar','5','2026','2026-05-14','2026-12-15','PAID'),
('sky_Vinoba_D','5','2026','2026-05-14','2026-12-15','PAID'),
('tcvn_bmc_hos','12','2025','2025-12-11','2026-12-15','PAID'),
('tcvn_bmc_hos2','12','2025','2025-12-11','2026-12-15','PAID'),
('tcvn_bmc_hos4','12','2025','2025-12-11','2026-12-15','PAID'),
('tcv_ramesh_s','5','2026','2026-05-13','2026-12-15','PAID'),
('tcv_sathish_Murugan','12','2026','2025-12-11','2026-12-15','PAID'),
('tcv_Jothi','5','2026','2026-05-16','2026-12-15','PAID'),
('tcv_diwakar','5','2026','2026-05-29','2026-12-15','PAID'),
('tcv_rinkesh','6','2026','2026-06-11','2026-12-15','PAID'),
('tcvn_sathyamoorthy_b','8','2026','2026-08-17','2026-09-16','PAID'),
('tcv_purushothaman','8','2026','2026-08-16','2026-09-16','PAID'),
('tcv_jagadesh','8','2026','2026-08-18','2026-09-17','PAID'),
('tcv_madhan_raj','8','2026','2026-08-17','2026-09-19','PAID'),
('tcv_eamimal_anusuya','8','2026','2026-08-14','2026-09-20','PAID'),
('tcv_daisy','8','2026','2026-08-14','2026-09-21','PAID'),
('tcv_thavaselvan','8','2026','2026-08-22','2026-09-21','PAID'),
('tcv_roshun','8','2026','2026-08-15','2026-09-27','PAID'),
('tcv_demo2','8','2026','2026-08-30','2026-09-29','PAID');
-- Resolve all mismatches before applying. More than one matching row is ambiguous.
SELECT t.net_id,t.period_month,t.period_year,COUNT(s.internet_subscription_id) AS exact_matches
FROM tmp_net_period_csv t LEFT JOIN internet_customers c ON LOWER(TRIM(c.net_id))=LOWER(t.net_id)
LEFT JOIN internet_subscriptions s ON s.internet_customer_id=c.internet_customer_id
 AND s.start_date=t.start_date AND s.end_date=t.end_date
GROUP BY t.net_id,t.period_month,t.period_year
HAVING COUNT(s.internet_subscription_id)<>1 OR t.period_month IS NULL OR t.period_year IS NULL;
SET @net_period_ready = (
 SELECT COUNT(*)=62 FROM (
  SELECT t.net_id FROM tmp_net_period_csv t
  JOIN internet_customers c ON LOWER(TRIM(c.net_id))=LOWER(t.net_id)
  JOIN internet_subscriptions s ON s.internet_customer_id=c.internet_customer_id
   AND s.start_date=t.start_date AND s.end_date=t.end_date
  WHERE t.period_month IS NOT NULL AND t.period_year IS NOT NULL
  GROUP BY t.net_id HAVING COUNT(*)=1
 ) valid_rows
);
SELECT @net_period_ready AS ready_must_be_1;
UPDATE internet_subscriptions s
JOIN internet_customers c ON c.internet_customer_id=s.internet_customer_id
JOIN tmp_net_period_csv t ON LOWER(TRIM(c.net_id))=LOWER(t.net_id)
 AND s.start_date=t.start_date AND s.end_date=t.end_date
SET s.subscription_month=t.period_month,s.subscription_year=t.period_year,
 s.payment_status=t.payment_status,
 s.paid_amount=IF(t.payment_status='PAID',s.amount,0),
 s.balance_amount=IF(t.payment_status='PAID',0,s.amount)
WHERE @net_period_ready=1;
SELECT ROW_COUNT() AS updated_rows;
-- Preview default. Replace ROLLBACK with COMMIT only after resolving the checks.
ROLLBACK;
