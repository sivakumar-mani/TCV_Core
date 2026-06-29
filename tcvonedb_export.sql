-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: tcvonedb
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product brands master';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brands`
--

LOCK TABLES `brands` WRITE;
/*!40000 ALTER TABLE `brands` DISABLE KEYS */;
/*!40000 ALTER TABLE `brands` ENABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hierarchical product categories';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Employee master data with department assignment';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Material catalog for work order issue and return';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `material_master`
--

LOCK TABLES `material_master` WRITE;
/*!40000 ALTER TABLE `material_master` DISABLE KEYS */;
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
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  UNIQUE KEY `source_key` (`source_key`),
  KEY `idx_active_read` (`is_active`,`is_read`),
  KEY `idx_type_active` (`notification_type`,`is_active`),
  KEY `idx_severity` (`severity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product catalog with pricing and classification';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Line items for each purchase order';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_items`
--

LOCK TABLES `purchase_items` WRITE;
/*!40000 ALTER TABLE `purchase_items` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Purchase order header from suppliers';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_master`
--

LOCK TABLES `purchase_master` WRITE;
/*!40000 ALTER TABLE `purchase_master` DISABLE KEYS */;
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
INSERT INTO `role_permissions` VALUES ('MANAGER','AUDIT_LOGS',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','BRANDS',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','CATEGORIES',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','CUSTOMER_PAYMENTS',1,1,0,0,1,'2026-06-22 07:25:53'),('MANAGER','CUSTOMERS',1,1,0,0,1,'2026-06-22 07:25:53'),('MANAGER','DASHBOARD',1,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','EMPLOYEE_ATTENDANCE',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','EMPLOYEE_SALARY',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','EMPLOYEES',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','NOTIFICATIONS',1,0,1,0,1,'2026-06-22 07:25:53'),('MANAGER','PRODUCTS',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','PURCHASES',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','QUOTATIONS',1,1,1,0,1,'2026-06-22 07:25:53'),('MANAGER','ROLE_PERMISSIONS',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','SALES',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','SERVICE_TICKETS',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','STOCK',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','SUPPLIER_PAYMENTS',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','SUPPLIERS',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','USERS',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','WARRANTIES',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','WORK_ORDERS',0,0,0,0,1,'2026-06-22 07:25:53'),('MANAGER','WORKFLOW_APPROVAL',0,0,0,0,1,'2026-06-22 07:25:53'),('EMPLOYEE','DASHBOARD',1,0,0,0,NULL,'2026-06-22 07:10:56'),('EMPLOYEE','NOTIFICATIONS',1,0,1,0,NULL,'2026-06-22 07:10:56'),('SALES','CUSTOMERS',1,1,1,0,NULL,'2026-06-22 07:10:56'),('SALES','DASHBOARD',1,0,0,0,NULL,'2026-06-22 07:10:56'),('SALES','NOTIFICATIONS',1,0,1,0,NULL,'2026-06-22 07:10:56'),('SALES','QUOTATIONS',1,1,1,0,NULL,'2026-06-22 07:10:56'),('SALES','SALES',1,1,1,0,NULL,'2026-06-22 07:10:56'),('SERVICE','DASHBOARD',1,0,0,0,NULL,'2026-06-22 07:10:56'),('SERVICE','NOTIFICATIONS',1,0,1,0,NULL,'2026-06-22 07:10:56'),('SERVICE','SERVICE_TICKETS',1,1,1,0,NULL,'2026-06-22 07:10:56'),('SERVICE','WARRANTIES',1,1,1,0,NULL,'2026-06-22 07:10:56'),('SERVICE','WORK_ORDERS',1,0,1,0,NULL,'2026-06-22 07:10:56');
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_ledger`
--

LOCK TABLES `stock_ledger` WRITE;
/*!40000 ALTER TABLE `stock_ledger` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_master`
--

LOCK TABLES `stock_master` WRITE;
/*!40000 ALTER TABLE `stock_master` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Supplier master data with payment terms';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
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
  KEY `idx_email` (`email`),
  KEY `idx_username` (`username`),
  KEY `idx_role` (`role`),
  KEY `idx_active_date` (`is_active`,`date_registered`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User authentication and role management';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','Tcv@1234','timecablevision@gmail.com','9876543210','Siva','Kumar','ADMIN',1,'2026-06-12','2026-06-22 13:05:40',0,NULL,'2026-06-12 07:04:54','2026-06-22 07:35:40'),(2,'tcv_mythili','Tcv@1234','mythili.msiva@gmail.com','9962543541','Mythili','Sivakumar','ADMIN',1,'2026-06-12',NULL,0,NULL,'2026-06-12 09:22:45','2026-06-12 09:22:45'),(3,'tcvmurugan','tcvMK@1234','sivakumar.pmani@gmail.com','9000090000','Murugan','K','MANAGER',1,'2026-06-22','2026-06-22 13:00:12',0,NULL,'2026-06-22 07:27:06','2026-06-22 07:30:12');
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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-29 12:18:48
