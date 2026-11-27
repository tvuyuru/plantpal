-- PlantPal: full database schema (users, plants, diagnoses).
-- Built in dependency order: users first, because plants and diagnoses
-- have foreign keys to users.id (and diagnoses also references plants.id).
-- Run once against the plant_pal database:
--   mysql -u root -p plant_pal < db/schema.sql

-- ---------- users ----------
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for each user. Primary key; plants.user_id points to it',
  `username` varchar(50) NOT NULL COMMENT 'Login name chosen at registration. Unique',
  `first_name` varchar(50) NOT NULL COMMENT 'First name entered at registration',
  `last_name` varchar(50) NOT NULL COMMENT 'Last name entered at registration',
  `name` varchar(100) NOT NULL COMMENT 'Display name shown after login. Not unique',
  `email` varchar(255) NOT NULL COMMENT 'Login ID and contact email. Unique, stored in lowercase',
  `zip_code` varchar(10) DEFAULT NULL COMMENT 'Optional US zip code, used to look up the local climate for plant diagnosis. Text so a leading 0 is kept',
  `password_hash` varchar(255) DEFAULT NULL COMMENT 'Hashed password (never the plain password). NULL for Google sign-in accounts, which have no PlantPal password',
  `auth_provider` varchar(20) NOT NULL DEFAULT 'local' COMMENT 'How the account signs in: local (email + password) or google. Tells the login code which check to run',
  `provider_user_id` varchar(255) DEFAULT NULL COMMENT 'The ID the provider (e.g. Google) gives this person. NULL for local accounts, which have none',
  `role` enum('user','admin') NOT NULL DEFAULT 'user' COMMENT 'Privilege level: user (own plants only) or admin. New accounts default to user',
  `last_login_at` timestamp NULL DEFAULT NULL COMMENT 'Time of last login. Empty until the first login',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the account was created. Set automatically',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'When the row was last changed (e.g. Profile edit). Refreshed automatically',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_provider` (`auth_provider`,`provider_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------- plants ----------
CREATE TABLE IF NOT EXISTS `plants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `species` varchar(100) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `notes` varchar(1000) DEFAULT NULL,
  `last_watered` date DEFAULT NULL,
  `water_every_days` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_plants_user` (`user_id`),
  CONSTRAINT `fk_plants_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------- diagnoses ----------
CREATE TABLE IF NOT EXISTS `diagnoses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plant_id` int NOT NULL,
  `user_id` int NOT NULL,
  `symptoms` text NOT NULL,
  `result` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_diag_plant` (`plant_id`),
  KEY `fk_diag_user` (`user_id`),
  CONSTRAINT `fk_diag_plant` FOREIGN KEY (`plant_id`) REFERENCES `plants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_diag_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;