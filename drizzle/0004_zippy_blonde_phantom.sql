ALTER TABLE `conversation_participants` ADD `unreadCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `lastMessagePreview` varchar(255);