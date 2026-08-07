-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: tcvonedb
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `tcvonedb`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `tcvonedb` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `tcvonedb`;

--
-- Table structure for table `audit_log`
--

DROP TABLE IF EXISTS `audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_log` (
  `audit_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `module` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `table_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `record_id` int DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `browser_info` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `change_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`audit_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_module` (`module`),
  KEY `idx_table_name` (`table_name`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_record` (`table_name`,`record_id`),
  CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_log`
--

LOCK TABLES `audit_log` WRITE;
/*!40000 ALTER TABLE `audit_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brands`
--

DROP TABLE IF EXISTS `brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brands` (
  `brand_id` int NOT NULL AUTO_INCREMENT,
  `brand_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`brand_id`),
  UNIQUE KEY `brand_name` (`brand_name`),
  UNIQUE KEY `brand_code` (`brand_code`),
  KEY `idx_brand_name` (`brand_name`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product brands master';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brands`
--

LOCK TABLES `brands` WRITE;
/*!40000 ALTER TABLE `brands` DISABLE KEYS */;
INSERT INTO `brands` VALUES (1,'vk','vk','mso vk bought the accessories',NULL,1,'2026-07-23 10:10:45','2026-07-23 10:10:45'),(2,'TIMESCOPE','timescope','CATV SELLER',NULL,1,'2026-07-23 10:20:01','2026-07-23 10:20:01');
/*!40000 ALTER TABLE `brands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_approval_groups`
--

DROP TABLE IF EXISTS `cable_approval_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_approval_groups` (
  `approval_group_id` bigint NOT NULL AUTO_INCREMENT,
  `approval_group_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `group_type` enum('NEW_CUSTOMER_ONBOARDING','CUSTOMER_UPDATE','STB_UPDATE','CONNECTION_UPDATE','MATERIAL_UPDATE','PACKAGE_UPDATE','SUBSCRIPTION_UPDATE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `approval_status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `requested_by_user_id` int DEFAULT NULL,
  `approved_by_user_id` int DEFAULT NULL,
  `requested_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_reason` text COLLATE utf8mb4_unicode_ci,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`approval_group_id`),
  UNIQUE KEY `uk_cable_approval_group_no` (`approval_group_no`),
  KEY `fk_cable_approval_groups_requested_by` (`requested_by_user_id`),
  KEY `fk_cable_approval_groups_approved_by` (`approved_by_user_id`),
  KEY `idx_cable_approval_group_type` (`group_type`),
  KEY `idx_cable_approval_group_status` (`approval_status`),
  CONSTRAINT `fk_cable_approval_groups_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_approval_groups_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Groups Cable TV records for single workflow approval. New customer onboarding uses one group for customer, STB, connection, materials, package and subscription.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_approval_groups`
--

LOCK TABLES `cable_approval_groups` WRITE;
/*!40000 ALTER TABLE `cable_approval_groups` DISABLE KEYS */;
INSERT INTO `cable_approval_groups` VALUES (1,'CTV-1784807681544','NEW_CUSTOMER_ONBOARDING','APPROVED',1,1,'2026-07-23 11:54:41','2026-07-23 11:54:41',NULL,NULL,'2026-07-23 11:54:41','2026-07-23 11:54:41'),(4,'CTV-1784808500081-703','PACKAGE_UPDATE','APPROVED',1,1,'2026-07-23 12:08:20','2026-07-23 12:08:20',NULL,NULL,'2026-07-23 12:08:20','2026-07-23 12:08:20'),(5,'CTV-1784808566310-268','CONNECTION_UPDATE','APPROVED',1,1,'2026-07-23 12:09:26','2026-07-23 12:09:26',NULL,NULL,'2026-07-23 12:09:26','2026-07-23 12:09:26'),(6,'CTV-1784877039535','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-07-24 07:10:39','2026-07-24 07:17:32',NULL,NULL,'2026-07-24 07:10:39','2026-07-24 07:17:32'),(7,'CTV-1784878429179','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-07-24 07:33:49','2026-07-24 08:44:55',NULL,NULL,'2026-07-24 07:33:49','2026-07-24 08:44:55'),(8,'CTV-1784893746481','NEW_CUSTOMER_ONBOARDING','APPROVED',1,1,'2026-07-24 11:49:06','2026-07-24 11:49:06',NULL,NULL,'2026-07-24 11:49:06','2026-07-24 11:49:06'),(10,'CTV-1784894049412-843','STB_UPDATE','APPROVED',1,1,'2026-07-24 11:54:09','2026-07-24 11:54:09',NULL,NULL,'2026-07-24 11:54:09','2026-07-24 11:54:09'),(11,'CTV-1784894414527-707','SUBSCRIPTION_UPDATE','APPROVED',1,1,'2026-07-24 12:00:14','2026-07-24 12:00:14',NULL,NULL,'2026-07-24 12:00:14','2026-07-24 12:00:14'),(12,'CTV-1784894536917-741','STB_UPDATE','APPROVED',1,1,'2026-07-24 12:02:16','2026-07-24 12:02:16',NULL,NULL,'2026-07-24 12:02:16','2026-07-24 12:02:16'),(13,'CTV-1784894598723-538','STB_UPDATE','APPROVED',1,1,'2026-07-24 12:03:18','2026-07-24 12:03:18',NULL,NULL,'2026-07-24 12:03:18','2026-07-24 12:03:18'),(14,'CTV-1784894660257-582','STB_UPDATE','APPROVED',1,1,'2026-07-24 12:04:20','2026-07-24 12:04:20',NULL,NULL,'2026-07-24 12:04:20','2026-07-24 12:04:20'),(15,'CTV-1784894761913-39','STB_UPDATE','APPROVED',1,1,'2026-07-24 12:06:01','2026-07-24 12:06:01',NULL,NULL,'2026-07-24 12:06:01','2026-07-24 12:06:01'),(16,'CTV-1784896184193-379','STB_UPDATE','APPROVED',1,1,'2026-07-24 12:29:44','2026-07-24 12:29:44',NULL,NULL,'2026-07-24 12:29:44','2026-07-24 12:29:44'),(17,'CTV-1784999261926','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-07-25 17:07:41','2026-07-25 17:27:54',NULL,NULL,'2026-07-25 17:07:41','2026-07-25 17:27:54'),(18,'CTV-1785002126004','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-07-25 17:55:26','2026-07-25 18:01:43',NULL,NULL,'2026-07-25 17:55:26','2026-07-25 18:01:43'),(19,'CTV-1785003335974','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-07-25 18:15:35','2026-07-25 18:17:23',NULL,NULL,'2026-07-25 18:15:35','2026-07-25 18:17:23'),(20,'CTV-1785044777293','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-07-26 05:46:17','2026-07-26 05:47:32',NULL,NULL,'2026-07-26 05:46:17','2026-07-26 05:47:32'),(22,'CTV-1785134499095-699','SUBSCRIPTION_UPDATE','APPROVED',3,1,'2026-07-27 06:41:39','2026-07-28 09:48:58',NULL,NULL,'2026-07-27 06:41:39','2026-07-28 09:48:58'),(23,'CTV-1785135296207-931','STB_UPDATE','APPROVED',3,1,'2026-07-27 06:54:56','2026-07-28 09:49:14',NULL,NULL,'2026-07-27 06:54:56','2026-07-28 09:49:14'),(24,'CTV-1785135460207-831','STB_UPDATE','APPROVED',3,1,'2026-07-27 06:57:40','2026-07-28 09:49:20',NULL,NULL,'2026-07-27 06:57:40','2026-07-28 09:49:20'),(25,'CTV-1785135591837-601','STB_UPDATE','PENDING',3,NULL,'2026-07-27 06:59:51',NULL,NULL,NULL,'2026-07-27 06:59:51','2026-07-27 06:59:51'),(27,'CTV-1785145226914-748','CUSTOMER_UPDATE','APPROVED',3,1,'2026-07-27 09:40:26','2026-07-28 09:49:54',NULL,NULL,'2026-07-27 09:40:26','2026-07-28 09:49:54'),(28,'CTV-1785145347436-533','CUSTOMER_UPDATE','APPROVED',3,1,'2026-07-27 09:42:27','2026-07-28 09:55:38',NULL,NULL,'2026-07-27 09:42:27','2026-07-28 09:55:38'),(29,'CTV-1785220513776-34','STB_UPDATE','APPROVED',1,1,'2026-07-28 06:35:13','2026-07-28 06:35:13',NULL,NULL,'2026-07-28 06:35:13','2026-07-28 06:35:13'),(30,'CTV-1785221090893','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-07-28 06:44:50','2026-07-28 06:49:09',NULL,NULL,'2026-07-28 06:44:50','2026-07-28 06:49:09'),(31,'CTV-1785221572728-119','STB_UPDATE','APPROVED',3,1,'2026-07-28 06:52:52','2026-07-28 09:55:42',NULL,NULL,'2026-07-28 06:52:52','2026-07-28 09:55:42'),(32,'CTV-1785229956841','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-07-28 09:12:36','2026-07-28 09:15:11',NULL,NULL,'2026-07-28 09:12:36','2026-07-28 09:15:11'),(33,'CTV-1785230140640-461','SUBSCRIPTION_UPDATE','APPROVED',3,1,'2026-07-28 09:15:40','2026-07-28 09:55:47',NULL,NULL,'2026-07-28 09:15:40','2026-07-28 09:55:47'),(34,'CTV-1785231322359-49','SUBSCRIPTION_UPDATE','APPROVED',3,1,'2026-07-28 09:35:22','2026-07-28 09:55:51',NULL,NULL,'2026-07-28 09:35:22','2026-07-28 09:55:51'),(35,'CTV-1785231824947-633','SUBSCRIPTION_UPDATE','PENDING',3,NULL,'2026-07-28 09:43:44',NULL,NULL,NULL,'2026-07-28 09:43:44','2026-07-28 09:43:44'),(36,'CTV-1785231879709-837','SUBSCRIPTION_UPDATE','APPROVED',3,1,'2026-07-28 09:44:39','2026-07-28 09:55:55',NULL,NULL,'2026-07-28 09:44:39','2026-07-28 09:55:55'),(37,'CTV-1785232823642','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-07-28 10:00:23','2026-07-28 10:09:57',NULL,NULL,'2026-07-28 10:00:23','2026-07-28 10:09:57'),(38,'CTV-1785233453404-187','SUBSCRIPTION_UPDATE','APPROVED',1,1,'2026-07-28 10:10:53','2026-07-28 10:10:53',NULL,NULL,'2026-07-28 10:10:53','2026-07-28 10:10:53'),(39,'CTV-1785233988097-793','STB_UPDATE','APPROVED',3,1,'2026-07-28 10:19:48','2026-07-28 10:20:35',NULL,NULL,'2026-07-28 10:19:48','2026-07-28 10:20:35'),(40,'CTV-1785234795685-19','STB_UPDATE','APPROVED',3,1,'2026-07-28 10:33:15','2026-07-28 10:34:10',NULL,NULL,'2026-07-28 10:33:15','2026-07-28 10:34:10'),(41,'CTV-1785238831201','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-07-28 11:40:31','2026-07-28 11:47:54',NULL,NULL,'2026-07-28 11:40:31','2026-07-28 11:47:54'),(42,'CTV-1785326632928','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-07-29 12:03:52','2026-07-29 12:05:05',NULL,NULL,'2026-07-29 12:03:52','2026-07-29 12:05:05'),(43,'CTV-1785395974964','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-07-30 07:19:34','2026-07-30 07:26:36',NULL,NULL,'2026-07-30 07:19:34','2026-07-30 07:26:36'),(44,'CTV-1785396511631-74','SUBSCRIPTION_UPDATE','APPROVED',1,1,'2026-07-30 07:28:31','2026-07-30 07:28:31',NULL,NULL,'2026-07-30 07:28:31','2026-07-30 07:28:31'),(45,'CTV-1785396545165-868','STB_UPDATE','APPROVED',1,1,'2026-07-30 07:29:05','2026-07-30 07:29:05',NULL,NULL,'2026-07-30 07:29:05','2026-07-30 07:29:05'),(46,'CTV-1785396588651-858','STB_UPDATE','APPROVED',1,1,'2026-07-30 07:29:48','2026-07-30 07:29:48',NULL,NULL,'2026-07-30 07:29:48','2026-07-30 07:29:48'),(47,'CTV-1785396635140-375','CONNECTION_UPDATE','APPROVED',1,1,'2026-07-30 07:30:35','2026-07-30 07:30:35',NULL,NULL,'2026-07-30 07:30:35','2026-07-30 07:30:35'),(48,'CTV-1785396724855-963','STB_UPDATE','APPROVED',1,1,'2026-07-30 07:32:04','2026-07-30 07:32:04',NULL,NULL,'2026-07-30 07:32:04','2026-07-30 07:32:04'),(49,'CTV-1785402994083-188','STB_UPDATE','APPROVED',3,1,'2026-07-30 09:16:34','2026-07-30 09:27:57',NULL,NULL,'2026-07-30 09:16:34','2026-07-30 09:27:57'),(50,'CTV-1785403657070','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-07-30 09:27:37','2026-07-30 09:39:34',NULL,NULL,'2026-07-30 09:27:37','2026-07-30 09:39:34'),(51,'CTV-1785404416104-229','SUBSCRIPTION_UPDATE','APPROVED',3,1,'2026-07-30 09:40:16','2026-07-30 10:02:08',NULL,NULL,'2026-07-30 09:40:16','2026-07-30 10:02:08'),(52,'CTV-1785404441643-413','SUBSCRIPTION_UPDATE','APPROVED',3,1,'2026-07-30 09:40:41','2026-07-30 10:02:12',NULL,NULL,'2026-07-30 09:40:41','2026-07-30 10:02:12'),(53,'CTV-1785404720034-115','SUBSCRIPTION_UPDATE','APPROVED',3,1,'2026-07-30 09:45:20','2026-07-30 10:02:16',NULL,NULL,'2026-07-30 09:45:20','2026-07-30 10:02:16'),(54,'CTV-1785405759079-336','SUBSCRIPTION_UPDATE','APPROVED',1,1,'2026-07-30 10:02:39','2026-07-30 10:02:39',NULL,NULL,'2026-07-30 10:02:39','2026-07-30 10:02:39'),(55,'CTV-1785405818464-417','SUBSCRIPTION_UPDATE','APPROVED',1,1,'2026-07-30 10:03:38','2026-07-30 10:03:38',NULL,NULL,'2026-07-30 10:03:38','2026-07-30 10:03:38'),(56,'CTV-1785406360947-549','SUBSCRIPTION_UPDATE','APPROVED',1,1,'2026-07-30 10:12:40','2026-07-30 10:12:40',NULL,NULL,'2026-07-30 10:12:40','2026-07-30 10:12:40'),(57,'CTV-1785406397105-916','STB_UPDATE','APPROVED',1,1,'2026-07-30 10:13:17','2026-07-30 10:13:17',NULL,NULL,'2026-07-30 10:13:17','2026-07-30 10:13:17'),(58,'CTV-1785406822003-343','STB_UPDATE','APPROVED',1,1,'2026-07-30 10:20:22','2026-07-30 10:20:22',NULL,NULL,'2026-07-30 10:20:22','2026-07-30 10:20:22'),(59,'CTV-1785406918479-553','STB_UPDATE','APPROVED',3,1,'2026-07-30 10:21:58','2026-07-31 06:30:04',NULL,NULL,'2026-07-30 10:21:58','2026-07-31 06:30:04'),(60,'CTV-1785407134562-256','STB_UPDATE','APPROVED',3,1,'2026-07-30 10:25:34','2026-07-31 06:30:09',NULL,NULL,'2026-07-30 10:25:34','2026-07-31 06:30:09'),(61,'CTV-1785407481064-567','STB_UPDATE','APPROVED',1,1,'2026-07-30 10:31:21','2026-07-30 10:31:21',NULL,NULL,'2026-07-30 10:31:21','2026-07-30 10:31:21'),(62,'CTV-1785407610792-175','STB_UPDATE','APPROVED',3,1,'2026-07-30 10:33:30','2026-07-31 06:30:13',NULL,NULL,'2026-07-30 10:33:30','2026-07-31 06:30:13'),(64,'CTV-1785479380546','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-07-31 06:29:40','2026-07-31 06:34:53',NULL,NULL,'2026-07-31 06:29:40','2026-07-31 06:34:53'),(65,'CTV-1785482043282-24','STB_UPDATE','APPROVED',1,1,'2026-07-31 07:14:03','2026-07-31 07:14:03',NULL,NULL,'2026-07-31 07:14:03','2026-07-31 07:14:03'),(66,'CTV-1785482869266-950','STB_UPDATE','APPROVED',3,1,'2026-07-31 07:27:49','2026-07-31 09:46:36',NULL,NULL,'2026-07-31 07:27:49','2026-07-31 09:46:36'),(67,'CTV-1785490226006','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-07-31 09:30:26','2026-07-31 09:46:52',NULL,NULL,'2026-07-31 09:30:26','2026-07-31 09:46:52'),(68,'CTV-1785491450408-456','STB_UPDATE','APPROVED',3,1,'2026-07-31 09:50:50','2026-07-31 10:00:26',NULL,NULL,'2026-07-31 09:50:50','2026-07-31 10:00:26'),(69,'CTV-1785492407741-477','STB_UPDATE','APPROVED',3,1,'2026-07-31 10:06:47','2026-07-31 10:09:08',NULL,NULL,'2026-07-31 10:06:47','2026-07-31 10:09:08'),(70,'CTV-1785738309848','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-08-03 06:25:09','2026-08-03 06:29:10',NULL,NULL,'2026-08-03 06:25:09','2026-08-03 06:29:10'),(71,'CTV-1785740896638','NEW_CUSTOMER_ONBOARDING','APPROVED',3,1,'2026-08-03 07:08:16','2026-08-03 07:09:21',NULL,NULL,'2026-08-03 07:08:16','2026-08-03 07:09:21'),(72,'CTV-1785741642205-855','STB_UPDATE','APPROVED',3,1,'2026-08-03 07:20:42','2026-08-03 07:21:45',NULL,NULL,'2026-08-03 07:20:42','2026-08-03 07:21:45'),(73,'CTV-1785742375781-701','STB_UPDATE','PENDING',3,NULL,'2026-08-03 07:32:55',NULL,NULL,NULL,'2026-08-03 07:32:55','2026-08-03 07:32:55');
/*!40000 ALTER TABLE `cable_approval_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_areas`
--

DROP TABLE IF EXISTS `cable_areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_areas` (
  `area_id` int NOT NULL AUTO_INCREMENT,
  `network_id` int DEFAULT NULL,
  `location_id` int NOT NULL,
  `area_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`area_id`),
  UNIQUE KEY `uk_cable_network_location_area` (`network_id`,`location_id`,`area_name`),
  KEY `idx_cable_area_location` (`location_id`),
  KEY `idx_cable_area_active` (`is_active`),
  CONSTRAINT `fk_cable_areas_location` FOREIGN KEY (`location_id`) REFERENCES `cable_locations` (`location_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_areas_network` FOREIGN KEY (`network_id`) REFERENCES `cable_network_master` (`network_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV area master mapped to location';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_areas`
--

LOCK TABLES `cable_areas` WRITE;
/*!40000 ALTER TABLE `cable_areas` DISABLE KEYS */;
INSERT INTO `cable_areas` VALUES (1,1,1,'Arkeeswarar colony',1,'2026-07-23 09:37:12','2026-07-23 09:37:12'),(2,2,1,'Lakshmipuram',1,'2026-07-23 09:38:11','2026-07-23 09:38:11'),(4,3,2,'LIC Colony',1,'2026-07-23 09:41:45','2026-07-23 09:41:45');
/*!40000 ALTER TABLE `cable_areas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_connection_materials`
--

DROP TABLE IF EXISTS `cable_connection_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_connection_materials` (
  `connection_material_id` bigint NOT NULL AUTO_INCREMENT,
  `approval_group_id` bigint DEFAULT NULL,
  `connection_id` bigint NOT NULL,
  `product_id` int DEFAULT NULL,
  `material_id` int DEFAULT NULL,
  `item_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `qty` decimal(10,2) NOT NULL,
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PCS',
  `unit_rate` decimal(12,2) NOT NULL DEFAULT '0.00',
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `issued_by_employee_id` int DEFAULT NULL,
  `updated_by_employee_id` int DEFAULT NULL,
  `updated_date` date DEFAULT NULL,
  `approval_status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `created_by_user_id` int DEFAULT NULL,
  `approved_by_user_id` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_reason` text COLLATE utf8mb4_unicode_ci,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`connection_material_id`),
  KEY `fk_cable_materials_issued_by` (`issued_by_employee_id`),
  KEY `fk_cable_materials_created_by_user` (`created_by_user_id`),
  KEY `fk_cable_materials_approved_by_user` (`approved_by_user_id`),
  KEY `idx_cable_materials_connection` (`connection_id`),
  KEY `idx_cable_materials_approval_group` (`approval_group_id`),
  KEY `idx_cable_materials_product` (`product_id`),
  KEY `idx_cable_materials_material` (`material_id`),
  KEY `idx_cable_materials_approval_status` (`approval_status`),
  CONSTRAINT `fk_cable_materials_approval_group` FOREIGN KEY (`approval_group_id`) REFERENCES `cable_approval_groups` (`approval_group_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_materials_approved_by_user` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_materials_connection` FOREIGN KEY (`connection_id`) REFERENCES `cable_connections` (`connection_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_materials_created_by_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_materials_issued_by` FOREIGN KEY (`issued_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_materials_material_master` FOREIGN KEY (`material_id`) REFERENCES `material_master` (`material_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_materials_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `cable_connection_materials_chk_1` CHECK ((`qty` > 0)),
  CONSTRAINT `cable_connection_materials_chk_2` CHECK ((`unit_rate` >= 0)),
  CONSTRAINT `cable_connection_materials_chk_3` CHECK ((`amount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Materials used for Cable TV connection, entered as add-row items';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_connection_materials`
--

LOCK TABLES `cable_connection_materials` WRITE;
/*!40000 ALTER TABLE `cable_connection_materials` DISABLE KEYS */;
INSERT INTO `cable_connection_materials` VALUES (1,1,1,5,NULL,'TIMESCOPE Fiber 6 core',10.00,'PCS',15.00,150.00,1,1,'2026-07-23','APPROVED',1,NULL,NULL,NULL,NULL,'2026-07-23 11:54:41'),(2,1,1,6,NULL,'TIMESCOPE RG cable copper',10.00,'PCS',25.00,250.00,1,1,'2026-07-23','APPROVED',1,NULL,NULL,NULL,NULL,'2026-07-23 11:54:41'),(3,5,2,5,NULL,'TIMESCOPE Fiber 6 core',10.00,'PCS',15.00,150.00,1,1,'2026-07-23','APPROVED',1,NULL,NULL,NULL,NULL,'2026-07-23 12:09:26'),(4,6,3,5,NULL,'TIMESCOPE Fiber 6 core',10.00,'PCS',15.00,150.00,3,3,'2026-07-24','APPROVED',3,NULL,NULL,NULL,NULL,'2026-07-24 07:10:39'),(5,7,4,6,NULL,'TIMESCOPE RG cable copper',10.00,'PCS',25.00,250.00,3,3,'2026-07-24','APPROVED',3,NULL,NULL,NULL,NULL,'2026-07-24 07:33:49'),(6,8,5,5,NULL,'TIMESCOPE Fiber 6 core',10.00,'PCS',15.00,150.00,2,2,'2026-07-24','APPROVED',1,NULL,NULL,NULL,NULL,'2026-07-24 11:49:06'),(7,17,6,5,NULL,'TIMESCOPE Fiber 6 core',10.00,'PCS',15.00,150.00,3,3,'2026-07-25','APPROVED',3,NULL,NULL,NULL,NULL,'2026-07-25 17:07:41'),(8,18,7,5,NULL,'TIMESCOPE Fiber 6 core',10.00,'PCS',15.00,150.00,3,3,'2026-07-25','APPROVED',3,NULL,NULL,NULL,NULL,'2026-07-25 17:55:26'),(9,19,8,5,NULL,'TIMESCOPE Fiber 6 core',10.00,'PCS',15.00,150.00,3,3,'2026-07-25','APPROVED',3,NULL,NULL,NULL,NULL,'2026-07-25 18:15:35'),(10,20,9,5,NULL,'TIMESCOPE Fiber 6 core',10.00,'PCS',15.00,150.00,3,3,'2026-07-26','APPROVED',3,NULL,NULL,NULL,NULL,'2026-07-26 05:46:17'),(11,30,12,5,NULL,'TIMESCOPE Fiber 6 core',10.00,'PCS',15.00,150.00,3,3,'2026-07-28','APPROVED',3,NULL,NULL,NULL,NULL,'2026-07-28 06:44:50'),(12,32,13,6,NULL,'TIMESCOPE RG cable copper',20.00,'PCS',25.00,500.00,3,3,'2026-07-28','APPROVED',3,NULL,NULL,NULL,NULL,'2026-07-28 09:12:36'),(13,37,14,5,NULL,'TIMESCOPE Fiber 6 core',10.00,'PCS',15.00,150.00,3,3,'2026-07-28','APPROVED',3,NULL,NULL,NULL,NULL,'2026-07-28 10:00:23'),(14,41,15,5,NULL,'TIMESCOPE Fiber 6 core',10.00,'PCS',15.00,150.00,3,3,'2026-07-28','APPROVED',3,NULL,NULL,NULL,NULL,'2026-07-28 11:40:31'),(15,42,16,6,NULL,'TIMESCOPE RG cable copper',10.00,'PCS',25.00,250.00,3,3,'2026-07-29','APPROVED',3,NULL,NULL,NULL,NULL,'2026-07-29 12:03:52'),(16,43,17,6,NULL,'TIMESCOPE RG cable copper',10.00,'PCS',25.00,250.00,3,3,'2026-07-30','APPROVED',3,NULL,NULL,NULL,NULL,'2026-07-30 07:19:34'),(17,50,19,5,NULL,'TIMESCOPE Fiber 6 core',10.00,'PCS',15.00,150.00,3,3,'2026-07-30','APPROVED',3,NULL,NULL,NULL,NULL,'2026-07-30 09:27:37'),(18,64,20,5,NULL,'TIMESCOPE Fiber 6 core',10.00,'PCS',15.00,150.00,3,3,'2026-07-31','APPROVED',3,NULL,NULL,NULL,NULL,'2026-07-31 06:29:40'),(19,67,21,5,NULL,'TIMESCOPE Fiber 6 core',10.00,'PCS',15.00,150.00,3,3,'2026-07-31','APPROVED',3,NULL,NULL,NULL,NULL,'2026-07-31 09:30:26'),(20,70,22,6,NULL,'TIMESCOPE RG cable copper',10.00,'PCS',25.00,250.00,3,3,'2026-08-03','APPROVED',3,NULL,NULL,NULL,NULL,'2026-08-03 06:25:09'),(21,71,23,6,NULL,'TIMESCOPE RG cable copper',10.00,'PCS',25.00,250.00,3,3,'2026-08-03','APPROVED',3,NULL,NULL,NULL,NULL,'2026-08-03 07:08:16');
/*!40000 ALTER TABLE `cable_connection_materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_connection_sources`
--

DROP TABLE IF EXISTS `cable_connection_sources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_connection_sources` (
  `source_id` int NOT NULL AUTO_INCREMENT,
  `source_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`source_id`),
  UNIQUE KEY `uk_cable_source_name` (`source_name`),
  KEY `idx_cable_source_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV source of connection master';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_connection_sources`
--

LOCK TABLES `cable_connection_sources` WRITE;
/*!40000 ALTER TABLE `cable_connection_sources` DISABLE KEYS */;
INSERT INTO `cable_connection_sources` VALUES (1,'Direct',1,'2026-07-23 11:54:41','2026-07-23 11:54:41'),(2,'Customer Approach Office',1,'2026-07-26 05:46:17','2026-07-26 05:46:17');
/*!40000 ALTER TABLE `cable_connection_sources` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_connections`
--

DROP TABLE IF EXISTS `cable_connections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_connections` (
  `connection_id` bigint NOT NULL AUTO_INCREMENT,
  `approval_group_id` bigint DEFAULT NULL,
  `cable_customer_id` bigint NOT NULL,
  `connection_date` date NOT NULL DEFAULT (curdate()),
  `disconnection_date` date DEFAULT NULL,
  `connection_type` enum('NEW','RECONNECTION','SHIFTED','TRANSFERRED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NEW',
  `old_door_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_door_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `old_location_id` int DEFAULT NULL,
  `old_area_id` int DEFAULT NULL,
  `old_street_id` int DEFAULT NULL,
  `new_location_id` int DEFAULT NULL,
  `new_area_id` int DEFAULT NULL,
  `new_street_id` int DEFAULT NULL,
  `old_address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `connected_by_employee_id` int DEFAULT NULL,
  `entered_by_employee_id` int DEFAULT NULL,
  `connection_charge` decimal(12,2) NOT NULL DEFAULT '0.00',
  `connection_discount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `labour_service_charge` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('ACTIVE','DISCONNECTED','SHIFTED','TRANSFERRED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `approval_status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_by_user_id` int DEFAULT NULL,
  `approved_by_user_id` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`connection_id`),
  KEY `fk_cable_connections_connected_by` (`connected_by_employee_id`),
  KEY `fk_cable_connections_created_by_user` (`created_by_user_id`),
  KEY `fk_cable_connections_approved_by_user` (`approved_by_user_id`),
  KEY `idx_cable_connections_customer` (`cable_customer_id`),
  KEY `idx_cable_connections_approval_group` (`approval_group_id`),
  KEY `idx_cable_connections_date` (`connection_date`),
  KEY `idx_cable_connections_type` (`connection_type`),
  KEY `idx_cable_connections_status` (`status`),
  KEY `idx_cable_connections_approval_status` (`approval_status`),
  CONSTRAINT `fk_cable_connections_approval_group` FOREIGN KEY (`approval_group_id`) REFERENCES `cable_approval_groups` (`approval_group_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_connections_approved_by_user` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_connections_connected_by` FOREIGN KEY (`connected_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_connections_created_by_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_connections_customer` FOREIGN KEY (`cable_customer_id`) REFERENCES `cable_tv_customers` (`cable_customer_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `cable_connections_chk_1` CHECK ((`connection_charge` >= 0)),
  CONSTRAINT `cable_connections_chk_2` CHECK ((`labour_service_charge` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV connection, disconnection, shifted and transferred history';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_connections`
--

LOCK TABLES `cable_connections` WRITE;
/*!40000 ALTER TABLE `cable_connections` DISABLE KEYS */;
INSERT INTO `cable_connections` VALUES (1,1,1,'2026-07-23',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,250.00,0.00,100.00,'ACTIVE','APPROVED',NULL,1,NULL,NULL,NULL,'2026-07-23 11:54:41','2026-07-23 12:06:57'),(2,5,1,'2026-07-23',NULL,'SHIFTED','2/3','3',1,1,2,1,1,1,'2/3, 2nd Street, Arkeeswarar colony, Chromepet, Chennai, 600044','3, 1st Street, Arkeeswarar colony, Chromepet, Chennai, 600044',1,1,250.00,0.00,50.00,'ACTIVE','APPROVED',NULL,1,NULL,NULL,NULL,'2026-07-23 12:09:26','2026-07-23 12:09:26'),(3,6,2,'2026-07-24',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,250.00,0.00,100.00,'ACTIVE','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-24 07:10:39','2026-07-24 07:29:35'),(4,7,3,'2026-07-24',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,250.00,0.00,100.00,'ACTIVE','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-24 07:33:49','2026-07-24 08:44:20'),(5,8,4,'2026-07-24',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,2,NULL,250.00,0.00,100.00,'ACTIVE','APPROVED','test',1,NULL,NULL,NULL,'2026-07-24 11:49:06','2026-07-24 11:49:06'),(6,17,5,'2026-07-25',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,250.00,0.00,100.00,'ACTIVE','APPROVED','test',3,NULL,NULL,NULL,'2026-07-25 17:07:41','2026-07-25 17:42:54'),(7,18,6,'2026-07-25',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,250.00,0.00,100.00,'ACTIVE','APPROVED','test',3,NULL,NULL,NULL,'2026-07-25 17:55:26','2026-07-25 18:05:25'),(8,19,7,'2026-07-25',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,250.00,0.00,100.00,'ACTIVE','APPROVED','test',3,NULL,NULL,NULL,'2026-07-25 18:15:35','2026-07-25 18:19:20'),(9,20,8,'2026-07-26',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,250.00,0.00,100.00,'ACTIVE','APPROVED','jak to vk exchange',3,NULL,NULL,NULL,'2026-07-26 05:46:17','2026-07-26 05:48:51'),(10,27,6,'2026-07-27',NULL,'RECONNECTION',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,3,0.00,0.00,0.00,'ACTIVE','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-27 09:40:40','2026-07-28 09:49:54'),(11,28,6,'2026-07-27',NULL,'RECONNECTION',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,3,0.00,0.00,0.00,'ACTIVE','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-27 09:42:36','2026-07-28 09:55:38'),(12,30,10,'2026-07-28',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,250.00,0.00,100.00,'ACTIVE','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-28 06:44:50','2026-07-28 06:49:31'),(13,32,11,'2026-07-28',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,250.00,0.00,100.00,'ACTIVE','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-28 09:12:36','2026-07-28 09:14:03'),(14,37,12,'2026-07-28',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,250.00,0.00,100.00,'ACTIVE','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-28 10:00:23','2026-07-28 10:09:34'),(15,41,13,'2026-07-28',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,500.00,0.00,100.00,'ACTIVE','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-28 11:40:31','2026-07-28 15:11:27'),(16,42,14,'2026-07-28',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,300.00,0.00,100.00,'ACTIVE','APPROVED','test',3,NULL,NULL,NULL,'2026-07-29 12:03:52','2026-07-30 07:27:30'),(17,43,15,'2026-07-29',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,250.00,0.00,100.00,'ACTIVE','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-30 07:19:34','2026-07-30 07:27:12'),(18,47,15,'2026-07-30',NULL,'RECONNECTION',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,3,100.00,0.00,0.00,'ACTIVE','APPROVED',NULL,1,NULL,NULL,NULL,'2026-07-30 07:30:35','2026-07-30 07:30:35'),(19,50,16,'2026-07-29',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,250.00,250.00,100.00,'ACTIVE','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-30 09:27:37','2026-07-30 09:33:40'),(20,64,17,'2026-07-30',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,150.00,0.00,100.00,'ACTIVE','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-31 06:29:40','2026-07-31 07:12:55'),(21,67,18,'2026-07-30',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,550.00,0.00,100.00,'ACTIVE','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-31 09:30:26','2026-07-31 09:46:09'),(22,70,19,'2026-08-03',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,250.00,0.00,100.00,'ACTIVE','APPROVED',NULL,3,NULL,NULL,NULL,'2026-08-03 06:25:09','2026-08-03 07:09:36'),(23,71,20,'2026-08-03',NULL,'NEW',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,3,NULL,250.00,0.00,100.00,'ACTIVE','APPROVED',NULL,3,NULL,NULL,NULL,'2026-08-03 07:08:16','2026-08-03 07:18:32');
/*!40000 ALTER TABLE `cable_connections` ENABLE KEYS */;
UNLOCK TABLES;

-- Connection network mapping added after seed data so legacy positional inserts remain valid.
ALTER TABLE `cable_connections`
  ADD COLUMN `old_network_id` int DEFAULT NULL AFTER `connection_type`,
  ADD COLUMN `new_network_id` int DEFAULT NULL AFTER `old_network_id`,
  ADD KEY `idx_cable_connections_old_network` (`old_network_id`),
  ADD KEY `idx_cable_connections_new_network` (`new_network_id`),
  ADD CONSTRAINT `fk_cable_connections_old_network` FOREIGN KEY (`old_network_id`) REFERENCES `cable_network_master` (`network_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cable_connections_new_network` FOREIGN KEY (`new_network_id`) REFERENCES `cable_network_master` (`network_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Table structure for table `cable_customer_account_payments`
--

DROP TABLE IF EXISTS `cable_customer_account_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_customer_account_payments` (
  `payment_id` bigint NOT NULL AUTO_INCREMENT,
  `account_id` bigint NOT NULL,
  `cash_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `online_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `received_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `paid_date` date NOT NULL,
  `received_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `balance_after_payment` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_status` enum('PARTIAL','PAID') NOT NULL,
  `received_by_user_id` int NOT NULL,
  `received_by_employee_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  KEY `idx_cable_account_payments_account` (`account_id`),
  KEY `idx_cable_account_payments_paid_date` (`paid_date`),
  CONSTRAINT `fk_cable_account_payments_account` FOREIGN KEY (`account_id`) REFERENCES `cable_customer_accounts` (`account_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_customer_account_payments`
--

LOCK TABLES `cable_customer_account_payments` WRITE;
/*!40000 ALTER TABLE `cable_customer_account_payments` DISABLE KEYS */;
INSERT INTO `cable_customer_account_payments` VALUES (2,1,500.00,0.00,500.00,'2026-07-23','2026-07-23','2026-07-24',637.00,'PARTIAL',1,1,'2026-07-23 12:04:08'),(3,1,637.00,0.00,637.00,'2026-07-23','2026-07-23',NULL,0.00,'PAID',1,1,'2026-07-23 12:06:57'),(4,3,2100.00,0.00,2100.00,'2026-07-24','2026-07-24',NULL,0.00,'PAID',1,1,'2026-07-24 07:29:35'),(5,4,1377.00,0.00,1377.00,'2026-07-24','2026-07-24',NULL,0.00,'PAID',1,1,'2026-07-24 08:44:20'),(6,5,1277.00,0.00,1277.00,'2026-07-24','2026-07-24',NULL,0.00,'PAID',1,1,'2026-07-24 11:50:49'),(7,8,1268.00,0.00,1268.00,'2026-07-25','2026-07-25',NULL,0.00,'PAID',1,1,'2026-07-25 17:42:54'),(8,9,1268.00,0.00,1268.00,'2026-07-25','2026-07-25',NULL,0.00,'PAID',1,1,'2026-07-25 18:05:25'),(9,10,1268.00,0.00,1268.00,'2026-07-25','2026-07-25',NULL,0.00,'PAID',1,1,'2026-07-25 18:19:20'),(10,11,1108.00,0.00,1108.00,'2026-07-26','2026-07-26',NULL,0.00,'PAID',1,1,'2026-07-26 05:48:51'),(11,13,1239.00,0.00,1239.00,'2026-07-28','2026-07-28',NULL,0.00,'PAID',1,1,'2026-07-28 06:49:31'),(12,14,1089.00,0.00,1089.00,'2026-07-28','2026-07-28',NULL,0.00,'PAID',1,1,'2026-07-28 09:14:03'),(13,16,1089.00,0.00,1089.00,'2026-07-28','2026-07-28',NULL,0.00,'PAID',1,1,'2026-07-28 10:09:34'),(14,2,400.00,0.00,400.00,'2026-07-28','2026-07-28',NULL,0.00,'PAID',1,1,'2026-07-28 10:13:02'),(15,7,150.00,0.00,150.00,'2026-07-28','2026-07-28',NULL,0.00,'PAID',1,1,'2026-07-28 10:13:13'),(18,17,971.00,0.00,971.00,'2026-07-28','2026-07-28',NULL,0.00,'PAID',1,1,'2026-07-28 15:11:27'),(19,19,1105.00,0.00,1105.00,'2026-07-30','2026-07-30',NULL,0.00,'PAID',1,1,'2026-07-30 07:27:12'),(20,18,1045.00,0.00,1045.00,'2026-07-30','2026-07-30',NULL,0.00,'PAID',1,1,'2026-07-30 07:27:30'),(21,20,100.00,0.00,100.00,'2026-07-30','2026-07-30',NULL,0.00,'PAID',1,1,'2026-07-30 07:31:22'),(22,21,919.35,0.00,919.35,'2026-07-30','2026-07-30',NULL,0.00,'PAID',1,1,'2026-07-30 09:33:40'),(23,22,550.00,0.00,550.00,'2026-07-31','2026-07-31',NULL,0.00,'PAID',1,1,'2026-07-31 06:36:27'),(24,23,808.00,0.00,808.00,'2026-07-31','2026-07-31',NULL,0.00,'PAID',1,1,'2026-07-31 07:12:55'),(25,24,350.00,0.00,350.00,'2026-07-31','2026-07-31',NULL,0.00,'PAID',1,1,'2026-07-31 09:30:58'),(26,25,1295.00,0.00,1295.00,'2026-07-31','2026-07-31',NULL,0.00,'PAID',1,1,'2026-07-31 09:46:09'),(27,26,1331.00,0.00,1331.00,'2026-08-03','2026-08-03',NULL,0.00,'PAID',1,1,'2026-08-03 07:09:36'),(28,27,1350.00,0.00,1350.00,'2026-08-03','2026-08-03',NULL,0.00,'PAID',1,1,'2026-08-03 07:18:32');
/*!40000 ALTER TABLE `cable_customer_account_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_customer_accounts`
--

DROP TABLE IF EXISTS `cable_customer_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_customer_accounts` (
  `account_id` bigint NOT NULL AUTO_INCREMENT,
  `approval_group_id` bigint NOT NULL,
  `cable_customer_id` bigint NOT NULL,
  `stb_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `connection_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `labor_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `material_cost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `material_discount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `subscription_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `sub_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `overall_discount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `grand_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `customer_paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `office_received_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `office_balance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `due_date` date DEFAULT NULL,
  `account_status` enum('PENDING','PARTIAL','PAID','RECEIVED') NOT NULL DEFAULT 'PENDING',
  `received_by_user_id` int DEFAULT NULL,
  `received_by_employee_id` int DEFAULT NULL,
  `received_at` timestamp NULL DEFAULT NULL,
  `approval_status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `created_by_user_id` int DEFAULT NULL,
  `approved_by_user_id` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`account_id`),
  KEY `idx_cable_customer_accounts_customer` (`cable_customer_id`),
  KEY `idx_cable_customer_accounts_status` (`account_status`),
  KEY `fk_cable_accounts_approval_group` (`approval_group_id`),
  CONSTRAINT `fk_cable_accounts_approval_group` FOREIGN KEY (`approval_group_id`) REFERENCES `cable_approval_groups` (`approval_group_id`),
  CONSTRAINT `fk_cable_accounts_customer` FOREIGN KEY (`cable_customer_id`) REFERENCES `cable_tv_customers` (`cable_customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_customer_accounts`
--

LOCK TABLES `cable_customer_accounts` WRITE;
/*!40000 ALTER TABLE `cable_customer_accounts` DISABLE KEYS */;
INSERT INTO `cable_customer_accounts` VALUES (1,1,1,800.00,250.00,100.00,400.00,0.00,87.00,1537.00,400.00,400.00,1137.00,0.00,1137.00,0.00,1137.00,NULL,'PAID',1,1,'2026-07-23 12:06:57','APPROVED',1,1,'2026-07-23 11:54:41','2026-07-23 11:54:41','2026-07-23 12:06:57'),(2,5,1,0.00,250.00,50.00,150.00,0.00,0.00,400.00,0.00,0.00,400.00,0.00,400.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-28 10:13:02','APPROVED',1,1,'2026-07-23 12:09:26','2026-07-23 12:09:26','2026-07-28 10:13:02'),(3,6,2,800.00,250.00,100.00,150.00,0.00,900.00,2100.00,0.00,0.00,2100.00,0.00,2100.00,0.00,2100.00,NULL,'PAID',1,1,'2026-07-24 07:29:35','APPROVED',3,1,'2026-07-24 07:17:32','2026-07-24 07:10:39','2026-07-24 07:29:35'),(4,7,3,800.00,250.00,100.00,250.00,0.00,77.00,1377.00,0.00,0.00,1377.00,0.00,1377.00,0.00,1377.00,NULL,'PAID',1,1,'2026-07-24 08:44:20','APPROVED',3,1,'2026-07-24 08:44:55','2026-07-24 07:33:49','2026-07-24 08:44:55'),(5,8,4,800.00,250.00,100.00,150.00,0.00,77.00,1277.00,0.00,0.00,1277.00,0.00,1277.00,0.00,1277.00,NULL,'PAID',1,1,'2026-07-24 11:50:49','APPROVED',1,1,'2026-07-24 11:49:06','2026-07-24 11:49:06','2026-07-24 11:50:49'),(7,13,4,500.00,0.00,50.00,0.00,0.00,0.00,550.00,400.00,0.00,150.00,100.00,150.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-28 10:13:13','APPROVED',1,1,'2026-07-24 12:03:18','2026-07-24 12:03:18','2026-07-28 10:13:13'),(8,17,5,800.00,250.00,100.00,150.00,0.00,68.00,1268.00,0.00,0.00,1268.00,1268.00,1268.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-25 17:42:54','APPROVED',3,1,'2026-07-25 17:27:54','2026-07-25 17:07:41','2026-07-25 17:42:54'),(9,18,6,800.00,250.00,100.00,150.00,0.00,68.00,1268.00,0.00,0.00,1268.00,1268.00,1268.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-25 18:05:25','APPROVED',3,1,'2026-07-25 18:01:43','2026-07-25 17:55:26','2026-07-25 18:05:25'),(10,19,7,800.00,250.00,100.00,150.00,0.00,68.00,1268.00,0.00,0.00,1268.00,1268.00,1268.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-25 18:19:20','APPROVED',3,1,'2026-07-25 18:17:23','2026-07-25 18:15:35','2026-07-25 18:19:20'),(11,20,8,800.00,250.00,100.00,150.00,0.00,58.00,1258.00,150.00,150.00,1108.00,1108.00,1108.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-26 05:48:51','APPROVED',3,1,'2026-07-26 05:47:32','2026-07-26 05:46:17','2026-07-26 05:48:51'),(13,30,10,800.00,250.00,100.00,150.00,0.00,39.00,1239.00,0.00,0.00,1239.00,1239.00,1239.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-28 06:49:31','APPROVED',3,1,'2026-07-28 06:49:09','2026-07-28 06:44:50','2026-07-28 06:49:31'),(14,32,11,800.00,250.00,100.00,500.00,0.00,39.00,1589.00,500.00,500.00,1089.00,1589.00,1089.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-28 09:14:03','APPROVED',3,1,'2026-07-28 09:15:11','2026-07-28 09:12:36','2026-07-28 09:15:11'),(16,37,12,800.00,250.00,100.00,150.00,150.00,39.00,1239.00,150.00,0.00,1089.00,1089.00,1089.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-28 10:09:34','APPROVED',3,1,'2026-07-28 10:09:57','2026-07-28 10:00:23','2026-07-28 10:09:57'),(17,41,13,100.00,500.00,100.00,150.00,150.00,271.00,1121.00,150.00,0.00,971.00,1086.00,971.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-28 15:11:27','APPROVED',3,1,'2026-07-28 11:47:54','2026-07-28 11:40:31','2026-07-28 15:11:27'),(18,42,14,500.00,300.00,100.00,250.00,250.00,145.00,1295.00,250.00,0.00,1045.00,1079.00,1045.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-30 07:27:30','APPROVED',3,1,'2026-07-29 12:05:05','2026-07-29 12:03:52','2026-07-30 07:27:30'),(19,43,15,800.00,250.00,100.00,250.00,250.00,155.00,1555.00,450.00,0.00,1105.00,1069.00,1105.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-30 07:27:12','APPROVED',3,1,'2026-07-30 07:26:36','2026-07-30 07:19:34','2026-07-30 07:27:12'),(20,47,15,0.00,100.00,0.00,0.00,0.00,0.00,100.00,0.00,0.00,100.00,100.00,100.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-30 07:31:22','APPROVED',1,1,'2026-07-30 07:30:35','2026-07-30 07:30:35','2026-07-30 07:31:22'),(21,50,16,800.00,250.00,100.00,150.00,150.00,19.35,1319.35,400.00,0.00,919.35,569.00,919.35,0.00,0.00,NULL,'PAID',1,1,'2026-07-30 09:33:40','APPROVED',3,1,'2026-07-30 09:39:34','2026-07-30 09:27:37','2026-07-30 09:39:34'),(22,60,15,500.00,0.00,50.00,0.00,0.00,0.00,550.00,0.00,0.00,550.00,0.00,550.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-31 06:36:27','APPROVED',3,1,'2026-07-31 06:30:09','2026-07-30 10:25:34','2026-07-31 06:36:27'),(23,64,17,500.00,150.00,100.00,150.00,150.00,58.00,958.00,150.00,0.00,808.00,1059.00,808.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-31 07:12:55','APPROVED',3,1,'2026-07-31 06:34:53','2026-07-31 06:29:40','2026-07-31 07:12:55'),(24,66,17,250.00,0.00,100.00,0.00,0.00,0.00,350.00,0.00,0.00,350.00,0.00,350.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-31 09:30:58','APPROVED',3,1,'2026-07-31 09:46:36','2026-07-31 07:27:49','2026-07-31 09:46:36'),(25,67,18,500.00,550.00,100.00,150.00,150.00,145.00,1445.00,150.00,0.00,1295.00,1060.00,1295.00,0.00,0.00,NULL,'PAID',1,1,'2026-07-31 09:46:09','APPROVED',3,1,'2026-07-31 09:46:52','2026-07-31 09:30:26','2026-07-31 09:46:52'),(26,70,19,800.00,250.00,100.00,250.00,250.00,281.00,1581.00,250.00,0.00,1331.00,1331.00,1331.00,0.00,0.00,NULL,'PAID',1,1,'2026-08-03 07:09:36','APPROVED',3,1,'2026-08-03 06:29:10','2026-08-03 06:25:09','2026-08-03 07:09:36'),(27,71,20,800.00,250.00,100.00,250.00,250.00,300.00,1600.00,250.00,0.00,1350.00,1350.00,1350.00,0.00,0.00,NULL,'PAID',1,1,'2026-08-03 07:18:32','APPROVED',3,1,'2026-08-03 07:09:21','2026-08-03 07:08:16','2026-08-03 07:18:32'),(28,73,20,100.00,0.00,50.00,0.00,0.00,0.00,150.00,0.00,0.00,150.00,0.00,0.00,0.00,150.00,NULL,'PENDING',NULL,NULL,NULL,'PENDING',3,NULL,NULL,'2026-08-03 07:32:55','2026-08-03 07:32:55');
/*!40000 ALTER TABLE `cable_customer_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_customer_packages`
--

DROP TABLE IF EXISTS `cable_customer_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_customer_packages` (
  `customer_package_id` bigint NOT NULL AUTO_INCREMENT,
  `approval_group_id` bigint DEFAULT NULL,
  `cable_customer_id` bigint NOT NULL,
  `package_id` int NOT NULL,
  `package_type` enum('ADDON','ALACARTE','BROADCASTER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ADDON',
  `package_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `start_date` date NOT NULL DEFAULT (curdate()),
  `end_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `updated_by_employee_id` int DEFAULT NULL,
  `approval_status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `created_by_user_id` int DEFAULT NULL,
  `approved_by_user_id` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_package_id`),
  KEY `fk_cable_customer_packages_created_by_user` (`created_by_user_id`),
  KEY `fk_cable_customer_packages_approved_by_user` (`approved_by_user_id`),
  KEY `idx_cable_customer_packages_customer` (`cable_customer_id`),
  KEY `idx_cable_customer_packages_approval_group` (`approval_group_id`),
  KEY `idx_cable_customer_packages_package` (`package_id`),
  KEY `idx_cable_customer_packages_active` (`is_active`),
  KEY `idx_cable_customer_packages_approval_status` (`approval_status`),
  KEY `idx_cable_customer_packages_type` (`package_type`),
  KEY `idx_cable_customer_packages_updated_by` (`updated_by_employee_id`),
  CONSTRAINT `fk_cable_customer_packages_approval_group` FOREIGN KEY (`approval_group_id`) REFERENCES `cable_approval_groups` (`approval_group_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_customer_packages_approved_by_user` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_customer_packages_created_by_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_customer_packages_customer` FOREIGN KEY (`cable_customer_id`) REFERENCES `cable_tv_customers` (`cable_customer_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_customer_packages_package` FOREIGN KEY (`package_id`) REFERENCES `cable_package_master` (`package_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_customer_packages_updated_by` FOREIGN KEY (`updated_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `cable_customer_packages_chk_1` CHECK ((`package_price` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV package assigned to customer with snapshot package price';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_customer_packages`
--

LOCK TABLES `cable_customer_packages` WRITE;
/*!40000 ALTER TABLE `cable_customer_packages` DISABLE KEYS */;
INSERT INTO `cable_customer_packages` VALUES (1,1,1,1,'ADDON',0.00,'2026-07-22','2026-07-23',0,NULL,'APPROVED',1,NULL,NULL,NULL,'2026-07-23 11:54:41','2026-07-23 12:08:08'),(2,4,1,2,'ADDON',280.00,'2026-07-23','2026-07-31',1,1,'APPROVED',1,NULL,NULL,NULL,'2026-07-23 12:08:20','2026-07-23 12:08:20'),(3,6,2,1,'ADDON',300.00,'2026-07-01','2026-09-30',1,NULL,'APPROVED',3,NULL,NULL,NULL,'2026-07-24 07:10:39','2026-07-24 07:29:35'),(4,7,3,1,'ADDON',300.00,'2026-07-24','2026-07-31',1,NULL,'APPROVED',3,NULL,NULL,NULL,'2026-07-24 07:33:49','2026-07-24 08:44:20'),(5,8,4,1,'ADDON',300.00,'2026-07-22','2026-07-29',1,NULL,'APPROVED',1,NULL,NULL,NULL,'2026-07-24 11:49:06','2026-07-24 11:51:43'),(6,17,5,1,'ADDON',300.00,'2026-07-25','2026-07-31',1,NULL,'APPROVED',3,NULL,NULL,NULL,'2026-07-25 17:07:41','2026-07-25 17:42:54'),(7,18,6,1,'ADDON',300.00,'2026-07-25','2026-07-31',1,NULL,'APPROVED',3,NULL,NULL,NULL,'2026-07-25 17:55:26','2026-07-25 18:05:25'),(8,19,7,1,'ADDON',300.00,'2026-07-25','2026-07-31',1,NULL,'APPROVED',3,NULL,NULL,NULL,'2026-07-25 18:15:35','2026-07-25 18:19:20'),(9,20,8,1,'ADDON',300.00,'2026-07-26','2026-07-31',1,NULL,'APPROVED',3,NULL,NULL,NULL,'2026-07-26 05:46:17','2026-07-26 05:48:51'),(10,27,6,1,'ADDON',300.00,'2026-07-27','2026-07-21',0,3,'APPROVED',3,NULL,NULL,NULL,'2026-07-27 09:40:57','2026-07-28 09:49:54'),(11,30,10,1,'ADDON',300.00,'2026-07-28','2026-07-31',1,NULL,'APPROVED',3,NULL,NULL,NULL,'2026-07-28 06:44:50','2026-07-28 06:49:31'),(12,32,11,1,'ADDON',300.00,'2026-07-28','2026-07-31',1,NULL,'APPROVED',3,NULL,NULL,NULL,'2026-07-28 09:12:36','2026-07-28 09:14:03'),(13,37,12,1,'ADDON',300.00,'2026-07-28','2026-07-31',1,NULL,'APPROVED',3,NULL,NULL,NULL,'2026-07-28 10:00:23','2026-07-28 10:09:34'),(14,41,13,1,'ADDON',300.00,'2026-07-27','2026-07-30',1,1,'APPROVED',3,NULL,NULL,NULL,'2026-07-28 11:40:31','2026-07-28 15:11:27'),(15,42,14,2,'ADDON',280.00,'2026-07-28','2026-07-30',1,1,'APPROVED',3,NULL,NULL,NULL,'2026-07-29 12:03:52','2026-07-30 07:27:30'),(16,43,15,2,'ADDON',280.00,'2026-07-29','2026-07-30',1,1,'APPROVED',3,NULL,NULL,NULL,'2026-07-30 07:19:34','2026-07-30 07:27:12'),(17,50,16,1,'ADDON',300.00,'2026-07-30','2026-07-31',1,NULL,'APPROVED',3,NULL,NULL,NULL,'2026-07-30 09:27:37','2026-07-30 09:33:40'),(18,64,17,1,'ADDON',300.00,'2026-07-30','2026-07-30',1,1,'APPROVED',3,NULL,NULL,NULL,'2026-07-31 06:29:40','2026-07-31 07:12:55'),(19,67,18,1,'ADDON',300.00,'2026-07-29','2026-07-29',1,1,'APPROVED',3,NULL,NULL,NULL,'2026-07-31 09:30:26','2026-07-31 09:46:09'),(20,70,19,1,'ADDON',300.00,'2026-08-03','2026-08-31',1,NULL,'APPROVED',3,NULL,NULL,NULL,'2026-08-03 06:25:09','2026-08-03 07:09:36'),(21,71,20,1,'ADDON',300.00,'2026-08-03','2026-08-31',1,NULL,'APPROVED',3,NULL,NULL,NULL,'2026-08-03 07:08:16','2026-08-03 07:18:32');
/*!40000 ALTER TABLE `cable_customer_packages` ENABLE KEYS */;
UNLOCK TABLES;

-- Package soft-removal workflow state added after seed data to preserve positional inserts.
ALTER TABLE `cable_customer_packages`
  ADD COLUMN `removal_status` enum('NONE','PENDING','APPROVED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NONE' AFTER `approval_status`,
  ADD COLUMN `removal_requested_at` datetime DEFAULT NULL AFTER `removal_status`,
  ADD KEY `idx_cable_customer_packages_removal_status` (`removal_status`);

--
-- Table structure for table `cable_customer_stb_accessories`
--

DROP TABLE IF EXISTS `cable_customer_stb_accessories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_customer_stb_accessories` (
  `stb_accessory_id` bigint NOT NULL AUTO_INCREMENT,
  `approval_group_id` bigint DEFAULT NULL,
  `cable_customer_id` bigint NOT NULL,
  `customer_stb_id` bigint NOT NULL,
  `product_id` int NOT NULL,
  `movement_type` enum('ISSUE','RETURN') NOT NULL DEFAULT 'ISSUE',
  `accessory_name` varchar(200) NOT NULL,
  `qty` decimal(10,2) NOT NULL DEFAULT '1.00',
  `unit` varchar(20) NOT NULL DEFAULT 'PCS',
  `issued_by_employee_id` int DEFAULT NULL,
  `issued_date` date DEFAULT NULL,
  `approval_status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `created_by_user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stb_accessory_id`),
  KEY `idx_cable_stb_accessories_customer` (`cable_customer_id`),
  KEY `idx_cable_stb_accessories_stb` (`customer_stb_id`),
  KEY `idx_cable_stb_accessories_product` (`product_id`),
  KEY `fk_cable_stb_accessories_group` (`approval_group_id`),
  KEY `fk_cable_stb_accessories_employee` (`issued_by_employee_id`),
  CONSTRAINT `fk_cable_stb_accessories_customer` FOREIGN KEY (`cable_customer_id`) REFERENCES `cable_tv_customers` (`cable_customer_id`),
  CONSTRAINT `fk_cable_stb_accessories_employee` FOREIGN KEY (`issued_by_employee_id`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `fk_cable_stb_accessories_group` FOREIGN KEY (`approval_group_id`) REFERENCES `cable_approval_groups` (`approval_group_id`),
  CONSTRAINT `fk_cable_stb_accessories_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  CONSTRAINT `fk_cable_stb_accessories_stb` FOREIGN KEY (`customer_stb_id`) REFERENCES `cable_customer_stbs` (`customer_stb_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_customer_stb_accessories`
--

LOCK TABLES `cable_customer_stb_accessories` WRITE;
/*!40000 ALTER TABLE `cable_customer_stb_accessories` DISABLE KEYS */;
INSERT INTO `cable_customer_stb_accessories` VALUES (1,1,1,1,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',1,'2026-07-23','APPROVED',1,'2026-07-23 11:54:41','2026-07-23 12:06:57'),(2,1,1,1,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',1,'2026-07-23','APPROVED',1,'2026-07-23 11:54:41','2026-07-23 12:06:57'),(3,1,1,1,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',1,'2026-07-23','APPROVED',1,'2026-07-23 11:54:41','2026-07-23 12:06:57'),(4,6,2,2,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-24','APPROVED',3,'2026-07-24 07:10:39','2026-07-24 07:29:35'),(5,6,2,2,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-24','APPROVED',3,'2026-07-24 07:10:39','2026-07-24 07:29:35'),(6,6,2,2,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-24','APPROVED',3,'2026-07-24 07:10:39','2026-07-24 07:29:35'),(7,7,3,3,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-24','APPROVED',3,'2026-07-24 07:33:49','2026-07-24 08:44:20'),(8,7,3,3,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-24','APPROVED',3,'2026-07-24 07:33:49','2026-07-24 08:44:20'),(9,7,3,3,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-24','APPROVED',3,'2026-07-24 07:33:49','2026-07-24 08:44:20'),(10,8,4,4,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',2,'2026-07-24','APPROVED',1,'2026-07-24 11:49:06','2026-07-24 11:49:06'),(11,8,4,4,3,'ISSUE','vk STB accessories av card 1 Pin → 3 RCA',1.00,'PCS',2,'2026-07-24','APPROVED',1,'2026-07-24 11:49:06','2026-07-24 11:49:06'),(12,8,4,4,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',2,'2026-07-24','APPROVED',1,'2026-07-24 11:49:06','2026-07-24 11:49:06'),(13,17,5,11,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-25','APPROVED',3,'2026-07-25 17:07:41','2026-07-25 17:42:54'),(14,17,5,11,8,'ISSUE','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-07-25','APPROVED',3,'2026-07-25 17:07:41','2026-07-25 17:42:54'),(15,17,5,11,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-25','APPROVED',3,'2026-07-25 17:07:41','2026-07-25 17:42:54'),(16,17,5,11,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-25','APPROVED',3,'2026-07-25 17:07:41','2026-07-25 17:42:54'),(17,18,6,12,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-25','APPROVED',3,'2026-07-25 17:55:26','2026-07-25 18:05:25'),(18,18,6,12,8,'ISSUE','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-07-25','APPROVED',3,'2026-07-25 17:55:26','2026-07-25 18:05:25'),(19,18,6,12,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-25','APPROVED',3,'2026-07-25 17:55:26','2026-07-25 18:05:25'),(20,18,6,12,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-25','APPROVED',3,'2026-07-25 17:55:26','2026-07-25 18:05:25'),(21,19,7,13,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-25','APPROVED',3,'2026-07-25 18:15:35','2026-07-25 18:19:20'),(22,19,7,13,8,'ISSUE','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-07-25','APPROVED',3,'2026-07-25 18:15:35','2026-07-25 18:19:20'),(23,19,7,13,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-25','APPROVED',3,'2026-07-25 18:15:35','2026-07-25 18:19:20'),(24,19,7,13,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-25','APPROVED',3,'2026-07-25 18:15:35','2026-07-25 18:19:20'),(25,20,8,14,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-26','APPROVED',3,'2026-07-26 05:46:17','2026-07-26 05:48:51'),(26,20,8,14,8,'ISSUE','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-07-26','APPROVED',3,'2026-07-26 05:46:17','2026-07-26 05:48:51'),(27,20,8,14,7,'ISSUE','vk STB accessories av card 3 Pin → 3 RCA',1.00,'PCS',3,'2026-07-26','APPROVED',3,'2026-07-26 05:46:17','2026-07-26 05:48:51'),(28,20,8,14,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-26','APPROVED',3,'2026-07-26 05:46:17','2026-07-26 05:48:51'),(29,29,5,20,2,'RETURN','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-28','APPROVED',1,'2026-07-28 06:35:13','2026-07-28 06:35:13'),(30,29,5,20,8,'RETURN','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-07-28','APPROVED',1,'2026-07-28 06:35:13','2026-07-28 06:35:13'),(31,29,5,20,1,'RETURN','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-28','APPROVED',1,'2026-07-28 06:35:13','2026-07-28 06:35:13'),(32,29,5,20,4,'RETURN','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-28','APPROVED',1,'2026-07-28 06:35:13','2026-07-28 06:35:13'),(33,30,10,21,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 06:44:50','2026-07-28 06:49:31'),(34,30,10,21,8,'ISSUE','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 06:44:50','2026-07-28 06:49:31'),(35,30,10,21,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 06:44:50','2026-07-28 06:49:31'),(36,30,10,21,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 06:44:50','2026-07-28 06:49:31'),(37,32,11,23,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 09:12:36','2026-07-28 09:14:03'),(38,32,11,23,8,'ISSUE','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 09:12:36','2026-07-28 09:14:03'),(39,32,11,23,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 09:12:36','2026-07-28 09:14:03'),(40,32,11,23,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 09:12:36','2026-07-28 09:14:03'),(41,37,12,24,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 10:00:23','2026-07-28 10:09:34'),(42,37,12,24,8,'ISSUE','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 10:00:23','2026-07-28 10:09:34'),(43,37,12,24,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 10:00:23','2026-07-28 10:09:34'),(44,37,12,24,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 10:00:23','2026-07-28 10:09:34'),(45,39,2,25,2,'RETURN','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 10:19:48','2026-07-28 10:20:35'),(46,39,2,25,1,'RETURN','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 10:19:48','2026-07-28 10:20:35'),(47,39,2,25,4,'RETURN','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 10:19:48','2026-07-28 10:20:35'),(48,40,1,26,2,'RETURN','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 10:33:15','2026-07-28 10:34:10'),(49,40,1,26,1,'RETURN','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 10:33:15','2026-07-28 10:34:10'),(50,40,1,26,4,'RETURN','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 10:33:15','2026-07-28 10:34:10'),(51,41,13,27,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 11:40:31','2026-07-28 15:11:27'),(52,41,13,27,8,'ISSUE','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 11:40:31','2026-07-28 15:11:27'),(53,41,13,27,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 11:40:31','2026-07-28 15:11:27'),(54,41,13,27,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-28','APPROVED',3,'2026-07-28 11:40:31','2026-07-28 15:11:27'),(55,42,14,28,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-29','APPROVED',3,'2026-07-29 12:03:52','2026-07-30 07:27:30'),(56,42,14,28,8,'ISSUE','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-07-29','APPROVED',3,'2026-07-29 12:03:52','2026-07-30 07:27:30'),(57,42,14,28,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-29','APPROVED',3,'2026-07-29 12:03:52','2026-07-30 07:27:30'),(58,42,14,28,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-29','APPROVED',3,'2026-07-29 12:03:52','2026-07-30 07:27:30'),(59,43,15,29,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-30','APPROVED',3,'2026-07-30 07:19:34','2026-07-30 07:27:12'),(60,43,15,29,8,'ISSUE','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-07-30','APPROVED',3,'2026-07-30 07:19:34','2026-07-30 07:27:12'),(61,43,15,29,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-30','APPROVED',3,'2026-07-30 07:19:34','2026-07-30 07:27:12'),(62,43,15,29,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-30','APPROVED',3,'2026-07-30 07:19:34','2026-07-30 07:27:12'),(63,50,16,34,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-30','APPROVED',3,'2026-07-30 09:27:37','2026-07-30 09:33:40'),(64,50,16,34,8,'ISSUE','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-07-30','APPROVED',3,'2026-07-30 09:27:37','2026-07-30 09:33:40'),(65,50,16,34,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-30','APPROVED',3,'2026-07-30 09:27:37','2026-07-30 09:33:40'),(66,50,16,34,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-30','APPROVED',3,'2026-07-30 09:27:37','2026-07-30 09:33:40'),(67,64,17,41,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-31','APPROVED',3,'2026-07-31 06:29:40','2026-07-31 07:12:55'),(68,64,17,41,8,'ISSUE','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-07-31','APPROVED',3,'2026-07-31 06:29:40','2026-07-31 07:12:55'),(69,64,17,41,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-31','APPROVED',3,'2026-07-31 06:29:40','2026-07-31 07:12:55'),(70,64,17,41,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-31','APPROVED',3,'2026-07-31 06:29:40','2026-07-31 07:12:55'),(71,67,18,44,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-31','APPROVED',3,'2026-07-31 09:30:26','2026-07-31 09:46:09'),(72,67,18,44,8,'ISSUE','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-07-31','APPROVED',3,'2026-07-31 09:30:26','2026-07-31 09:46:09'),(73,67,18,44,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-31','APPROVED',3,'2026-07-31 09:30:26','2026-07-31 09:46:09'),(74,67,18,44,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-31','APPROVED',3,'2026-07-31 09:30:26','2026-07-31 09:46:09'),(75,69,8,46,2,'RETURN','vk STB accessories aaa battery',1.00,'PCS',3,'2026-07-31','APPROVED',3,'2026-07-31 10:06:47','2026-07-31 10:09:08'),(76,69,8,46,8,'RETURN','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-07-31','APPROVED',3,'2026-07-31 10:06:47','2026-07-31 10:09:08'),(77,69,8,46,1,'RETURN','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-07-31','APPROVED',3,'2026-07-31 10:06:47','2026-07-31 10:09:08'),(78,69,8,46,4,'RETURN','vk STB accessories remote Blue',1.00,'PCS',3,'2026-07-31','APPROVED',3,'2026-07-31 10:06:47','2026-07-31 10:09:08'),(79,70,19,47,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-08-03','APPROVED',3,'2026-08-03 06:25:09','2026-08-03 07:09:36'),(80,70,19,47,8,'ISSUE','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-08-03','APPROVED',3,'2026-08-03 06:25:09','2026-08-03 07:09:36'),(81,70,19,47,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-08-03','APPROVED',3,'2026-08-03 06:25:09','2026-08-03 07:09:36'),(82,70,19,47,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-08-03','APPROVED',3,'2026-08-03 06:25:09','2026-08-03 07:09:36'),(83,71,20,48,2,'ISSUE','vk STB accessories aaa battery',1.00,'PCS',3,'2026-08-03','APPROVED',3,'2026-08-03 07:08:16','2026-08-03 07:18:32'),(84,71,20,48,8,'ISSUE','vk STB accessories Adaptor 12V 1amp',1.00,'PCS',3,'2026-08-03','APPROVED',3,'2026-08-03 07:08:16','2026-08-03 07:18:32'),(85,71,20,48,1,'ISSUE','vk STB accessories hdmi 1mts',1.00,'PCS',3,'2026-08-03','APPROVED',3,'2026-08-03 07:08:16','2026-08-03 07:18:32'),(86,71,20,48,4,'ISSUE','vk STB accessories remote Blue',1.00,'PCS',3,'2026-08-03','APPROVED',3,'2026-08-03 07:08:16','2026-08-03 07:18:32');
/*!40000 ALTER TABLE `cable_customer_stb_accessories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_customer_stbs`
--

DROP TABLE IF EXISTS `cable_customer_stbs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_customer_stbs` (
  `customer_stb_id` bigint NOT NULL AUTO_INCREMENT,
  `approval_group_id` bigint DEFAULT NULL,
  `cable_customer_id` bigint NOT NULL,
  `stb_master_id` bigint DEFAULT NULL,
  `stb_type` enum('NEW','SERVICED','RETURNED','FAULT','DAMAGED','UPGRADE','REPLACED','EXCHANGE','CUSTOMER_OWNED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NEW',
  `issue_mode` enum('FULL_SET','BOX_ONLY') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BOX_ONLY',
  `installed_mso_id` int DEFAULT NULL,
  `exchange_original_mso_id` int DEFAULT NULL,
  `stb_no` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stb_image_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stb_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `stb_discount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `labour_service_charge` decimal(12,2) NOT NULL DEFAULT '0.00',
  `refund_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `refund_payment_mode` enum('CASH','ONLINE','BANK','UPI','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CASH',
  `installed_by_employee_id` int DEFAULT NULL,
  `entered_by_employee_id` int DEFAULT NULL,
  `installed_date` date NOT NULL DEFAULT (curdate()),
  `updated_date` date DEFAULT NULL,
  `update_reason` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason_remarks` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('ACTIVE','RETRIEVED','FAULT','DISCONNECTED','UPGRADE','RETURNED','FAULTY','REPLACED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `approval_status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `created_by_user_id` int DEFAULT NULL,
  `approved_by_user_id` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_stb_id`),
  KEY `fk_cable_stbs_installed_mso` (`installed_mso_id`),
  KEY `fk_cable_stbs_exchange_mso` (`exchange_original_mso_id`),
  KEY `fk_cable_stbs_installed_by` (`installed_by_employee_id`),
  KEY `fk_cable_stbs_created_by_user` (`created_by_user_id`),
  KEY `fk_cable_stbs_approved_by_user` (`approved_by_user_id`),
  KEY `idx_cable_stbs_approval_group` (`approval_group_id`),
  KEY `idx_cable_stbs_customer` (`cable_customer_id`),
  KEY `idx_cable_stbs_type` (`stb_type`),
  KEY `idx_cable_stbs_status` (`status`),
  KEY `idx_cable_stbs_approval_status` (`approval_status`),
  KEY `idx_cable_stbs_master` (`stb_master_id`),
  CONSTRAINT `fk_cable_stbs_approval_group` FOREIGN KEY (`approval_group_id`) REFERENCES `cable_approval_groups` (`approval_group_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_stbs_approved_by_user` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_stbs_created_by_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_stbs_customer` FOREIGN KEY (`cable_customer_id`) REFERENCES `cable_tv_customers` (`cable_customer_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_stbs_exchange_mso` FOREIGN KEY (`exchange_original_mso_id`) REFERENCES `cable_mso_master` (`mso_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_stbs_installed_by` FOREIGN KEY (`installed_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_stbs_installed_mso` FOREIGN KEY (`installed_mso_id`) REFERENCES `cable_mso_master` (`mso_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_stbs_master` FOREIGN KEY (`stb_master_id`) REFERENCES `cable_stb_master` (`stb_master_id`),
  CONSTRAINT `cable_customer_stbs_chk_1` CHECK ((`stb_amount` >= 0)),
  CONSTRAINT `cable_customer_stbs_chk_2` CHECK ((`stb_discount` >= 0)),
  CONSTRAINT `cable_customer_stbs_chk_3` CHECK ((`labour_service_charge` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer STB details and exchange history';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_customer_stbs`
--

LOCK TABLES `cable_customer_stbs` WRITE;
/*!40000 ALTER TABLE `cable_customer_stbs` DISABLE KEYS */;
INSERT INTO `cable_customer_stbs` VALUES (1,1,1,1,'NEW','FULL_SET',NULL,NULL,'0000832B000DE477',NULL,800.00,0.00,0.00,0.00,'CASH',1,1,'2026-07-23',NULL,NULL,NULL,'ACTIVE','APPROVED',1,NULL,NULL,NULL,'2026-07-23 11:54:41','2026-07-23 12:06:57'),(2,6,2,2,'SERVICED','FULL_SET',NULL,NULL,'',NULL,0.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-24','2026-07-24','REACTIVATE','fault reactivate','ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-24 07:10:39','2026-07-24 12:22:33'),(3,7,3,5,'NEW','FULL_SET',NULL,NULL,'0000832B000DE479',NULL,800.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-24',NULL,NULL,NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-24 07:33:49','2026-07-24 08:44:20'),(4,8,4,6,'SERVICED','FULL_SET',NULL,NULL,'0000832B000DE480',NULL,800.00,0.00,0.00,0.00,'CASH',2,2,'2026-07-24',NULL,NULL,NULL,'DISCONNECTED','APPROVED',1,NULL,NULL,NULL,'2026-07-24 11:49:06','2026-07-24 11:54:09'),(7,13,4,9,'SERVICED','BOX_ONLY',NULL,NULL,'0000832B000DE201',NULL,500.00,400.00,50.00,0.00,'CASH',1,1,'2026-07-24','2026-07-24','REPLACED',NULL,'ACTIVE','APPROVED',1,NULL,NULL,NULL,'2026-07-24 12:03:18','2026-07-24 12:28:49'),(11,17,5,7,'NEW','FULL_SET',NULL,NULL,'0000832B000DE100',NULL,800.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-25',NULL,NULL,NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-25 17:07:41','2026-07-25 17:42:54'),(12,18,6,6,'SERVICED','FULL_SET',NULL,NULL,'0000832B000DE480',NULL,800.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-25',NULL,NULL,NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-25 17:55:26','2026-07-25 18:05:25'),(13,19,7,8,'NEW','FULL_SET',NULL,NULL,'0000832B000DE101',NULL,800.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-25',NULL,NULL,NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-25 18:15:35','2026-07-25 18:19:20'),(14,20,8,10,'SERVICED','FULL_SET',NULL,NULL,'0000832B000DE201',NULL,800.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-26',NULL,NULL,NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-26 05:46:17','2026-07-26 05:48:51'),(15,23,7,8,'NEW','BOX_ONLY',NULL,NULL,'0000832B000DE101',NULL,0.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-25','2026-07-27','FAULT','test','DISCONNECTED','APPROVED',3,NULL,NULL,NULL,'2026-07-27 06:54:56','2026-07-28 09:49:13'),(16,24,7,8,'NEW','BOX_ONLY',NULL,NULL,'0000832B000DE101',NULL,0.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-25','2026-07-27','REACTIVATE',NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-27 06:57:40','2026-07-28 09:49:20'),(18,27,6,6,'SERVICED','BOX_ONLY',NULL,NULL,'0000832B000DE480',NULL,0.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-25','2026-07-27','FAULT',NULL,'DISCONNECTED','APPROVED',3,NULL,NULL,NULL,'2026-07-27 09:40:26','2026-07-28 09:49:54'),(19,28,6,6,'SERVICED','BOX_ONLY',NULL,NULL,'0000832B000DE480',NULL,0.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-25','2026-07-27','REACTIVATE',NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-27 09:42:27','2026-07-28 09:55:38'),(20,29,5,7,'NEW','BOX_ONLY',NULL,NULL,'0000832B000DE100',NULL,0.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-25','2026-07-28','RETURNED','shifted','DISCONNECTED','APPROVED',1,NULL,NULL,NULL,'2026-07-28 06:35:13','2026-07-28 06:35:13'),(21,30,10,7,'RETURNED','FULL_SET',NULL,NULL,'0000832B000DE100',NULL,800.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-28',NULL,NULL,NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-28 06:44:50','2026-07-28 06:49:31'),(22,31,10,7,'RETURNED','BOX_ONLY',NULL,NULL,'0000832B000DE100',NULL,0.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-28','2026-07-28','BURNT','power burnt','DISCONNECTED','APPROVED',3,NULL,NULL,NULL,'2026-07-28 06:52:52','2026-07-28 09:55:42'),(23,32,11,11,'NEW','FULL_SET',NULL,NULL,'0000832B000DE105',NULL,800.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-28',NULL,NULL,NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-28 09:12:36','2026-07-28 09:14:03'),(24,37,12,12,'NEW','FULL_SET',NULL,NULL,'0000832B000DE106',NULL,800.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-28',NULL,NULL,NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-28 10:00:23','2026-07-28 10:09:34'),(25,39,2,2,'RETURNED','BOX_ONLY',NULL,NULL,'',NULL,0.00,0.00,0.00,100.00,'CASH',3,3,'2026-07-24','2026-07-28','RETURNED',NULL,'RETRIEVED','APPROVED',3,NULL,NULL,NULL,'2026-07-28 10:19:48','2026-07-28 10:27:09'),(26,40,1,1,'RETURNED','BOX_ONLY',NULL,NULL,'0000832B000DE477',NULL,0.00,0.00,0.00,250.00,'CASH',3,3,'2026-07-23','2026-07-28','RETURNED','testing','RETRIEVED','APPROVED',3,NULL,NULL,NULL,'2026-07-28 10:33:15','2026-07-28 10:34:10'),(27,41,13,2,'NEW','BOX_ONLY',NULL,NULL,'0000832B000DE478',NULL,100.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-28','2026-07-28',NULL,NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-28 11:40:31','2026-07-28 15:11:27'),(28,42,14,13,'NEW','BOX_ONLY',NULL,NULL,'0000832B000DE100',NULL,500.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-29','2026-07-29',NULL,NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-29 12:03:52','2026-07-30 07:27:30'),(29,43,15,2,'NEW','FULL_SET',NULL,NULL,'0000832B000DE478',NULL,800.00,200.00,0.00,0.00,'CASH',3,3,'2026-07-30','2026-07-30',NULL,NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-30 07:19:34','2026-07-30 07:27:12'),(30,45,15,2,'FAULT','BOX_ONLY',NULL,NULL,'0000832B000DE478',NULL,0.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-30','2026-07-30','DAMAGED','test','FAULT','APPROVED',1,NULL,NULL,NULL,'2026-07-30 07:29:05','2026-07-30 07:29:05'),(31,46,15,2,'FAULT','BOX_ONLY',NULL,NULL,'0000832B000DE478',NULL,0.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-30','2026-07-30','REACTIVATE',NULL,'ACTIVE','APPROVED',1,NULL,NULL,NULL,'2026-07-30 07:29:48','2026-07-30 07:29:48'),(32,48,15,2,'FAULT','BOX_ONLY',NULL,NULL,'0000832B000DE478',NULL,0.00,0.00,0.00,0.00,'CASH',2,2,'2026-07-30','2026-07-30','FAULT','test','FAULT','APPROVED',1,NULL,NULL,NULL,'2026-07-30 07:32:04','2026-07-30 07:32:04'),(33,49,15,2,'FAULT','BOX_ONLY',NULL,NULL,'0000832B000DE478',NULL,0.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-30','2026-07-30','REACTIVATE',NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-30 09:16:34','2026-07-30 09:27:57'),(34,50,16,14,'NEW','FULL_SET',NULL,NULL,'0000832B000DE107',NULL,800.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-30','2026-07-30',NULL,NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-30 09:27:37','2026-07-30 09:33:40'),(35,57,16,14,'FAULT','BOX_ONLY',NULL,NULL,'0000832B000DE107',NULL,0.00,0.00,0.00,0.00,'CASH',1,1,'2026-07-30','2026-07-30','FAULT','test','FAULT','APPROVED',1,NULL,NULL,NULL,'2026-07-30 10:13:17','2026-07-30 10:13:17'),(36,58,16,14,'FAULT','BOX_ONLY',NULL,NULL,'0000832B000DE107',NULL,0.00,0.00,0.00,0.00,'CASH',1,NULL,'2026-07-30','2026-07-30','REACTIVATE',NULL,'ACTIVE','APPROVED',1,NULL,NULL,NULL,'2026-07-30 10:20:22','2026-07-30 10:20:22'),(37,59,15,2,'FAULT','BOX_ONLY',NULL,NULL,'0000832B000DE478',NULL,0.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-30','2026-07-30','DAMAGED','test','FAULT','APPROVED',3,NULL,NULL,NULL,'2026-07-30 10:21:58','2026-07-31 06:30:04'),(38,60,15,15,'NEW','BOX_ONLY',NULL,NULL,'0000832B000DE108',NULL,500.00,0.00,50.00,0.00,'CASH',3,3,'2026-07-30','2026-07-30','REPLACED',NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-30 10:25:34','2026-07-31 06:36:27'),(39,61,12,12,'FAULT','BOX_ONLY',NULL,NULL,'0000832B000DE106',NULL,0.00,0.00,0.00,0.00,'CASH',1,1,'2026-07-28','2026-07-30','FAULT',NULL,'FAULT','APPROVED',1,NULL,NULL,NULL,'2026-07-30 10:31:21','2026-07-30 10:31:21'),(40,62,16,14,'FAULT','BOX_ONLY',NULL,NULL,'0000832B000DE107',NULL,0.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-30','2026-07-30','FAULT',NULL,'FAULT','APPROVED',3,NULL,NULL,NULL,'2026-07-30 10:33:30','2026-07-31 06:30:13'),(41,64,17,16,'NEW','BOX_ONLY',NULL,NULL,'0000832B000DE109',NULL,500.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-31','2026-07-31',NULL,NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-31 06:29:40','2026-07-31 07:12:55'),(42,65,17,16,'FAULT','BOX_ONLY',NULL,NULL,'0000832B000DE109',NULL,0.00,0.00,0.00,0.00,'CASH',1,1,'2026-07-31','2026-07-31','FAULT','test','FAULT','APPROVED',1,NULL,NULL,NULL,'2026-07-31 07:14:03','2026-07-31 07:14:03'),(43,66,17,16,'FAULT','BOX_ONLY',NULL,NULL,'0000832B000DE109',NULL,250.00,0.00,100.00,0.00,'CASH',3,3,'2026-07-31','2026-07-31','REACTIVATE',NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-31 07:27:49','2026-07-31 09:30:58'),(44,67,18,8,'NEW','BOX_ONLY',NULL,NULL,'0000832B000DE101',NULL,500.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-31','2026-07-31',NULL,NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-07-31 09:30:26','2026-07-31 09:46:09'),(45,68,18,8,'FAULT','BOX_ONLY',NULL,NULL,'0000832B000DE101',NULL,0.00,0.00,0.00,0.00,'CASH',3,3,'2026-07-31','2026-07-31','FAULT','test','FAULT','APPROVED',3,NULL,NULL,NULL,'2026-07-31 09:50:50','2026-07-31 10:00:26'),(46,69,8,10,'RETURNED','BOX_ONLY',NULL,NULL,'0000832B000DE201',NULL,0.00,0.00,0.00,250.00,'CASH',3,3,'2026-07-26','2026-07-31','RETURNED','box taken back','RETRIEVED','APPROVED',3,NULL,NULL,NULL,'2026-07-31 10:06:47','2026-07-31 10:09:08'),(47,70,19,10,'NEW','FULL_SET',NULL,NULL,'0000832B000DE201',NULL,800.00,0.00,0.00,0.00,'CASH',3,3,'2026-08-03',NULL,NULL,NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-08-03 06:25:09','2026-08-03 07:09:36'),(48,71,20,17,'NEW','FULL_SET',NULL,NULL,'0000832B000D1001',NULL,800.00,0.00,0.00,0.00,'CASH',3,3,'2026-08-03',NULL,NULL,NULL,'ACTIVE','APPROVED',3,NULL,NULL,NULL,'2026-08-03 07:08:16','2026-08-03 07:18:32'),(49,72,20,17,'FAULT','BOX_ONLY',NULL,NULL,'0000832B000D1001',NULL,0.00,0.00,0.00,0.00,'CASH',3,3,'2026-08-03','2026-08-03','FAULT','not activated','FAULT','APPROVED',3,NULL,NULL,NULL,'2026-08-03 07:20:42','2026-08-03 07:21:45'),(50,73,20,17,'FAULT','BOX_ONLY',NULL,NULL,'0000832B000D1001',NULL,100.00,0.00,50.00,0.00,'CASH',3,3,'2026-08-03','2026-08-03','REACTIVATE',NULL,'ACTIVE','PENDING',3,NULL,NULL,NULL,'2026-08-03 07:32:55','2026-08-03 07:32:55');
/*!40000 ALTER TABLE `cable_customer_stbs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_locations`
--

DROP TABLE IF EXISTS `cable_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_locations` (
  `location_id` int NOT NULL AUTO_INCREMENT,
  `location_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `post_short_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pincode` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`location_id`),
  UNIQUE KEY `uk_cable_location_city` (`location_name`,`city`),
  UNIQUE KEY `uk_cable_location_short_code` (`post_short_code`),
  UNIQUE KEY `uk_cable_location_pincode` (`pincode`),
  KEY `idx_cable_location_city` (`city`),
  KEY `idx_cable_location_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV location master';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_locations`
--

LOCK TABLES `cable_locations` WRITE;
/*!40000 ALTER TABLE `cable_locations` DISABLE KEYS */;
INSERT INTO `cable_locations` VALUES (1,'Chromepet','CHR','Chennai','600044',1,'2026-07-23 09:20:25','2026-07-23 09:20:25'),(2,'Pammal','PAM','Chennai','600075',1,'2026-07-23 09:20:25','2026-07-23 09:20:25');
/*!40000 ALTER TABLE `cable_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_mso_master`
--

DROP TABLE IF EXISTS `cable_mso_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_mso_master` (
  `mso_id` int NOT NULL AUTO_INCREMENT,
  `mso_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`mso_id`),
  UNIQUE KEY `uk_cable_mso_name` (`mso_name`),
  KEY `idx_cable_mso_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='MSO/operator master for STB installed and exchange tracking';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_mso_master`
--

LOCK TABLES `cable_mso_master` WRITE;
/*!40000 ALTER TABLE `cable_mso_master` DISABLE KEYS */;
/*!40000 ALTER TABLE `cable_mso_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_network_master`
--

DROP TABLE IF EXISTS `cable_network_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_network_master` (
  `network_id` int NOT NULL AUTO_INCREMENT,
  `network_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `network_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_no_start` int DEFAULT NULL,
  `customer_no_end` int DEFAULT NULL,
  `remarks` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`network_id`),
  UNIQUE KEY `uk_cable_network_code` (`network_code`),
  KEY `idx_cable_network_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV network master: TCV, PAMMAL, MURUGAN, SVN';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_network_master`
--

LOCK TABLES `cable_network_master` WRITE;
/*!40000 ALTER TABLE `cable_network_master` DISABLE KEYS */;
INSERT INTO `cable_network_master` VALUES (1,'TCV','TCV',1001,NULL,'TCV customer range: 1001-2000 and 6001 onward',1,'2026-07-23 09:13:02','2026-07-23 09:13:02'),(2,'SVN','SVN',3001,6000,'Legacy customer range: 3001-6000',1,'2026-07-23 09:13:02','2026-07-23 09:13:02'),(3,'PAMMAL','Pammal',101,999,'Legacy customer range: 101-999',1,'2026-07-23 09:13:02','2026-07-23 09:13:02'),(4,'LO','LO',NULL,NULL,'Local operator cable network',1,'2026-07-23 09:13:02','2026-07-23 09:13:02');
/*!40000 ALTER TABLE `cable_network_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_package_master`
--

DROP TABLE IF EXISTS `cable_package_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_package_master` (
  `package_id` int NOT NULL AUTO_INCREMENT,
  `package_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `package_type` enum('MSO_PACKAGE','ADDON','ALACARTE','BROADCAST') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MSO_PACKAGE',
  `price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`package_id`),
  UNIQUE KEY `uk_cable_package_name_type` (`package_name`,`package_type`),
  KEY `idx_cable_package_type` (`package_type`),
  KEY `idx_cable_package_active` (`is_active`),
  CONSTRAINT `cable_package_master_chk_1` CHECK ((`price` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV package master with package type and price';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_package_master`
--

LOCK TABLES `cable_package_master` WRITE;
/*!40000 ALTER TABLE `cable_package_master` DISABLE KEYS */;
INSERT INTO `cable_package_master` VALUES (1,'VK TAMIL','MSO_PACKAGE',300.00,NULL,1,'2026-07-23 10:18:06','2026-07-23 10:18:06'),(2,'VK ONE','MSO_PACKAGE',280.00,NULL,1,'2026-07-23 10:18:19','2026-07-23 10:18:19');
/*!40000 ALTER TABLE `cable_package_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_stb_issue_master`
--

DROP TABLE IF EXISTS `cable_stb_issue_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_stb_issue_master` (
  `stb_issue_id` bigint NOT NULL AUTO_INCREMENT,
  `stb_master_id` bigint NOT NULL,
  `cable_customer_id` bigint NOT NULL,
  `customer_stb_id` bigint DEFAULT NULL,
  `issued_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `issued_by_employee_id` int DEFAULT NULL,
  `issue_status` enum('ISSUED','RETURNED','CANCELLED') NOT NULL DEFAULT 'ISSUED',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`stb_issue_id`),
  KEY `idx_cable_stb_issue_customer` (`cable_customer_id`),
  KEY `idx_cable_stb_issue_stb` (`stb_master_id`),
  KEY `fk_cable_stb_issue_customer_stb` (`customer_stb_id`),
  KEY `fk_cable_stb_issue_employee` (`issued_by_employee_id`),
  CONSTRAINT `fk_cable_stb_issue_customer` FOREIGN KEY (`cable_customer_id`) REFERENCES `cable_tv_customers` (`cable_customer_id`),
  CONSTRAINT `fk_cable_stb_issue_customer_stb` FOREIGN KEY (`customer_stb_id`) REFERENCES `cable_customer_stbs` (`customer_stb_id`),
  CONSTRAINT `fk_cable_stb_issue_employee` FOREIGN KEY (`issued_by_employee_id`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `fk_cable_stb_issue_master` FOREIGN KEY (`stb_master_id`) REFERENCES `cable_stb_master` (`stb_master_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_stb_issue_master`
--

LOCK TABLES `cable_stb_issue_master` WRITE;
/*!40000 ALTER TABLE `cable_stb_issue_master` DISABLE KEYS */;
INSERT INTO `cable_stb_issue_master` VALUES (1,1,1,1,'2026-07-23 11:54:41',1,'RETURNED','2026-07-23 11:54:41'),(2,2,2,2,'2026-07-24 07:10:39',3,'RETURNED','2026-07-24 07:10:39'),(3,5,3,3,'2026-07-24 07:33:49',3,'ISSUED','2026-07-24 07:33:49'),(4,6,4,4,'2026-07-24 11:49:06',2,'ISSUED','2026-07-24 11:49:06'),(5,9,4,7,'2026-07-24 12:03:18',1,'ISSUED','2026-07-24 12:03:18'),(6,7,5,11,'2026-07-25 17:07:41',3,'RETURNED','2026-07-25 17:07:41'),(7,6,6,12,'2026-07-25 17:55:26',3,'ISSUED','2026-07-25 17:55:26'),(8,8,7,13,'2026-07-25 18:15:35',3,'ISSUED','2026-07-25 18:15:35'),(9,10,8,14,'2026-07-26 05:46:17',3,'RETURNED','2026-07-26 05:46:17'),(10,7,10,21,'2026-07-28 06:44:50',3,'ISSUED','2026-07-28 06:44:50'),(11,11,11,23,'2026-07-28 09:12:36',3,'ISSUED','2026-07-28 09:12:36'),(12,12,12,24,'2026-07-28 10:00:23',3,'ISSUED','2026-07-28 10:00:23'),(13,1,13,27,'2026-07-28 11:40:31',3,'ISSUED','2026-07-28 11:40:31'),(14,13,14,28,'2026-07-29 12:03:52',3,'ISSUED','2026-07-29 12:03:52'),(15,2,15,29,'2026-07-30 07:19:34',3,'RETURNED','2026-07-30 07:19:34'),(16,14,16,34,'2026-07-30 09:27:37',3,'ISSUED','2026-07-30 09:27:37'),(17,15,15,38,'2026-07-30 10:25:34',3,'ISSUED','2026-07-30 10:25:34'),(18,16,17,41,'2026-07-31 06:29:40',3,'ISSUED','2026-07-31 06:29:40'),(19,8,18,44,'2026-07-31 09:30:26',3,'ISSUED','2026-07-31 09:30:26'),(20,10,19,47,'2026-08-03 06:25:09',3,'ISSUED','2026-08-03 06:25:09'),(21,17,20,48,'2026-08-03 07:08:16',3,'ISSUED','2026-08-03 07:08:16');
/*!40000 ALTER TABLE `cable_stb_issue_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_stb_master`
--

DROP TABLE IF EXISTS `cable_stb_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_stb_master` (
  `stb_master_id` bigint NOT NULL AUTO_INCREMENT,
  `stb_number` varchar(100) NOT NULL,
  `box_type` enum('HD','SD') NOT NULL DEFAULT 'HD',
  `stock_type` enum('NEW','SERVICED','RETURNED','FAULT','DAMAGED','BURNT') NOT NULL DEFAULT 'NEW',
  `mso_id` int DEFAULT NULL,
  `stb_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `full_set_amount` decimal(12,2) NOT NULL DEFAULT '800.00',
  `assigned_employee_id` int DEFAULT NULL,
  `status` enum('AVAILABLE','IN_SERVICE','NOT_SERVICEABLE','NOT_AVAILABLE') NOT NULL DEFAULT 'AVAILABLE',
  `updated_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stb_master_id`),
  KEY `idx_cable_stb_master_status` (`status`),
  KEY `idx_cable_stb_master_stock_type` (`stock_type`),
  KEY `fk_cable_stb_master_mso` (`mso_id`),
  KEY `idx_cable_stb_master_number` (`stb_number`),
  CONSTRAINT `fk_cable_stb_master_mso` FOREIGN KEY (`mso_id`) REFERENCES `cable_mso_master` (`mso_id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_stb_master`
--

LOCK TABLES `cable_stb_master` WRITE;
/*!40000 ALTER TABLE `cable_stb_master` DISABLE KEYS */;
INSERT INTO `cable_stb_master` VALUES (1,'0000832B000DE477','HD','RETURNED',NULL,500.00,800.00,3,'NOT_AVAILABLE','2026-07-28',1,'2026-07-23 09:59:11','2026-07-31 06:27:48'),(2,'0000832B000DE478','HD','SERVICED',NULL,100.00,800.00,NULL,'NOT_AVAILABLE','2026-07-28',1,'2026-07-23 10:00:24','2026-07-31 09:10:29'),(5,'0000832B000DE479','HD','NEW',NULL,500.00,800.00,3,'NOT_AVAILABLE','2026-07-24',1,'2026-07-24 07:28:02','2026-07-31 06:27:48'),(6,'0000832B000DE480','HD','FAULT',NULL,500.00,800.00,3,'NOT_AVAILABLE','2026-07-28',1,'2026-07-24 07:28:38','2026-07-31 06:27:48'),(7,'0000832B000DE100','HD','FAULT',NULL,500.00,800.00,3,'NOT_AVAILABLE','2026-07-28',1,'2026-07-24 11:57:22','2026-07-31 06:27:48'),(8,'0000832B000DE101','HD','FAULT',NULL,500.00,800.00,NULL,'NOT_AVAILABLE','2026-07-30',1,'2026-07-24 11:57:31','2026-07-31 10:00:26'),(9,'0000832B000DE200','HD','SERVICED',NULL,500.00,800.00,2,'NOT_AVAILABLE','2026-07-24',1,'2026-07-24 11:57:46','2026-07-31 06:27:48'),(10,'0000832B000DE201','HD','RETURNED',NULL,500.00,800.00,3,'NOT_AVAILABLE','2026-07-26',1,'2026-07-24 11:58:08','2026-08-03 06:25:09'),(11,'0000832B000DE105','HD','NEW',NULL,500.00,800.00,3,'NOT_AVAILABLE','2026-07-28',1,'2026-07-28 09:10:48','2026-07-31 06:27:48'),(12,'0000832B000DE106','HD','FAULT',NULL,500.00,800.00,3,'NOT_AVAILABLE','2026-07-30',1,'2026-07-28 09:58:41','2026-07-31 06:27:48'),(13,'0000832B000DE100','HD','SERVICED',NULL,500.00,800.00,3,'NOT_AVAILABLE','2026-07-29',1,'2026-07-28 16:15:23','2026-07-31 06:27:48'),(14,'0000832B000DE107','HD','FAULT',NULL,500.00,800.00,3,'NOT_AVAILABLE','2026-07-30',1,'2026-07-30 09:24:13','2026-07-31 06:30:13'),(15,'0000832B000DE108','HD','NEW',NULL,500.00,800.00,3,'NOT_AVAILABLE','2026-07-30',1,'2026-07-30 09:24:39','2026-07-31 06:27:48'),(16,'0000832B000DE109','HD','FAULT',NULL,500.00,800.00,3,'NOT_AVAILABLE','2026-07-30',1,'2026-07-30 09:25:17','2026-07-31 07:14:03'),(17,'0000832B000D1001','HD','FAULT',NULL,500.00,800.00,NULL,'NOT_AVAILABLE','2026-08-03',1,'2026-08-03 07:06:03','2026-08-03 07:21:45'),(18,'0000832B000D1002','HD','NEW',NULL,500.00,800.00,3,'AVAILABLE','2026-08-03',1,'2026-08-03 07:06:14','2026-08-03 07:06:28'),(19,'0000832B000D1003','HD','NEW',NULL,500.00,800.00,3,'AVAILABLE','2026-08-03',1,'2026-08-03 07:06:22','2026-08-03 07:06:29');
/*!40000 ALTER TABLE `cable_stb_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_streets`
--

DROP TABLE IF EXISTS `cable_streets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_streets` (
  `street_id` int NOT NULL AUTO_INCREMENT,
  `area_id` int NOT NULL,
  `street_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`street_id`),
  UNIQUE KEY `uk_cable_area_street` (`area_id`,`street_name`),
  KEY `idx_cable_street_area` (`area_id`),
  KEY `idx_cable_street_active` (`is_active`),
  CONSTRAINT `fk_cable_streets_area` FOREIGN KEY (`area_id`) REFERENCES `cable_areas` (`area_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV street master mapped to area';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_streets`
--

LOCK TABLES `cable_streets` WRITE;
/*!40000 ALTER TABLE `cable_streets` DISABLE KEYS */;
INSERT INTO `cable_streets` VALUES (1,1,'1st Street',1,'2026-07-23 09:37:12','2026-07-23 09:37:12'),(2,1,'2nd Street',1,'2026-07-23 09:37:34','2026-07-23 09:37:34'),(3,2,'Ranganathanswamy 2nd Street',1,'2026-07-23 09:38:11','2026-07-23 09:38:11'),(6,4,'1st Cross Street',1,'2026-07-23 09:41:45','2026-07-23 09:41:45');
/*!40000 ALTER TABLE `cable_streets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_subscription_payments`
--

DROP TABLE IF EXISTS `cable_subscription_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_subscription_payments` (
  `subscription_payment_id` bigint NOT NULL AUTO_INCREMENT,
  `subscription_id` bigint NOT NULL,
  `cable_customer_id` bigint NOT NULL,
  `received_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `collected_date` date NOT NULL,
  `payment_mode` varchar(30) DEFAULT NULL,
  `payment_reference` varchar(150) DEFAULT NULL,
  `received_by_employee_id` int DEFAULT NULL,
  `comments` varchar(500) DEFAULT NULL,
  `balance_after_payment` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_status` enum('PARTIAL','PAID') NOT NULL,
  `created_by_user_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`subscription_payment_id`),
  KEY `idx_cable_subscription_payment_subscription` (`subscription_id`),
  KEY `idx_cable_subscription_payment_customer` (`cable_customer_id`),
  KEY `idx_cable_subscription_payment_date` (`collected_date`),
  CONSTRAINT `fk_cable_subscription_payment_customer` FOREIGN KEY (`cable_customer_id`) REFERENCES `cable_tv_customers` (`cable_customer_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cable_subscription_payment_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `cable_subscriptions` (`subscription_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_subscription_payments`
--

LOCK TABLES `cable_subscription_payments` WRITE;
/*!40000 ALTER TABLE `cable_subscription_payments` DISABLE KEYS */;
INSERT INTO `cable_subscription_payments` VALUES (1,4,1,140.00,'2026-07-24','CASH',NULL,3,NULL,140.00,'PARTIAL',3,'2026-07-24 08:52:25'),(2,15,11,300.00,'2026-07-28','CASH',NULL,3,NULL,0.00,'PAID',3,'2026-07-28 09:56:32'),(3,12,8,300.00,'2026-07-28','CASH',NULL,3,NULL,0.00,'PAID',3,'2026-07-28 09:56:36'),(4,7,4,300.00,'2026-07-28','CASH',NULL,3,NULL,0.00,'PAID',3,'2026-07-28 09:56:40'),(5,5,3,160.00,'2026-07-28','CASH',NULL,3,NULL,0.00,'PAID',3,'2026-07-28 09:56:46'),(6,4,1,140.00,'2026-07-28','CASH',NULL,3,NULL,0.00,'PAID',3,'2026-07-28 09:56:52'),(7,20,12,300.00,'2026-07-28','CASH',NULL,3,NULL,0.00,'PAID',3,'2026-07-28 10:11:48'),(8,29,12,300.00,'2026-07-30','CASH',NULL,1,NULL,0.00,'PAID',1,'2026-07-30 10:03:14'),(9,40,20,300.00,'2026-08-03','CASH',NULL,3,NULL,0.00,'PAID',3,'2026-08-03 07:20:00');
/*!40000 ALTER TABLE `cable_subscription_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_subscriptions`
--

DROP TABLE IF EXISTS `cable_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_subscriptions` (
  `subscription_id` bigint NOT NULL AUTO_INCREMENT,
  `approval_group_id` bigint DEFAULT NULL,
  `cable_customer_id` bigint NOT NULL,
  `customer_package_id` bigint NOT NULL,
  `subscription_month` tinyint NOT NULL,
  `subscription_year` smallint NOT NULL,
  `days_in_month` int NOT NULL,
  `billing_basis` enum('DAY','MONTH','YEAR') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MONTH',
  `number_of_days_or_months` decimal(8,2) NOT NULL DEFAULT '1.00',
  `received_count` decimal(8,2) NOT NULL DEFAULT '1.00',
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `collect_date` date DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `collected_by_employee_id` int DEFAULT NULL,
  `payment_mapped_employee_id` int DEFAULT NULL,
  `payment_mode` enum('CASH','ONLINE','OFFICE','UPI','CARD','BANK','CHEQUE') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_reference` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_status` enum('PENDING','PARTIAL','PAID','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `approval_status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_by_user_id` int DEFAULT NULL,
  `approved_by_user_id` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`subscription_id`),
  UNIQUE KEY `uk_cable_subscription_customer_package_month` (`cable_customer_id`,`customer_package_id`,`subscription_month`,`subscription_year`),
  KEY `fk_cable_subscriptions_collected_by` (`collected_by_employee_id`),
  KEY `fk_cable_subscriptions_created_by_user` (`created_by_user_id`),
  KEY `fk_cable_subscriptions_approved_by_user` (`approved_by_user_id`),
  KEY `idx_cable_subscriptions_customer` (`cable_customer_id`),
  KEY `idx_cable_subscriptions_approval_group` (`approval_group_id`),
  KEY `idx_cable_subscriptions_package` (`customer_package_id`),
  KEY `idx_cable_subscriptions_month_year` (`subscription_month`,`subscription_year`),
  KEY `idx_cable_subscriptions_collect_date` (`collect_date`),
  KEY `idx_cable_subscriptions_payment_status` (`payment_status`),
  KEY `idx_cable_subscriptions_approval_status` (`approval_status`),
  CONSTRAINT `fk_cable_subscriptions_approval_group` FOREIGN KEY (`approval_group_id`) REFERENCES `cable_approval_groups` (`approval_group_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_subscriptions_approved_by_user` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_subscriptions_collected_by` FOREIGN KEY (`collected_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_subscriptions_created_by_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_subscriptions_customer` FOREIGN KEY (`cable_customer_id`) REFERENCES `cable_tv_customers` (`cable_customer_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_subscriptions_customer_package` FOREIGN KEY (`customer_package_id`) REFERENCES `cable_customer_packages` (`customer_package_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `cable_subscriptions_chk_1` CHECK ((`subscription_month` between 1 and 12)),
  CONSTRAINT `cable_subscriptions_chk_2` CHECK ((`subscription_year` >= 2000)),
  CONSTRAINT `cable_subscriptions_chk_3` CHECK ((`days_in_month` between 28 and 31)),
  CONSTRAINT `cable_subscriptions_chk_4` CHECK ((`number_of_days_or_months` > 0)),
  CONSTRAINT `cable_subscriptions_chk_5` CHECK ((`amount` >= 0)),
  CONSTRAINT `cable_subscriptions_chk_6` CHECK ((`paid_amount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV monthly/yearly subscription billing and collection';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_subscriptions`
--

LOCK TABLES `cable_subscriptions` WRITE;
/*!40000 ALTER TABLE `cable_subscriptions` DISABLE KEYS */;
INSERT INTO `cable_subscriptions` VALUES (1,1,1,1,7,2026,31,'DAY',9.00,1.00,87.10,0.00,87.10,NULL,'2026-07-23','2026-07-31',1,NULL,NULL,NULL,'PAID','APPROVED',NULL,1,NULL,NULL,NULL,'2026-07-23 11:54:41','2026-07-23 12:06:57'),(2,6,2,3,7,2026,31,'MONTH',3.00,1.00,900.00,0.00,900.00,NULL,'2026-07-01','2026-09-30',3,NULL,NULL,NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-24 07:10:39','2026-07-24 07:29:35'),(3,7,3,4,7,2026,31,'DAY',8.00,1.00,77.42,0.00,77.42,NULL,'2026-07-24','2026-07-31',3,NULL,NULL,NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-24 07:33:49','2026-07-24 08:44:20'),(4,NULL,1,2,8,2026,31,'MONTH',1.00,1.00,280.00,280.00,0.00,'2026-07-28','2026-08-01','2026-08-31',3,NULL,'CASH',NULL,'PAID','APPROVED',NULL,1,NULL,NULL,NULL,'2026-07-24 08:45:19','2026-07-28 09:56:52'),(5,NULL,3,4,8,2026,31,'MONTH',1.00,1.00,300.00,300.00,0.00,'2026-07-28','2026-08-01','2026-08-31',3,NULL,'CASH',NULL,'PAID','APPROVED',NULL,1,NULL,NULL,NULL,'2026-07-24 08:45:19','2026-07-28 09:56:46'),(6,8,4,5,7,2026,31,'DAY',8.00,0.26,77.00,77.00,0.00,NULL,'2026-07-24','2026-07-31',2,NULL,'CASH',NULL,'PAID','APPROVED',NULL,1,NULL,NULL,NULL,'2026-07-24 11:49:06','2026-07-24 11:59:40'),(7,11,4,5,8,2026,31,'MONTH',1.00,1.00,300.00,300.00,0.00,'2026-07-28','2026-08-01','2026-08-31',3,NULL,'CASH',NULL,'PAID','APPROVED',NULL,1,NULL,NULL,NULL,'2026-07-24 12:00:14','2026-07-28 09:56:40'),(8,17,5,6,7,2026,31,'DAY',7.00,1.00,67.74,0.00,67.74,NULL,'2026-07-25','2026-07-31',3,NULL,NULL,NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-25 17:07:41','2026-07-25 17:42:54'),(9,18,6,7,7,2026,31,'DAY',7.00,1.00,67.74,0.00,67.74,NULL,'2026-07-25','2026-07-31',3,NULL,NULL,NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-25 17:55:26','2026-07-25 18:05:25'),(10,19,7,8,7,2026,31,'DAY',7.00,1.00,67.74,0.00,67.74,NULL,'2026-07-25','2026-07-31',3,NULL,NULL,NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-25 18:15:35','2026-07-25 18:19:20'),(11,20,8,9,7,2026,31,'DAY',6.00,1.00,58.06,0.00,58.06,NULL,'2026-07-26','2026-07-31',3,NULL,NULL,NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-26 05:46:17','2026-07-26 05:48:51'),(12,22,8,9,8,2026,31,'MONTH',1.00,1.00,300.00,300.00,0.00,'2026-07-28','2026-08-01','2026-08-31',3,NULL,'CASH',NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-27 06:41:39','2026-07-28 09:56:36'),(13,30,10,11,7,2026,31,'DAY',4.00,1.00,38.71,0.00,38.71,NULL,'2026-07-28','2026-07-31',3,NULL,NULL,NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-28 06:44:50','2026-07-28 06:49:31'),(14,32,11,12,7,2026,31,'DAY',4.00,1.00,38.71,0.00,38.71,NULL,'2026-07-28','2026-07-31',3,NULL,NULL,NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-28 09:12:36','2026-07-28 09:14:03'),(15,33,11,12,8,2026,31,'MONTH',1.00,1.00,300.00,300.00,0.00,'2026-07-28','2026-08-01','2026-08-31',3,NULL,'CASH',NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-28 09:15:40','2026-07-28 09:56:32'),(16,34,6,7,8,2026,31,'MONTH',1.00,1.00,300.00,300.00,0.00,'2026-07-28','2026-08-01','2026-08-31',3,NULL,'CASH',NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-28 09:35:22','2026-07-28 09:55:51'),(18,36,2,3,8,2026,31,'MONTH',1.00,1.00,300.00,300.00,0.00,'2026-07-28','2026-08-01','2026-08-31',3,NULL,'CASH',NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-28 09:44:39','2026-07-28 09:55:55'),(19,37,12,13,7,2026,31,'DAY',4.00,1.00,38.71,0.00,38.71,NULL,'2026-07-28','2026-07-31',3,NULL,NULL,NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-28 10:00:23','2026-07-28 10:09:34'),(20,38,12,13,8,2026,31,'MONTH',1.00,1.00,300.00,300.00,0.00,'2026-07-28','2026-08-01','2026-08-31',3,NULL,'CASH',NULL,'PAID','APPROVED',NULL,1,NULL,NULL,NULL,'2026-07-28 10:10:53','2026-07-28 10:11:48'),(21,41,13,14,7,2026,31,'DAY',28.00,0.90,271.00,0.00,271.00,'2026-07-27','2026-07-01','2026-07-28',3,NULL,'CASH',NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-28 11:40:31','2026-07-28 15:11:27'),(22,42,14,15,7,2026,31,'DAY',15.00,0.48,145.00,0.00,145.00,NULL,'2026-07-15','2026-07-29',3,NULL,'CASH',NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-29 12:03:52','2026-07-30 07:27:30'),(23,43,15,16,7,2026,31,'DAY',16.00,0.52,155.00,0.00,155.00,NULL,'2026-07-15','2026-07-30',3,NULL,'CASH',NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-30 07:19:34','2026-07-30 07:27:12'),(24,44,15,16,8,2026,31,'MONTH',1.00,1.00,280.00,0.00,280.00,'2026-07-30','2026-08-01','2026-08-31',3,NULL,'CASH',NULL,'PENDING','APPROVED',NULL,1,NULL,NULL,NULL,'2026-07-30 07:28:31','2026-07-30 07:28:31'),(25,50,16,17,7,2026,31,'DAY',2.00,1.00,19.35,0.00,19.35,NULL,'2026-07-30','2026-07-31',3,NULL,NULL,NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-30 09:27:37','2026-07-30 09:33:40'),(26,51,16,17,8,2026,31,'MONTH',1.00,1.00,300.00,300.00,0.00,'2026-07-30','2026-08-01','2026-08-31',3,NULL,'CASH',NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-30 09:40:16','2026-07-30 10:02:08'),(29,54,12,13,9,2026,30,'MONTH',1.00,1.00,300.00,300.00,0.00,'2026-07-30','2026-09-01','2026-09-30',1,NULL,'CASH',NULL,'PAID','APPROVED',NULL,1,NULL,NULL,NULL,'2026-07-30 10:02:39','2026-07-30 10:03:14'),(30,55,12,13,10,2026,31,'MONTH',1.00,1.00,300.00,0.00,300.00,'2026-07-30','2026-10-01','2026-10-31',3,NULL,'CASH',NULL,'PENDING','APPROVED',NULL,1,NULL,NULL,NULL,'2026-07-30 10:03:38','2026-07-30 10:03:38'),(31,56,16,17,9,2026,30,'MONTH',1.00,1.00,300.00,0.00,300.00,'2026-07-30','2026-09-01','2026-09-30',3,NULL,'CASH',NULL,'PENDING','APPROVED',NULL,1,NULL,NULL,NULL,'2026-07-30 10:12:40','2026-07-30 10:12:40'),(32,64,17,18,7,2026,31,'DAY',6.00,0.19,58.00,0.00,58.00,'2026-07-30','2026-07-24','2026-07-29',3,NULL,'CASH',NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-31 06:29:40','2026-07-31 07:12:55'),(33,NULL,17,18,8,2026,31,'MONTH',1.00,1.00,300.00,0.00,300.00,'2026-07-31','2026-08-01','2026-08-31',3,NULL,'CASH',NULL,'PENDING','APPROVED',NULL,1,NULL,NULL,NULL,'2026-07-31 07:13:30','2026-07-31 07:13:30'),(34,NULL,17,18,9,2026,30,'MONTH',1.00,1.00,300.00,0.00,300.00,'2026-07-31','2026-09-01','2026-09-30',3,NULL,'CASH',NULL,'PENDING','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-31 07:16:46','2026-07-31 07:16:46'),(35,67,18,19,7,2026,31,'DAY',15.00,0.48,145.00,0.00,145.00,NULL,'2026-07-15','2026-07-29',3,NULL,'CASH',NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-31 09:30:26','2026-07-31 09:46:09'),(36,NULL,18,19,8,2026,31,'MONTH',1.00,1.00,300.00,0.00,300.00,'2026-07-31','2026-08-01','2026-08-31',3,NULL,'CASH',NULL,'PENDING','APPROVED',NULL,1,NULL,NULL,NULL,'2026-07-31 09:47:09','2026-07-31 09:47:09'),(37,NULL,18,19,9,2026,30,'MONTH',1.00,1.00,300.00,0.00,300.00,'2026-07-31','2026-09-01','2026-09-30',3,NULL,'CASH',NULL,'PENDING','APPROVED',NULL,3,NULL,NULL,NULL,'2026-07-31 09:48:06','2026-07-31 09:48:06'),(38,70,19,20,8,2026,31,'DAY',29.00,1.00,280.65,0.00,280.65,NULL,'2026-08-03','2026-08-31',3,NULL,NULL,NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-08-03 06:25:09','2026-08-03 07:09:36'),(39,71,20,21,8,2026,31,'DAY',31.00,1.00,300.00,0.00,300.00,NULL,'2026-08-03','2026-08-31',3,NULL,NULL,NULL,'PAID','APPROVED',NULL,3,NULL,NULL,NULL,'2026-08-03 07:08:16','2026-08-03 07:18:32'),(40,NULL,20,21,9,2026,30,'MONTH',1.00,1.00,300.00,300.00,0.00,'2026-08-03','2026-09-01','2026-09-30',3,NULL,'CASH',NULL,'PAID','APPROVED',NULL,1,NULL,NULL,NULL,'2026-08-03 07:19:02','2026-08-03 07:20:00'),(41,NULL,20,21,10,2026,31,'MONTH',1.00,1.00,300.00,0.00,300.00,'2026-08-03','2026-10-01','2026-10-31',3,NULL,'CASH',NULL,'PENDING','APPROVED',NULL,3,NULL,NULL,NULL,'2026-08-03 07:19:42','2026-08-03 07:19:42');
/*!40000 ALTER TABLE `cable_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_tv_complaint_attempts`
--

DROP TABLE IF EXISTS `cable_tv_complaint_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_tv_complaint_attempts` (
  `complaint_attempt_id` bigint NOT NULL AUTO_INCREMENT,
  `complaint_id` bigint NOT NULL,
  `attempt_no` int NOT NULL,
  `status` enum('OPEN','IN_PROGRESS','HOLD','PENDING','COMPLETED') NOT NULL,
  `assigned_employee_id` int DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `reason` text,
  `remedy` text,
  `notes` text,
  `entered_by_user_id` int DEFAULT NULL,
  `entered_by_employee_id` int DEFAULT NULL,
  `entered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`complaint_attempt_id`),
  KEY `idx_cable_tv_attempt_complaint` (`complaint_id`),
  KEY `fk_cable_tv_attempt_employee` (`assigned_employee_id`),
  CONSTRAINT `fk_cable_tv_attempt_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `cable_tv_complaints` (`complaint_id`),
  CONSTRAINT `fk_cable_tv_attempt_employee` FOREIGN KEY (`assigned_employee_id`) REFERENCES `employees` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_tv_complaint_attempts`
--

LOCK TABLES `cable_tv_complaint_attempts` WRITE;
/*!40000 ALTER TABLE `cable_tv_complaint_attempts` DISABLE KEYS */;
INSERT INTO `cable_tv_complaint_attempts` VALUES (1,1,1,'OPEN',NULL,NULL,NULL,NULL,NULL,'test',1,1,'2026-07-29 12:08:42'),(2,1,2,'IN_PROGRESS',3,'2026-07-29 12:16:00','2026-07-29 12:44:00','test','test','test',3,3,'2026-07-29 12:17:04'),(3,1,3,'COMPLETED',3,'2026-07-29 12:17:00','2026-07-29 12:34:00','test','test','test',3,3,'2026-07-29 12:17:39'),(4,2,1,'OPEN',NULL,NULL,NULL,NULL,NULL,'test',3,3,'2026-07-29 12:18:47'),(5,3,1,'OPEN',NULL,NULL,NULL,NULL,NULL,'ktv not working',1,1,'2026-07-29 12:26:56'),(6,4,1,'OPEN',NULL,NULL,NULL,NULL,NULL,'test',1,1,'2026-07-29 12:28:23'),(7,4,2,'IN_PROGRESS',1,'2026-07-29 12:28:00','2026-07-29 12:50:00',NULL,NULL,NULL,1,1,'2026-07-29 12:28:58');
/*!40000 ALTER TABLE `cable_tv_complaint_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_tv_complaints`
--

DROP TABLE IF EXISTS `cable_tv_complaints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_tv_complaints` (
  `complaint_id` bigint NOT NULL AUTO_INCREMENT,
  `complaint_no` varchar(30) NOT NULL,
  `complainant_type` enum('CATV','NET','CCTV','ANONYMOUS') NOT NULL DEFAULT 'CATV',
  `cable_customer_id` bigint DEFAULT NULL,
  `service_customer_id` int DEFAULT NULL,
  `anonymous_name` varchar(150) DEFAULT NULL,
  `anonymous_mobile` varchar(20) DEFAULT NULL,
  `reported_mobile` varchar(20) DEFAULT NULL,
  `anonymous_address` varchar(500) DEFAULT NULL,
  `nature_of_complaint` varchar(250) NOT NULL,
  `complaint_description` text,
  `status` enum('OPEN','IN_PROGRESS','HOLD','PENDING','COMPLETED') NOT NULL DEFAULT 'OPEN',
  `assigned_employee_id` int DEFAULT NULL,
  `registered_by_user_id` int DEFAULT NULL,
  `registered_by_employee_id` int DEFAULT NULL,
  `registered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`complaint_id`),
  UNIQUE KEY `uk_cable_tv_complaint_no` (`complaint_no`),
  KEY `idx_cable_tv_complaint_customer` (`cable_customer_id`),
  KEY `idx_cable_tv_complaint_status` (`status`),
  KEY `idx_cable_tv_complaint_assigned` (`assigned_employee_id`),
  KEY `idx_cable_tv_complaint_service_customer` (`service_customer_id`),
  CONSTRAINT `fk_cable_tv_complaint_assigned` FOREIGN KEY (`assigned_employee_id`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `fk_cable_tv_complaint_customer` FOREIGN KEY (`cable_customer_id`) REFERENCES `cable_tv_customers` (`cable_customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_tv_complaints`
--

LOCK TABLES `cable_tv_complaints` WRITE;
/*!40000 ALTER TABLE `cable_tv_complaints` DISABLE KEYS */;
INSERT INTO `cable_tv_complaints` VALUES (1,'CMP-000001','CATV',13,NULL,NULL,NULL,NULL,NULL,'test','test','COMPLETED',3,1,1,'2026-07-29 12:08:42','2026-07-29 12:17:39','2026-07-29 06:38:42','2026-07-29 06:47:39'),(2,'CMP-000002','ANONYMOUS',NULL,NULL,'Sivakuamr',NULL,NULL,'test','test','test','OPEN',NULL,3,3,'2026-07-29 12:18:47',NULL,'2026-07-29 06:48:47','2026-07-29 07:34:57'),(3,'CMP-000003','CATV',4,NULL,NULL,NULL,'9962543540',NULL,'channel missing','ktv not working','OPEN',NULL,1,1,'2026-07-29 12:26:56',NULL,'2026-07-29 06:56:56','2026-07-29 06:56:56'),(4,'CMP-000004','CATV',5,NULL,'Velu','9000090000',NULL,'no 4 , 1st street, kamaraj nagar','test','test','IN_PROGRESS',1,1,1,'2026-07-29 12:28:23',NULL,'2026-07-29 06:58:23','2026-07-29 06:58:58');
/*!40000 ALTER TABLE `cable_tv_complaints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cable_tv_customers`
--

DROP TABLE IF EXISTS `cable_tv_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_tv_customers` (
  `cable_customer_id` bigint NOT NULL AUTO_INCREMENT,
  `approval_group_id` bigint DEFAULT NULL,
  `erp_customer_id` int DEFAULT NULL,
  `network_id` int NOT NULL,
  `network_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_type` enum('REGULAR','BUSINESS') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'REGULAR',
  `legacy_customer_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_code` int NOT NULL,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `door_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_id` int NOT NULL,
  `area_id` int NOT NULL,
  `street_id` int NOT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pincode` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile_no` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `aadhaar_no` varchar(12) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alternate_mobile_no` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_id` int DEFAULT NULL,
  `installed_by_employee_id` int DEFAULT NULL,
  `labour_service_charge` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('ACTIVE','INACTIVE','DISCONNECTED','SHIFTED','TRANSFERRED','RETRIEVED','FAULT','UPGRADE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `approval_status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `created_by_user_id` int DEFAULT NULL,
  `approved_by_user_id` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cable_customer_id`),
  UNIQUE KEY `uk_cable_customer_code` (`customer_code`),
  UNIQUE KEY `uk_cable_network_legacy_customer` (`network_id`,`legacy_customer_no`),
  KEY `fk_cable_customers_erp_customer` (`erp_customer_id`),
  KEY `fk_cable_customers_area` (`area_id`),
  KEY `fk_cable_customers_street` (`street_id`),
  KEY `fk_cable_customers_source` (`source_id`),
  KEY `fk_cable_customers_installed_by` (`installed_by_employee_id`),
  KEY `fk_cable_customers_created_by_user` (`created_by_user_id`),
  KEY `fk_cable_customers_approved_by_user` (`approved_by_user_id`),
  KEY `idx_cable_customer_approval_group` (`approval_group_id`),
  KEY `idx_cable_customer_name` (`full_name`),
  KEY `idx_cable_customer_mobile` (`mobile_no`),
  KEY `idx_cable_customer_network` (`network_id`),
  KEY `idx_cable_customer_location_area_street` (`location_id`,`area_id`,`street_id`),
  KEY `idx_cable_customer_status` (`status`),
  KEY `idx_cable_customer_approval_status` (`approval_status`),
  CONSTRAINT `fk_cable_customers_approval_group` FOREIGN KEY (`approval_group_id`) REFERENCES `cable_approval_groups` (`approval_group_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_customers_approved_by_user` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_customers_area` FOREIGN KEY (`area_id`) REFERENCES `cable_areas` (`area_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_customers_created_by_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_customers_erp_customer` FOREIGN KEY (`erp_customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_customers_installed_by` FOREIGN KEY (`installed_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_customers_location` FOREIGN KEY (`location_id`) REFERENCES `cable_locations` (`location_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_customers_network` FOREIGN KEY (`network_id`) REFERENCES `cable_network_master` (`network_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_customers_source` FOREIGN KEY (`source_id`) REFERENCES `cable_connection_sources` (`source_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cable_customers_street` FOREIGN KEY (`street_id`) REFERENCES `cable_streets` (`street_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `cable_tv_customers_chk_1` CHECK ((`labour_service_charge` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Combined Cable TV customer table for all networks';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cable_tv_customers`
--

LOCK TABLES `cable_tv_customers` WRITE;
/*!40000 ALTER TABLE `cable_tv_customers` DISABLE KEYS */;
INSERT INTO `cable_tv_customers` VALUES (1,1,NULL,1,'TCV','REGULAR',NULL,1001,'SIVAKUMAR Mani','3',1,1,1,'Chennai','600044','9962543541','100020003000','9042043540',1,3,0.00,'RETRIEVED','APPROVED',1,1,'2026-07-23 11:54:41',NULL,'2026-07-23 11:54:41','2026-07-28 10:34:10'),(2,6,NULL,2,'SVN','REGULAR',NULL,1002,'mani','2',1,2,3,'Chennai','600044','9962543540','996254354099','9962543540',1,3,0.00,'RETRIEVED','APPROVED',3,1,'2026-07-24 07:17:32',NULL,'2026-07-24 07:10:39','2026-07-28 10:20:35'),(3,7,NULL,1,'TCV','REGULAR',NULL,1003,'Raman','5',1,1,1,'Chennai','600044','9962543540','996254354099','9962543540',1,3,0.00,'ACTIVE','APPROVED',3,1,'2026-07-24 08:44:55',NULL,'2026-07-24 07:33:49','2026-07-24 08:44:55'),(4,8,NULL,1,'TCV','REGULAR',NULL,1004,'mythili','2',1,1,1,'Chennai','600044','9962543541','996254354199','9962543541',1,2,0.00,'ACTIVE','APPROVED',1,1,'2026-07-24 11:49:06',NULL,'2026-07-24 11:49:06','2026-07-24 12:30:28'),(5,17,NULL,1,'TCV','REGULAR',NULL,1005,'SIVAKUMAR M','2',1,1,1,'Chennai','600044','9962543540','996254354099','9962543540',1,3,0.00,'DISCONNECTED','APPROVED',3,1,'2026-07-25 17:27:54',NULL,'2026-07-25 17:07:41','2026-07-28 06:35:13'),(6,18,NULL,1,'TCV','REGULAR',NULL,1006,'Kumar','2',1,1,2,'Chennai','600044','9962543540','996254353199','9962543531',1,3,0.00,'ACTIVE','APPROVED',3,1,'2026-07-25 18:01:43',NULL,'2026-07-25 17:55:26','2026-07-28 09:55:38'),(7,19,NULL,2,'SVN','REGULAR',NULL,1007,'Rajesh','2',1,2,3,'Chennai','600044','9962543540','996254354099','9962543541',1,3,0.00,'ACTIVE','APPROVED',3,1,'2026-07-25 18:17:23',NULL,'2026-07-25 18:15:35','2026-07-28 09:49:20'),(8,20,NULL,1,'TCV','REGULAR',NULL,1008,'thenmozhi','114',1,1,2,'Chennai','600044','9042390878','697085643219','9444443871',2,3,0.00,'RETRIEVED','APPROVED',3,1,'2026-07-26 05:47:32',NULL,'2026-07-26 05:46:17','2026-07-31 10:09:08'),(10,30,NULL,1,'TCV','REGULAR',NULL,1009,'Rajendran','1',1,1,2,'Chennai','600044','9962543540','996254354199','9962543541',1,3,0.00,'DISCONNECTED','APPROVED',3,1,'2026-07-28 06:49:09',NULL,'2026-07-28 06:44:50','2026-07-28 09:55:42'),(11,32,NULL,1,'TCV','REGULAR',NULL,1010,'Pannir','2',1,1,2,'Chennai','600044','9962543540','996254354099','9962543541',1,3,0.00,'ACTIVE','APPROVED',3,1,'2026-07-28 09:15:11',NULL,'2026-07-28 09:12:36','2026-07-28 09:15:11'),(12,37,NULL,2,'SVN','REGULAR',NULL,1011,'Testing','1',1,2,3,'Chennai','600044','9962543540','996254354199','9962543541',1,3,0.00,'FAULT','APPROVED',3,1,'2026-07-28 10:09:57',NULL,'2026-07-28 10:00:23','2026-07-30 10:31:21'),(13,41,NULL,1,'TCV','REGULAR',NULL,1012,'Demo1','1',1,1,2,'Chennai','600044','9962543540','996254354099','9962543540',1,3,0.00,'ACTIVE','APPROVED',3,1,'2026-07-28 11:47:54',NULL,'2026-07-28 11:40:31','2026-07-28 11:47:54'),(14,42,NULL,1,'TCV','REGULAR',NULL,1013,'Murugan','1',1,1,2,'Chennai','600044','9962543540','996254354099','9962543541',1,3,0.00,'ACTIVE','APPROVED',3,1,'2026-07-29 12:05:05',NULL,'2026-07-29 12:03:52','2026-07-29 12:05:05'),(15,43,NULL,1,'TCV','REGULAR',NULL,1014,'Demo30July','1',1,1,2,'Chennai','600044','9962543540','996254354099','9962543541',1,3,0.00,'ACTIVE','APPROVED',3,1,'2026-07-30 07:26:36',NULL,'2026-07-30 07:19:34','2026-07-31 06:36:27'),(16,50,NULL,1,'TCV','REGULAR',NULL,1015,'Vignesh m','1',1,1,1,'Chennai','600044','9962543540','996254354099','9962543541',1,3,0.00,'FAULT','APPROVED',3,1,'2026-07-30 09:39:34',NULL,'2026-07-30 09:27:37','2026-07-31 06:30:13'),(17,64,NULL,2,'SVN','REGULAR',NULL,1016,'Ramanathan','1',1,2,3,'Chennai','600044','9962543540','996254354199','9962543541',1,3,0.00,'ACTIVE','APPROVED',3,1,'2026-07-31 06:34:53',NULL,'2026-07-31 06:29:40','2026-07-31 09:30:58'),(18,67,NULL,1,'TCV','REGULAR',NULL,1017,'Umapathy','36',1,1,1,'Chennai','600044','9962543540','996254354199','9962543541',1,3,0.00,'FAULT','APPROVED',3,1,'2026-07-31 09:46:52',NULL,'2026-07-31 09:30:26','2026-07-31 10:00:26'),(19,70,NULL,1,'TCV','REGULAR',NULL,1018,'Vijay','1',1,1,1,'Chennai','600044','9962543540',NULL,NULL,1,3,0.00,'ACTIVE','APPROVED',3,1,'2026-08-03 06:29:10',NULL,'2026-08-03 06:25:09','2026-08-03 06:29:10'),(20,71,NULL,2,'SVN','REGULAR',NULL,1019,'Vinayaga Muruga','1',1,2,3,'Chennai','600044','9962543540','996254354199','9962543541',2,3,0.00,'FAULT','APPROVED',3,1,'2026-08-03 07:09:21',NULL,'2026-08-03 07:08:16','2026-08-03 07:21:45');
/*!40000 ALTER TABLE `cable_tv_customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_id` int DEFAULT NULL COMMENT 'For hierarchical categories (NULL for root)',
  `level` int NOT NULL DEFAULT '1' COMMENT '1=Root, 2=Sub-category, etc.',
  `slug` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL-friendly identifier',
  `sort_order` smallint NOT NULL DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_level` (`level`),
  KEY `idx_slug` (`slug`),
  KEY `idx_active` (`is_active`),
  KEY `idx_parent_active` (`parent_id`,`is_active`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`category_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hierarchical product categories';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'CATV',NULL,1,'catv',2,NULL,1,'2026-07-23 10:11:30','2026-07-23 10:11:30'),(2,'STB accessories',1,2,'catv-stb-accessories',0,NULL,1,'2026-07-23 10:11:30','2026-07-23 10:11:30'),(3,'hdmi',2,3,'catv-stb-accessories-hdmi',0,NULL,1,'2026-07-23 10:11:30','2026-07-23 10:11:30'),(4,'1mts',3,4,'catv-stb-accessories-hdmi-1mts',0,NULL,1,'2026-07-23 10:11:30','2026-07-23 10:11:30'),(5,'av card',2,3,'catv-stb-accessories-av-card',0,NULL,1,'2026-07-23 10:12:17','2026-07-23 10:12:17'),(6,'1 Pin → 3 RCA',5,4,'catv-stb-accessories-av-card-1-pin-3-rca',0,NULL,1,'2026-07-23 10:12:17','2026-07-23 10:12:17'),(7,'3 Pin → 3 RCA',5,4,'catv-stb-accessories-av-card-3-pin-3-rca',0,NULL,1,'2026-07-23 10:12:54','2026-07-23 10:12:54'),(8,'aaa',2,3,'catv-stb-accessories-aaa',0,NULL,1,'2026-07-23 10:13:36','2026-07-23 10:13:36'),(9,'battery',8,4,'catv-stb-accessories-aaa-battery',0,NULL,1,'2026-07-23 10:13:36','2026-07-23 10:13:36'),(10,'remote',2,3,'catv-stb-accessories-remote',0,NULL,1,'2026-07-23 10:14:34','2026-07-23 10:14:34'),(11,'Blue',10,4,'catv-stb-accessories-remote-blue',0,NULL,1,'2026-07-23 10:14:34','2026-07-23 10:14:34'),(12,'Fiber',1,2,'catv-fiber',0,NULL,1,'2026-07-23 10:20:35','2026-07-23 10:20:35'),(13,'6 core',12,3,'catv-fiber-6-core',0,NULL,1,'2026-07-23 10:20:35','2026-07-23 10:20:35'),(14,'RG cable',1,2,'catv-rg-cable',0,NULL,1,'2026-07-23 10:20:58','2026-07-23 10:20:58'),(15,'copper',14,3,'catv-rg-cable-copper',0,NULL,1,'2026-07-23 10:20:58','2026-07-23 10:20:58'),(16,'Adaptor',2,3,'catv-stb-accessories-adaptor',0,NULL,1,'2026-07-25 17:00:16','2026-07-25 17:00:16'),(17,'12V',16,4,'catv-stb-accessories-adaptor-12v',0,NULL,1,'2026-07-25 17:00:16','2026-07-25 17:00:16'),(18,'1amp',17,5,'catv-stb-accessories-adaptor-12v-1amp',0,NULL,1,'2026-07-25 17:00:16','2026-07-25 17:00:16'),(19,'Used Accessories',1,2,'catv-used-accessories',0,'Returned CATV accessories available as used stock',1,'2026-07-28 06:35:13','2026-07-28 06:35:13');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_payments`
--

DROP TABLE IF EXISTS `customer_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_payments` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `sales_id` int DEFAULT NULL COMMENT 'Against which invoice',
  `amount` decimal(12,2) NOT NULL,
  `payment_date` date NOT NULL DEFAULT (curdate()),
  `payment_mode` enum('CASH','CARD','UPI','BANK','CHEQUE','ONLINE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Cheque/Receipt/Transaction number',
  `payment_against` enum('INVOICE','ADVANCE','ADJUSTMENT') COLLATE utf8mb4_unicode_ci DEFAULT 'INVOICE',
  `narration` text COLLATE utf8mb4_unicode_ci,
  `received_by_employee_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  KEY `received_by_employee_id` (`received_by_employee_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_sales_id` (`sales_id`),
  KEY `idx_payment_date` (`payment_date`),
  KEY `idx_reference_no` (`reference_no`),
  CONSTRAINT `customer_payments_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON UPDATE CASCADE,
  CONSTRAINT `customer_payments_ibfk_2` FOREIGN KEY (`sales_id`) REFERENCES `sales_master` (`sales_id`) ON DELETE SET NULL,
  CONSTRAINT `customer_payments_ibfk_3` FOREIGN KEY (`received_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL,
  CONSTRAINT `customer_payments_chk_1` CHECK ((`amount` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer payment records';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_payments`
--

LOCK TABLES `customer_payments` WRITE;
/*!40000 ALTER TABLE `customer_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `salutation` enum('Mr/Mrs/Ms','Mr.','Mrs.','Ms.','M/S') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Mr/Mrs/Ms',
  `customer_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_person` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alternate_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gst_no` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_type` enum('RETAIL','WHOLESALE','DEALER','CORPORATE','SERVICE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RETAIL',
  `marketing_employee_id` int DEFAULT NULL,
  `referral_details` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `city_district` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pincode` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `credit_limit` decimal(12,2) NOT NULL DEFAULT '0.00',
  `opening_balance` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'Customer credit balance',
  `outstanding_balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`customer_id`),
  KEY `idx_customer_name` (`customer_name`),
  KEY `idx_customer_type` (`customer_type`),
  KEY `idx_city` (`city_district`),
  KEY `idx_active` (`is_active`),
  KEY `idx_email` (`email`),
  KEY `idx_phone` (`phone`),
  KEY `idx_salutation` (`salutation`),
  KEY `idx_marketing_employee_id` (`marketing_employee_id`),
  CONSTRAINT `fk_customers_marketing_employee` FOREIGN KEY (`marketing_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `customers_chk_1` CHECK ((`credit_limit` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer master data with credit management';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_attendance`
--

DROP TABLE IF EXISTS `employee_attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_attendance` (
  `attendance_id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `attendance_date` date NOT NULL,
  `status` enum('PRESENT','ABSENT','HALF_DAY','LEAVE','HOLIDAY') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PRESENT',
  `check_in` time DEFAULT NULL,
  `check_out` time DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`attendance_id`),
  UNIQUE KEY `uk_employee_attendance_date` (`employee_id`,`attendance_date`),
  KEY `idx_attendance_date` (`attendance_date`),
  KEY `idx_attendance_status` (`status`),
  CONSTRAINT `employee_attendance_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_attendance`
--

LOCK TABLES `employee_attendance` WRITE;
/*!40000 ALTER TABLE `employee_attendance` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_salary`
--

DROP TABLE IF EXISTS `employee_salary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_salary` (
  `salary_id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `company_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TCV',
  `salary_month` tinyint NOT NULL,
  `salary_year` smallint NOT NULL,
  `period_start_date` date NOT NULL,
  `period_end_date` date NOT NULL,
  `salary_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `earnings_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `deductions_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `net_salary` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('DRAFT','FINAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'FINAL',
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`salary_id`),
  UNIQUE KEY `uk_employee_salary_month` (`employee_id`,`salary_month`,`salary_year`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_salary_period` (`salary_year`,`salary_month`),
  KEY `idx_period_start_date` (`period_start_date`),
  CONSTRAINT `employee_salary_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `employee_salary_chk_1` CHECK ((`salary_month` between 1 and 12)),
  CONSTRAINT `employee_salary_chk_2` CHECK ((`salary_year` >= 2000)),
  CONSTRAINT `employee_salary_chk_3` CHECK ((`salary_amount` >= 0)),
  CONSTRAINT `employee_salary_chk_4` CHECK ((`earnings_total` >= 0)),
  CONSTRAINT `employee_salary_chk_5` CHECK ((`deductions_total` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Employee monthly salary slip header';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_salary`
--

LOCK TABLES `employee_salary` WRITE;
/*!40000 ALTER TABLE `employee_salary` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_salary` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_salary_items`
--

DROP TABLE IF EXISTS `employee_salary_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_salary_items` (
  `salary_item_id` int NOT NULL AUTO_INCREMENT,
  `salary_id` int NOT NULL,
  `item_type` enum('EARNING','DEDUCTION') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EARNING',
  `line_no` smallint NOT NULL,
  `description` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `qty` decimal(10,2) NOT NULL DEFAULT '1.00',
  `price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`salary_item_id`),
  KEY `idx_salary_id` (`salary_id`),
  KEY `idx_item_type` (`item_type`),
  CONSTRAINT `employee_salary_items_ibfk_1` FOREIGN KEY (`salary_id`) REFERENCES `employee_salary` (`salary_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `employee_salary_items_chk_1` CHECK ((`qty` >= 0)),
  CONSTRAINT `employee_salary_items_chk_2` CHECK ((`price` >= 0)),
  CONSTRAINT `employee_salary_items_chk_3` CHECK ((`total` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Employee salary slip earning and deduction lines';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_salary_items`
--

LOCK TABLES `employee_salary_items` WRITE;
/*!40000 ALTER TABLE `employee_salary_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `employee_salary_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `employee_id` int NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Auto generated employee code, e.g. TCV1',
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alternate_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `designation` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` enum('ADMIN','ENGINEER','TECHNICAL','STAFF','SALES','PURCHASE','STORE','INSTALLATION','SERVICE','ACCOUNTS') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SERVICE',
  `date_of_birth` date DEFAULT NULL,
  `qualification` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photo_file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Uploaded photo file name',
  `photo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Uploaded photo relative path or URL',
  `spouse_or_parent_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Name of spouse or parent',
  `relationship` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Relationship to spouse/parent',
  `kids_details` text COLLATE utf8mb4_unicode_ci COMMENT 'Children names and details',
  `id_proof_type` enum('AADHAAR','PAN','VOTER_ID','PASSPORT','DRIVING_LICENSE','RATION_CARD','NREGA_JOB_CARD','BANK_PASSBOOK','POST_OFFICE_PASSBOOK','GOVERNMENT_EMPLOYEE_ID','DEFENCE_ID','PENSIONER_CARD','BIRTH_CERTIFICATE','OTHER') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Accepted Indian identification proof type',
  `id_proof_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Name on identification proof',
  `id_proof_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Identification proof number',
  `joining_date` date NOT NULL,
  `permanent_address` text COLLATE utf8mb4_unicode_ci,
  `permanent_city_district` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permanent_state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permanent_pincode` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `temporary_address` text COLLATE utf8mb4_unicode_ci,
  `temporary_city_district` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `temporary_state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `temporary_pincode` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`employee_id`),
  UNIQUE KEY `employee_code` (`employee_code`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_employee_code` (`employee_code`),
  KEY `idx_department` (`department`),
  KEY `idx_email` (`email`),
  KEY `idx_active` (`is_active`),
  KEY `idx_joining_date` (`joining_date`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Employee master data with department assignment';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES (1,'TCV1','Sivakumar','M','9962543540','9962543540','timecablevision@gmail.com','CTO','ADMIN','1992-01-01','mca','1784800622893-lop_-_Copy.jpg','/uploads/employees/1784800622893-lop_-_Copy.jpg','mythili','wife','2 sons','AADHAAR','aadhar','100020000300000','2026-07-01','2, 2nd Street Arkeeswarar Colony, chrompet','Chengalpattu','Tamil Nadu','600044','2, 2nd Street Arkeeswarar Colony, chrompet','Chengalpattu','Tamil Nadu','600044',1,'2026-07-23 09:57:30','2026-07-23 09:57:30'),(2,'TCV2','mythili','Sivakumar','9042043540','9042043540','9042043540@gmail.com','Manager','ENGINEER','2000-06-01','msc','1784803600709-cart.png','/uploads/employees/1784803600709-cart.png','aruna','wife','test','AADHAAR','aadhar','100020003000','2026-07-01','2, 3rd Street Arkeeswarar Colony, chrompet','Chengalpattu','Tamil Nadu','600044','2, 3rd Street Arkeeswarar Colony, chrompet','Chengalpattu','Tamil Nadu','600044',1,'2026-07-23 10:47:13','2026-07-24 06:46:16'),(3,'TCV3','Murugan','K','9042043540',NULL,'mailtomurugan@gmail.com','Manager','ENGINEER','1982-05-10','BSc',NULL,NULL,'Aruna','wife','1 daughter 1 son','AADHAAR','aadhar','100020003000','2016-04-14','20, 3rd Street, Arkeeswarar colony, Chrompet, ','Chengalpattu','Tamil Nadu','600044','20, 3rd Street, Arkeeswarar colony, Chrompet, ','Chengalpattu','Tamil Nadu','600044',1,'2026-07-14 08:29:54','2026-07-14 08:29:54');
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `finance_transactions`
--

DROP TABLE IF EXISTS `finance_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `finance_transactions` (
  `finance_transaction_id` bigint NOT NULL AUTO_INCREMENT,
  `transaction_date` date NOT NULL,
  `transaction_type` enum('DEBIT','CREDIT') NOT NULL,
  `category` varchar(100) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_mode` enum('CASH','ONLINE','BANK','UPI','OTHER') NOT NULL DEFAULT 'CASH',
  `reference_no` varchar(100) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `instructed_by` varchar(150) DEFAULT NULL,
  `bill_copy_available` enum('YES','NO') DEFAULT NULL,
  `item_list` text,
  `received_by` varchar(150) DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `approval_status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `approved_by_user_id` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `source_module` varchar(50) DEFAULT NULL,
  `source_id` bigint DEFAULT NULL,
  `created_by_user_id` int DEFAULT NULL,
  `created_by_employee_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`finance_transaction_id`),
  UNIQUE KEY `uk_finance_source` (`source_module`,`source_id`),
  KEY `idx_finance_transaction_date` (`transaction_date`),
  KEY `idx_finance_transaction_type` (`transaction_type`),
  KEY `fk_finance_transaction_user` (`created_by_user_id`),
  KEY `fk_finance_transaction_employee` (`created_by_employee_id`),
  CONSTRAINT `fk_finance_transaction_employee` FOREIGN KEY (`created_by_employee_id`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `fk_finance_transaction_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `finance_transactions`
--

LOCK TABLES `finance_transactions` WRITE;
/*!40000 ALTER TABLE `finance_transactions` DISABLE KEYS */;
INSERT INTO `finance_transactions` VALUES (1,'2026-07-28','DEBIT','STB Return Refund',100.00,'CASH','CTV-STB-25','Refund paid for returned STB 0000832B000DE478',NULL,NULL,NULL,NULL,NULL,'PENDING',NULL,NULL,'CATV_STB_RETURN',25,3,3,'2026-07-28 10:27:09'),(2,'2026-07-28','DEBIT','STB Return Refund',250.00,'CASH','CTV-STB-26','Refund paid for returned STB 0000832B000DE477',NULL,NULL,NULL,NULL,NULL,'PENDING',NULL,NULL,'CATV_STB_RETURN',26,3,3,'2026-07-28 10:34:10'),(3,'2026-07-28','DEBIT','EB accessories',250.00,'CASH',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PENDING',NULL,NULL,NULL,NULL,1,1,'2026-07-28 10:34:55'),(4,'2026-07-28','CREDIT','New connection amount',1100.00,'CASH',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'PENDING',NULL,NULL,NULL,NULL,1,1,'2026-07-28 10:35:28'),(5,'2026-07-31','DEBIT','STB Return Refund',250.00,'CASH','CTV-STB-46','Refund paid for returned STB 0000832B000DE201',NULL,NULL,NULL,NULL,NULL,'PENDING',NULL,NULL,'CATV_STB_RETURN',46,3,3,'2026-07-31 10:09:08'),(6,'2026-07-31','CREDIT','collection amount received from 01-07-2026',10000.00,'CASH','from murugan','test',NULL,NULL,NULL,NULL,NULL,'PENDING',NULL,NULL,NULL,NULL,1,1,'2026-07-31 10:11:54'),(7,'2026-07-31','DEBIT','cctv installation valiinayagam',1200.00,'CASH','bill','test purchase',NULL,NULL,NULL,NULL,NULL,'PENDING',NULL,NULL,NULL,NULL,1,1,'2026-07-31 10:46:41'),(8,'2026-07-31','DEBIT','cctv',100.00,'CASH','bill no:1',NULL,NULL,NULL,NULL,NULL,NULL,'PENDING',NULL,NULL,NULL,NULL,1,1,'2026-07-31 10:47:47'),(9,'2026-07-31','CREDIT','collection',25000.00,'CASH','test','test',NULL,NULL,NULL,NULL,NULL,'PENDING',NULL,NULL,NULL,NULL,1,1,'2026-07-31 11:49:54');
/*!40000 ALTER TABLE `finance_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `material_master`
--

DROP TABLE IF EXISTS `material_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_master` (
  `material_id` int NOT NULL AUTO_INCREMENT,
  `product_id` int DEFAULT NULL COMMENT 'Optional linked inventory product',
  `material_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PCS',
  `standard_rate` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gst_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`material_id`),
  UNIQUE KEY `material_code` (`material_code`),
  KEY `product_id` (`product_id`),
  KEY `idx_material_code` (`material_code`),
  KEY `idx_material_name` (`material_name`),
  KEY `idx_active` (`is_active`),
  CONSTRAINT `material_master_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `material_master_chk_1` CHECK ((`standard_rate` >= 0)),
  CONSTRAINT `material_master_chk_2` CHECK ((`gst_percent` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Material catalog for work order issue and return';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `material_master`
--

LOCK TABLES `material_master` WRITE;
/*!40000 ALTER TABLE `material_master` DISABLE KEYS */;
INSERT INTO `material_master` VALUES (1,1,'VKSTBACCHDM1MT','vk STB accessories hdmi 1mts',NULL,'PCS',110.00,0.00,1,'2026-07-24 09:18:16','2026-07-24 09:18:16'),(2,2,'VKSTBACCAAABAT','vk STB accessories aaa battery',NULL,'PCS',20.00,0.00,1,'2026-07-24 09:18:16','2026-07-24 09:18:16'),(3,3,'VKSTBACCAVCAR1PIN→3RCA','vk STB accessories av card 1 Pin → 3 RCA',NULL,'PCS',60.00,0.00,1,'2026-07-24 09:18:16','2026-07-24 09:18:16'),(4,4,'VKSTBACCREMBLU','vk STB accessories remote Blue',NULL,'PCS',120.00,0.00,1,'2026-07-24 09:18:16','2026-07-24 09:18:16'),(5,5,'TIMFIB6COR','TIMESCOPE Fiber 6 core',NULL,'PCS',15.00,0.00,1,'2026-07-24 09:18:16','2026-07-24 09:18:16'),(6,6,'TIMRGCABCOP','TIMESCOPE RG cable copper',NULL,'PCS',25.00,0.00,1,'2026-07-24 09:18:16','2026-07-24 09:18:16'),(7,7,'VKSTBACCAVCAR3PIN→3RCA','vk STB accessories av card 3 Pin → 3 RCA',NULL,'PCS',0.00,0.00,1,'2026-07-24 09:18:16','2026-07-24 09:18:16');
/*!40000 ALTER TABLE `material_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `source_key` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notification_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` enum('INFO','WARNING','CRITICAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INFO',
  `reference_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `reference_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `navigation_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_user_id` int DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  UNIQUE KEY `source_key` (`source_key`),
  KEY `idx_active_read` (`is_active`,`is_read`),
  KEY `idx_type_active` (`notification_type`,`is_active`),
  KEY `idx_severity` (`severity`),
  KEY `idx_notification_target` (`target_user_id`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=3237 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,'cable-tv-account-due:1','CABLE_TV_ACCOUNT_DUE','Cable TV payment due','SIVAKUMAR M (1001) has Rs. 637.00 balance due on 2026-07-24.','WARNING','CABLE_TV_ACCOUNT',1,'1001','/cable-tv-account-pending?status=PARTIAL&name=1001',1,0,0,'2026-07-23 12:07:56','2026-07-23 12:04:56','2026-07-23 12:07:56'),(4,'supplier-balance:1','SUPPLIER_BALANCE','Supplier payment pending','Rs. 1000.00 is payable to Asian Electronics for PO-202607-0001.','WARNING','PURCHASE',1,'PO-202607-0001','/supplier-payments?supplierId=1&purchaseId=1',NULL,0,1,NULL,'2026-07-24 08:30:21','2026-08-03 07:52:35'),(1170,'stock:1','OUT_OF_STOCK','Product out of stock','VKSTBACCHDM1MT - vk STB accessories hdmi 1mts has 0 available.','CRITICAL','PRODUCT',1,'VKSTBACCHDM1MT','/stock?productId=1',NULL,0,0,'2026-07-28 15:11:22','2026-07-28 10:09:45','2026-07-28 15:11:22');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `product_id` int NOT NULL AUTO_INCREMENT,
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SKU/Product code',
  `brand_id` int DEFAULT NULL COMMENT 'Brand foreign key',
  `category_id` int DEFAULT NULL COMMENT 'Category foreign key',
  `barcode` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `product_type` enum('MATERIAL','SERVICE','LABOR') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MATERIAL',
  `purchase_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `selling_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gst_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `hsn_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'GST HSN code',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PCS' COMMENT 'Unit of measurement (PCS, BOX, etc.)',
  `reorder_level` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` enum('ACTIVE','INACTIVE','DISCONTINUED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `product_code` (`product_code`),
  UNIQUE KEY `uk_product_code` (`product_code`),
  UNIQUE KEY `barcode` (`barcode`),
  KEY `idx_brand_id` (`brand_id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_product_code` (`product_code`),
  KEY `idx_status` (`status`),
  KEY `idx_reorder` (`reorder_level`,`status`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`brand_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `products_chk_1` CHECK ((`purchase_price` >= 0)),
  CONSTRAINT `products_chk_2` CHECK ((`selling_price` >= 0)),
  CONSTRAINT `products_chk_3` CHECK (((`gst_percent` >= 0) and (`gst_percent` <= 100))),
  CONSTRAINT `products_chk_4` CHECK ((`reorder_level` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product catalog with pricing and classification';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'vk STB accessories hdmi 1mts','VKSTBACCHDM1MT',1,4,NULL,NULL,'MATERIAL',80.00,110.00,0.00,NULL,'PCS',0.00,'ACTIVE','2026-07-23 10:15:15','2026-07-23 10:15:15'),(2,'vk STB accessories aaa battery','VKSTBACCAAABAT',1,9,NULL,NULL,'MATERIAL',15.00,20.00,0.00,NULL,'PCS',0.00,'ACTIVE','2026-07-23 10:16:00','2026-07-23 10:16:00'),(3,'vk STB accessories av card 1 Pin → 3 RCA','VKSTBACCAVCAR1PIN→3RCA',1,6,NULL,NULL,'MATERIAL',30.00,60.00,0.00,NULL,'PCS',0.00,'ACTIVE','2026-07-23 10:16:22','2026-07-23 10:16:22'),(4,'vk STB accessories remote Blue','VKSTBACCREMBLU',1,11,NULL,NULL,'MATERIAL',70.00,120.00,0.00,NULL,'PCS',0.00,'ACTIVE','2026-07-23 10:16:58','2026-07-23 10:16:58'),(5,'TIMESCOPE Fiber 6 core','TIMFIB6COR',2,13,NULL,NULL,'MATERIAL',8.00,15.00,0.00,NULL,'PCS',0.00,'ACTIVE','2026-07-23 10:21:24','2026-07-23 10:21:24'),(6,'TIMESCOPE RG cable copper','TIMRGCABCOP',2,15,NULL,NULL,'MATERIAL',8.00,25.00,0.00,NULL,'PCS',0.00,'ACTIVE','2026-07-23 10:21:43','2026-07-23 10:21:43'),(7,'vk STB accessories av card 3 Pin → 3 RCA','VKSTBACCAVCAR3PIN→3RCA',1,7,NULL,NULL,'MATERIAL',0.00,0.00,0.00,NULL,'PCS',0.00,'ACTIVE','2026-07-24 08:29:45','2026-07-24 08:29:45'),(8,'vk STB accessories Adaptor 12V 1amp','VKSTBACCADA12V1AM',1,18,NULL,NULL,'MATERIAL',80.00,160.00,0.00,NULL,'PCS',0.00,'ACTIVE','2026-07-25 17:00:46','2026-07-25 17:00:46'),(9,'Used vk aaa battery','USED-VKSTBACCAAABAT',1,19,NULL,'Returned used stock for vk STB accessories aaa battery','MATERIAL',15.00,20.00,0.00,NULL,'PCS',0.00,'ACTIVE','2026-07-28 06:35:13','2026-07-28 06:35:13'),(10,'Used vk Adaptor 12V 1amp','USED-VKSTBACCADA12V1AM',1,19,NULL,'Returned used stock for vk STB accessories Adaptor 12V 1amp','MATERIAL',80.00,160.00,0.00,NULL,'PCS',0.00,'ACTIVE','2026-07-28 06:35:13','2026-07-28 06:35:13'),(11,'Used vk hdmi 1mts','USED-VKSTBACCHDM1MT',1,19,NULL,'Returned used stock for vk STB accessories hdmi 1mts','MATERIAL',80.00,110.00,0.00,NULL,'PCS',0.00,'ACTIVE','2026-07-28 06:35:13','2026-07-28 06:35:13'),(12,'Used vk remote Blue','USED-VKSTBACCREMBLU',1,19,NULL,'Returned used stock for vk STB accessories remote Blue','MATERIAL',70.00,120.00,0.00,NULL,'PCS',0.00,'ACTIVE','2026-07-28 06:35:13','2026-07-28 06:35:13');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_items`
--

DROP TABLE IF EXISTS `purchase_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_items` (
  `purchase_item_id` int NOT NULL AUTO_INCREMENT,
  `purchase_id` int NOT NULL,
  `product_id` int NOT NULL,
  `qty` decimal(10,2) NOT NULL,
  `purchase_price` decimal(12,2) NOT NULL,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `tax_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `amount` decimal(12,2) NOT NULL COMMENT 'Line total',
  `received_qty` decimal(10,2) DEFAULT '0.00' COMMENT 'Actual qty received',
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_item_id`),
  KEY `idx_purchase_id` (`purchase_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `purchase_items_ibfk_1` FOREIGN KEY (`purchase_id`) REFERENCES `purchase_master` (`purchase_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `purchase_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  CONSTRAINT `purchase_items_chk_1` CHECK ((`qty` > 0)),
  CONSTRAINT `purchase_items_chk_2` CHECK ((`purchase_price` >= 0)),
  CONSTRAINT `purchase_items_chk_3` CHECK ((`discount_amount` >= 0)),
  CONSTRAINT `purchase_items_chk_4` CHECK ((`tax_percent` >= 0)),
  CONSTRAINT `purchase_items_chk_5` CHECK ((`tax_amount` >= 0)),
  CONSTRAINT `purchase_items_chk_6` CHECK ((`amount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Line items for each purchase order';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_items`
--

LOCK TABLES `purchase_items` WRITE;
/*!40000 ALTER TABLE `purchase_items` DISABLE KEYS */;
INSERT INTO `purchase_items` VALUES (24,1,6,500.00,10.00,0.00,0.00,0.00,0.00,5000.00,500.00,NULL,'2026-07-28 15:11:11'),(25,1,5,500.00,10.00,0.00,0.00,0.00,0.00,5000.00,500.00,NULL,'2026-07-28 15:11:11'),(26,1,4,100.00,45.00,0.00,0.00,0.00,0.00,4500.00,50.00,NULL,'2026-07-28 15:11:11'),(27,1,3,10.00,30.00,0.00,0.00,0.00,0.00,300.00,50.00,NULL,'2026-07-28 15:11:11'),(28,1,2,100.00,15.00,0.00,0.00,0.00,0.00,1500.00,100.00,NULL,'2026-07-28 15:11:11'),(29,1,1,10.00,80.00,0.00,0.00,0.00,0.00,800.00,50.00,NULL,'2026-07-28 15:11:11'),(30,1,7,10.00,20.00,0.00,0.00,0.00,0.00,200.00,50.00,NULL,'2026-07-28 15:11:11'),(31,1,8,10.00,80.00,0.00,0.00,0.00,0.00,800.00,50.00,NULL,'2026-07-28 15:11:11');
/*!40000 ALTER TABLE `purchase_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_master`
--

DROP TABLE IF EXISTS `purchase_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_master` (
  `purchase_id` int NOT NULL AUTO_INCREMENT,
  `purchase_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Purchase order number',
  `supplier_id` int NOT NULL,
  `invoice_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Supplier invoice number',
  `invoice_date` date DEFAULT NULL,
  `purchase_date` date NOT NULL DEFAULT (curdate()),
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `purchase_status` enum('DRAFT','RECEIVED','COMPLETED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `payment_status` enum('PENDING','PARTIAL','PAID') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `approval_status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `approved_by_employee_id` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `received_date` date DEFAULT NULL,
  `created_by_employee_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_id`),
  UNIQUE KEY `purchase_no` (`purchase_no`),
  UNIQUE KEY `uk_purchase_no` (`purchase_no`),
  KEY `created_by_employee_id` (`created_by_employee_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_purchase_date` (`purchase_date`),
  KEY `idx_purchase_status` (`purchase_status`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_supplier_status` (`supplier_id`,`purchase_status`),
  CONSTRAINT `purchase_master_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON UPDATE CASCADE,
  CONSTRAINT `purchase_master_ibfk_2` FOREIGN KEY (`created_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL,
  CONSTRAINT `purchase_master_chk_1` CHECK ((`total_amount` >= 0)),
  CONSTRAINT `purchase_master_chk_2` CHECK ((`discount_amount` >= 0)),
  CONSTRAINT `purchase_master_chk_3` CHECK ((`tax_amount` >= 0)),
  CONSTRAINT `purchase_master_chk_4` CHECK ((`net_amount` >= 0)),
  CONSTRAINT `purchase_master_chk_5` CHECK ((`paid_amount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Purchase order header from suppliers';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_master`
--

LOCK TABLES `purchase_master` WRITE;
/*!40000 ALTER TABLE `purchase_master` DISABLE KEYS */;
INSERT INTO `purchase_master` VALUES (1,'PO-202607-0001',1,'100002','2026-07-23','2026-07-23',18100.00,0.00,0.00,0.00,18100.00,17100.00,1000.00,'RECEIVED','PARTIAL','APPROVED',NULL,'2026-07-24 07:19:04','test','2026-07-23',NULL,'2026-07-23 10:26:51','2026-07-28 15:11:11');
/*!40000 ALTER TABLE `purchase_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotation_items`
--

DROP TABLE IF EXISTS `quotation_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotation_items` (
  `quotation_item_id` int NOT NULL AUTO_INCREMENT,
  `quotation_id` int NOT NULL,
  `product_id` int DEFAULT NULL COMMENT 'NULL for custom items',
  `item_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `qty` decimal(10,2) NOT NULL,
  `selling_price` decimal(12,2) NOT NULL,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `tax_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `amount` decimal(12,2) NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `line_no` smallint DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`quotation_item_id`),
  KEY `idx_quotation_id` (`quotation_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `quotation_items_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `quotation_master` (`quotation_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `quotation_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `quotation_items_chk_1` CHECK ((`qty` > 0)),
  CONSTRAINT `quotation_items_chk_2` CHECK ((`selling_price` >= 0)),
  CONSTRAINT `quotation_items_chk_3` CHECK ((`discount_amount` >= 0)),
  CONSTRAINT `quotation_items_chk_4` CHECK ((`tax_percent` >= 0)),
  CONSTRAINT `quotation_items_chk_5` CHECK ((`tax_amount` >= 0)),
  CONSTRAINT `quotation_items_chk_6` CHECK ((`amount` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Line items in each quotation';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotation_items`
--

LOCK TABLES `quotation_items` WRITE;
/*!40000 ALTER TABLE `quotation_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `quotation_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotation_master`
--

DROP TABLE IF EXISTS `quotation_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotation_master` (
  `quotation_id` int NOT NULL AUTO_INCREMENT,
  `quotation_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quotation_version` int NOT NULL DEFAULT '1',
  `quotation_date` date NOT NULL DEFAULT (curdate()),
  `valid_until` date DEFAULT NULL COMMENT 'Quote expiry date',
  `customer_id` int NOT NULL,
  `prepared_by_employee_id` int DEFAULT NULL,
  `approved_by_employee_id` int DEFAULT NULL,
  `requirement_details` text COLLATE utf8mb4_unicode_ci COMMENT 'Customer requirements/site details',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `cgst_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `sgst_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `quotation_status` enum('DRAFT','SENT','APPROVED','ACCEPTED','CANCELLED','REJECTED','EXPIRED','CONVERTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `sent_date` date DEFAULT NULL,
  `approved_date` date DEFAULT NULL,
  `rejected_reason` text COLLATE utf8mb4_unicode_ci,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`quotation_id`),
  UNIQUE KEY `quotation_no` (`quotation_no`),
  UNIQUE KEY `uk_quotation_no` (`quotation_no`),
  KEY `prepared_by_employee_id` (`prepared_by_employee_id`),
  KEY `approved_by_employee_id` (`approved_by_employee_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_quotation_date` (`quotation_date`),
  KEY `idx_status` (`quotation_status`),
  KEY `idx_valid_until` (`valid_until`),
  KEY `idx_customer_status` (`customer_id`,`quotation_status`),
  CONSTRAINT `quotation_master_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON UPDATE CASCADE,
  CONSTRAINT `quotation_master_ibfk_2` FOREIGN KEY (`prepared_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL,
  CONSTRAINT `quotation_master_ibfk_3` FOREIGN KEY (`approved_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL,
  CONSTRAINT `quotation_master_chk_1` CHECK ((`total_amount` >= 0)),
  CONSTRAINT `quotation_master_chk_2` CHECK ((`discount_amount` >= 0)),
  CONSTRAINT `quotation_master_chk_3` CHECK ((`tax_amount` >= 0)),
  CONSTRAINT `quotation_master_chk_4` CHECK ((`net_amount` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer quotations/proposals';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotation_master`
--

LOCK TABLES `quotation_master` WRITE;
/*!40000 ALTER TABLE `quotation_master` DISABLE KEYS */;
/*!40000 ALTER TABLE `quotation_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role` enum('MANAGER','EMPLOYEE','SALES','SERVICE') NOT NULL,
  `permission_key` varchar(80) NOT NULL,
  `can_view` tinyint(1) NOT NULL DEFAULT '0',
  `can_create` tinyint(1) NOT NULL DEFAULT '0',
  `can_update` tinyint(1) NOT NULL DEFAULT '0',
  `can_delete` tinyint(1) NOT NULL DEFAULT '0',
  `updated_by` int DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`role`,`permission_key`),
  KEY `fk_role_permissions_updated_by` (`updated_by`),
  CONSTRAINT `fk_role_permissions_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES ('MANAGER','AUDIT_LOGS',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','BRANDS',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','CABLE_TV_ACCOUNTS',1,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','CABLE_TV_CONNECTIONS',1,1,0,0,1,'2026-07-17 11:40:00'),('MANAGER','CABLE_TV_CUSTOMER_PACKAGES',1,1,0,0,1,'2026-07-17 11:40:00'),('MANAGER','CABLE_TV_CUSTOMER_STBS',1,1,0,0,1,'2026-07-17 11:40:00'),('MANAGER','CABLE_TV_CUSTOMERS',1,1,0,0,1,'2026-07-17 11:40:00'),('MANAGER','CABLE_TV_MASTERS',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','CABLE_TV_PACKAGES',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','CABLE_TV_STBS',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','CABLE_TV_SUBSCRIPTION_DUES',1,1,0,0,1,'2026-07-17 11:40:00'),('MANAGER','CABLE_TV_SUBSCRIPTION_REPORT',1,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','CABLE_TV_SUBSCRIPTIONS',1,1,0,0,1,'2026-07-17 11:40:00'),('MANAGER','CATEGORIES',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','CUSTOMER_PAYMENTS',1,1,0,0,1,'2026-07-17 11:40:00'),('MANAGER','CUSTOMERS',1,1,0,0,1,'2026-07-17 11:40:00'),('MANAGER','DASHBOARD',1,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','EMPLOYEE_ATTENDANCE',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','EMPLOYEE_SALARY',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','EMPLOYEES',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','NOTIFICATIONS',1,0,1,0,1,'2026-07-17 11:40:00'),('MANAGER','PRODUCTS',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','PURCHASES',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','QUOTATIONS',1,1,1,0,1,'2026-07-17 11:40:00'),('MANAGER','ROLE_PERMISSIONS',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','SALES',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','SERVICE_TICKETS',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','STOCK',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','SUPPLIER_PAYMENTS',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','SUPPLIERS',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','USERS',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','WARRANTIES',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','WORK_ORDERS',0,0,0,0,1,'2026-07-17 11:40:00'),('MANAGER','WORKFLOW_APPROVAL',0,0,0,0,1,'2026-07-17 11:40:00');
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_items`
--

DROP TABLE IF EXISTS `sales_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_items` (
  `sales_item_id` int NOT NULL AUTO_INCREMENT,
  `sales_id` int NOT NULL,
  `product_id` int DEFAULT NULL COMMENT 'NULL for custom items',
  `item_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `qty` decimal(10,2) NOT NULL,
  `selling_price` decimal(12,2) NOT NULL,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `tax_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `amount` decimal(12,2) NOT NULL,
  `line_no` smallint DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`sales_item_id`),
  KEY `idx_sales_id` (`sales_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `sales_items_ibfk_1` FOREIGN KEY (`sales_id`) REFERENCES `sales_master` (`sales_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `sales_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `sales_items_chk_1` CHECK ((`qty` > 0)),
  CONSTRAINT `sales_items_chk_2` CHECK ((`selling_price` >= 0)),
  CONSTRAINT `sales_items_chk_3` CHECK ((`discount_amount` >= 0)),
  CONSTRAINT `sales_items_chk_4` CHECK ((`tax_percent` >= 0)),
  CONSTRAINT `sales_items_chk_5` CHECK ((`tax_amount` >= 0)),
  CONSTRAINT `sales_items_chk_6` CHECK ((`amount` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Line items in each sales invoice';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_items`
--

LOCK TABLES `sales_items` WRITE;
/*!40000 ALTER TABLE `sales_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_master`
--

DROP TABLE IF EXISTS `sales_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_master` (
  `sales_id` int NOT NULL AUTO_INCREMENT,
  `invoice_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_date` date NOT NULL DEFAULT (curdate()),
  `customer_id` int NOT NULL,
  `quotation_id` int DEFAULT NULL COMMENT 'Source quotation (if any)',
  `work_order_id` int DEFAULT NULL COMMENT 'Associated work order (if any)',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_mode` enum('CASH','CARD','UPI','BANK','CHEQUE','CREDIT') COLLATE utf8mb4_unicode_ci DEFAULT 'CREDIT',
  `payment_status` enum('PENDING','PARTIAL','PAID','OVERDUE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `sales_status` enum('DRAFT','COMPLETED','CANCELLED','RETURNED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `due_date` date DEFAULT NULL COMMENT 'Payment due date',
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_by_employee_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`sales_id`),
  UNIQUE KEY `invoice_no` (`invoice_no`),
  UNIQUE KEY `uk_invoice_no` (`invoice_no`),
  KEY `quotation_id` (`quotation_id`),
  KEY `work_order_id` (`work_order_id`),
  KEY `created_by_employee_id` (`created_by_employee_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_invoice_date` (`invoice_date`),
  KEY `idx_sales_status` (`sales_status`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_customer_status` (`customer_id`,`sales_status`),
  KEY `idx_invoice_date_status` (`invoice_date`,`payment_status`),
  CONSTRAINT `sales_master_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON UPDATE CASCADE,
  CONSTRAINT `sales_master_ibfk_2` FOREIGN KEY (`quotation_id`) REFERENCES `quotation_master` (`quotation_id`) ON DELETE SET NULL,
  CONSTRAINT `sales_master_ibfk_3` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`work_order_id`) ON DELETE SET NULL,
  CONSTRAINT `sales_master_ibfk_4` FOREIGN KEY (`created_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL,
  CONSTRAINT `sales_master_chk_1` CHECK ((`total_amount` >= 0)),
  CONSTRAINT `sales_master_chk_2` CHECK ((`discount_amount` >= 0)),
  CONSTRAINT `sales_master_chk_3` CHECK ((`tax_amount` >= 0)),
  CONSTRAINT `sales_master_chk_4` CHECK ((`net_amount` >= 0)),
  CONSTRAINT `sales_master_chk_5` CHECK ((`paid_amount` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sales invoices';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_master`
--

LOCK TABLES `sales_master` WRITE;
/*!40000 ALTER TABLE `sales_master` DISABLE KEYS */;
/*!40000 ALTER TABLE `sales_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `service_tickets`
--

DROP TABLE IF EXISTS `service_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_tickets` (
  `service_ticket_id` int NOT NULL AUTO_INCREMENT,
  `ticket_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` int NOT NULL,
  `product_id` int DEFAULT NULL COMMENT 'Product under service',
  `sales_id` int DEFAULT NULL COMMENT 'Related sales invoice',
  `assigned_to_employee_id` int DEFAULT NULL,
  `complaint_details` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_status` enum('OPEN','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `priority` enum('LOW','MEDIUM','HIGH','URGENT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEDIUM',
  `opened_date` date NOT NULL DEFAULT (curdate()),
  `closed_date` date DEFAULT NULL,
  `resolution_notes` text COLLATE utf8mb4_unicode_ci,
  `resolution_time_hours` int DEFAULT NULL COMMENT 'Time to resolve',
  `created_by_employee_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`service_ticket_id`),
  UNIQUE KEY `ticket_no` (`ticket_no`),
  UNIQUE KEY `uk_ticket_no` (`ticket_no`),
  KEY `product_id` (`product_id`),
  KEY `sales_id` (`sales_id`),
  KEY `created_by_employee_id` (`created_by_employee_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_service_status` (`service_status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_opened_date` (`opened_date`),
  KEY `idx_assigned_to` (`assigned_to_employee_id`),
  KEY `idx_status_priority` (`service_status`,`priority`),
  CONSTRAINT `service_tickets_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON UPDATE CASCADE,
  CONSTRAINT `service_tickets_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE SET NULL,
  CONSTRAINT `service_tickets_ibfk_3` FOREIGN KEY (`sales_id`) REFERENCES `sales_master` (`sales_id`) ON DELETE SET NULL,
  CONSTRAINT `service_tickets_ibfk_4` FOREIGN KEY (`assigned_to_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL,
  CONSTRAINT `service_tickets_ibfk_5` FOREIGN KEY (`created_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer service tickets';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `service_tickets`
--

LOCK TABLES `service_tickets` WRITE;
/*!40000 ALTER TABLE `service_tickets` DISABLE KEYS */;
/*!40000 ALTER TABLE `service_tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_ledger`
--

DROP TABLE IF EXISTS `stock_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_ledger` (
  `stock_ledger_id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `transaction_type` enum('PURCHASE','SALE','RETURN','ADJUSTMENT','INSTALLATION','SCRAP') COLLATE utf8mb4_unicode_ci NOT NULL,
  `transaction_id` int DEFAULT NULL,
  `reference_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qty_in` decimal(10,2) NOT NULL DEFAULT '0.00',
  `qty_out` decimal(10,2) NOT NULL DEFAULT '0.00',
  `balance_qty` decimal(10,2) NOT NULL,
  `unit_cost` decimal(12,2) DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `recorded_by_employee_id` int DEFAULT NULL,
  `transaction_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`stock_ledger_id`),
  KEY `recorded_by_employee_id` (`recorded_by_employee_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_transaction_date` (`transaction_date`),
  KEY `idx_product_date` (`product_id`,`transaction_date`),
  KEY `idx_reference` (`reference_no`),
  CONSTRAINT `stock_ledger_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE,
  CONSTRAINT `stock_ledger_ibfk_2` FOREIGN KEY (`recorded_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_ledger`
--

LOCK TABLES `stock_ledger` WRITE;
/*!40000 ALTER TABLE `stock_ledger` DISABLE KEYS */;
INSERT INTO `stock_ledger` VALUES (1,6,'PURCHASE',1,'PO-202607-0001',500.00,0.00,500.00,10.00,'Purchase receipt reconciliation',NULL,'2026-07-23 10:26:51','2026-07-23 10:26:51'),(2,5,'PURCHASE',1,'PO-202607-0001',500.00,0.00,500.00,10.00,'Purchase receipt reconciliation',NULL,'2026-07-23 10:26:51','2026-07-23 10:26:51'),(3,4,'PURCHASE',1,'PO-202607-0001',50.00,0.00,50.00,45.00,'Purchase receipt reconciliation',NULL,'2026-07-23 10:29:10','2026-07-23 10:29:10'),(4,3,'PURCHASE',1,'PO-202607-0001',10.00,0.00,10.00,30.00,'Purchase receipt reconciliation',NULL,'2026-07-23 10:29:10','2026-07-23 10:29:10'),(5,2,'PURCHASE',1,'PO-202607-0001',100.00,0.00,100.00,15.00,'Purchase receipt reconciliation',NULL,'2026-07-23 10:29:10','2026-07-23 10:29:10'),(6,1,'PURCHASE',1,'PO-202607-0001',10.00,0.00,10.00,80.00,'Purchase receipt reconciliation',NULL,'2026-07-23 10:29:10','2026-07-23 10:29:10'),(7,2,'INSTALLATION',1,'CTV-STB-1',0.00,1.00,99.00,15.00,'CATV STB accessory issued to customer 1',1,'2026-07-23 11:54:41','2026-07-23 11:54:41'),(8,1,'INSTALLATION',2,'CTV-STB-1',0.00,1.00,9.00,80.00,'CATV STB accessory issued to customer 1',1,'2026-07-23 11:54:41','2026-07-23 11:54:41'),(9,4,'INSTALLATION',3,'CTV-STB-1',0.00,1.00,49.00,70.00,'CATV STB accessory issued to customer 1',1,'2026-07-23 11:54:41','2026-07-23 11:54:41'),(10,2,'INSTALLATION',1,'CTV-STB-1',0.00,1.00,98.00,15.00,'CATV STB accessory issued after account receipt',1,'2026-07-23 12:06:57','2026-07-23 12:06:57'),(11,1,'INSTALLATION',2,'CTV-STB-1',0.00,1.00,8.00,80.00,'CATV STB accessory issued after account receipt',1,'2026-07-23 12:06:57','2026-07-23 12:06:57'),(12,4,'INSTALLATION',3,'CTV-STB-1',0.00,1.00,48.00,70.00,'CATV STB accessory issued after account receipt',1,'2026-07-23 12:06:57','2026-07-23 12:06:57'),(13,2,'INSTALLATION',4,'CTV-STB-2',0.00,1.00,97.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-07-24 07:29:35','2026-07-24 07:29:35'),(14,1,'INSTALLATION',5,'CTV-STB-2',0.00,1.00,7.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-24 07:29:35','2026-07-24 07:29:35'),(15,4,'INSTALLATION',6,'CTV-STB-2',0.00,1.00,47.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-07-24 07:29:35','2026-07-24 07:29:35'),(16,7,'PURCHASE',1,'PO-202607-0001',10.00,0.00,10.00,20.00,'Purchase receipt reconciliation',NULL,'2026-07-24 08:30:19','2026-07-24 08:30:19'),(17,2,'INSTALLATION',7,'CTV-STB-3',0.00,1.00,96.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-07-24 08:44:20','2026-07-24 08:44:20'),(18,1,'INSTALLATION',8,'CTV-STB-3',0.00,1.00,6.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-24 08:44:20','2026-07-24 08:44:20'),(19,4,'INSTALLATION',9,'CTV-STB-3',0.00,1.00,46.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-07-24 08:44:20','2026-07-24 08:44:20'),(20,2,'INSTALLATION',10,'CTV-STB-4',0.00,1.00,95.00,15.00,'CATV STB accessory issued to customer 4',2,'2026-07-24 11:49:06','2026-07-24 11:49:06'),(21,3,'INSTALLATION',11,'CTV-STB-4',0.00,1.00,9.00,30.00,'CATV STB accessory issued to customer 4',2,'2026-07-24 11:49:06','2026-07-24 11:49:06'),(22,4,'INSTALLATION',12,'CTV-STB-4',0.00,1.00,45.00,70.00,'CATV STB accessory issued to customer 4',2,'2026-07-24 11:49:06','2026-07-24 11:49:06'),(23,8,'PURCHASE',1,'PO-202607-0001',10.00,0.00,10.00,80.00,'Purchase receipt reconciliation',NULL,'2026-07-25 17:01:15','2026-07-25 17:01:15'),(24,2,'INSTALLATION',13,'CTV-STB-11',0.00,1.00,94.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-07-25 17:42:54','2026-07-25 17:42:54'),(25,8,'INSTALLATION',14,'CTV-STB-11',0.00,1.00,9.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-25 17:42:54','2026-07-25 17:42:54'),(26,1,'INSTALLATION',15,'CTV-STB-11',0.00,1.00,5.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-25 17:42:54','2026-07-25 17:42:54'),(27,4,'INSTALLATION',16,'CTV-STB-11',0.00,1.00,44.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-07-25 17:42:54','2026-07-25 17:42:54'),(28,2,'INSTALLATION',17,'CTV-STB-12',0.00,1.00,93.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-07-25 18:05:25','2026-07-25 18:05:25'),(29,8,'INSTALLATION',18,'CTV-STB-12',0.00,1.00,8.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-25 18:05:25','2026-07-25 18:05:25'),(30,1,'INSTALLATION',19,'CTV-STB-12',0.00,1.00,4.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-25 18:05:25','2026-07-25 18:05:25'),(31,4,'INSTALLATION',20,'CTV-STB-12',0.00,1.00,43.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-07-25 18:05:25','2026-07-25 18:05:25'),(32,2,'INSTALLATION',21,'CTV-STB-13',0.00,1.00,92.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-07-25 18:19:20','2026-07-25 18:19:20'),(33,8,'INSTALLATION',22,'CTV-STB-13',0.00,1.00,7.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-25 18:19:20','2026-07-25 18:19:20'),(34,1,'INSTALLATION',23,'CTV-STB-13',0.00,1.00,3.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-25 18:19:20','2026-07-25 18:19:20'),(35,4,'INSTALLATION',24,'CTV-STB-13',0.00,1.00,42.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-07-25 18:19:20','2026-07-25 18:19:20'),(36,2,'INSTALLATION',25,'CTV-STB-14',0.00,1.00,91.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-07-26 05:48:51','2026-07-26 05:48:51'),(37,8,'INSTALLATION',26,'CTV-STB-14',0.00,1.00,6.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-26 05:48:51','2026-07-26 05:48:51'),(38,7,'INSTALLATION',27,'CTV-STB-14',0.00,1.00,9.00,0.00,'CATV STB accessory issued after account receipt',3,'2026-07-26 05:48:51','2026-07-26 05:48:51'),(39,4,'INSTALLATION',28,'CTV-STB-14',0.00,1.00,41.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-07-26 05:48:51','2026-07-26 05:48:51'),(40,9,'RETURN',29,'CTV-STB-20',1.00,0.00,1.00,15.00,'CATV accessory returned by customer 5 to used stock',3,'2026-07-28 06:35:13','2026-07-28 06:35:13'),(41,10,'RETURN',30,'CTV-STB-20',1.00,0.00,1.00,80.00,'CATV accessory returned by customer 5 to used stock',3,'2026-07-28 06:35:13','2026-07-28 06:35:13'),(42,11,'RETURN',31,'CTV-STB-20',1.00,0.00,1.00,80.00,'CATV accessory returned by customer 5 to used stock',3,'2026-07-28 06:35:13','2026-07-28 06:35:13'),(43,12,'RETURN',32,'CTV-STB-20',1.00,0.00,1.00,70.00,'CATV accessory returned by customer 5 to used stock',3,'2026-07-28 06:35:13','2026-07-28 06:35:13'),(44,2,'INSTALLATION',33,'CTV-STB-21',0.00,1.00,90.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-07-28 06:49:31','2026-07-28 06:49:31'),(45,8,'INSTALLATION',34,'CTV-STB-21',0.00,1.00,5.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-28 06:49:31','2026-07-28 06:49:31'),(46,1,'INSTALLATION',35,'CTV-STB-21',0.00,1.00,2.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-28 06:49:31','2026-07-28 06:49:31'),(47,4,'INSTALLATION',36,'CTV-STB-21',0.00,1.00,40.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-07-28 06:49:31','2026-07-28 06:49:31'),(48,2,'INSTALLATION',37,'CTV-STB-23',0.00,1.00,89.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-07-28 09:14:03','2026-07-28 09:14:03'),(49,8,'INSTALLATION',38,'CTV-STB-23',0.00,1.00,4.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-28 09:14:03','2026-07-28 09:14:03'),(50,1,'INSTALLATION',39,'CTV-STB-23',0.00,1.00,1.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-28 09:14:03','2026-07-28 09:14:03'),(51,4,'INSTALLATION',40,'CTV-STB-23',0.00,1.00,39.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-07-28 09:14:03','2026-07-28 09:14:03'),(52,2,'INSTALLATION',41,'CTV-STB-24',0.00,1.00,88.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-07-28 10:09:34','2026-07-28 10:09:34'),(53,8,'INSTALLATION',42,'CTV-STB-24',0.00,1.00,3.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-28 10:09:34','2026-07-28 10:09:34'),(54,1,'INSTALLATION',43,'CTV-STB-24',0.00,1.00,0.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-28 10:09:34','2026-07-28 10:09:34'),(55,4,'INSTALLATION',44,'CTV-STB-24',0.00,1.00,38.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-07-28 10:09:34','2026-07-28 10:09:34'),(56,9,'RETURN',45,'CTV-STB-25',1.00,0.00,2.00,15.00,'CATV returned accessory approved into used stock',3,'2026-07-28 10:20:35','2026-07-28 10:20:35'),(57,11,'RETURN',46,'CTV-STB-25',1.00,0.00,2.00,80.00,'CATV returned accessory approved into used stock',3,'2026-07-28 10:20:35','2026-07-28 10:20:35'),(58,12,'RETURN',47,'CTV-STB-25',1.00,0.00,2.00,70.00,'CATV returned accessory approved into used stock',3,'2026-07-28 10:20:35','2026-07-28 10:20:35'),(59,9,'RETURN',48,'CTV-STB-26',1.00,0.00,3.00,15.00,'CATV returned accessory approved into used stock',3,'2026-07-28 10:34:10','2026-07-28 10:34:10'),(60,11,'RETURN',49,'CTV-STB-26',1.00,0.00,3.00,80.00,'CATV returned accessory approved into used stock',3,'2026-07-28 10:34:10','2026-07-28 10:34:10'),(61,12,'RETURN',50,'CTV-STB-26',1.00,0.00,3.00,70.00,'CATV returned accessory approved into used stock',3,'2026-07-28 10:34:10','2026-07-28 10:34:10'),(66,3,'PURCHASE',1,'PO-202607-0001',40.00,0.00,49.00,30.00,'Purchase receipt reconciliation',NULL,'2026-07-28 15:11:11','2026-07-28 15:11:11'),(67,1,'PURCHASE',1,'PO-202607-0001',40.00,0.00,40.00,80.00,'Purchase receipt reconciliation',NULL,'2026-07-28 15:11:11','2026-07-28 15:11:11'),(68,7,'PURCHASE',1,'PO-202607-0001',40.00,0.00,49.00,20.00,'Purchase receipt reconciliation',NULL,'2026-07-28 15:11:11','2026-07-28 15:11:11'),(69,8,'PURCHASE',1,'PO-202607-0001',40.00,0.00,43.00,80.00,'Purchase receipt reconciliation',NULL,'2026-07-28 15:11:11','2026-07-28 15:11:11'),(70,2,'INSTALLATION',51,'CTV-STB-27',0.00,1.00,87.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-07-28 15:11:27','2026-07-28 15:11:27'),(71,8,'INSTALLATION',52,'CTV-STB-27',0.00,1.00,42.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-28 15:11:27','2026-07-28 15:11:27'),(72,1,'INSTALLATION',53,'CTV-STB-27',0.00,1.00,39.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-28 15:11:27','2026-07-28 15:11:27'),(73,4,'INSTALLATION',54,'CTV-STB-27',0.00,1.00,37.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-07-28 15:11:27','2026-07-28 15:11:27'),(74,2,'ADJUSTMENT',NULL,NULL,0.00,1.00,86.00,NULL,'Issued to technician 3',1,'2026-07-29 08:20:29','2026-07-29 08:20:29'),(75,4,'ADJUSTMENT',NULL,NULL,0.00,5.00,32.00,NULL,'Issued to technician 3',1,'2026-07-29 09:16:03','2026-07-29 09:16:03'),(76,2,'ADJUSTMENT',8,'MAT-000008',0.00,1.00,85.00,NULL,'Issued to technician 3 - test',1,'2026-07-29 10:06:52','2026-07-29 10:06:52'),(77,4,'ADJUSTMENT',9,'MAT-000009',0.00,1.00,31.00,NULL,'Issued to technician 2 - test',1,'2026-07-29 10:06:52','2026-07-29 10:06:52'),(78,2,'INSTALLATION',59,'CTV-STB-29',0.00,1.00,84.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-07-30 07:27:12','2026-07-30 07:27:12'),(79,8,'INSTALLATION',60,'CTV-STB-29',0.00,1.00,41.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-30 07:27:12','2026-07-30 07:27:12'),(80,1,'INSTALLATION',61,'CTV-STB-29',0.00,1.00,38.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-30 07:27:12','2026-07-30 07:27:12'),(81,4,'INSTALLATION',62,'CTV-STB-29',0.00,1.00,30.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-07-30 07:27:12','2026-07-30 07:27:12'),(82,2,'INSTALLATION',55,'CTV-STB-28',0.00,1.00,83.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-07-30 07:27:30','2026-07-30 07:27:30'),(83,8,'INSTALLATION',56,'CTV-STB-28',0.00,1.00,40.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-30 07:27:30','2026-07-30 07:27:30'),(84,1,'INSTALLATION',57,'CTV-STB-28',0.00,1.00,37.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-30 07:27:30','2026-07-30 07:27:30'),(85,4,'INSTALLATION',58,'CTV-STB-28',0.00,1.00,29.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-07-30 07:27:30','2026-07-30 07:27:30'),(86,2,'INSTALLATION',63,'CTV-STB-34',0.00,1.00,82.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-07-30 09:33:40','2026-07-30 09:33:40'),(87,8,'INSTALLATION',64,'CTV-STB-34',0.00,1.00,39.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-30 09:33:40','2026-07-30 09:33:40'),(88,1,'INSTALLATION',65,'CTV-STB-34',0.00,1.00,36.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-30 09:33:40','2026-07-30 09:33:40'),(89,4,'INSTALLATION',66,'CTV-STB-34',0.00,1.00,28.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-07-30 09:33:40','2026-07-30 09:33:40'),(90,2,'INSTALLATION',67,'CTV-STB-41',0.00,1.00,81.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-07-31 07:12:55','2026-07-31 07:12:55'),(91,8,'INSTALLATION',68,'CTV-STB-41',0.00,1.00,38.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-31 07:12:55','2026-07-31 07:12:55'),(92,1,'INSTALLATION',69,'CTV-STB-41',0.00,1.00,35.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-31 07:12:55','2026-07-31 07:12:55'),(93,4,'INSTALLATION',70,'CTV-STB-41',0.00,1.00,27.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-07-31 07:12:55','2026-07-31 07:12:55'),(94,2,'INSTALLATION',71,'CTV-STB-44',0.00,1.00,80.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-07-31 09:46:09','2026-07-31 09:46:09'),(95,8,'INSTALLATION',72,'CTV-STB-44',0.00,1.00,37.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-31 09:46:09','2026-07-31 09:46:09'),(96,1,'INSTALLATION',73,'CTV-STB-44',0.00,1.00,34.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-07-31 09:46:09','2026-07-31 09:46:09'),(97,4,'INSTALLATION',74,'CTV-STB-44',0.00,1.00,26.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-07-31 09:46:09','2026-07-31 09:46:09'),(98,9,'RETURN',75,'CTV-STB-46',1.00,0.00,4.00,15.00,'CATV returned accessory approved into used stock',3,'2026-07-31 10:09:08','2026-07-31 10:09:08'),(99,10,'RETURN',76,'CTV-STB-46',1.00,0.00,2.00,80.00,'CATV returned accessory approved into used stock',3,'2026-07-31 10:09:08','2026-07-31 10:09:08'),(100,11,'RETURN',77,'CTV-STB-46',1.00,0.00,4.00,80.00,'CATV returned accessory approved into used stock',3,'2026-07-31 10:09:08','2026-07-31 10:09:08'),(101,12,'RETURN',78,'CTV-STB-46',1.00,0.00,4.00,70.00,'CATV returned accessory approved into used stock',3,'2026-07-31 10:09:08','2026-07-31 10:09:08'),(102,2,'INSTALLATION',79,'CTV-STB-47',0.00,1.00,79.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-08-03 07:09:36','2026-08-03 07:09:36'),(103,8,'INSTALLATION',80,'CTV-STB-47',0.00,1.00,36.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-08-03 07:09:36','2026-08-03 07:09:36'),(104,1,'INSTALLATION',81,'CTV-STB-47',0.00,1.00,33.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-08-03 07:09:36','2026-08-03 07:09:36'),(105,4,'INSTALLATION',82,'CTV-STB-47',0.00,1.00,25.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-08-03 07:09:36','2026-08-03 07:09:36'),(106,2,'INSTALLATION',83,'CTV-STB-48',0.00,1.00,78.00,15.00,'CATV STB accessory issued after account receipt',3,'2026-08-03 07:18:32','2026-08-03 07:18:32'),(107,8,'INSTALLATION',84,'CTV-STB-48',0.00,1.00,35.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-08-03 07:18:32','2026-08-03 07:18:32'),(108,1,'INSTALLATION',85,'CTV-STB-48',0.00,1.00,32.00,80.00,'CATV STB accessory issued after account receipt',3,'2026-08-03 07:18:32','2026-08-03 07:18:32'),(109,4,'INSTALLATION',86,'CTV-STB-48',0.00,1.00,24.00,70.00,'CATV STB accessory issued after account receipt',3,'2026-08-03 07:18:32','2026-08-03 07:18:32');
/*!40000 ALTER TABLE `stock_ledger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_master`
--

DROP TABLE IF EXISTS `stock_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_master` (
  `stock_id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `available_qty` decimal(10,2) NOT NULL DEFAULT '0.00',
  `reserved_qty` decimal(10,2) NOT NULL DEFAULT '0.00',
  `minimum_stock` decimal(10,2) NOT NULL DEFAULT '0.00',
  `maximum_stock` decimal(10,2) NOT NULL DEFAULT '0.00',
  `reorder_qty` decimal(10,2) NOT NULL DEFAULT '0.00',
  `last_purchase_price` decimal(12,2) DEFAULT NULL,
  `last_sale_price` decimal(12,2) DEFAULT NULL,
  `last_stock_check_date` date DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `last_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stock_id`),
  UNIQUE KEY `product_id` (`product_id`),
  KEY `idx_available_qty` (`available_qty`),
  KEY `idx_below_minimum` (`available_qty`,`minimum_stock`),
  KEY `idx_last_updated` (`last_updated`),
  CONSTRAINT `stock_master_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_master`
--

LOCK TABLES `stock_master` WRITE;
/*!40000 ALTER TABLE `stock_master` DISABLE KEYS */;
INSERT INTO `stock_master` VALUES (1,6,500.00,0.00,0.00,0.00,0.00,10.00,NULL,'2026-07-23',NULL,'2026-07-23 10:26:51'),(2,5,500.00,0.00,0.00,0.00,0.00,10.00,NULL,'2026-07-23',NULL,'2026-07-23 10:26:51'),(3,4,24.00,0.00,0.00,0.00,0.00,45.00,NULL,'2026-08-03',NULL,'2026-08-03 07:18:32'),(4,3,49.00,0.00,0.00,0.00,0.00,30.00,NULL,'2026-07-28',NULL,'2026-07-28 15:11:11'),(5,2,78.00,0.00,0.00,0.00,0.00,15.00,NULL,'2026-08-03',NULL,'2026-08-03 07:18:32'),(6,1,32.00,0.00,0.00,0.00,0.00,80.00,NULL,'2026-08-03',NULL,'2026-08-03 07:18:32'),(16,7,49.00,0.00,0.00,0.00,0.00,20.00,NULL,'2026-07-28',NULL,'2026-07-28 15:11:11'),(23,8,35.00,0.00,0.00,0.00,0.00,80.00,NULL,'2026-08-03',NULL,'2026-08-03 07:18:32'),(40,9,4.00,0.00,0.00,0.00,0.00,NULL,NULL,'2026-07-31',NULL,'2026-07-31 10:09:08'),(41,10,2.00,0.00,0.00,0.00,0.00,NULL,NULL,'2026-07-31',NULL,'2026-07-31 10:09:08'),(42,11,4.00,0.00,0.00,0.00,0.00,NULL,NULL,'2026-07-31',NULL,'2026-07-31 10:09:08'),(43,12,4.00,0.00,0.00,0.00,0.00,NULL,NULL,'2026-07-31',NULL,'2026-07-31 10:09:08');
/*!40000 ALTER TABLE `stock_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_payments`
--

DROP TABLE IF EXISTS `supplier_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_payments` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `supplier_id` int NOT NULL,
  `purchase_id` int DEFAULT NULL COMMENT 'Against which PO',
  `amount` decimal(12,2) NOT NULL,
  `payment_date` date NOT NULL DEFAULT (curdate()),
  `payment_mode` enum('CASH','CARD','UPI','BANK','CHEQUE','ONLINE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Cheque/Transaction number',
  `narration` text COLLATE utf8mb4_unicode_ci,
  `paid_by_employee_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  KEY `paid_by_employee_id` (`paid_by_employee_id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_purchase_id` (`purchase_id`),
  KEY `idx_payment_date` (`payment_date`),
  KEY `idx_reference_no` (`reference_no`),
  CONSTRAINT `supplier_payments_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON UPDATE CASCADE,
  CONSTRAINT `supplier_payments_ibfk_2` FOREIGN KEY (`purchase_id`) REFERENCES `purchase_master` (`purchase_id`) ON DELETE SET NULL,
  CONSTRAINT `supplier_payments_ibfk_3` FOREIGN KEY (`paid_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL,
  CONSTRAINT `supplier_payments_chk_1` CHECK ((`amount` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Supplier payment records';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_payments`
--

LOCK TABLES `supplier_payments` WRITE;
/*!40000 ALTER TABLE `supplier_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `supplier_id` int NOT NULL AUTO_INCREMENT,
  `supplier_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_person` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alternate_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gst_no` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'GST registration number',
  `pan_no` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `state` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pincode` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `opening_balance` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'Supplier credit balance',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `payment_terms` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'e.g., Net 30, 2/10 Net 30',
  `bank_account_no` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ifsc_code` varchar(11) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`supplier_id`),
  UNIQUE KEY `supplier_name` (`supplier_name`),
  KEY `idx_supplier_name` (`supplier_name`),
  KEY `idx_gst_no` (`gst_no`),
  KEY `idx_city` (`city`),
  KEY `idx_active` (`is_active`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Supplier master data with payment terms';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES (1,'Asian Electronics','Mohit','9000090000',NULL,'test@gmail.com',NULL,NULL,'23, BALAJI COMPLEX Narashingapuram street, chennai','Chennai','Tamil Nadu','600002',0.00,1,NULL,NULL,NULL,NULL,'2026-07-23 10:23:11','2026-07-23 10:23:11');
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `technician_material_movements`
--

DROP TABLE IF EXISTS `technician_material_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `technician_material_movements` (
  `material_movement_id` bigint NOT NULL AUTO_INCREMENT,
  `movement_no` varchar(30) NOT NULL,
  `movement_type` enum('ISSUE','SALE','FAULT','RETURN') NOT NULL,
  `employee_id` int NOT NULL,
  `product_id` int NOT NULL,
  `qty` decimal(10,2) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `commission_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_status` enum('PENDING','PARTIAL','PAID') NOT NULL DEFAULT 'PENDING',
  `customer_type` enum('CATV','NET','CCTV','ANONYMOUS') DEFAULT NULL,
  `cable_customer_id` bigint DEFAULT NULL,
  `service_customer_id` int DEFAULT NULL,
  `anonymous_name` varchar(150) DEFAULT NULL,
  `anonymous_mobile` varchar(20) DEFAULT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `remarks` text,
  `movement_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by_user_id` int DEFAULT NULL,
  `created_by_employee_id` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`material_movement_id`),
  UNIQUE KEY `uk_material_movement_no` (`movement_no`),
  KEY `idx_material_movement_employee` (`employee_id`),
  KEY `idx_material_movement_product` (`product_id`),
  KEY `idx_material_movement_date` (`movement_date`),
  KEY `fk_material_movement_catv_customer` (`cable_customer_id`),
  KEY `fk_material_movement_service_customer` (`service_customer_id`),
  CONSTRAINT `fk_material_movement_catv_customer` FOREIGN KEY (`cable_customer_id`) REFERENCES `cable_tv_customers` (`cable_customer_id`),
  CONSTRAINT `fk_material_movement_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `fk_material_movement_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  CONSTRAINT `fk_material_movement_service_customer` FOREIGN KEY (`service_customer_id`) REFERENCES `customers` (`customer_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `technician_material_movements`
--

LOCK TABLES `technician_material_movements` WRITE;
/*!40000 ALTER TABLE `technician_material_movements` DISABLE KEYS */;
INSERT INTO `technician_material_movements` VALUES (1,'MAT-000001','ISSUE',3,2,1.00,0.00,0.00,0.00,0.00,0.00,'PAID',NULL,NULL,NULL,NULL,NULL,NULL,'to murugan','2026-07-29 13:49:00',1,1,'2026-07-29 08:20:29'),(2,'MAT-000002','SALE',3,2,1.00,20.00,20.00,0.00,20.00,0.00,'PAID','CATV',13,NULL,NULL,NULL,NULL,NULL,'2026-07-29 13:54:00',1,1,'2026-07-29 08:25:09'),(3,'MAT-000003','ISSUE',3,4,5.00,0.00,0.00,0.00,0.00,0.00,'PAID',NULL,NULL,NULL,NULL,NULL,NULL,'to murugan','2026-07-29 14:45:00',1,1,'2026-07-29 09:16:03'),(4,'MAT-000004','SALE',3,4,1.00,120.00,120.00,0.00,120.00,0.00,'PAID','CATV',11,NULL,NULL,NULL,NULL,'tets','2026-07-29 14:46:00',3,3,'2026-07-29 09:17:06'),(5,'MAT-000005','SALE',3,4,1.00,120.00,120.00,0.00,120.00,0.00,'PAID','ANONYMOUS',NULL,NULL,'test',NULL,NULL,NULL,'2026-07-29 14:58:00',3,3,'2026-07-29 09:29:59'),(6,'MAT-000006','SALE',3,4,1.00,120.00,120.00,10.00,120.00,0.00,'PAID','CATV',13,NULL,NULL,NULL,NULL,NULL,'2026-07-29 15:11:00',3,3,'2026-07-29 09:41:16'),(7,'MAT-000007','SALE',3,4,1.00,120.00,110.00,10.00,110.00,0.00,'PAID','CATV',6,NULL,NULL,NULL,NULL,NULL,'2026-07-29 15:18:00',3,3,'2026-07-29 09:49:19'),(8,'MAT-000008','ISSUE',3,2,1.00,0.00,0.00,0.00,0.00,0.00,'PAID',NULL,NULL,NULL,NULL,NULL,NULL,'test','2026-07-29 15:35:00',1,1,'2026-07-29 10:06:52'),(9,'MAT-000009','ISSUE',2,4,1.00,0.00,0.00,0.00,0.00,0.00,'PAID',NULL,NULL,NULL,NULL,NULL,NULL,'test','2026-07-29 15:36:00',1,1,'2026-07-29 10:06:52'),(10,'MAT-000010','SALE',3,2,1.00,20.00,15.00,5.00,15.00,0.00,'PAID','CATV',1,NULL,NULL,NULL,NULL,'TEST','2026-07-29 17:12:00',3,3,'2026-07-29 11:43:36'),(11,'MAT-000011','SALE',3,4,1.00,120.00,110.00,10.00,110.00,0.00,'PAID','CATV',1,NULL,NULL,NULL,NULL,'TEST','2026-07-29 17:12:00',3,3,'2026-07-29 11:43:36');
/*!40000 ALTER TABLE `technician_material_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `technician_material_sale_payments`
--

DROP TABLE IF EXISTS `technician_material_sale_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `technician_material_sale_payments` (
  `material_sale_payment_id` bigint NOT NULL AUTO_INCREMENT,
  `material_movement_id` bigint NOT NULL,
  `cash_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `online_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `received_amount` decimal(12,2) NOT NULL,
  `balance_after_payment` decimal(12,2) NOT NULL,
  `payment_status` enum('PARTIAL','PAID') NOT NULL,
  `received_by_user_id` int DEFAULT NULL,
  `received_by_employee_id` int DEFAULT NULL,
  `received_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`material_sale_payment_id`),
  KEY `idx_material_sale_payment_movement` (`material_movement_id`),
  CONSTRAINT `fk_material_sale_payment_movement` FOREIGN KEY (`material_movement_id`) REFERENCES `technician_material_movements` (`material_movement_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `technician_material_sale_payments`
--

LOCK TABLES `technician_material_sale_payments` WRITE;
/*!40000 ALTER TABLE `technician_material_sale_payments` DISABLE KEYS */;
INSERT INTO `technician_material_sale_payments` VALUES (1,10,15.00,0.00,15.00,0.00,'PAID',1,1,'2026-07-29',NULL,'2026-07-29 12:01:13'),(2,11,110.00,0.00,110.00,0.00,'PAID',1,1,'2026-07-29',NULL,'2026-07-29 12:01:22'),(3,7,110.00,0.00,110.00,0.00,'PAID',1,1,'2026-07-29',NULL,'2026-07-29 12:01:30'),(4,6,120.00,0.00,120.00,0.00,'PAID',1,1,'2026-07-29',NULL,'2026-07-29 12:01:34'),(5,5,120.00,0.00,120.00,0.00,'PAID',1,1,'2026-07-29',NULL,'2026-07-29 12:01:41'),(6,4,120.00,0.00,120.00,0.00,'PAID',1,1,'2026-07-29',NULL,'2026-07-29 12:01:46'),(7,2,20.00,0.00,20.00,0.00,'PAID',1,1,'2026-07-29',NULL,'2026-07-29 12:01:53');
/*!40000 ALTER TABLE `technician_material_sale_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `technician_material_stock`
--

DROP TABLE IF EXISTS `technician_material_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `technician_material_stock` (
  `technician_material_stock_id` bigint NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `product_id` int NOT NULL,
  `available_qty` decimal(10,2) NOT NULL DEFAULT '0.00',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`technician_material_stock_id`),
  UNIQUE KEY `uk_technician_product` (`employee_id`,`product_id`),
  KEY `fk_technician_stock_product` (`product_id`),
  CONSTRAINT `fk_technician_stock_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`),
  CONSTRAINT `fk_technician_stock_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `technician_material_stock`
--

LOCK TABLES `technician_material_stock` WRITE;
/*!40000 ALTER TABLE `technician_material_stock` DISABLE KEYS */;
INSERT INTO `technician_material_stock` VALUES (1,3,2,0.00,'2026-07-29 11:43:36'),(4,3,4,0.00,'2026-07-29 11:43:36'),(10,2,4,1.00,'2026-07-29 10:06:52');
/*!40000 ALTER TABLE `technician_material_stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int DEFAULT NULL,
  `employee_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Bcrypt hashed password',
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('ADMIN','MANAGER','EMPLOYEE','SALES','SERVICE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EMPLOYEE',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1=Active, 0=Inactive',
  `date_registered` date NOT NULL DEFAULT (curdate()),
  `last_login` datetime DEFAULT NULL,
  `login_attempt_count` int DEFAULT '0' COMMENT 'For lockout mechanism',
  `locked_until` datetime DEFAULT NULL COMMENT 'Account lock timestamp',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `idx_users_employee_id` (`employee_id`),
  KEY `idx_email` (`email`),
  KEY `idx_username` (`username`),
  KEY `idx_role` (`role`),
  KEY `idx_active_date` (`is_active`,`date_registered`),
  CONSTRAINT `fk_users_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User authentication and role management';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,1,'TCV1','tcvmsiva','tcv@1310','timecablevision@gmail.com','9962543540','SIVAKUMAR','M','ADMIN',1,'2026-07-14','2026-08-03 11:48:14',0,NULL,'2026-07-14 08:12:55','2026-08-03 06:18:14'),(2,2,'TCV2','mythili','tcv@1310','mythili.msiva@gmail.com','9962543541','mythili','Sivakumar','ADMIN',1,'2026-07-14',NULL,0,NULL,'2026-07-14 09:20:07','2026-07-14 09:20:07'),(3,3,'TCV3','tcvmurugan','welcome@1','mailtomurugan@gmail.com','9042043540','Murugan','K','MANAGER',1,'2026-07-14','2026-08-03 12:36:45',0,NULL,'2026-07-14 09:20:32','2026-08-03 07:06:45');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `warranty_master`
--

DROP TABLE IF EXISTS `warranty_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warranty_master` (
  `warranty_id` int NOT NULL AUTO_INCREMENT,
  `warranty_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` int NOT NULL,
  `sales_id` int DEFAULT NULL,
  `product_id` int NOT NULL,
  `serial_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Product serial number',
  `warranty_start_date` date NOT NULL DEFAULT (curdate()),
  `warranty_end_date` date NOT NULL,
  `warranty_type` enum('MANUFACTURER','EXTENDED','VOID') COLLATE utf8mb4_unicode_ci DEFAULT 'MANUFACTURER',
  `warranty_status` enum('ACTIVE','EXPIRED','CLAIMED','VOID') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `coverage_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Parts, Labor, Both',
  `warranty_cost` decimal(12,2) DEFAULT '0.00',
  `claims_count` int DEFAULT '0',
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`warranty_id`),
  UNIQUE KEY `warranty_no` (`warranty_no`),
  UNIQUE KEY `uk_warranty_no` (`warranty_no`),
  UNIQUE KEY `uk_serial_no` (`serial_no`),
  KEY `sales_id` (`sales_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_warranty_status` (`warranty_status`),
  KEY `idx_warranty_end_date` (`warranty_end_date`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `warranty_master_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON UPDATE CASCADE,
  CONSTRAINT `warranty_master_ibfk_2` FOREIGN KEY (`sales_id`) REFERENCES `sales_master` (`sales_id`) ON DELETE SET NULL,
  CONSTRAINT `warranty_master_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product warranty tracking';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warranty_master`
--

LOCK TABLES `warranty_master` WRITE;
/*!40000 ALTER TABLE `warranty_master` DISABLE KEYS */;
/*!40000 ALTER TABLE `warranty_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_order_employees`
--

DROP TABLE IF EXISTS `work_order_employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_order_employees` (
  `work_order_employee_id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `assigned_date` date NOT NULL DEFAULT (curdate()),
  `role_in_work` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Technician, Helper, Supervisor, etc.',
  `status` enum('ASSIGNED','STARTED','COMPLETED','REMOVED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ASSIGNED',
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`work_order_employee_id`),
  UNIQUE KEY `uk_work_order_employee` (`work_order_id`,`employee_id`),
  KEY `idx_work_order_id` (`work_order_id`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `work_order_employees_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`work_order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `work_order_employees_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Employee assignment to work orders';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_order_employees`
--

LOCK TABLES `work_order_employees` WRITE;
/*!40000 ALTER TABLE `work_order_employees` DISABLE KEYS */;
/*!40000 ALTER TABLE `work_order_employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_order_items`
--

DROP TABLE IF EXISTS `work_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_order_items` (
  `work_order_item_id` int NOT NULL AUTO_INCREMENT,
  `work_order_id` int NOT NULL,
  `quotation_item_id` int DEFAULT NULL COMMENT 'Source quotation item if created from quotation',
  `product_id` int DEFAULT NULL COMMENT 'NULL for custom work items',
  `item_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `qty` decimal(10,2) NOT NULL,
  `selling_price` decimal(12,2) NOT NULL,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `discount_percent` decimal(5,2) DEFAULT '0.00',
  `tax_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `amount` decimal(12,2) NOT NULL,
  `line_no` smallint DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`work_order_item_id`),
  KEY `idx_work_order_id` (`work_order_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_quotation_item_id` (`quotation_item_id`),
  CONSTRAINT `work_order_items_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`work_order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `work_order_items_ibfk_2` FOREIGN KEY (`quotation_item_id`) REFERENCES `quotation_items` (`quotation_item_id`) ON DELETE SET NULL,
  CONSTRAINT `work_order_items_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `work_order_items_chk_1` CHECK ((`qty` > 0)),
  CONSTRAINT `work_order_items_chk_2` CHECK ((`selling_price` >= 0)),
  CONSTRAINT `work_order_items_chk_3` CHECK ((`discount_amount` >= 0)),
  CONSTRAINT `work_order_items_chk_4` CHECK ((`tax_percent` >= 0)),
  CONSTRAINT `work_order_items_chk_5` CHECK ((`tax_amount` >= 0)),
  CONSTRAINT `work_order_items_chk_6` CHECK ((`amount` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Billable work items used to create invoices after work completion';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_order_items`
--

LOCK TABLES `work_order_items` WRITE;
/*!40000 ALTER TABLE `work_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `work_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_order_material_issues`
--

DROP TABLE IF EXISTS `work_order_material_issues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_order_material_issues` (
  `issue_id` int NOT NULL AUTO_INCREMENT,
  `issue_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `work_order_id` int NOT NULL,
  `material_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL COMMENT 'Inventory product issued',
  `issued_qty` decimal(10,2) NOT NULL,
  `issued_date` date NOT NULL DEFAULT (curdate()),
  `issued_to_employee_id` int DEFAULT NULL,
  `issued_by_employee_id` int DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `approval_status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `approved_by_employee_id` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`issue_id`),
  UNIQUE KEY `issue_no` (`issue_no`),
  KEY `issued_to_employee_id` (`issued_to_employee_id`),
  KEY `issued_by_employee_id` (`issued_by_employee_id`),
  KEY `idx_work_order_id` (`work_order_id`),
  KEY `idx_material_id` (`material_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_issued_date` (`issued_date`),
  CONSTRAINT `work_order_material_issues_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`work_order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `work_order_material_issues_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `material_master` (`material_id`) ON DELETE SET NULL,
  CONSTRAINT `work_order_material_issues_ibfk_3` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `work_order_material_issues_ibfk_4` FOREIGN KEY (`issued_to_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL,
  CONSTRAINT `work_order_material_issues_ibfk_5` FOREIGN KEY (`issued_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL,
  CONSTRAINT `work_order_material_issues_chk_1` CHECK ((`issued_qty` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Materials issued against work orders';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_order_material_issues`
--

LOCK TABLES `work_order_material_issues` WRITE;
/*!40000 ALTER TABLE `work_order_material_issues` DISABLE KEYS */;
/*!40000 ALTER TABLE `work_order_material_issues` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_order_material_returns`
--

DROP TABLE IF EXISTS `work_order_material_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_order_material_returns` (
  `return_id` int NOT NULL AUTO_INCREMENT,
  `return_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `issue_id` int DEFAULT NULL,
  `work_order_id` int NOT NULL,
  `material_id` int DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `returned_qty` decimal(10,2) NOT NULL,
  `return_date` date NOT NULL DEFAULT (curdate()),
  `returned_by_employee_id` int DEFAULT NULL,
  `received_by_employee_id` int DEFAULT NULL,
  `condition_status` enum('GOOD','DAMAGED','SCRAP') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GOOD',
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`return_id`),
  UNIQUE KEY `return_no` (`return_no`),
  KEY `material_id` (`material_id`),
  KEY `product_id` (`product_id`),
  KEY `returned_by_employee_id` (`returned_by_employee_id`),
  KEY `received_by_employee_id` (`received_by_employee_id`),
  KEY `idx_issue_id` (`issue_id`),
  KEY `idx_work_order_id` (`work_order_id`),
  KEY `idx_return_date` (`return_date`),
  CONSTRAINT `work_order_material_returns_ibfk_1` FOREIGN KEY (`issue_id`) REFERENCES `work_order_material_issues` (`issue_id`) ON DELETE SET NULL,
  CONSTRAINT `work_order_material_returns_ibfk_2` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders` (`work_order_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `work_order_material_returns_ibfk_3` FOREIGN KEY (`material_id`) REFERENCES `material_master` (`material_id`) ON DELETE SET NULL,
  CONSTRAINT `work_order_material_returns_ibfk_4` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `work_order_material_returns_ibfk_5` FOREIGN KEY (`returned_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL,
  CONSTRAINT `work_order_material_returns_ibfk_6` FOREIGN KEY (`received_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL,
  CONSTRAINT `work_order_material_returns_chk_1` CHECK ((`returned_qty` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Returned material tracking after work completion';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_order_material_returns`
--

LOCK TABLES `work_order_material_returns` WRITE;
/*!40000 ALTER TABLE `work_order_material_returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `work_order_material_returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_orders`
--

DROP TABLE IF EXISTS `work_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_orders` (
  `work_order_id` int NOT NULL AUTO_INCREMENT,
  `work_order_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quotation_id` int DEFAULT NULL COMMENT 'Source quotation',
  `customer_id` int NOT NULL,
  `work_type` enum('INSTALLATION','SERVICE','REPAIR','MAINTENANCE','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INSTALLATION',
  `work_status` enum('PENDING','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `approval_status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `priority` enum('LOW','MEDIUM','HIGH','URGENT') COLLATE utf8mb4_unicode_ci DEFAULT 'MEDIUM',
  `start_date` date DEFAULT NULL,
  `completion_date` date DEFAULT NULL,
  `site_address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `site_contact_person` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `site_contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `work_notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Work description and special instructions',
  `assigned_to_employee_id` int DEFAULT NULL,
  `supervisor_id` int DEFAULT NULL COMMENT 'Field supervisor',
  `created_by_employee_id` int DEFAULT NULL,
  `completion_remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`work_order_id`),
  UNIQUE KEY `work_order_no` (`work_order_no`),
  UNIQUE KEY `uk_work_order_no` (`work_order_no`),
  KEY `assigned_to_employee_id` (`assigned_to_employee_id`),
  KEY `supervisor_id` (`supervisor_id`),
  KEY `created_by_employee_id` (`created_by_employee_id`),
  KEY `idx_quotation_id` (`quotation_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_work_status` (`work_status`),
  KEY `idx_start_date` (`start_date`),
  KEY `idx_work_type_status` (`work_type`,`work_status`),
  CONSTRAINT `work_orders_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `quotation_master` (`quotation_id`) ON DELETE SET NULL,
  CONSTRAINT `work_orders_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON UPDATE CASCADE,
  CONSTRAINT `work_orders_ibfk_3` FOREIGN KEY (`assigned_to_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL,
  CONSTRAINT `work_orders_ibfk_4` FOREIGN KEY (`supervisor_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL,
  CONSTRAINT `work_orders_ibfk_5` FOREIGN KEY (`created_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Installation and service work orders';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_orders`
--

LOCK TABLES `work_orders` WRITE;
/*!40000 ALTER TABLE `work_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `work_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workflow_approvals`
--

DROP TABLE IF EXISTS `workflow_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workflow_approvals` (
  `workflow_id` int NOT NULL AUTO_INCREMENT,
  `module_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_id` int NOT NULL,
  `reference_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `workflow_status` enum('PENDING','APPROVED','REJECTED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `requested_by_employee_id` int DEFAULT NULL,
  `approved_by_employee_id` int DEFAULT NULL,
  `requested_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`workflow_id`),
  UNIQUE KEY `uk_workflow_reference` (`module_name`,`reference_id`),
  KEY `idx_module_status` (`module_name`,`workflow_status`),
  KEY `idx_reference_no` (`reference_no`),
  KEY `requested_by_employee_id` (`requested_by_employee_id`),
  KEY `approved_by_employee_id` (`approved_by_employee_id`),
  CONSTRAINT `workflow_approvals_ibfk_1` FOREIGN KEY (`requested_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL,
  CONSTRAINT `workflow_approvals_ibfk_2` FOREIGN KEY (`approved_by_employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workflow_approvals`
--

LOCK TABLES `workflow_approvals` WRITE;
/*!40000 ALTER TABLE `workflow_approvals` DISABLE KEYS */;
/*!40000 ALTER TABLE `workflow_approvals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'tcvonedb'
--

--
-- Dumping routines for database 'tcvonedb'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-03 15:25:40
