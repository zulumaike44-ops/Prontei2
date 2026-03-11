CREATE TABLE `whatsapp_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`establishmentId` int NOT NULL,
	`customerId` int,
	`phone` varchar(20) NOT NULL,
	`normalizedPhone` varchar(20) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'open',
	`lastMessageAt` datetime,
	`lastMessagePreview` varchar(255),
	`messageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`direction` varchar(10) NOT NULL,
	`messageType` varchar(20) NOT NULL DEFAULT 'text',
	`content` text,
	`externalMessageId` varchar(100),
	`status` varchar(20) NOT NULL DEFAULT 'received',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsapp_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`establishmentId` int NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT false,
	`phoneNumber` varchar(20),
	`provider` varchar(50) NOT NULL DEFAULT 'meta',
	`accessToken` text,
	`webhookVerifyToken` varchar(100),
	`phoneNumberId` varchar(50),
	`businessAccountId` varchar(50),
	`autoReplyEnabled` boolean NOT NULL DEFAULT true,
	`autoReplyMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_whatsapp_settings_establishment` UNIQUE(`establishmentId`)
);
--> statement-breakpoint
CREATE INDEX `idx_wa_conv_establishment` ON `whatsapp_conversations` (`establishmentId`);--> statement-breakpoint
CREATE INDEX `idx_wa_conv_phone` ON `whatsapp_conversations` (`establishmentId`,`normalizedPhone`);--> statement-breakpoint
CREATE INDEX `idx_wa_conv_customer` ON `whatsapp_conversations` (`establishmentId`,`customerId`);--> statement-breakpoint
CREATE INDEX `idx_wa_conv_status` ON `whatsapp_conversations` (`establishmentId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_wa_conv_last_msg` ON `whatsapp_conversations` (`establishmentId`,`lastMessageAt`);--> statement-breakpoint
CREATE INDEX `idx_wa_msg_conversation` ON `whatsapp_messages` (`conversationId`);--> statement-breakpoint
CREATE INDEX `idx_wa_msg_direction` ON `whatsapp_messages` (`conversationId`,`direction`);--> statement-breakpoint
CREATE INDEX `idx_wa_msg_external` ON `whatsapp_messages` (`externalMessageId`);