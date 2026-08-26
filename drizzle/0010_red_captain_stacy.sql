CREATE TABLE `kini_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kiniUserId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`avatar` varchar(1024),
	`gender` enum('male','female','other','prefer_not'),
	`status` enum('single','dating','married','complicated','prefer_not'),
	`province` varchar(128),
	`birthYear` int,
	`bio` text,
	`job` varchar(128),
	`lat` double,
	`lng` double,
	`isDiscoverable` boolean NOT NULL DEFAULT true,
	`hiddenUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kini_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `kini_users_user_id_unique` UNIQUE(`kiniUserId`)
);
--> statement-breakpoint
CREATE INDEX `kini_users_discovery_idx` ON `kini_users` (`isDiscoverable`,`hiddenUntil`);--> statement-breakpoint
CREATE INDEX `kini_users_coordinates_idx` ON `kini_users` (`lat`,`lng`);