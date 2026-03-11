ALTER TABLE `blocked_times` ADD `title` varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE `blocked_times` ADD `isActive` boolean DEFAULT true NOT NULL;