ALTER TABLE `appointments` ADD `manageToken` varchar(64);--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `uq_appt_manage_token` UNIQUE(`manageToken`);