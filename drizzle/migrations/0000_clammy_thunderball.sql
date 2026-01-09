CREATE TABLE `drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`templateName` varchar(50),
	`recipientName` varchar(100),
	`recipientRelation` varchar(50),
	`audioUrl` varchar(500),
	`audioBase64` text,
	`transcription` text,
	`aiDraft` text,
	`finalContent` text,
	`unlockAt` timestamp,
	`currentStep` varchar(20) NOT NULL DEFAULT 'template',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `letter_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`letterId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'before_unlock',
	`daysBefore` int NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`sentAt` timestamp,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `letter_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `letter_share_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`letterId` int NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`replacedByToken` varchar(64),
	`revokeReason` varchar(255),
	`viewCount` int NOT NULL DEFAULT 0,
	`lastAccessedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `letter_share_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `letter_share_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `letters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`visibilityScope` enum('private','family','link') NOT NULL DEFAULT 'private',
	`familyId` int,
	`recipientName` varchar(100),
	`recipientRelation` varchar(50),
	`audioUrl` varchar(500),
	`audioDuration` int,
	`encryptedAudioUrl` varchar(500),
	`encryptedAudioIv` varchar(255),
	`encryptedAudioMimeType` varchar(100),
	`encryptedAudioByteSize` int,
	`encryptedAudioDurationSec` int,
	`encryptedAudioCryptoVersion` varchar(20),
	`templateUsed` varchar(50),
	`isEncrypted` boolean NOT NULL DEFAULT true,
	`encryptionIv` varchar(255) NOT NULL,
	`ciphertextUrl` varchar(500) NOT NULL,
	`proofHash` varchar(64) NOT NULL,
	`proofProvider` varchar(50) DEFAULT 'local',
	`txHash` varchar(66),
	`proofCreatedAt` timestamp,
	`otsFileUrl` varchar(500),
	`otsStatus` varchar(20) DEFAULT 'pending',
	`otsSubmittedAt` timestamp,
	`otsConfirmedAt` timestamp,
	`unlockAt` timestamp,
	`unlockPolicy` varchar(50) DEFAULT 'datetime',
	`isUnlocked` boolean NOT NULL DEFAULT false,
	`unlockedAt` timestamp,
	`shareToken` varchar(64),
	`viewCount` int NOT NULL DEFAULT 0,
	`lastViewedAt` timestamp,
	`serverShare` text,
	`useShamir` boolean NOT NULL DEFAULT true,
	`wrappedClientShare` text,
	`wrappedClientShareIv` varchar(255),
	`wrappedClientShareSalt` varchar(255),
	`wrappedClientShareKdf` varchar(50),
	`wrappedClientShareKdfIters` int,
	`unlockCodeRegeneratedAt` timestamp,
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `letters_id` PRIMARY KEY(`id`),
	CONSTRAINT `letters_shareToken_unique` UNIQUE(`shareToken`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`meta` text,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`displayName` varchar(100) NOT NULL,
	`subtitle` varchar(200),
	`description` text,
	`category` varchar(50) NOT NULL DEFAULT 'emotion',
	`prompt` text NOT NULL,
	`recordingPrompt` text NOT NULL,
	`recordingGuide` text,
	`exampleOneLiner` text,
	`icon` varchar(50),
	`isRecommended` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 100,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `templates_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`notificationEmail` varchar(320),
	`trustedContactEmail` varchar(320),
	`notifyEnabled` boolean NOT NULL DEFAULT true,
	`notifyDaysBefore` int NOT NULL DEFAULT 7,
	`notificationEmailVerified` boolean NOT NULL DEFAULT false,
	`notificationEmailVerifyToken` varchar(64),
	`notificationEmailVerifyExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
