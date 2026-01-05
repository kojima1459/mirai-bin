ALTER TABLE `letters` ADD `otsFileUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `letters` ADD `otsStatus` varchar(20) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `letters` ADD `otsSubmittedAt` timestamp;--> statement-breakpoint
ALTER TABLE `letters` ADD `otsConfirmedAt` timestamp;