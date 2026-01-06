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
