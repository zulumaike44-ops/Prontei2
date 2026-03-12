ALTER TABLE `whatsapp_conversations` ADD `conversationState` varchar(30) DEFAULT 'MENU' NOT NULL;--> statement-breakpoint
ALTER TABLE `whatsapp_conversations` ADD `selectedServiceId` int;--> statement-breakpoint
ALTER TABLE `whatsapp_conversations` ADD `selectedProfessionalId` int;--> statement-breakpoint
ALTER TABLE `whatsapp_conversations` ADD `selectedDate` varchar(10);--> statement-breakpoint
ALTER TABLE `whatsapp_conversations` ADD `selectedTime` varchar(5);--> statement-breakpoint
ALTER TABLE `whatsapp_conversations` ADD `lastInteractionAt` datetime;--> statement-breakpoint
CREATE INDEX `idx_wa_conv_state` ON `whatsapp_conversations` (`establishmentId`,`conversationState`);