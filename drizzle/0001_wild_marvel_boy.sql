CREATE TABLE `appointment_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointmentId` int NOT NULL,
	`previousStatus` varchar(20),
	`newStatus` varchar(20) NOT NULL,
	`changedBy` int,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appointment_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`establishmentId` int NOT NULL,
	`professionalId` int NOT NULL,
	`serviceId` int NOT NULL,
	`customerId` int,
	`startDatetime` datetime NOT NULL,
	`endDatetime` datetime NOT NULL,
	`durationMinutes` smallint NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`price` decimal(10,2) NOT NULL,
	`notes` text,
	`source` varchar(20) NOT NULL DEFAULT 'manual',
	`cancelledAt` datetime,
	`cancellationReason` varchar(255),
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`establishmentId` int,
	`userId` int,
	`action` varchar(50) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int,
	`oldValues` json,
	`newValues` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blocked_times` (
	`id` int AUTO_INCREMENT NOT NULL,
	`establishmentId` int NOT NULL,
	`professionalId` int,
	`startDatetime` datetime NOT NULL,
	`endDatetime` datetime NOT NULL,
	`reason` varchar(255),
	`isAllDay` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blocked_times_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `business_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`icon` varchar(50),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_types_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`establishmentId` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`phone` varchar(20),
	`email` varchar(255),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_customer_phone` UNIQUE(`establishmentId`,`phone`)
);
--> statement-breakpoint
CREATE TABLE `establishments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`businessTypeId` int NOT NULL,
	`subscriptionPlanId` int,
	`name` varchar(200) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`description` text,
	`logoUrl` text,
	`phone` varchar(20),
	`email` varchar(255),
	`addressZipcode` varchar(10),
	`addressStreet` varchar(255),
	`addressNumber` varchar(20),
	`addressComplement` varchar(100),
	`addressNeighborhood` varchar(100),
	`addressCity` varchar(100),
	`addressState` char(2),
	`timezone` varchar(50) NOT NULL DEFAULT 'America/Sao_Paulo',
	`onboardingStep` smallint NOT NULL DEFAULT 1,
	`onboardingCompleted` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `establishments_id` PRIMARY KEY(`id`),
	CONSTRAINT `establishments_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `professional_services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`professionalId` int NOT NULL,
	`serviceId` int NOT NULL,
	`customPrice` decimal(10,2),
	`customDurationMinutes` smallint,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `professional_services_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_prof_service` UNIQUE(`professionalId`,`serviceId`)
);
--> statement-breakpoint
CREATE TABLE `professionals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`establishmentId` int NOT NULL,
	`userId` int,
	`name` varchar(150) NOT NULL,
	`email` varchar(255),
	`phone` varchar(20),
	`avatarUrl` text,
	`bio` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`displayOrder` smallint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `professionals_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_professionals_email` UNIQUE(`establishmentId`,`email`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`establishmentId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`durationMinutes` smallint NOT NULL,
	`price` decimal(10,2) NOT NULL DEFAULT '0',
	`category` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`displayOrder` smallint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`priceMonthly` decimal(10,2) NOT NULL DEFAULT '0',
	`priceYearly` decimal(10,2),
	`maxProfessionals` smallint,
	`maxServices` smallint,
	`maxAppointmentsMonth` int,
	`features` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`displayOrder` smallint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_plans_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `working_hours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`establishmentId` int NOT NULL,
	`professionalId` int,
	`dayOfWeek` smallint NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`breakStart` varchar(5),
	`breakEnd` varchar(5),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `working_hours_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_working_hours` UNIQUE(`establishmentId`,`professionalId`,`dayOfWeek`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerifiedAt` timestamp;--> statement-breakpoint
CREATE INDEX `idx_status_history_appt` ON `appointment_status_history` (`appointmentId`);--> statement-breakpoint
CREATE INDEX `idx_appt_establishment` ON `appointments` (`establishmentId`);--> statement-breakpoint
CREATE INDEX `idx_appt_prof_range` ON `appointments` (`establishmentId`,`professionalId`,`startDatetime`,`endDatetime`);--> statement-breakpoint
CREATE INDEX `idx_appt_start` ON `appointments` (`establishmentId`,`startDatetime`);--> statement-breakpoint
CREATE INDEX `idx_appt_customer` ON `appointments` (`establishmentId`,`customerId`);--> statement-breakpoint
CREATE INDEX `idx_appt_status` ON `appointments` (`establishmentId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_audit_establishment` ON `audit_logs` (`establishmentId`);--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `audit_logs` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `idx_audit_created` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_blocked_establishment` ON `blocked_times` (`establishmentId`);--> statement-breakpoint
CREATE INDEX `idx_blocked_prof` ON `blocked_times` (`establishmentId`,`professionalId`);--> statement-breakpoint
CREATE INDEX `idx_blocked_range` ON `blocked_times` (`startDatetime`,`endDatetime`);--> statement-breakpoint
CREATE INDEX `idx_business_types_active` ON `business_types` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_customers_establishment` ON `customers` (`establishmentId`);--> statement-breakpoint
CREATE INDEX `idx_customers_name` ON `customers` (`establishmentId`,`name`);--> statement-breakpoint
CREATE INDEX `idx_establishments_owner` ON `establishments` (`ownerId`);--> statement-breakpoint
CREATE INDEX `idx_establishments_business_type` ON `establishments` (`businessTypeId`);--> statement-breakpoint
CREATE INDEX `idx_establishments_active` ON `establishments` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_prof_services_prof` ON `professional_services` (`professionalId`);--> statement-breakpoint
CREATE INDEX `idx_prof_services_service` ON `professional_services` (`serviceId`);--> statement-breakpoint
CREATE INDEX `idx_professionals_establishment` ON `professionals` (`establishmentId`);--> statement-breakpoint
CREATE INDEX `idx_professionals_active` ON `professionals` (`establishmentId`,`isActive`);--> statement-breakpoint
CREATE INDEX `idx_services_establishment` ON `services` (`establishmentId`);--> statement-breakpoint
CREATE INDEX `idx_services_active` ON `services` (`establishmentId`,`isActive`);--> statement-breakpoint
CREATE INDEX `idx_services_category` ON `services` (`establishmentId`,`category`);--> statement-breakpoint
CREATE INDEX `idx_plans_active` ON `subscription_plans` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_working_hours_establishment` ON `working_hours` (`establishmentId`);