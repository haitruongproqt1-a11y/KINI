ALTER TABLE `messages` ADD `clientMessageId` varchar(64);--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_client_unique` UNIQUE(`senderId`,`clientMessageId`);