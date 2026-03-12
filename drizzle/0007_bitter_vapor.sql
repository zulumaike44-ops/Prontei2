ALTER TABLE `whatsapp_settings` MODIFY COLUMN `provider` varchar(50) NOT NULL DEFAULT 'z-api';--> statement-breakpoint
ALTER TABLE `whatsapp_settings` ADD `instanceId` varchar(100);--> statement-breakpoint
ALTER TABLE `whatsapp_settings` ADD `instanceToken` varchar(200);--> statement-breakpoint
ALTER TABLE `whatsapp_settings` ADD `clientToken` text;--> statement-breakpoint
CREATE INDEX `idx_wa_settings_instance` ON `whatsapp_settings` (`instanceId`);