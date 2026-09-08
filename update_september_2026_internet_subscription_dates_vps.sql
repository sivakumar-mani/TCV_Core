-- Update only September 2026 Internet subscription dates for the supplied Net IDs.
-- Review the pre-check result sets before COMMIT when running manually.
START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS tmp_sep_2026_net_ids;
CREATE TEMPORARY TABLE tmp_sep_2026_net_ids (
  net_id VARCHAR(150) NOT NULL PRIMARY KEY
) ENGINE=MEMORY DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tmp_sep_2026_net_ids (net_id) VALUES
('sky_Bhuvanaswari_T'),
('sky_Kaveri_R'),
('sky_Kumarappan_RM'),
('sky_Laxman_R'),
('sky_Malleswari_V'),
('sky_Prakash_S1'),
('sky_Rajesh_Kanna'),
('sky_Sadagopan_S'),
('sky_Subramani_V'),
('sky_Sundrasekar_S'),
('tcvn_airways_express'),
('tcvn_aji_ck'),
('tcvn_Alagarsamy_M'),
('tcvn_chandrasekar_s'),
('tcvn_Chellapandian_K'),
('tcvn_dasarathan_dj'),
('tcvn_dayanithi_d'),
('tcvn_dhanagopal_g'),
('tcvn_dhanaraj_p'),
('tcvn_dillibabu_r'),
('tcvn_divyabarathi_babu'),
('tcvn_harikrishnan_m'),
('tcvn_harishene_m'),
('tcvn_harsha_impex'),
('tcvn_harsha_leathers'),
('tcvn_hemachalam_v'),
('tcvn_jai_stills'),
('tcvn_jayaraman_c'),
('tcvn_jayavel_t'),
('tcvn_kabilan_k'),
('tcv_velu'),
('tcvn_maithili_lakshmanan'),
('tcvn_Mohamed_Niyasin'),
('tcvn_Murali_C'),
('tcvn_murali_kannan'),
('tcvn_Mutharasu_P'),
('tcvn_natarajan_t'),
('tcvn_nvl_solutions'),
('tcvn_pavankumar_y'),
('tcvn_prakash_s'),
('tcvn_rahul_v'),
('tcvn_Ramalingam_A'),
('tcvn_ranjeet_kumar'),
('tcvn_rizwan_a'),
('tcvn_saradhabai_a'),
('tcvn_sarankumar_am'),
('tcvn_sarika_m'),
('tcvn_sathyamoorthy_b'),
('tcvn_selladurai_v'),
('tcvn_seshachalam_l'),
('tcvn_sivaprakasam_a'),
('tcvn_srinivasa_rao'),
('tcvn_srini_n'),
('tcvn_suba_monisha'),
('tcvn_syedibrahim_k1'),
('tcvn_thomaspeter_j'),
('tcvn_vinoth_kannan'),
('tcvn_vishnu_k'),
('tcvn_vivekanand_p'),
('tcv_alpha_trading'),
('tcv_balaganesh'),
('tcv_blink_it'),
('tcv_daisy'),
('tcv_danajayan_r'),
('tcv_delhivery_logis'),
('tcv_eamimal_anusuya'),
('tcv_elangovan_r'),
('tcv_ezhumalai'),
('tcv_faculty_pharmacy'),
('tcv_Jagadeesan_V'),
('tcv_Jagadeeswaran'),
('tcv_Kabilan_Kugan'),
('tcv_kalaivanan_e'),
('tcv_kannadasan_a'),
('tcv_KiruthIga_K'),
('tcv_kumaresan_k'),
('tcv_kundalam'),
('tcv_magesh_arumugam'),
('tcv_narayanan_j'),
('tcv_neil_aurelio'),
('tcv_parthiban_s'),
('tcv_priyanka.m'),
('tcv_purushothaman'),
('tcv_raja_gopal'),
('tcv_ravanagomagan'),
('tcv_rk_shoes'),
('tcv_roshun'),
('tcv_samitha_arul'),
('tcv_sarangapani'),
('tcv_saravanan_s'),
('tcv_saravanan_s1'),
('tcv_sathik'),
('tcv_sathish_Murugesan'),
('tcv_selvaraj_n'),
('tcv_senthil_pichai'),
('tcv_sesha_l'),
('tcv_shahrukh'),
('tcv_shahul_hameed'),
('tcv_sr_hardware'),
('tcv_subaramani_subbaiya'),
('tcv_Sudhakar_NappappaNg'),
('tcv_Sudhakar_P'),
('tcv_Sudhakar_P1'),
('tcv_Sudhakar_P2'),
('tcv_sudhakar_p3'),
('tcv_Swaminathan_G'),
('tcv_swarnakumari_m'),
('tcv_thavaselvan'),
('tcv_thirumalai_v'),
('tcv_udhayasaravanan'),
('tcv_vimal_b'),
('tcv_vrm_polymers'),
('tcv_demo2'),
('tcv_silvaris'),
('tcv_Prabhakaran'),
('tcv_jagadesh'),
('tcv_nadhim'),
('tcv_madhan_raj'),
('tcv_lokesh');

