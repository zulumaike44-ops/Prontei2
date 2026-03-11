ALTER TABLE `customers` DROP INDEX `uq_customer_phone`;--> statement-breakpoint
ALTER TABLE `customers` MODIFY COLUMN `phone` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `normalizedPhone` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `uq_customer_normalized_phone` UNIQUE(`establishmentId`,`normalizedPhone`);--> statement-breakpoint
CREATE INDEX `idx_customers_active` ON `customers` (`establishmentId`,`isActive`);