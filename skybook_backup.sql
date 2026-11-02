-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: skybook
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
-- Table structure for table `administrator`
--

DROP TABLE IF EXISTS `administrator`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `administrator` (
  `AdminID` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `Email` varchar(100) NOT NULL,
  `Phone` varchar(15) DEFAULT NULL,
  `Password` varchar(255) NOT NULL,
  PRIMARY KEY (`AdminID`),
  UNIQUE KEY `Email` (`Email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `administrator`
--

LOCK TABLES `administrator` WRITE;
/*!40000 ALTER TABLE `administrator` DISABLE KEYS */;
INSERT INTO `administrator` VALUES (1,'SkyBook Admin','admin@skybook.com','9876543210','$2b$10$NlPFBXocUvcyg7uxG48iP.HOy4D8xF5ydD2xH0GQU8VRQ1Tcvl0/2');
/*!40000 ALTER TABLE `administrator` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `aircraft`
--

DROP TABLE IF EXISTS `aircraft`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aircraft` (
  `AircraftID` int NOT NULL AUTO_INCREMENT,
  `AircraftName` varchar(100) NOT NULL,
  `AircraftModel` varchar(100) NOT NULL,
  `Capacity` int NOT NULL,
  `Status` enum('Active','Inactive') DEFAULT 'Active',
  PRIMARY KEY (`AircraftID`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `aircraft`
--

LOCK TABLES `aircraft` WRITE;
/*!40000 ALTER TABLE `aircraft` DISABLE KEYS */;
INSERT INTO `aircraft` VALUES (1,'SkyBook Airbus','A320',180,'Active'),(2,'SkyBook Boeing','737-800',189,'Active'),(3,'SkyBook Airbus','A321',220,'Active');
/*!40000 ALTER TABLE `aircraft` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `booking`
--

DROP TABLE IF EXISTS `booking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking` (
  `BookingID` int NOT NULL AUTO_INCREMENT,
  `UserID` int DEFAULT NULL,
  `FlightID` int NOT NULL,
  `BookingDate` datetime DEFAULT CURRENT_TIMESTAMP,
  `BookingStatus` enum('Confirmed','Cancelled','Pending') DEFAULT 'Confirmed',
  `TotalFare` decimal(10,2) NOT NULL,
  PRIMARY KEY (`BookingID`),
  KEY `fk_booking_user` (`UserID`),
  KEY `fk_booking_flight` (`FlightID`),
  CONSTRAINT `fk_booking_flight` FOREIGN KEY (`FlightID`) REFERENCES `flight` (`FlightID`) ON DELETE RESTRICT,
  CONSTRAINT `fk_booking_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking`
--

LOCK TABLES `booking` WRITE;
/*!40000 ALTER TABLE `booking` DISABLE KEYS */;
INSERT INTO `booking` VALUES (1,3,1,'2026-08-26 20:41:14','Confirmed',11684.00),(2,3,1,'2026-08-27 18:08:15','Confirmed',17526.00);
/*!40000 ALTER TABLE `booking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bookingpassenger`
--

DROP TABLE IF EXISTS `bookingpassenger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookingpassenger` (
  `BookingID` int NOT NULL,
  `PassengerID` int NOT NULL,
  `PassengerNumber` int NOT NULL,
  PRIMARY KEY (`BookingID`,`PassengerID`),
  UNIQUE KEY `BookingID` (`BookingID`,`PassengerNumber`),
  KEY `fk_bookingpassenger_passenger` (`PassengerID`),
  CONSTRAINT `fk_bookingpassenger_booking` FOREIGN KEY (`BookingID`) REFERENCES `booking` (`BookingID`) ON DELETE CASCADE,
  CONSTRAINT `fk_bookingpassenger_passenger` FOREIGN KEY (`PassengerID`) REFERENCES `passenger` (`PassengerID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookingpassenger`
--

LOCK TABLES `bookingpassenger` WRITE;
/*!40000 ALTER TABLE `bookingpassenger` DISABLE KEYS */;
INSERT INTO `bookingpassenger` VALUES (1,1,1),(1,2,2),(2,3,1),(2,4,2),(2,5,3);
/*!40000 ALTER TABLE `bookingpassenger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flight`
--

DROP TABLE IF EXISTS `flight`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `flight` (
  `FlightID` int NOT NULL AUTO_INCREMENT,
  `FlightNumber` varchar(20) NOT NULL,
  `AirlineName` varchar(100) NOT NULL,
  `Source` varchar(100) NOT NULL,
  `Destination` varchar(100) NOT NULL,
  `DepartureTime` time NOT NULL,
  `ArrivalTime` time NOT NULL,
  `Duration` varchar(20) NOT NULL,
  `Fare` decimal(10,2) NOT NULL,
  `Status` enum('Available','Full','Cancelled') DEFAULT 'Available',
  `AircraftID` int NOT NULL,
  `CreatedBy` int DEFAULT NULL,
  PRIMARY KEY (`FlightID`),
  UNIQUE KEY `FlightNumber` (`FlightNumber`),
  KEY `fk_flight_aircraft` (`AircraftID`),
  KEY `fk_flight_admin` (`CreatedBy`),
  CONSTRAINT `fk_flight_admin` FOREIGN KEY (`CreatedBy`) REFERENCES `administrator` (`AdminID`) ON DELETE SET NULL,
  CONSTRAINT `fk_flight_aircraft` FOREIGN KEY (`AircraftID`) REFERENCES `aircraft` (`AircraftID`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flight`
--

LOCK TABLES `flight` WRITE;
/*!40000 ALTER TABLE `flight` DISABLE KEYS */;
INSERT INTO `flight` VALUES (1,'SB204','SkyBook Airlines','Chennai','Delhi','06:30:00','09:20:00','2h 50m',5842.00,'Available',1,1),(2,'SB418','SkyBook Express','Chennai','Delhi','11:15:00','14:10:00','2h 55m',6420.00,'Available',2,1),(3,'SB721','SkyBook Airways','Chennai','Delhi','18:45:00','21:35:00','2h 50m',6180.00,'Available',3,1),(4,'SB1010','SkyBook Airways','Chennai','Delhi','21:14:00','18:20:00','1hr',8000.00,'Available',2,1);
/*!40000 ALTER TABLE `flight` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `passenger`
--

DROP TABLE IF EXISTS `passenger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `passenger` (
  `PassengerID` int NOT NULL AUTO_INCREMENT,
  `UserID` int DEFAULT NULL,
  `FirstName` varchar(100) NOT NULL,
  `LastName` varchar(100) DEFAULT NULL,
  `Email` varchar(100) NOT NULL,
  `Phone` varchar(15) NOT NULL,
  PRIMARY KEY (`PassengerID`),
  KEY `fk_passenger_user` (`UserID`),
  CONSTRAINT `fk_passenger_user` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `passenger`
--

LOCK TABLES `passenger` WRITE;
/*!40000 ALTER TABLE `passenger` DISABLE KEYS */;
INSERT INTO `passenger` VALUES (1,3,'R.Jeethesh','','rjeethesh@gmail.com','1234567890'),(2,3,'hi','','rj@gmail.com','0987654321'),(3,3,'hi1','','rjeethesh@gmail.com','1234567890'),(4,3,'hi2','','abs@gmail.com','8098427765'),(5,3,'hi3','','abss@gmail.com','0987654321');
/*!40000 ALTER TABLE `passenger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment`
--

DROP TABLE IF EXISTS `payment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment` (
  `PaymentID` int NOT NULL AUTO_INCREMENT,
  `BookingID` int NOT NULL,
  `PaymentMode` enum('Online','Card','UPI','Cash') DEFAULT 'Online',
  `PaymentStatus` enum('Success','Failed','Pending') DEFAULT 'Pending',
  `Amount` decimal(10,2) NOT NULL,
  `PaymentDate` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`PaymentID`),
  KEY `fk_payment_booking` (`BookingID`),
  CONSTRAINT `fk_payment_booking` FOREIGN KEY (`BookingID`) REFERENCES `booking` (`BookingID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment`
--

LOCK TABLES `payment` WRITE;
/*!40000 ALTER TABLE `payment` DISABLE KEYS */;
INSERT INTO `payment` VALUES (1,1,'Online','Success',11684.00,'2026-08-26 20:41:14'),(2,2,'Online','Success',17526.00,'2026-08-27 18:08:15');
/*!40000 ALTER TABLE `payment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `seat`
--

DROP TABLE IF EXISTS `seat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `seat` (
  `SeatID` int NOT NULL AUTO_INCREMENT,
  `AircraftID` int NOT NULL,
  `SeatNumber` varchar(10) NOT NULL,
  `SeatStatus` enum('Available','Blocked') DEFAULT 'Available',
  PRIMARY KEY (`SeatID`),
  UNIQUE KEY `unique_aircraft_seat` (`AircraftID`,`SeatNumber`),
  CONSTRAINT `fk_seat_aircraft` FOREIGN KEY (`AircraftID`) REFERENCES `aircraft` (`AircraftID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1024 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `seat`
--

LOCK TABLES `seat` WRITE;
/*!40000 ALTER TABLE `seat` DISABLE KEYS */;
INSERT INTO `seat` VALUES (1,3,'2D','Available'),(2,2,'2D','Available'),(3,1,'2D','Available'),(4,3,'19B','Available'),(5,2,'19B','Available'),(6,1,'19B','Available'),(7,3,'35F','Available'),(8,3,'2C','Available'),(9,2,'2C','Available'),(10,1,'2C','Available'),(11,3,'19A','Available'),(12,2,'19A','Available'),(13,1,'19A','Available'),(14,3,'35E','Available'),(15,3,'2B','Available'),(16,2,'2B','Available'),(17,1,'2B','Available'),(18,3,'18F','Available'),(19,2,'18F','Available'),(20,1,'18F','Available'),(21,3,'35D','Available'),(22,3,'2A','Available'),(23,2,'2A','Available'),(24,1,'2A','Available'),(25,3,'18E','Available'),(26,2,'18E','Available'),(27,1,'18E','Available'),(28,3,'35C','Available'),(29,3,'1F','Available'),(30,2,'1F','Available'),(31,1,'1F','Available'),(32,3,'18D','Available'),(33,2,'18D','Available'),(34,1,'18D','Available'),(35,3,'35B','Available'),(36,3,'1E','Available'),(37,2,'1E','Available'),(38,1,'1E','Available'),(39,3,'18C','Available'),(40,2,'18C','Available'),(41,1,'18C','Available'),(42,3,'35A','Available'),(43,3,'1D','Available'),(44,2,'1D','Available'),(45,1,'1D','Available'),(46,3,'18B','Available'),(47,2,'18B','Available'),(48,1,'18B','Available'),(49,3,'34F','Available'),(50,3,'1C','Available'),(51,2,'1C','Available'),(52,1,'1C','Available'),(53,3,'18A','Available'),(54,2,'18A','Available'),(55,1,'18A','Available'),(56,3,'34E','Available'),(57,3,'1B','Available'),(58,2,'1B','Available'),(59,1,'1B','Available'),(60,3,'17F','Available'),(61,2,'17F','Available'),(62,1,'17F','Available'),(63,3,'34D','Available'),(64,3,'1A','Available'),(65,2,'1A','Available'),(66,1,'1A','Available'),(67,3,'17E','Available'),(68,2,'17E','Available'),(69,1,'17E','Available'),(70,3,'34C','Available'),(71,3,'4B','Available'),(72,2,'4B','Available'),(73,1,'4B','Available'),(74,3,'20F','Available'),(75,2,'20F','Available'),(76,1,'20F','Available'),(77,3,'37D','Available'),(78,3,'4A','Available'),(79,2,'4A','Available'),(80,1,'4A','Available'),(81,3,'20E','Available'),(82,2,'20E','Available'),(83,1,'20E','Available'),(84,3,'37C','Available'),(85,3,'3F','Available'),(86,2,'3F','Available'),(87,1,'3F','Available'),(88,3,'20D','Available'),(89,2,'20D','Available'),(90,1,'20D','Available'),(91,3,'37B','Available'),(92,3,'3E','Available'),(93,2,'3E','Available'),(94,1,'3E','Available'),(95,3,'20C','Available'),(96,2,'20C','Available'),(97,1,'20C','Available'),(98,3,'37A','Available'),(99,3,'3D','Available'),(100,2,'3D','Available'),(101,1,'3D','Available'),(102,3,'20B','Available'),(103,2,'20B','Available'),(104,1,'20B','Available'),(105,3,'36F','Available'),(106,3,'3C','Available'),(107,2,'3C','Available'),(108,1,'3C','Available'),(109,3,'20A','Available'),(110,2,'20A','Available'),(111,1,'20A','Available'),(112,3,'36E','Available'),(113,3,'3B','Available'),(114,2,'3B','Available'),(115,1,'3B','Available'),(116,3,'19F','Available'),(117,2,'19F','Available'),(118,1,'19F','Available'),(119,3,'36D','Available'),(120,3,'3A','Available'),(121,2,'3A','Available'),(122,1,'3A','Available'),(123,3,'19E','Available'),(124,2,'19E','Available'),(125,1,'19E','Available'),(126,3,'36C','Available'),(127,3,'2F','Available'),(128,2,'2F','Available'),(129,1,'2F','Available'),(130,3,'19D','Available'),(131,2,'19D','Available'),(132,1,'19D','Available'),(133,3,'36B','Available'),(134,3,'2E','Available'),(135,2,'2E','Available'),(136,1,'2E','Available'),(137,3,'19C','Available'),(138,2,'19C','Available'),(139,1,'19C','Available'),(140,3,'36A','Available'),(141,3,'5F','Available'),(142,2,'5F','Available'),(143,1,'5F','Available'),(144,3,'22D','Available'),(145,2,'22D','Available'),(146,1,'22D','Available'),(147,3,'5E','Available'),(148,2,'5E','Available'),(149,1,'5E','Available'),(150,3,'22C','Available'),(151,2,'22C','Available'),(152,1,'22C','Available'),(153,3,'5D','Available'),(154,2,'5D','Available'),(155,1,'5D','Available'),(156,3,'22B','Available'),(157,2,'22B','Available'),(158,1,'22B','Available'),(159,3,'5C','Available'),(160,2,'5C','Available'),(161,1,'5C','Available'),(162,3,'22A','Available'),(163,2,'22A','Available'),(164,1,'22A','Available'),(165,3,'5B','Available'),(166,2,'5B','Available'),(167,1,'5B','Available'),(168,3,'21F','Available'),(169,2,'21F','Available'),(170,1,'21F','Available'),(171,3,'5A','Available'),(172,2,'5A','Available'),(173,1,'5A','Available'),(174,3,'21E','Available'),(175,2,'21E','Available'),(176,1,'21E','Available'),(177,3,'4F','Available'),(178,2,'4F','Available'),(179,1,'4F','Available'),(180,3,'21D','Available'),(181,2,'21D','Available'),(182,1,'21D','Available'),(183,3,'4E','Available'),(184,2,'4E','Available'),(185,1,'4E','Available'),(186,3,'21C','Available'),(187,2,'21C','Available'),(188,1,'21C','Available'),(189,3,'4D','Available'),(190,2,'4D','Available'),(191,1,'4D','Available'),(192,3,'21B','Available'),(193,2,'21B','Available'),(194,1,'21B','Available'),(195,3,'4C','Available'),(196,2,'4C','Available'),(197,1,'4C','Available'),(198,3,'21A','Available'),(199,2,'21A','Available'),(200,1,'21A','Available'),(201,3,'7D','Available'),(202,2,'7D','Available'),(203,1,'7D','Available'),(204,3,'24B','Available'),(205,2,'24B','Available'),(206,1,'24B','Available'),(207,3,'7C','Available'),(208,2,'7C','Available'),(209,1,'7C','Available'),(210,3,'24A','Available'),(211,2,'24A','Available'),(212,1,'24A','Available'),(213,3,'7B','Available'),(214,2,'7B','Available'),(215,1,'7B','Available'),(216,3,'23F','Available'),(217,2,'23F','Available'),(218,1,'23F','Available'),(219,3,'7A','Available'),(220,2,'7A','Available'),(221,1,'7A','Available'),(222,3,'23E','Available'),(223,2,'23E','Available'),(224,1,'23E','Available'),(225,3,'6F','Available'),(226,2,'6F','Available'),(227,1,'6F','Available'),(228,3,'23D','Available'),(229,2,'23D','Available'),(230,1,'23D','Available'),(231,3,'6E','Available'),(232,2,'6E','Available'),(233,1,'6E','Available'),(234,3,'23C','Available'),(235,2,'23C','Available'),(236,1,'23C','Available'),(237,3,'6D','Available'),(238,2,'6D','Available'),(239,1,'6D','Available'),(240,3,'23B','Available'),(241,2,'23B','Available'),(242,1,'23B','Available'),(243,3,'6C','Available'),(244,2,'6C','Available'),(245,1,'6C','Available'),(246,3,'23A','Available'),(247,2,'23A','Available'),(248,1,'23A','Available'),(249,3,'6B','Available'),(250,2,'6B','Available'),(251,1,'6B','Available'),(252,3,'22F','Available'),(253,2,'22F','Available'),(254,1,'22F','Available'),(255,3,'6A','Available'),(256,2,'6A','Available'),(257,1,'6A','Available'),(258,3,'22E','Available'),(259,2,'22E','Available'),(260,1,'22E','Available'),(261,3,'9B','Available'),(262,2,'9B','Available'),(263,1,'9B','Available'),(264,3,'25F','Available'),(265,2,'25F','Available'),(266,1,'25F','Available'),(267,3,'9A','Available'),(268,2,'9A','Available'),(269,1,'9A','Available'),(270,3,'25E','Available'),(271,2,'25E','Available'),(272,1,'25E','Available'),(273,3,'8F','Available'),(274,2,'8F','Available'),(275,1,'8F','Available'),(276,3,'25D','Available'),(277,2,'25D','Available'),(278,1,'25D','Available'),(279,3,'8E','Available'),(280,2,'8E','Available'),(281,1,'8E','Available'),(282,3,'25C','Available'),(283,2,'25C','Available'),(284,1,'25C','Available'),(285,3,'8D','Available'),(286,2,'8D','Available'),(287,1,'8D','Available'),(288,3,'25B','Available'),(289,2,'25B','Available'),(290,1,'25B','Available'),(291,3,'8C','Available'),(292,2,'8C','Available'),(293,1,'8C','Available'),(294,3,'25A','Available'),(295,2,'25A','Available'),(296,1,'25A','Available'),(297,3,'8B','Available'),(298,2,'8B','Available'),(299,1,'8B','Available'),(300,3,'24F','Available'),(301,2,'24F','Available'),(302,1,'24F','Available'),(303,3,'8A','Available'),(304,2,'8A','Available'),(305,1,'8A','Available'),(306,3,'24E','Available'),(307,2,'24E','Available'),(308,1,'24E','Available'),(309,3,'7F','Available'),(310,2,'7F','Available'),(311,1,'7F','Available'),(312,3,'24D','Available'),(313,2,'24D','Available'),(314,1,'24D','Available'),(315,3,'7E','Available'),(316,2,'7E','Available'),(317,1,'7E','Available'),(318,3,'24C','Available'),(319,2,'24C','Available'),(320,1,'24C','Available'),(321,3,'10F','Available'),(322,2,'10F','Available'),(323,1,'10F','Available'),(324,3,'27D','Available'),(325,2,'27D','Available'),(326,1,'27D','Available'),(327,3,'10E','Available'),(328,2,'10E','Available'),(329,1,'10E','Available'),(330,3,'27C','Available'),(331,2,'27C','Available'),(332,1,'27C','Available'),(333,3,'10D','Available'),(334,2,'10D','Available'),(335,1,'10D','Available'),(336,3,'27B','Available'),(337,2,'27B','Available'),(338,1,'27B','Available'),(339,3,'10C','Available'),(340,2,'10C','Available'),(341,1,'10C','Available'),(342,3,'27A','Available'),(343,2,'27A','Available'),(344,1,'27A','Available'),(345,3,'10B','Available'),(346,2,'10B','Available'),(347,1,'10B','Available'),(348,3,'26F','Available'),(349,2,'26F','Available'),(350,1,'26F','Available'),(351,3,'10A','Available'),(352,2,'10A','Available'),(353,1,'10A','Available'),(354,3,'26E','Available'),(355,2,'26E','Available'),(356,1,'26E','Available'),(357,3,'9F','Available'),(358,2,'9F','Available'),(359,1,'9F','Available'),(360,3,'26D','Available'),(361,2,'26D','Available'),(362,1,'26D','Available'),(363,3,'9E','Available'),(364,2,'9E','Available'),(365,1,'9E','Available'),(366,3,'26C','Available'),(367,2,'26C','Available'),(368,1,'26C','Available'),(369,3,'9D','Available'),(370,2,'9D','Available'),(371,1,'9D','Available'),(372,3,'26B','Available'),(373,2,'26B','Available'),(374,1,'26B','Available'),(375,3,'9C','Available'),(376,2,'9C','Available'),(377,1,'9C','Available'),(378,3,'26A','Available'),(379,2,'26A','Available'),(380,1,'26A','Available'),(381,3,'12D','Available'),(382,2,'12D','Available'),(383,1,'12D','Available'),(384,3,'29B','Available'),(385,2,'29B','Available'),(386,1,'29B','Available'),(387,3,'12C','Available'),(388,2,'12C','Available'),(389,1,'12C','Available'),(390,3,'29A','Available'),(391,2,'29A','Available'),(392,1,'29A','Available'),(393,3,'12B','Available'),(394,2,'12B','Available'),(395,1,'12B','Available'),(396,3,'28F','Available'),(397,2,'28F','Available'),(398,1,'28F','Available'),(399,3,'12A','Available'),(400,2,'12A','Available'),(401,1,'12A','Available'),(402,3,'28E','Available'),(403,2,'28E','Available'),(404,1,'28E','Available'),(405,3,'11F','Available'),(406,2,'11F','Available'),(407,1,'11F','Available'),(408,3,'28D','Available'),(409,2,'28D','Available'),(410,1,'28D','Available'),(411,3,'11E','Available'),(412,2,'11E','Available'),(413,1,'11E','Available'),(414,3,'28C','Available'),(415,2,'28C','Available'),(416,1,'28C','Available'),(417,3,'11D','Available'),(418,2,'11D','Available'),(419,1,'11D','Available'),(420,3,'28B','Available'),(421,2,'28B','Available'),(422,1,'28B','Available'),(423,3,'11C','Available'),(424,2,'11C','Available'),(425,1,'11C','Available'),(426,3,'28A','Available'),(427,2,'28A','Available'),(428,1,'28A','Available'),(429,3,'11B','Available'),(430,2,'11B','Available'),(431,1,'11B','Available'),(432,3,'27F','Available'),(433,2,'27F','Available'),(434,1,'27F','Available'),(435,3,'11A','Available'),(436,2,'11A','Available'),(437,1,'11A','Available'),(438,3,'27E','Available'),(439,2,'27E','Available'),(440,1,'27E','Available'),(441,3,'14B','Available'),(442,2,'14B','Available'),(443,1,'14B','Available'),(444,3,'30F','Available'),(445,2,'30F','Available'),(446,1,'30F','Available'),(447,3,'14A','Available'),(448,2,'14A','Available'),(449,1,'14A','Available'),(450,3,'30E','Available'),(451,2,'30E','Available'),(452,1,'30E','Available'),(453,3,'13F','Available'),(454,2,'13F','Available'),(455,1,'13F','Available'),(456,3,'30D','Available'),(457,2,'30D','Available'),(458,1,'30D','Available'),(459,3,'13E','Available'),(460,2,'13E','Available'),(461,1,'13E','Available'),(462,3,'30C','Available'),(463,2,'30C','Available'),(464,1,'30C','Available'),(465,3,'13D','Available'),(466,2,'13D','Available'),(467,1,'13D','Available'),(468,3,'30B','Available'),(469,2,'30B','Available'),(470,1,'30B','Available'),(471,3,'13C','Available'),(472,2,'13C','Available'),(473,1,'13C','Available'),(474,3,'30A','Available'),(475,2,'30A','Available'),(476,1,'30A','Available'),(477,3,'13B','Available'),(478,2,'13B','Available'),(479,1,'13B','Available'),(480,3,'29F','Available'),(481,2,'29F','Available'),(482,1,'29F','Available'),(483,3,'13A','Available'),(484,2,'13A','Available'),(485,1,'13A','Available'),(486,3,'29E','Available'),(487,2,'29E','Available'),(488,1,'29E','Available'),(489,3,'12F','Available'),(490,2,'12F','Available'),(491,1,'12F','Available'),(492,3,'29D','Available'),(493,2,'29D','Available'),(494,1,'29D','Available'),(495,3,'12E','Available'),(496,2,'12E','Available'),(497,1,'12E','Available'),(498,3,'29C','Available'),(499,2,'29C','Available'),(500,1,'29C','Available'),(501,3,'15F','Available'),(502,2,'15F','Available'),(503,1,'15F','Available'),(504,3,'32D','Available'),(505,3,'15E','Available'),(506,2,'15E','Available'),(507,1,'15E','Available'),(508,3,'32C','Available'),(509,2,'32C','Available'),(510,3,'15D','Available'),(511,2,'15D','Available'),(512,1,'15D','Available'),(513,3,'32B','Available'),(514,2,'32B','Available'),(515,3,'15C','Available'),(516,2,'15C','Available'),(517,1,'15C','Available'),(518,3,'32A','Available'),(519,2,'32A','Available'),(520,3,'15B','Available'),(521,2,'15B','Available'),(522,1,'15B','Available'),(523,3,'31F','Available'),(524,2,'31F','Available'),(525,3,'15A','Available'),(526,2,'15A','Available'),(527,1,'15A','Available'),(528,3,'31E','Available'),(529,2,'31E','Available'),(530,3,'14F','Available'),(531,2,'14F','Available'),(532,1,'14F','Available'),(533,3,'31D','Available'),(534,2,'31D','Available'),(535,3,'14E','Available'),(536,2,'14E','Available'),(537,1,'14E','Available'),(538,3,'31C','Available'),(539,2,'31C','Available'),(540,3,'14D','Available'),(541,2,'14D','Available'),(542,1,'14D','Available'),(543,3,'31B','Available'),(544,2,'31B','Available'),(545,3,'14C','Available'),(546,2,'14C','Available'),(547,1,'14C','Available'),(548,3,'31A','Available'),(549,2,'31A','Available'),(550,3,'17D','Available'),(551,2,'17D','Available'),(552,1,'17D','Available'),(553,3,'34B','Available'),(554,3,'17C','Available'),(555,2,'17C','Available'),(556,1,'17C','Available'),(557,3,'34A','Available'),(558,3,'17B','Available'),(559,2,'17B','Available'),(560,1,'17B','Available'),(561,3,'33F','Available'),(562,3,'17A','Available'),(563,2,'17A','Available'),(564,1,'17A','Available'),(565,3,'33E','Available'),(566,3,'16F','Available'),(567,2,'16F','Available'),(568,1,'16F','Available'),(569,3,'33D','Available'),(570,3,'16E','Available'),(571,2,'16E','Available'),(572,1,'16E','Available'),(573,3,'33C','Available'),(574,3,'16D','Available'),(575,2,'16D','Available'),(576,1,'16D','Available'),(577,3,'33B','Available'),(578,3,'16C','Available'),(579,2,'16C','Available'),(580,1,'16C','Available'),(581,3,'33A','Available'),(582,3,'16B','Available'),(583,2,'16B','Available'),(584,1,'16B','Available'),(585,3,'32F','Available'),(586,3,'16A','Available'),(587,2,'16A','Available'),(588,1,'16A','Available'),(589,3,'32E','Available');
/*!40000 ALTER TABLE `seat` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticket`
--

DROP TABLE IF EXISTS `ticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket` (
  `TicketID` int NOT NULL AUTO_INCREMENT,
  `BookingID` int NOT NULL,
  `PassengerID` int NOT NULL,
  `FlightID` int NOT NULL,
  `SeatNumber` varchar(10) NOT NULL,
  `TicketClass` enum('Economy','Business','First') DEFAULT 'Economy',
  `TicketStatus` enum('Confirmed','Cancelled') DEFAULT 'Confirmed',
  PRIMARY KEY (`TicketID`),
  UNIQUE KEY `unique_flight_seat` (`FlightID`,`SeatNumber`),
  KEY `fk_ticket_booking` (`BookingID`),
  KEY `fk_ticket_passenger` (`PassengerID`),
  CONSTRAINT `fk_ticket_booking` FOREIGN KEY (`BookingID`) REFERENCES `booking` (`BookingID`) ON DELETE CASCADE,
  CONSTRAINT `fk_ticket_flight` FOREIGN KEY (`FlightID`) REFERENCES `flight` (`FlightID`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ticket_passenger` FOREIGN KEY (`PassengerID`) REFERENCES `passenger` (`PassengerID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticket`
--

LOCK TABLES `ticket` WRITE;
/*!40000 ALTER TABLE `ticket` DISABLE KEYS */;
INSERT INTO `ticket` VALUES (1,1,1,1,'3A','Economy','Confirmed'),(2,1,2,1,'4B','Economy','Confirmed'),(3,2,3,1,'5D','Economy','Confirmed'),(4,2,4,1,'5E','Economy','Confirmed'),(5,2,5,1,'5F','Economy','Confirmed');
/*!40000 ALTER TABLE `ticket` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `UserID` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `Email` varchar(100) NOT NULL,
  `Phone` varchar(15) DEFAULT NULL,
  `Password` varchar(255) NOT NULL,
  PRIMARY KEY (`UserID`),
  UNIQUE KEY `Email` (`Email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'Test User','user@skybook.com','9876543210','user123'),(2,'R.Jeethesh','j@gmail.com','1234567890','$2b$10$bmR10g5MfGlFejTcdeV/Te72IF0aL5K8pk9ltEwvxk7Q/1gDshVNu'),(3,'R.Jeethesh','je@gmail.com','1234567890','$2b$10$bBUsAg5CKDFXTaXln5xSnuHP.mB1l2n.JTvyYTLlx42matKNCjTpu');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-27 19:51:41
