CREATE TABLE `user_sessions` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`deviceName` varchar(128) NOT NULL,
	`platform` varchar(24) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastActiveAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_sessions_user_active_idx` ON `user_sessions` (`userId`,`revokedAt`);