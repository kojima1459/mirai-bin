CREATE TABLE `families` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`name` varchar(100) DEFAULT 'マイファミリー',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `families_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `family_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`familyId` int NOT NULL,
	`invitedEmail` varchar(320) NOT NULL,
	`token` varchar(64) NOT NULL,
	`status` enum('pending','accepted','revoked') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `family_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `family_invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `family_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`familyId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','member') NOT NULL DEFAULT 'member',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `family_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interview_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`sender` enum('ai','user') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `interview_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interview_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recipientName` varchar(100),
	`topic` varchar(100),
	`status` enum('active','completed') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `interview_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `letters` ADD `visibilityScope` enum('private','family','link') DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE `letters` ADD `familyId` int;--> statement-breakpoint
ALTER TABLE `letters` ADD `encryptedAudioUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `letters` ADD `encryptedAudioIv` varchar(255);--> statement-breakpoint
ALTER TABLE `letters` ADD `encryptedAudioMimeType` varchar(100);--> statement-breakpoint
ALTER TABLE `letters` ADD `encryptedAudioByteSize` int;--> statement-breakpoint
ALTER TABLE `letters` ADD `encryptedAudioDurationSec` int;--> statement-breakpoint
ALTER TABLE `letters` ADD `encryptedAudioCryptoVersion` varchar(20);