ALTER TABLE `templates` ADD `subtitle` varchar(200);--> statement-breakpoint
ALTER TABLE `templates` ADD `category` varchar(50) DEFAULT 'emotion' NOT NULL;--> statement-breakpoint
ALTER TABLE `templates` ADD `recordingGuide` text;--> statement-breakpoint
ALTER TABLE `templates` ADD `isRecommended` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `templates` ADD `sortOrder` int DEFAULT 100 NOT NULL;