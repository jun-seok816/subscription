-- MySQL dump 10.13  Distrib 8.0.28, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: subscription
-- ------------------------------------------------------
-- Server version	8.0.28

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `subscription_id` bigint DEFAULT NULL,
  `payment_id` varchar(100) NOT NULL,
  `portone_tx_id` varchar(100) DEFAULT NULL,
  `order_name` varchar(120) NOT NULL,
  `amount_krw` int NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'KRW',
  `is_success` tinyint(1) NOT NULL DEFAULT '1' COMMENT '결제 성공 여부(1=성공,0=실패)',
  `paid_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_payment_id` (`payment_id`),
  UNIQUE KEY `ux_portone_tx_id` (`portone_tx_id`),
  KEY `ix_user` (`user_id`),
  KEY `ix_sub` (`subscription_id`),
  KEY `ix_paid_at` (`paid_at`),
  CONSTRAINT `fk_pay_sub` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`),
  CONSTRAINT `fk_pay_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,1,2,'pay_ab103dbb-4a49-4e8c-a7c3-bbb51568c7ce','T8a5318e62a6767f969a','9 회차 결제',4000,'KRW',1,'2025-08-20 11:23:14','2025-08-20 11:23:14');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('zOCe27--4_nFZkRRCBR99eFaS378wKe3',1756348507,'{\"cookie\":{\"originalMaxAge\":604799997,\"expires\":\"2025-08-28T02:35:07.270Z\",\"httpOnly\":true,\"path\":\"/\"},\"userId\":1,\"email\":\"junseok816@gmail.com\"}');
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_schedules`
--

DROP TABLE IF EXISTS `subscription_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscription_schedules` (
  `payment_id` varchar(100) NOT NULL COMMENT '스케줄 고유키(멱등성)',
  `subscription_id` bigint NOT NULL,
  `schedule_at` datetime NOT NULL,
  `amount_krw` int NOT NULL,
  `status` enum('SCHEDULED','EXECUTED','CANCELLED') DEFAULT 'SCHEDULED',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `cancelled_at` datetime DEFAULT NULL,
  `executed_at` datetime DEFAULT NULL,
  `product_name` varchar(45) NOT NULL,
  PRIMARY KEY (`payment_id`),
  KEY `ix_subscription_id` (`subscription_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_schedules`
--

LOCK TABLES `subscription_schedules` WRITE;
/*!40000 ALTER TABLE `subscription_schedules` DISABLE KEYS */;
INSERT INTO `subscription_schedules` VALUES ('order_57799615-ddcd-4800-bbc4-cbf5c4d43b39',2,'2025-09-18 10:23:46',2000,'CANCELLED','2025-08-18 10:47:39','2025-08-20 11:23:16',NULL,'BASIC'),('order_5dc53458-412b-4549-8827-5b3e970c02b9',2,'2025-09-19 11:02:16',2000,'CANCELLED','2025-08-19 11:03:20','2025-08-20 11:23:16',NULL,'BASIC'),('order_615b26a6-950a-467e-9566-6b450162a151',2,'2025-09-12 16:11:50',2000,'CANCELLED','2025-08-12 16:12:08','2025-08-20 11:23:16',NULL,'BASIC'),('order_866d7f87-6df6-4b78-83b1-71d592fb0e01',2,'2025-09-18 14:59:43',2000,'CANCELLED','2025-08-18 15:01:07','2025-08-20 11:23:16',NULL,'BASIC'),('order_8c83d419-98ab-4951-8771-332ab303e19e',2,'2025-09-18 10:23:46',4000,'CANCELLED','2025-08-18 10:23:46','2025-08-20 11:23:16',NULL,'PRO'),('order_8cd0536c-fb47-4180-a858-1c2c8f978bc3',2,'2025-09-19 11:16:13',4000,'CANCELLED','2025-08-19 11:16:20','2025-08-20 11:23:16',NULL,'PRO'),('order_907fa0ef-7817-4e80-bd16-07ada5dff824',2,'2025-09-19 11:16:13',2000,'CANCELLED','2025-08-20 10:50:38','2025-08-20 11:23:16',NULL,'PRO'),('order_a5949ebc-6ffb-42dd-95d9-2ad465e28705',2,'2025-09-20 11:23:03',4000,'SCHEDULED','2025-08-20 11:23:33',NULL,NULL,'PRO'),('order_bc13b60d-90e9-49ac-ad6c-1bb1695c09a4',2,'2025-09-18 10:23:46',2000,'CANCELLED','2025-08-18 10:47:25','2025-08-20 11:23:16',NULL,'BASIC');
/*!40000 ALTER TABLE `subscription_schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'PK. 구독 행 ID',
  `user_id` bigint NOT NULL COMMENT 'FK. users.id',
  `plan_name` enum('FREE','BASIC','PRO') DEFAULT 'FREE' COMMENT '현재 플랜 이름',
  `billing_cycle` enum('MONTHLY','YEARLY') DEFAULT 'MONTHLY' COMMENT '결제 주기',
  `price_cents` int DEFAULT '0' COMMENT '이번 주기 청구 금액(￦ ×100)',
  `token_grant` int DEFAULT '0' COMMENT '주기당 지급 토큰 수',
  `current_period_end` datetime DEFAULT NULL COMMENT '현재 구독 기간 종료 시점',
  `pending_plan_name` enum('FREE','BASIC','PRO') DEFAULT NULL COMMENT '다음 주기에 적용될 플랜 (예약)',
  `pending_billing_cycle` enum('MONTHLY','YEARLY') DEFAULT NULL COMMENT '다음 주기 결제 주기 (예약)',
  `cancel_at_period_end` tinyint(1) DEFAULT '0' COMMENT '1: 기간 끝나면 자동 해지',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '행 최종 수정 시각',
  PRIMARY KEY (`id`),
  KEY `fk_users_idx` (`user_id`),
  CONSTRAINT `fk_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
INSERT INTO `subscriptions` VALUES (2,1,'PRO','MONTHLY',4000,0,'2025-09-20 11:23:03',NULL,NULL,0,'2025-08-20 11:23:03');
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'PK. 사용자 고유 ID',
  `email` varchar(255) NOT NULL COMMENT '로그인/고지용 이메일(UNIQUE 권장)',
  `token_balance` int DEFAULT '0' COMMENT '현재 보유 토큰(단위: 개)',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '가입 일시',
  `portone_customer_id` varchar(100) DEFAULT NULL COMMENT 'PortOne 고객 ID',
  `portone_billing_key` varchar(255) DEFAULT NULL COMMENT 'PortOne 빌링키(토큰)',
  `billing_key_status` enum('ACTIVE','INACTIVE','REVOKED') NOT NULL DEFAULT 'INACTIVE',
  `card_brand` varchar(50) DEFAULT NULL,
  `card_last4` char(4) DEFAULT NULL,
  `easy_pay_provider` varchar(50) DEFAULT NULL COMMENT 'EASY_PAY 지갑 종류',
  `billing_key_created_at` datetime DEFAULT NULL,
  `billing_key_updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_users_portone_customer_id` (`portone_customer_id`),
  UNIQUE KEY `ux_users_portone_billing_key` (`portone_billing_key`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'junseok816@gmail.com',5,'2025-08-08 11:24:51','7c62e627-5035-4981-a778-02e3a88a4c22','billing-key-0198c549-2edc-b396-0e28-a71fb0284954','ACTIVE',NULL,NULL,'KAKAOPAY','2025-08-08 14:49:48','2025-08-20 11:23:00');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_users_insert_create_subscription` AFTER INSERT ON `users` FOR EACH ROW BEGIN
  INSERT INTO subscriptions (
      user_id,
      plan_name,
      billing_cycle,
      price_cents,
      token_grant,
      current_period_end,
      cancel_at_period_end
  ) VALUES (
      NEW.id,            -- 방금 생성된 사용자 PK
      'FREE',            -- 기본 플랜
      'MONTHLY',         -- 기본 청구 주기
       0,                -- 가격 0원
       0,                -- 지급 토큰 0
      DATE_ADD(NEW.created_at, INTERVAL 1 MONTH), -- 첫 사이클 종료일
       0                 -- 자동 해지 안 함
  );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Dumping events for database 'subscription'
