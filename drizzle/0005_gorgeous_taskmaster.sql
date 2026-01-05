ALTER TABLE `letters` ADD `serverShare` text;--> statement-breakpoint
ALTER TABLE `letters` ADD `backupShare` text;--> statement-breakpoint
ALTER TABLE `letters` ADD `useShamir` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `letters` DROP COLUMN `keyShard1`;--> statement-breakpoint
ALTER TABLE `letters` DROP COLUMN `keyShard2`;--> statement-breakpoint
ALTER TABLE `letters` DROP COLUMN `keyShard3`;