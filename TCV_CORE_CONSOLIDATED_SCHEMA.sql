
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

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `tcvonedb` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `tcvonedb`;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product brands master';
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Groups Cable TV records for single workflow approval. New customer onboarding uses one group for customer, STB, connection, materials, package and subscription.';
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV area master mapped to location';
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Materials used for Cable TV connection, entered as add-row items';
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV source of connection master';
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV connection, disconnection, shifted and transferred history';
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `balance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `due_date` date DEFAULT NULL,
  `account_status` enum('PENDING','RECEIVED') NOT NULL DEFAULT 'PENDING',
  `received_by_user_id` int DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV package assigned to customer with snapshot package price';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cable_customer_stb_accessories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_customer_stb_accessories` (
  `stb_accessory_id` bigint NOT NULL AUTO_INCREMENT,
  `approval_group_id` bigint DEFAULT NULL,
  `cable_customer_id` bigint NOT NULL,
  `customer_stb_id` bigint NOT NULL,
  `product_id` int NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cable_customer_stbs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_customer_stbs` (
  `customer_stb_id` bigint NOT NULL AUTO_INCREMENT,
  `approval_group_id` bigint DEFAULT NULL,
  `cable_customer_id` bigint NOT NULL,
  `stb_master_id` bigint DEFAULT NULL,
  `stb_type` enum('NEW','SERVICED','RETURNED','FAULT','DAMAGED','UPGRADE','REPLACED','EXCHANGE','CUSTOMER_OWNED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NEW',
  `installed_mso_id` int DEFAULT NULL,
  `exchange_original_mso_id` int DEFAULT NULL,
  `stb_no` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stb_image_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stb_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `stb_discount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `labour_service_charge` decimal(12,2) NOT NULL DEFAULT '0.00',
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer STB details and exchange history';
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV location master';
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='MSO/operator master for STB installed and exchange tracking';
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV network master: TCV, PAMMAL, MURUGAN, SVN';
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV package master with package type and price';
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cable_stb_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_stb_master` (
  `stb_master_id` bigint NOT NULL AUTO_INCREMENT,
  `stb_number` varchar(100) NOT NULL,
  `box_type` enum('HD','SD') NOT NULL DEFAULT 'HD',
  `stock_type` enum('NEW','SERVICED','RETURNED','FAULT') NOT NULL DEFAULT 'NEW',
  `mso_id` int DEFAULT NULL,
  `stb_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('AVAILABLE','NOT_AVAILABLE') NOT NULL DEFAULT 'AVAILABLE',
  `updated_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stb_master_id`),
  UNIQUE KEY `uk_cable_stb_master_number` (`stb_number`),
  KEY `idx_cable_stb_master_status` (`status`),
  KEY `idx_cable_stb_master_stock_type` (`stock_type`),
  KEY `fk_cable_stb_master_mso` (`mso_id`),
  CONSTRAINT `fk_cable_stb_master_mso` FOREIGN KEY (`mso_id`) REFERENCES `cable_mso_master` (`mso_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV street master mapped to area';
/*!40101 SET character_set_client = @saved_cs_client */;
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
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `collect_date` date DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `collected_by_employee_id` int DEFAULT NULL,
  `payment_mode` enum('CASH','UPI','CARD','BANK','CHEQUE') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cable TV monthly/yearly subscription billing and collection';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cable_tv_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cable_tv_customers` (
  `cable_customer_id` bigint NOT NULL AUTO_INCREMENT,
  `approval_group_id` bigint DEFAULT NULL,
  `erp_customer_id` int DEFAULT NULL,
  `network_id` int NOT NULL,
  `network_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Combined Cable TV customer table for all networks';
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Employee master data with department assignment';
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=371 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product catalog with pricing and classification';
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Line items for each purchase order';
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

