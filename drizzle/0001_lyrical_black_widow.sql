CREATE TABLE `conversation_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	`lastReadMessageId` int,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversation_participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversation_participants_unique` UNIQUE(`conversationId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('direct','group') NOT NULL DEFAULT 'direct',
	`title` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastMessageAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `friend_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromUserId` int NOT NULL,
	`toUserId` int NOT NULL,
	`status` enum('pending','accepted','declined','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`respondedAt` timestamp,
	CONSTRAINT `friend_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `friend_requests_direction_unique` UNIQUE(`fromUserId`,`toUserId`)
);
--> statement-breakpoint
CREATE TABLE `message_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('sent','delivered','read') NOT NULL DEFAULT 'sent',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `message_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `message_receipts_message_user_unique` UNIQUE(`messageId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`senderId` int NOT NULL,
	`kind` enum('text','image','album','file','sticker') NOT NULL DEFAULT 'text',
	`content` text NOT NULL,
	`attachmentUrl` varchar(1024),
	`attachmentName` varchar(255),
	`replyToMessageId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`editedAt` timestamp,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(64) NOT NULL,
	`displayName` varchar(128) NOT NULL,
	`avatarColor` varchar(16) NOT NULL DEFAULT '#1677FF',
	`securityQuestion` varchar(255),
	`securityAnswerHash` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_user_id_unique` UNIQUE(`userId`),
	CONSTRAINT `user_profiles_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE INDEX `conversation_participants_user_idx` ON `conversation_participants` (`userId`);--> statement-breakpoint
CREATE INDEX `friend_requests_recipient_status_idx` ON `friend_requests` (`toUserId`,`status`);--> statement-breakpoint
CREATE INDEX `message_receipts_user_status_idx` ON `message_receipts` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `messages_conversation_created_idx` ON `messages` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `messages_sender_idx` ON `messages` (`senderId`);