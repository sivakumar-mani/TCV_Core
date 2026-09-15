-- VPS ONLY: September 2026 subscriptions for 97 supplied Net IDs.
-- Select your application database and run the whole file while subscription editing is paused.
-- No stored procedure, temporary table, UPDATE or DELETE. Case-insensitive Net ID matching.
-- Missing/duplicate customers and missing/ambiguous active approved packages are skipped and listed.
-- Existing September 2026 subscriptions or exact matching dates are skipped, including paid rows.
-- Amount = assigned package_price exactly; no extra GST or day-based prorating.
-- 30 days is one billing period: DAYS, period_value=30, period_count=1.
-- PENDING is the database value displayed as Unpaid. No collection date/collector is invented.
START TRANSACTION;

-- Review this result for records that cannot be inserted.
SELECT n.net_id,CASE WHEN c.customer_id IS NULL THEN 'Customer not found'
 WHEN c.matches<>1 THEN 'Duplicate Net ID'
 WHEN p.package_id IS NULL THEN 'No active approved package'
 WHEN p.matches<>1 THEN 'Multiple active approved packages'
 ELSE 'Invalid package price' END AS skipped_reason
FROM (
 SELECT 'sky_Bhuvanaswari_T' AS net_id
 UNION ALL
 SELECT 'sky_Kumarappan_RM'
 UNION ALL
 SELECT 'sky_Laxman_R'
 UNION ALL
 SELECT 'sky_Prakash_S1'
 UNION ALL
 SELECT 'sky_Rajesh_Kanna'
 UNION ALL
 SELECT 'sky_Subramani_V'
 UNION ALL
 SELECT 'sky_Sundrasekar_S'
 UNION ALL
 SELECT 'tcvn_aji_ck'
 UNION ALL
 SELECT 'tcvn_chandrasekar_s'
 UNION ALL
 SELECT 'tcvn_Chellapandian_K'
 UNION ALL
 SELECT 'tcvn_dasarathan_dj'
 UNION ALL
 SELECT 'tcvn_dhanagopal_g'
 UNION ALL
 SELECT 'tcvn_dhanaraj_p'
 UNION ALL
 SELECT 'tcvn_dillibabu_r'
 UNION ALL
 SELECT 'tcvn_divyabarathi_babu'
 UNION ALL
 SELECT 'tcvn_harikrishnan_m'
 UNION ALL
 SELECT 'tcvn_harsha_impex'
 UNION ALL
 SELECT 'tcvn_harsha_leathers'
 UNION ALL
 SELECT 'tcvn_jai_stills'
 UNION ALL
 SELECT 'tcvn_jayaraman_c'
 UNION ALL
 SELECT 'tcvn_jayavel_t'
 UNION ALL
 SELECT 'tcv_velu'
 UNION ALL
 SELECT 'tcvn_murali_kannan'
 UNION ALL
 SELECT 'tcvn_natarajan_t'
 UNION ALL
 SELECT 'tcvn_prakash_s'
 UNION ALL
 SELECT 'tcvn_ranjeet_kumar'
 UNION ALL
 SELECT 'tcvn_rizwan_a'
 UNION ALL
 SELECT 'tcvn_sarankumar_am'
 UNION ALL
 SELECT 'tcvn_sarika_m'
 UNION ALL
 SELECT 'tcvn_seshachalam_l'
 UNION ALL
 SELECT 'tcvn_srinivasa_rao'
 UNION ALL
 SELECT 'tcvn_srini_n'
 UNION ALL
 SELECT 'tcvn_syedibrahim_k1'
 UNION ALL
 SELECT 'tcvn_thomaspeter_j'
 UNION ALL
 SELECT 'tcvn_vishnu_k'
 UNION ALL
 SELECT 'tcvn_vivekanand_p'
 UNION ALL
 SELECT 'tcv_balaganesh'
 UNION ALL
 SELECT 'tcv_blink_it'
 UNION ALL
 SELECT 'tcv_danajayan_r'
 UNION ALL
 SELECT 'tcv_delhivery_logis'
 UNION ALL
 SELECT 'tcv_elangovan_r'
 UNION ALL
 SELECT 'tcv_faculty_pharmacy'
 UNION ALL
 SELECT 'tcv_Jagadeesan_V'
 UNION ALL
 SELECT 'tcv_Jagadeeswaran'
 UNION ALL
 SELECT 'tcv_kalaivanan_e'
 UNION ALL
 SELECT 'tcv_kannadasan_a'
 UNION ALL
 SELECT 'tcv_KiruthIga_K'
 UNION ALL
 SELECT 'tcv_kumaresan_k'
 UNION ALL
 SELECT 'tcv_magesh_arumugam'
 UNION ALL
 SELECT 'tcv_neil_aurelio'
 UNION ALL
 SELECT 'tcv_parthiban_s'
 UNION ALL
 SELECT 'tcv_priyanka.m'
 UNION ALL
 SELECT 'tcv_raja_gopal'
 UNION ALL
 SELECT 'tcv_ravanagomagan'
 UNION ALL
 SELECT 'tcv_samitha_arul'
 UNION ALL
 SELECT 'tcv_saravanan_s'
 UNION ALL
 SELECT 'tcv_saravanan_s1'
 UNION ALL
 SELECT 'tcv_sathik'
 UNION ALL
 SELECT 'tcv_sathish_Murugesan'
 UNION ALL
 SELECT 'tcv_selvaraj_n'
 UNION ALL
 SELECT 'tcv_senthil_pichai'
 UNION ALL
 SELECT 'tcv_shahrukh'
 UNION ALL
 SELECT 'tcv_shahul_hameed'
 UNION ALL
 SELECT 'tcv_sham'
 UNION ALL
 SELECT 'tcv_Sudhakar_NappappaNg'
 UNION ALL
 SELECT 'tcv_Sudhakar_P'
 UNION ALL
 SELECT 'tcv_Sudhakar_P1'
 UNION ALL
 SELECT 'tcv_Sudhakar_P2'
 UNION ALL
 SELECT 'tcv_sudhakar_p3'
 UNION ALL
 SELECT 'tcv_thirumalai_v'
 UNION ALL
 SELECT 'tcv_udhayasaravanan'
 UNION ALL
 SELECT 'tcv_vrm_polymers'
 UNION ALL
 SELECT 'tcv_Prabhakaran'
 UNION ALL
 SELECT 'tcv_nadhim'
 UNION ALL
 SELECT 'tcv_lokesh'
 UNION ALL
 SELECT 'tcvn_sathyamoorthy_b'
 UNION ALL
 SELECT 'tcv_purushothaman'
 UNION ALL
 SELECT 'tcv_jagadesh'
 UNION ALL
 SELECT 'tcv_madhan_raj'
 UNION ALL
 SELECT 'tcv_thavaselvan'
 UNION ALL
 SELECT 'tcv_roshun'
 UNION ALL
 SELECT 'tcv_poncho_hos'
 UNION ALL
 SELECT 'tcv_accsys'
 UNION ALL
 SELECT 'tcvn_banu_raj'
 UNION ALL
 SELECT 'tcvn_raja_m'
 UNION ALL
 SELECT 'tcvn_sneha_enterprises'
 UNION ALL
 SELECT 'tcvn_harsha_exports'
 UNION ALL
 SELECT 'tcvn_magnum_clothing'
 UNION ALL
 SELECT 'tcvn_magnum_clothing2'
 UNION ALL
 SELECT 'tcvn_nooruddin_md'
 UNION ALL
 SELECT 'tcvn_pneu_tech'
 UNION ALL
 SELECT 'tcvn_true_kem'
 UNION ALL
 SELECT 'tcv_raisuddin_p'
 UNION ALL
 SELECT 'tcvn_rk_c'
 UNION ALL
 SELECT 'tcvn_surya_chemical'
 UNION ALL
 SELECT 'tcvn_meghdoot_ei'
 UNION ALL
 SELECT 'tcvn_vck_enterprises'
) n LEFT JOIN (
 SELECT LOWER(TRIM(net_id)) COLLATE utf8mb4_unicode_ci AS normalized_net_id,
 MIN(internet_customer_id) AS customer_id,COUNT(*) AS matches
 FROM internet_customers GROUP BY LOWER(TRIM(net_id)) COLLATE utf8mb4_unicode_ci
) c ON c.normalized_net_id=CONVERT(n.net_id USING utf8mb4) COLLATE utf8mb4_unicode_ci
LEFT JOIN (
 SELECT internet_customer_id,MIN(internet_customer_package_id) AS package_id,
 MIN(package_price) AS package_price,COUNT(*) AS matches
 FROM internet_customer_packages WHERE is_active=1 AND approval_status='APPROVED'
 GROUP BY internet_customer_id
) p ON p.internet_customer_id=c.customer_id
WHERE c.customer_id IS NULL OR c.matches<>1 OR p.package_id IS NULL OR p.matches<>1
 OR p.package_price IS NULL OR p.package_price<0;

