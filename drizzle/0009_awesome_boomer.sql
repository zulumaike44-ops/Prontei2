DROP INDEX `idx_wa_settings_instance` ON `whatsapp_settings`;--> statement-breakpoint
ALTER TABLE `whatsapp_settings` MODIFY COLUMN `provider` varchar(50) NOT NULL DEFAULT 'meta';--> statement-breakpoint
ALTER TABLE `whatsapp_settings` ADD `displayPhoneNumber` varchar(30);--> statement-breakpoint
ALTER TABLE `whatsapp_settings` ADD `wabaId` varchar(100);--> statement-breakpoint
ALTER TABLE `whatsapp_settings` ADD `phoneNumberId` varchar(100);--> statement-breakpoint
ALTER TABLE `whatsapp_settings` ADD `accessToken` text;--> statement-breakpoint
ALTER TABLE `whatsapp_settings` ADD `verifiedName` varchar(200);--> statement-breakpoint
ALTER TABLE `whatsapp_settings` ADD `qualityRating` varchar(20);--> statement-breakpoint
CREATE INDEX `idx_wa_settings_phone_number_id` ON `whatsapp_settings` (`phoneNumberId`);--> statement-breakpoint
CREATE INDEX `idx_wa_settings_waba` ON `whatsapp_settings` (`wabaId`);--> statement-breakpoint
ALTER TABLE `whatsapp_settings` DROP COLUMN `instanceId`;--> statement-breakpoint
ALTER TABLE `whatsapp_settings` DROP COLUMN `instanceToken`;--> statement-breakpoint
ALTER TABLE `whatsapp_settings` DROP COLUMN `clientToken`;