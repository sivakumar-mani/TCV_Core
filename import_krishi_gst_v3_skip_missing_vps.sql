-- CORRECTED VERSION: skip missing customers. Import this entire file through phpMyAdmin Import.
-- Uses a new procedure name so the old installed procedure cannot be called by this file.
-- VPS: import all 176 rows from krishi-active-gst-v3.xlsx directly into internet_subscriptions.
-- Replaces the previous insert-only script. No temporary or staging tables are used.
-- Select the application database and execute the ENTIRE file in one session.
-- Requires CREATE ROUTINE permission. Pause subscription editing while running.
-- Net ID matching ignores case and outer spaces. Tcv collector = Murugan K.
-- Match an existing subscription by exact dates, then month/year, then sole customer subscription.
-- Missing customers are skipped and reported. Ambiguous matches or missing packages roll back changes.
-- If the customer has no subscriptions, INSERT one using their active approved package.
-- Existing customer/package/account data and existing approval/payment-mode metadata are preserved.
-- Amount includes the workbook GST already. Paid => zero balance; Unpaid => full amount outstanding.
-- Dates and supplied No of Period are copied; tcv_sathish_Murugan has a source date/day-count inconsistency.
-- Re-running updates the same subscriptions instead of adding duplicates.
DELIMITER $$
DROP PROCEDURE IF EXISTS import_krishi_gst_v3_skip_missing$$
CREATE PROCEDURE import_krishi_gst_v3_skip_missing()
BEGIN
 DECLARE finished BOOLEAN DEFAULT FALSE;
 DECLARE v_net VARCHAR(150);
 DECLARE v_mon INT; DECLARE v_year INT; DECLARE v_collected DATE;
 DECLARE v_days INT; DECLARE v_start DATE; DECLARE v_end DATE;
 DECLARE v_amount DECIMAL(12,2); DECLARE v_source_balance DECIMAL(12,2); DECLARE v_status VARCHAR(10);
 DECLARE v_customer BIGINT; DECLARE v_subscription BIGINT; DECLARE v_package BIGINT;
 DECLARE v_collector INT; DECLARE v_count INT; DECLARE v_total INT;
 DECLARE updated_count INT DEFAULT 0; DECLARE inserted_count INT DEFAULT 0;
 DECLARE skipped_count INT DEFAULT 0;
 DECLARE problem VARCHAR(128);
 DECLARE workbook CURSOR FOR
 SELECT 'sky_Bhuvanaswari_T',8,2026,'2026-08-11',35,'2026-08-11','2026-09-15',885,NULL,'PENDING'
 UNION ALL
 SELECT 'sky_Kaveri_R',9,2026,'2026-09-10',35,'2026-09-10','2026-10-15',472,NULL,'PAID'
 UNION ALL
 SELECT 'sky_kirankumar',5,2026,'2026-05-14',215,'2026-05-14','2026-12-15',3540,NULL,'PAID'
 UNION ALL
 SELECT 'sky_Kumarappan_RM',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',1180,NULL,'PENDING'
 UNION ALL
 SELECT 'sky_Laxman_R',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'sky_Malleswari_V',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',472,NULL,'PAID'
 UNION ALL
 SELECT 'sky_Narasimhan_S',1,2026,'2026-01-30',470,'2026-01-30','2027-05-15',9204,NULL,'PAID'
 UNION ALL
 SELECT 'sky_New_Apoorva',8,2026,'2026-08-14',213,'2026-08-14','2027-03-15',3540,NULL,'PAID'
 UNION ALL
 SELECT 'sky_Prakash_S1',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',767,NULL,'PENDING'
 UNION ALL
 SELECT 'sky_Purusothaman_A',12,2025,'2025-12-03',467,'2025-12-03','2027-03-15',9204,NULL,'PAID'
 UNION ALL
 SELECT 'sky_Rajesh_Kanna',8,2026,'2026-08-17',29,'2026-08-17','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'sky_Sadagopan_S',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',767,NULL,'PAID'
 UNION ALL
 SELECT 'sky_Shyamprasad_CS',8,2026,'2026-08-15',212,'2026-08-15','2027-03-15',4602,NULL,'PAID'
 UNION ALL
 SELECT 'sky_Subramani_V',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'sky_Sundrasekar_S',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',767,NULL,'PENDING'
 UNION ALL
 SELECT 'sky_Vinoba_D',5,2026,'2026-05-14',215,'2026-05-14','2026-12-15',3540,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_airways_express',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',590,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_aji_ck',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_Alagarsamy_M',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',590,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_babu_s',8,2026,'2026-08-15',457,'2026-08-15','2027-11-15',9204,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_Bhaathi_S',8,2026,'2026-08-16',211,'2026-08-16','2027-03-15',3540,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_bmc_hos',12,2025,'2025-12-11',369,'2025-12-11','2026-12-15',16992,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_bmc_hos2',12,2025,'2025-12-11',369,'2025-12-11','2026-12-15',16992,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_bmc_hos4',12,2025,'2025-12-11',369,'2025-12-11','2026-12-15',16992,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_bmc_nursing',12,2025,'2025-12-11',459,'2025-12-11','2027-03-15',14160,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_chandrasekar_s',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_Chellapandian_K',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_chithra_natarajan',7,2026,'2026-07-15',215,'2026-07-15','2027-02-15',3540,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_dasarathan_dj',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_dayanithi_d',9,2026,'2026-09-09',36,'2026-09-09','2026-10-15',590,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_dhanagopal_g',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_dhanaraj_p',2,2026,'2026-02-16',211,'2026-02-16','2026-09-15',3540,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_dillibabu_r',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',472,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_divyabarathi_babu',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',767,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_divya_a',9,2026,'2026-09-08',37,'2026-09-08','2026-10-15',590,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_Elayaraja_K',9,2026,'2026-09-06',70,'2026-09-06','2026-11-15',590,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_harikrishnan_m',8,2026,'2026-08-17',29,'2026-08-17','2026-09-15',767,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_harishene_m',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',590,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_harsha_impex',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_harsha_leathers',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_hemachalam_v',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',590,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_jai_stills',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_jayaraman_c',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_jayavel_t',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_kabilan_k',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',1180,NULL,'PAID'
 UNION ALL
 SELECT 'tcv_velu',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',767,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_maithili_lakshmanan',9,2026,'2026-09-13',32,'2026-09-13','2026-10-15',1003,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_malini_m',4,2026,'2026-04-10',219,'2026-04-10','2026-11-15',3540,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_Mohamed_Niyasin',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',767,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_Murali_C',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',590,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_murali_kannan',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',767,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_Mutharasu_P',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',472,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_natarajan_t',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_nrkfreight',5,2026,'2026-05-16',456,'2026-05-16','2027-08-15',9204,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_nvl_solutions',9,2026,'2026-09-09',36,'2026-09-09','2026-10-15',590,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_om_narayana',12,2025,'2025-12-11',459,'2025-12-11','2027-03-15',10620,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_Palani_R',12,2025,'2025-12-11',459,'2025-12-11','2027-03-15',14160,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_pavankumar_y',9,2026,'2026-09-13',32,'2026-09-13','2026-10-15',767,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_Pio_J',2,2026,'2026-02-15',424,'2026-02-15','2027-04-15',3540,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_prakash_s',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',767,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_premier_party',3,2026,'2026-03-16',213,'2026-03-16','2026-10-15',3540,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_rahul_v',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',1416,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_Ramalingam_A',9,2026,'2026-09-12',33,'2026-09-12','2026-10-15',767,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_ranjeet_kumar',2,2026,'2026-02-14',213,'2026-02-14','2026-09-15',4602,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_rizwan_a',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',767,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_saradhabai_a',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',1180,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_sarankumar_am',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',1180,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_saravanan_g',7,2026,'2026-07-16',214,'2026-07-16','2027-02-15',3540,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_sarika_m',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_sathyamoorthy_b',8,2026,'2026-08-17',30,'2026-08-17','2026-09-16',1003,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_selladurai_v',9,2026,'2026-09-10',35,'2026-09-10','2026-10-15',767,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_seshachalam_l',2,2026,'2026-02-15',212,'2026-02-15','2026-09-15',3540,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_singaravelu_p',4,2026,'2026-04-13',216,'2026-04-13','2026-11-15',3540,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_sivaprakasam_a',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',590,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_srinivasa_rao',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',767,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_srini_n',2,2026,'2026-02-17',210,'2026-02-17','2026-09-15',4602,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_suba_monisha',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',590,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_sultan_pm',3,2026,'2026-03-16',213,'2026-03-16','2026-10-15',3540,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_syedibrahim_k1',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_thomaspeter_j',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',767,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_vallinayagam_a',3,2026,'2026-03-14',215,'2026-03-14','2026-10-15',3540,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_vijayalakshmi_s',3,2026,'2026-03-15',214,'2026-03-15','2026-10-15',3540,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_vijay_v',9,2026,'2026-09-02',43,'2026-09-02','2026-10-15',885,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_vinothkumar_s',7,2026,'2026-07-15',215,'2026-07-15','2027-02-15',3540,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_vinoth_kannan',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',590,NULL,'PAID'
 UNION ALL
 SELECT 'tcvn_vishnu_k',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',590,NULL,'PENDING'
 UNION ALL
 SELECT 'tcvn_vivekanand_p',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',885,NULL,'PENDING'
 UNION ALL
 SELECT 'tcv_alpha_trading',9,2026,'2026-09-10',35,'2026-09-10','2026-10-15',885,0,'PAID'
 UNION ALL
 SELECT 'tcv_Archana',9,2026,'2026-09-02',29,'2026-09-02','2026-10-01',1003,0,'PAID'
 UNION ALL
 SELECT 'tcv_arunachalam_s',12,2025,'2025-12-18',424,'2025-12-18','2027-02-15',3540,0,'PAID'
 UNION ALL
 SELECT 'tcv_balaganesh',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',590,0,'PENDING'
 UNION ALL
 SELECT 'tcv_blink_it',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',767,0,'PENDING'
 UNION ALL
 SELECT 'tcv_chandra_cineri',9,2026,'2026-09-07',38,'2026-09-07','2026-10-15',708,0,'PAID'
 UNION ALL
 SELECT 'tcv_daisy',9,2026,'2026-09-12',39,'2026-09-12','2026-10-21',885,0,'PAID'
 UNION ALL
 SELECT 'tcv_danajayan_r',3,2026,'2026-03-03',196,'2026-03-03','2026-09-15',3540,0,'PENDING'
 UNION ALL
 SELECT 'tcv_delhivery_logis',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',767,0,'PENDING'
 UNION ALL
 SELECT 'tcv_eamimal_anusuya',9,2026,'2026-09-14',36,'2026-09-14','2026-10-20',885,0,'PAID'
 UNION ALL
 SELECT 'tcv_echos_above',9,2025,'2025-09-15',487,'2025-09-15','2027-01-15',7080,0,'PAID'
 UNION ALL
 SELECT 'tcv_elangovan_r',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',590,0,'PENDING'
 UNION ALL
 SELECT 'tcv_elumalai',9,2026,'2026-09-06',30,'2026-09-06','2026-10-06',1003,0,'PAID'
 UNION ALL
 SELECT 'tcv_ezhumalai',9,2026,'2026-09-10',35,'2026-09-10','2026-10-15',354,0,'PAID'
 UNION ALL
 SELECT 'tcv_faculty_pharmacy',8,2026,'2026-08-17',29,'2026-08-17','2026-09-15',885,0,'PENDING'
 UNION ALL
 SELECT 'tcv_freeda_stephen',9,2026,'2026-09-02',43,'2026-09-02','2026-10-15',472,0,'PAID'
 UNION ALL
 SELECT 'tcv_Jagadeesan_V',9,2026,'2026-09-15',30,'2026-09-15','2026-10-15',590,0,'PAID'
 UNION ALL
 SELECT 'tcv_Jagadeeswaran',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',472,0,'PENDING'
 UNION ALL
 SELECT 'tcv_Kabilan_Kugan',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',1180,0,'PAID'
 UNION ALL
 SELECT 'tcv_kalaiselvi_a',9,2026,'2026-09-05',71,'2026-09-05','2026-11-15',472,0,'PAID'
 UNION ALL
 SELECT 'tcv_kalaivanan_e',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',590,0,'PENDING'
 UNION ALL
 SELECT 'tcv_kamal_r',5,2026,'2026-05-09',190,'2026-05-09','2026-11-15',3540,0,'PAID'
 UNION ALL
 SELECT 'tcv_kannadasan_a',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',472,0,'PENDING'
 UNION ALL
 SELECT 'tcv_KiruthIga_K',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',767,0,'PENDING'
 UNION ALL
 SELECT 'tcv_kumaresan_k',2,2026,'2026-02-17',210,'2026-02-17','2026-09-15',3540,0,'PENDING'
 UNION ALL
 SELECT 'tcv_kundalam',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',885,0,'PAID'
 UNION ALL
 SELECT 'tcv_magesh_arumugam',8,2026,'2026-08-14',32,'2026-08-14','2026-09-15',472,0,'PENDING'
 UNION ALL
 SELECT 'tcv_manoj_m',9,2026,'2026-09-01',44,'2026-09-01','2026-10-15',1770,0,'PAID'
 UNION ALL
 SELECT 'tcv_narayanan_j',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',590,0,'PAID'
 UNION ALL
 SELECT 'tcv_neil_aurelio',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',590,0,'PENDING'
 UNION ALL
 SELECT 'tcv_parthiban_s',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',590,0,'PENDING'
 UNION ALL
 SELECT 'tcv_pradeep_kumar',12,2025,'2025-12-06',436,'2025-12-06','2027-02-15',7080,0,'PAID'
 UNION ALL
 SELECT 'tcv_priyanka.m',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',885,0,'PENDING'
 UNION ALL
 SELECT 'tcv_purushothaman',8,2026,'2026-08-16',31,'2026-08-16','2026-09-16',767,0,'PENDING'
 UNION ALL
 SELECT 'tcv_raja_gopal',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',472,0,'PENDING'
 UNION ALL
 SELECT 'tcv_ramanathan_l',8,2026,'2026-08-15',212,'2026-08-15','2027-03-15',3540,0,'PAID'
 UNION ALL
 SELECT 'tcv_ramesh_s',5,2026,'2026-05-13',216,'2026-05-13','2026-12-15',3540,0,'PAID'
 UNION ALL
 SELECT 'tcv_ravanagomagan',8,2026,'2026-08-18',28,'2026-08-18','2026-09-15',590,0,'PENDING'
 UNION ALL
 SELECT 'tcv_rk_shoes',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',885,0,'PAID'
 UNION ALL
 SELECT 'tcv_roshun',8,2026,'2026-08-15',43,'2026-08-15','2026-09-27',767,0,'PENDING'
 UNION ALL
 SELECT 'tcv_samitha_arul',8,2026,'2026-08-31',15,'2026-08-31','2026-09-15',590,0,'PENDING'
 UNION ALL
 SELECT 'tcv_sarangapani',9,2026,'2026-09-08',29,'2026-09-08','2026-10-07',885,0,'PAID'
 UNION ALL
 SELECT 'tcv_saravanan_s',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',590,0,'PENDING'
 UNION ALL
 SELECT 'tcv_saravanan_s1',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',590,0,'PENDING'
 UNION ALL
 SELECT 'tcv_sathik',8,2026,'2026-08-14',32,'2026-08-14','2026-09-15',472,0,'PENDING'
 UNION ALL
 SELECT 'tcv_sathish_Murugan',9,2025,'2025-09-15',413,'2025-09-15','2026-12-15',9204,0,'PAID'
 UNION ALL
 SELECT 'tcv_sathish_Murugesan',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',472,0,'PENDING'
 UNION ALL
 SELECT 'tcv_selvaraj_n',8,2026,'2026-08-19',27,'2026-08-19','2026-09-15',590,0,'PENDING'
 UNION ALL
 SELECT 'tcv_senthil_pichai',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',472,0,'PENDING'
 UNION ALL
 SELECT 'tcv_sesha_l',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',472,0,'PAID'
 UNION ALL
 SELECT 'tcv_Sethu_G',1,2026,'2026-01-06',739,'2026-01-06','2028-01-15',9204,0,'PAID'
 UNION ALL
 SELECT 'tcv_shahrukh',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',590,0,'PENDING'
 UNION ALL
 SELECT 'tcv_shahul_hameed',9,2026,'2026-09-01',14,'2026-09-01','2026-09-15',590,0,'PENDING'
 UNION ALL
 SELECT 'tcv_sham',9,2026,'2026-09-11',4,'2026-09-11','2026-09-15',590,0,'PENDING'
 UNION ALL
 SELECT 'tcv_sr_hardware',9,2026,'2026-09-12',33,'2026-09-12','2026-10-15',767,0,'PAID'
 UNION ALL
 SELECT 'tcv_subaramani_subbaiya',9,2026,'2026-09-11',29,'2026-09-11','2026-10-10',885,0,'PAID'
 UNION ALL
 SELECT 'tcv_Sudhakar_NappappaNg',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',472,0,'PENDING'
 UNION ALL
 SELECT 'tcv_Sudhakar_P',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',472,0,'PENDING'
 UNION ALL
 SELECT 'tcv_Sudhakar_P1',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',472,0,'PENDING'
 UNION ALL
 SELECT 'tcv_Sudhakar_P2',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',472,0,'PENDING'
 UNION ALL
 SELECT 'tcv_sudhakar_p3',8,2026,'2026-08-15',31,'2026-08-15','2026-09-15',472,0,'PENDING'
 UNION ALL
 SELECT 'tcv_Swaminathan_G',9,2026,'2026-09-11',34,'2026-09-11','2026-10-15',767,0,'PAID'
 UNION ALL
 SELECT 'tcv_swarnakumari_m',9,2026,'2026-09-09',36,'2026-09-09','2026-10-15',767,0,'PAID'
 UNION ALL
 SELECT 'tcv_thavaselvan',8,2026,'2026-08-22',30,'2026-08-22','2026-09-21',590,0,'PENDING'
 UNION ALL
 SELECT 'tcv_thirumalai_v',8,2026,'2026-08-08',38,'2026-08-08','2026-09-15',590,0,'PENDING'
 UNION ALL
 SELECT 'tcv_Udaya_Kumar',8,2026,'2026-08-31',45,'2026-08-31','2026-10-15',1180,0,'PAID'
 UNION ALL
 SELECT 'tcv_udhayasaravanan',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',472,0,'PENDING'
 UNION ALL
 SELECT 'tcv_umapathy_m',3,2026,'2026-03-15',214,'2026-03-15','2026-10-15',3540,0,'PAID'
 UNION ALL
 SELECT 'tcv_vignesh_r',8,2026,'2026-08-17',59,'2026-08-17','2026-10-15',767,0,'PAID'
 UNION ALL
 SELECT 'tcv_Vijayakumar_B',8,2026,'2026-08-16',211,'2026-08-16','2027-03-15',3540,0,'PAID'
 UNION ALL
 SELECT 'tcv_vijaya_g',2,2026,'2026-02-16',453,'2026-02-16','2027-05-15',7080,0,'PAID'
 UNION ALL
 SELECT 'tcv_vimal_b',9,2026,'2026-09-08',37,'2026-09-08','2026-10-15',472,0,'PAID'
 UNION ALL
 SELECT 'tcv_vrm_polymers',2,2026,'2026-02-18',209,'2026-02-18','2026-09-15',4602,0,'PENDING'
 UNION ALL
 SELECT 'tcv_Jayababu',9,2026,'2026-09-04',41,'2026-09-04','2026-10-15',590,0,'PAID'
 UNION ALL
 SELECT 'tcv_silvaris',9,2026,'2026-09-14',31,'2026-09-14','2026-10-15',354,0,'PAID'
 UNION ALL
 SELECT 'tcv_Prabhakaran',8,2026,'2026-08-16',30,'2026-08-16','2026-09-15',472,0,'PENDING'
 UNION ALL
 SELECT 'tcv_jagadesh',8,2026,'2026-08-18',30,'2026-08-18','2026-09-17',885,0,'PENDING'
 UNION ALL
 SELECT 'tcv_Jothi',5,2026,'2026-05-16',213,'2026-05-16','2026-12-15',5310,0,'PAID'
 UNION ALL
 SELECT 'tcv_lakshmi',9,2026,'2026-09-03',42,'2026-09-03','2026-10-15',590,0,'PAID'
 UNION ALL
 SELECT 'tcv_maria',8,2026,'2026-08-02',74,'2026-08-02','2026-10-15',1770,0,'PAID'
 UNION ALL
 SELECT 'tcv_nadhim',8,2026,'2026-08-17',29,'2026-08-17','2026-09-15',354,0,'PENDING'
 UNION ALL
 SELECT 'tcv_Venkatakrishnan',5,2026,'2026-05-15',457,'2026-05-15','2027-08-15',7080,0,'PAID'
 UNION ALL
 SELECT 'tcv_diwakar',5,2026,'2026-05-29',200,'2026-05-29','2026-12-15',3540,0,'PAID'
 UNION ALL
 SELECT 'tcv_rinkesh',6,2026,'2026-06-11',187,'2026-06-11','2026-12-15',2832,0,'PAID'
 UNION ALL
 SELECT 'tcv_madhan_raj',8,2026,'2026-08-17',33,'2026-08-17','2026-09-19',826,0,'PENDING'
 UNION ALL
 SELECT 'tcv_lokesh',9,2026,'2026-09-08',7,'2026-09-08','2026-09-15',590,0,'PENDING'
 UNION ALL
 SELECT 'tcv_ajithkumar',7,2026,'2026-07-17',213,'2026-07-17','2027-02-15',3540,0,'PAID'
 UNION ALL
 SELECT 'tcv_enbarasan',9,2026,'2026-09-01',226,'2026-09-01','2027-04-15',5310,0,'PAID'
 UNION ALL
 SELECT 'tcv_vasumathi',9,2026,'2026-09-05',191,'2026-09-05','2027-03-15',3540,0,'PAID';
 DECLARE CONTINUE HANDLER FOR NOT FOUND SET finished=TRUE;
 DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
 SET @krishi_import_result='NOT COMPLETED', @krishi_updated=0, @krishi_inserted=0, @krishi_skipped=0, @krishi_missing_net_ids='';
 START TRANSACTION;
 SELECT COUNT(*),MIN(employee_id) INTO v_count,v_collector FROM employees
 WHERE LOWER(TRIM(first_name))='murugan' AND LOWER(TRIM(last_name))='k';
 IF v_count<>1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Collector Murugan K must match exactly one employee'; END IF;
 OPEN workbook;
 import_rows: LOOP
  FETCH workbook INTO v_net,v_mon,v_year,v_collected,v_days,v_start,v_end,v_amount,v_source_balance,v_status;
  IF finished THEN LEAVE import_rows; END IF;
  SELECT COUNT(*),MIN(internet_customer_id) INTO v_count,v_customer FROM internet_customers
   WHERE LOWER(TRIM(net_id)) COLLATE utf8mb4_unicode_ci=LOWER(CONVERT(v_net USING utf8mb4)) COLLATE utf8mb4_unicode_ci;
  IF v_count=0 THEN
   SET skipped_count=skipped_count+1;
   SET @krishi_missing_net_ids=CONCAT_WS(', ',NULLIF(@krishi_missing_net_ids,''),v_net);
   ITERATE import_rows;
  END IF;
  IF v_count<>1 THEN
   SET problem=CONCAT('Duplicate customer Net ID: ',v_net);
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT=problem;
  END IF;
  SELECT COUNT(*) INTO v_total FROM internet_subscriptions WHERE internet_customer_id=v_customer;
  SELECT COUNT(*),MIN(internet_subscription_id) INTO v_count,v_subscription FROM internet_subscriptions
   WHERE internet_customer_id=v_customer AND start_date=v_start AND end_date=v_end;
  IF v_count=0 THEN
   SELECT COUNT(*),MIN(internet_subscription_id) INTO v_count,v_subscription FROM internet_subscriptions
    WHERE internet_customer_id=v_customer AND subscription_month=v_mon AND subscription_year=v_year;
  END IF;
  IF v_count=0 AND v_total=1 THEN
   SELECT COUNT(*),MIN(internet_subscription_id) INTO v_count,v_subscription FROM internet_subscriptions WHERE internet_customer_id=v_customer;
  END IF;
  IF v_count>1 OR (v_count=0 AND v_total>0) THEN
   SET problem=CONCAT('Cannot uniquely select existing subscription: ',v_net);
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT=problem;
  END IF;
  IF v_count=1 THEN
   UPDATE internet_subscriptions
   SET subscription_month=v_mon,subscription_year=v_year,
    collect_date=v_collected,collected_by_employee_id=v_collector,
    billing_basis='DAYS',period_value=v_days,period_count=v_days,
    additional_months=0,additional_days=0,additional_years=0,free_period_value=0,
    start_date=v_start,end_date=v_end,amount=v_amount,
    paid_amount=IF(v_status='PAID',v_amount,0),balance_amount=IF(v_status='PAID',0,v_amount),payment_status=v_status
   WHERE internet_subscription_id=v_subscription AND internet_customer_id=v_customer;
   SET updated_count=updated_count+1;
  ELSE
   SELECT COUNT(*),MIN(internet_customer_package_id) INTO v_count,v_package FROM internet_customer_packages
    WHERE internet_customer_id=v_customer AND is_active=1 AND approval_status='APPROVED';
   IF v_count<>1 THEN
    SET problem=CONCAT('Expected one active approved customer package: ',v_net);
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT=problem;
   END IF;
   INSERT INTO internet_subscriptions (
    internet_customer_id,internet_customer_package_id,subscription_month,subscription_year,
    collect_date,collected_by_employee_id,billing_basis,period_value,period_count,
    start_date,end_date,amount,paid_amount,balance_amount,payment_status,approval_status
   ) VALUES (
    v_customer,v_package,v_mon,v_year,v_collected,v_collector,'DAYS',v_days,v_days,
    v_start,v_end,v_amount,IF(v_status='PAID',v_amount,0),IF(v_status='PAID',0,v_amount),v_status,'APPROVED'
   );
   SET inserted_count=inserted_count+1;
  END IF;
 END LOOP;
 CLOSE workbook;
 IF updated_count+inserted_count+skipped_count<>176 THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Expected 176 processed subscriptions; rolled back';
 END IF;
 COMMIT;
 SET @krishi_import_result='APPLIED', @krishi_updated=updated_count, @krishi_inserted=inserted_count, @krishi_skipped=skipped_count;
END$$
DELIMITER ;
CALL import_krishi_gst_v3_skip_missing();
DROP PROCEDURE IF EXISTS import_krishi_gst_v3_skip_missing;

-- One result set outside CALL avoids per-customer results during phpMyAdmin import.
SELECT @krishi_import_result AS result,@krishi_updated AS existing_subscriptions_processed,
 @krishi_inserted AS subscriptions_inserted,@krishi_skipped AS customers_not_found,
 @krishi_missing_net_ids AS missing_net_ids;
