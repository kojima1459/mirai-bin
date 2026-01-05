ALTER TABLE `letters` MODIFY COLUMN `useShamir` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `letters` ADD `wrappedClientShare` text;--> statement-breakpoint
ALTER TABLE `letters` ADD `wrappedClientShareIv` varchar(255);--> statement-breakpoint
ALTER TABLE `letters` ADD `wrappedClientShareSalt` varchar(255);--> statement-breakpoint
ALTER TABLE `letters` ADD `wrappedClientShareKdf` varchar(50);--> statement-breakpoint
ALTER TABLE `letters` ADD `wrappedClientShareKdfIters` int;--> statement-breakpoint
ALTER TABLE `letters` DROP COLUMN `transcription`;--> statement-breakpoint
ALTER TABLE `letters` DROP COLUMN `aiDraft`;--> statement-breakpoint
ALTER TABLE `letters` DROP COLUMN `finalContent`;--> statement-breakpoint
ALTER TABLE `letters` DROP COLUMN `backupShare`;