--
/*!50106 SET @save_time_zone= @@TIME_ZONE */ ;
/*!50106 DROP EVENT IF EXISTS `ev_apply_pending_free` */;
DELIMITER ;;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;;
/*!50003 SET character_set_client  = utf8mb4 */ ;;
/*!50003 SET character_set_results = utf8mb4 */ ;;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION' */ ;;
/*!50003 SET @saved_time_zone      = @@time_zone */ ;;
/*!50003 SET time_zone             = 'SYSTEM' */ ;;
/*!50106 CREATE*/ /*!50117 DEFINER=`root`@`localhost`*/ /*!50106 EVENT `ev_apply_pending_free` ON SCHEDULE EVERY 1 MINUTE STARTS '2025-08-20 10:32:55' ON COMPLETION NOT PRESERVE ENABLE DO UPDATE subscriptions
     SET plan_name = 'FREE',
         pending_plan_name = NULL,
         pending_billing_cycle = NULL,
         updated_at = CURRENT_TIMESTAMP
   WHERE pending_plan_name = 'FREE'
     AND current_period_end IS NOT NULL
     AND current_period_end <= NOW()
     AND plan_name <> 'FREE' */ ;;
/*!50003 SET time_zone             = @saved_time_zone */ ;;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;;
/*!50003 SET character_set_client  = @saved_cs_client */ ;;
/*!50003 SET character_set_results = @saved_cs_results */ ;;
/*!50003 SET collation_connection  = @saved_col_connection */ ;;
DELIMITER ;
/*!50106 SET TIME_ZONE= @save_time_zone */ ;

--
-- Dumping routines for database 'subscription'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-08-21 14:26:09
