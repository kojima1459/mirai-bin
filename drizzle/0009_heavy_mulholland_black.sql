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
