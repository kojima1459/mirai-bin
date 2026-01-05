ALTER TABLE `letters` ADD `shareToken` varchar(64);--> statement-breakpoint
ALTER TABLE `letters` ADD `viewCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `letters` ADD `lastViewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `letters` ADD CONSTRAINT `letters_shareToken_unique` UNIQUE(`shareToken`);