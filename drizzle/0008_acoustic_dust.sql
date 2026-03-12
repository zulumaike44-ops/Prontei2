ALTER TABLE `whatsapp_settings` ADD `status` varchar(30) DEFAULT 'disconnected' NOT NULL;--> statement-breakpoint
ALTER TABLE `whatsapp_settings` ADD `connectedAt` datetime;--> statement-breakpoint
ALTER TABLE `whatsapp_settings` DROP COLUMN `accessToken`;--> statement-breakpoint
ALTER TABLE `whatsapp_settings` DROP COLUMN `webhookVerifyToken`;--> statement-breakpoint
ALTER TABLE `whatsapp_settings` DROP COLUMN `phoneNumberId`;--> statement-breakpoint
ALTER TABLE `whatsapp_settings` DROP COLUMN `businessAccountId`;