-- Pre-check 1: supplied IDs that do not exist in internet_customers.
SELECT t.net_id AS unmatched_net_id
FROM tmp_sep_2026_net_ids t
LEFT JOIN internet_customers c
  ON LOWER(TRIM(c.net_id)) = LOWER(t.net_id)
WHERE c.internet_customer_id IS NULL
ORDER BY t.net_id;

-- Pre-check 2: matched customers without a September 2026 subscription.
SELECT c.net_id AS missing_september_subscription
FROM tmp_sep_2026_net_ids t
JOIN internet_customers c
  ON LOWER(TRIM(c.net_id)) = LOWER(t.net_id)
LEFT JOIN internet_subscriptions s
  ON s.internet_customer_id = c.internet_customer_id
 AND s.subscription_month = 9
 AND s.subscription_year = 2026
WHERE s.internet_subscription_id IS NULL
ORDER BY c.net_id;

-- Pre-check 3: duplicate September rows that will be removed.
SELECT c.net_id, COUNT(*) AS september_row_count
FROM tmp_sep_2026_net_ids t
JOIN internet_customers c
  ON LOWER(TRIM(c.net_id)) = LOWER(t.net_id)
JOIN internet_subscriptions s
  ON s.internet_customer_id = c.internet_customer_id
 AND s.subscription_month = 9
 AND s.subscription_year = 2026
GROUP BY c.internet_customer_id, c.net_id
HAVING COUNT(*) > 1
ORDER BY c.net_id;

-- Keep one row per customer. Prefer rows containing payment, then the oldest row.
DELETE duplicate_row
FROM internet_subscriptions duplicate_row
JOIN internet_customers c
  ON c.internet_customer_id = duplicate_row.internet_customer_id
JOIN tmp_sep_2026_net_ids t
  ON LOWER(TRIM(c.net_id)) = LOWER(t.net_id)
JOIN internet_subscriptions keeper
  ON keeper.internet_customer_id = duplicate_row.internet_customer_id
 AND keeper.subscription_month = duplicate_row.subscription_month
 AND keeper.subscription_year = duplicate_row.subscription_year
 AND (
      CASE keeper.payment_status WHEN 'PAID' THEN 3 WHEN 'PARTIAL' THEN 2 ELSE 1 END
        > CASE duplicate_row.payment_status WHEN 'PAID' THEN 3 WHEN 'PARTIAL' THEN 2 ELSE 1 END
   OR (keeper.payment_status = duplicate_row.payment_status
       AND keeper.paid_amount > duplicate_row.paid_amount)
   OR (keeper.payment_status = duplicate_row.payment_status
       AND keeper.paid_amount = duplicate_row.paid_amount
       AND keeper.internet_subscription_id < duplicate_row.internet_subscription_id)
 )
WHERE duplicate_row.subscription_month = 9
  AND duplicate_row.subscription_year = 2026;

SET @removed_duplicate_rows = ROW_COUNT();
SELECT @removed_duplicate_rows AS removed_duplicate_rows;

UPDATE internet_subscriptions s
JOIN internet_customers c
  ON c.internet_customer_id = s.internet_customer_id
JOIN tmp_sep_2026_net_ids t
  ON LOWER(TRIM(c.net_id)) = LOWER(t.net_id)
SET s.start_date = '2026-09-16',
    s.end_date = '2026-10-15',
    s.billing_basis = 'MONTH',
    s.period_value = 1,
    s.period_count = 1
WHERE s.subscription_month = 9
  AND s.subscription_year = 2026;

SET @updated_september_2026_rows = ROW_COUNT();
SELECT @updated_september_2026_rows AS updated_subscription_rows;

-- Verification result set.
SELECT c.net_id, s.internet_subscription_id, s.subscription_month,
       s.subscription_year, s.billing_basis, s.period_value, s.period_count,
       s.start_date, s.end_date, DATEDIFF(s.end_date, s.start_date) + 1 AS number_of_days
FROM tmp_sep_2026_net_ids t
JOIN internet_customers c
  ON LOWER(TRIM(c.net_id)) = LOWER(t.net_id)
JOIN internet_subscriptions s
  ON s.internet_customer_id = c.internet_customer_id
 AND s.subscription_month = 9
 AND s.subscription_year = 2026
ORDER BY c.net_id, s.internet_subscription_id;

COMMIT;
DROP TEMPORARY TABLE IF EXISTS tmp_sep_2026_net_ids;
