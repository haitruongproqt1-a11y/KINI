CREATE TABLE `push_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`expoPushToken` varchar(255) NOT NULL,
	`platform` varchar(24) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastActiveAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `push_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_devices_token_unique` UNIQUE(`expoPushToken`)
);
--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `authKind` enum('kini_password','oauth') DEFAULT 'kini_password' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `passwordUpdatedAt` timestamp;--> statement-breakpoint
CREATE INDEX `push_devices_user_idx` ON `push_devices` (`userId`);