
-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS `yogshala_local`;

-- Use the created database
USE `yogshala_local`;

-- Table structure for table `admins`
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for table `teachers`
CREATE TABLE IF NOT EXISTS `teachers` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for table `students`
CREATE TABLE IF NOT EXISTS `students` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `subscription_status` ENUM('active', 'expired') NOT NULL DEFAULT 'expired',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for table `batches`
CREATE TABLE IF NOT EXISTS `batches` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `teacher_id` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `teacher_id` (`teacher_id`),
  CONSTRAINT `batches_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for table `students_batches`
CREATE TABLE IF NOT EXISTS `students_batches` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `student_id` INT(11) NOT NULL,
  `batch_id` INT(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_batch` (`student_id`,`batch_id`),
  KEY `batch_id` (`batch_id`),
  CONSTRAINT `students_batches_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `students_batches_ibfk_2` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for table `schedules`
CREATE TABLE IF NOT EXISTS `schedules` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `batch_id` INT(11) NOT NULL,
  `class_time` TIME NOT NULL,
  `duration` INT(11) NOT NULL COMMENT 'Duration in minutes',
  `class_date` DATE NOT NULL,
  PRIMARY KEY (`id`),
  KEY `batch_id` (`batch_id`),
  CONSTRAINT `schedules_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for table `live_classes`
CREATE TABLE IF NOT EXISTS `live_classes` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `schedule_id` INT(11) NOT NULL,
  `room_name` VARCHAR(255) NOT NULL,
  `status` ENUM('upcoming', 'live', 'ended', 'cancelled') NOT NULL DEFAULT 'upcoming',
  `start_time` TIMESTAMP NULL DEFAULT NULL,
  `end_time` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `schedule_id` (`schedule_id`),
  CONSTRAINT `live_classes_ibfk_1` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for table `attendance`
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `student_id` INT(11) NOT NULL,
  `live_class_id` INT(11) NOT NULL,
  `join_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `leave_time` TIMESTAMP NULL DEFAULT NULL,
  `duration` INT(11) DEFAULT NULL COMMENT 'Duration in minutes',
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `live_class_id` (`live_class_id`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`live_class_id`) REFERENCES `live_classes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for table `payments`
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `student_id` INT(11) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expiry_date` DATE NOT NULL,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS enquiries (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(200) NOT NULL, phone VARCHAR(25) NOT NULL, email VARCHAR(200) NOT NULL, details TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS recordings (id INT AUTO_INCREMENT PRIMARY KEY, batch_id INT NOT NULL, title VARCHAR(200) NOT NULL, url VARCHAR(2000) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(batch_id) REFERENCES batches(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