INSERT INTO internet_subscriptions (
 internet_customer_id,internet_customer_package_id,subscription_month,subscription_year,
 billing_basis,period_value,period_count,additional_months,additional_days,additional_years,
 free_period_value,free_period_unit,start_date,end_date,collect_date,collected_by_employee_id,
 amount,paid_amount,balance_amount,payment_status,approval_status,payment_mode
)
SELECT c.customer_id,p.package_id,9,2026,'DAYS',30,1,0,0,0,0,'MONTH',
 '2026-09-16','2026-10-15',NULL,NULL,p.package_price,0,p.package_price,'PENDING','APPROVED','DASHBOARD'
FROM (
 SELECT 'sky_Bhuvanaswari_T' AS net_id
 UNION ALL
 SELECT 'sky_Kumarappan_RM'
 UNION ALL
 SELECT 'sky_Laxman_R'
 UNION ALL
 SELECT 'sky_Prakash_S1'
 UNION ALL
 SELECT 'sky_Rajesh_Kanna'
 UNION ALL
 SELECT 'sky_Subramani_V'
 UNION ALL
 SELECT 'sky_Sundrasekar_S'
 UNION ALL
 SELECT 'tcvn_aji_ck'
 UNION ALL
 SELECT 'tcvn_chandrasekar_s'
 UNION ALL
 SELECT 'tcvn_Chellapandian_K'
 UNION ALL
 SELECT 'tcvn_dasarathan_dj'
 UNION ALL
 SELECT 'tcvn_dhanagopal_g'
 UNION ALL
 SELECT 'tcvn_dhanaraj_p'
 UNION ALL
 SELECT 'tcvn_dillibabu_r'
 UNION ALL
 SELECT 'tcvn_divyabarathi_babu'
 UNION ALL
 SELECT 'tcvn_harikrishnan_m'
 UNION ALL
 SELECT 'tcvn_harsha_impex'
 UNION ALL
 SELECT 'tcvn_harsha_leathers'
 UNION ALL
 SELECT 'tcvn_jai_stills'
 UNION ALL
 SELECT 'tcvn_jayaraman_c'
 UNION ALL
 SELECT 'tcvn_jayavel_t'
 UNION ALL
 SELECT 'tcv_velu'
 UNION ALL
 SELECT 'tcvn_murali_kannan'
 UNION ALL
 SELECT 'tcvn_natarajan_t'
 UNION ALL
 SELECT 'tcvn_prakash_s'
 UNION ALL
 SELECT 'tcvn_ranjeet_kumar'
 UNION ALL
 SELECT 'tcvn_rizwan_a'
 UNION ALL
 SELECT 'tcvn_sarankumar_am'
 UNION ALL
 SELECT 'tcvn_sarika_m'
 UNION ALL
 SELECT 'tcvn_seshachalam_l'
 UNION ALL
 SELECT 'tcvn_srinivasa_rao'
 UNION ALL
 SELECT 'tcvn_srini_n'
 UNION ALL
 SELECT 'tcvn_syedibrahim_k1'
 UNION ALL
 SELECT 'tcvn_thomaspeter_j'
 UNION ALL
 SELECT 'tcvn_vishnu_k'
 UNION ALL
 SELECT 'tcvn_vivekanand_p'
 UNION ALL
 SELECT 'tcv_balaganesh'
 UNION ALL
 SELECT 'tcv_blink_it'
 UNION ALL
 SELECT 'tcv_danajayan_r'
 UNION ALL
 SELECT 'tcv_delhivery_logis'
 UNION ALL
 SELECT 'tcv_elangovan_r'
 UNION ALL
 SELECT 'tcv_faculty_pharmacy'
 UNION ALL
 SELECT 'tcv_Jagadeesan_V'
 UNION ALL
 SELECT 'tcv_Jagadeeswaran'
 UNION ALL
 SELECT 'tcv_kalaivanan_e'
 UNION ALL
 SELECT 'tcv_kannadasan_a'
 UNION ALL
 SELECT 'tcv_KiruthIga_K'
 UNION ALL
 SELECT 'tcv_kumaresan_k'
 UNION ALL
 SELECT 'tcv_magesh_arumugam'
 UNION ALL
 SELECT 'tcv_neil_aurelio'
 UNION ALL
 SELECT 'tcv_parthiban_s'
 UNION ALL
 SELECT 'tcv_priyanka.m'
 UNION ALL
 SELECT 'tcv_raja_gopal'
 UNION ALL
 SELECT 'tcv_ravanagomagan'
 UNION ALL
 SELECT 'tcv_samitha_arul'
 UNION ALL
 SELECT 'tcv_saravanan_s'
 UNION ALL
 SELECT 'tcv_saravanan_s1'
 UNION ALL
 SELECT 'tcv_sathik'
 UNION ALL
 SELECT 'tcv_sathish_Murugesan'
 UNION ALL
 SELECT 'tcv_selvaraj_n'
 UNION ALL
 SELECT 'tcv_senthil_pichai'
 UNION ALL
 SELECT 'tcv_shahrukh'
 UNION ALL
 SELECT 'tcv_shahul_hameed'
 UNION ALL
 SELECT 'tcv_sham'
 UNION ALL
 SELECT 'tcv_Sudhakar_NappappaNg'
 UNION ALL
 SELECT 'tcv_Sudhakar_P'
 UNION ALL
 SELECT 'tcv_Sudhakar_P1'
 UNION ALL
 SELECT 'tcv_Sudhakar_P2'
 UNION ALL
 SELECT 'tcv_sudhakar_p3'
 UNION ALL
 SELECT 'tcv_thirumalai_v'
 UNION ALL
 SELECT 'tcv_udhayasaravanan'
 UNION ALL
 SELECT 'tcv_vrm_polymers'
 UNION ALL
 SELECT 'tcv_Prabhakaran'
 UNION ALL
 SELECT 'tcv_nadhim'
 UNION ALL
 SELECT 'tcv_lokesh'
 UNION ALL
 SELECT 'tcvn_sathyamoorthy_b'
 UNION ALL
 SELECT 'tcv_purushothaman'
 UNION ALL
 SELECT 'tcv_jagadesh'
 UNION ALL
 SELECT 'tcv_madhan_raj'
 UNION ALL
 SELECT 'tcv_thavaselvan'
 UNION ALL
 SELECT 'tcv_roshun'
 UNION ALL
 SELECT 'tcv_poncho_hos'
 UNION ALL
 SELECT 'tcv_accsys'
 UNION ALL
 SELECT 'tcvn_banu_raj'
 UNION ALL
 SELECT 'tcvn_raja_m'
 UNION ALL
 SELECT 'tcvn_sneha_enterprises'
 UNION ALL
 SELECT 'tcvn_harsha_exports'
 UNION ALL
 SELECT 'tcvn_magnum_clothing'
 UNION ALL
 SELECT 'tcvn_magnum_clothing2'
 UNION ALL
 SELECT 'tcvn_nooruddin_md'
 UNION ALL
 SELECT 'tcvn_pneu_tech'
 UNION ALL
 SELECT 'tcvn_true_kem'
 UNION ALL
 SELECT 'tcv_raisuddin_p'
 UNION ALL
 SELECT 'tcvn_rk_c'
 UNION ALL
 SELECT 'tcvn_surya_chemical'
 UNION ALL
 SELECT 'tcvn_meghdoot_ei'
 UNION ALL
 SELECT 'tcvn_vck_enterprises'
) n JOIN (
 SELECT LOWER(TRIM(net_id)) COLLATE utf8mb4_unicode_ci AS normalized_net_id,
 MIN(internet_customer_id) AS customer_id,COUNT(*) AS matches
 FROM internet_customers GROUP BY LOWER(TRIM(net_id)) COLLATE utf8mb4_unicode_ci
) c ON c.normalized_net_id=CONVERT(n.net_id USING utf8mb4) COLLATE utf8mb4_unicode_ci
JOIN (
 SELECT internet_customer_id,MIN(internet_customer_package_id) AS package_id,
 MIN(package_price) AS package_price,COUNT(*) AS matches
 FROM internet_customer_packages WHERE is_active=1 AND approval_status='APPROVED'
 GROUP BY internet_customer_id
) p ON p.internet_customer_id=c.customer_id
WHERE c.matches=1 AND p.matches=1 AND p.package_price>=0
 AND NOT EXISTS (
  SELECT 1 FROM internet_subscriptions s WHERE s.internet_customer_id=c.customer_id
  AND ((s.subscription_month=9 AND s.subscription_year=2026)
   OR (s.start_date='2026-09-16' AND s.end_date='2026-10-15'))
 );
SET @september_inserted=ROW_COUNT();
COMMIT;
SELECT 97 AS requested_net_ids,@september_inserted AS inserted_subscriptions,
 97-@september_inserted AS skipped_existing_or_unmatched;
