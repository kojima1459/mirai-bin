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
