CREATE TABLE `android_release_signing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyId` varchar(64) NOT NULL,
	`keystoreBase64` text NOT NULL,
	`storePassword` varchar(255) NOT NULL,
	`keyAlias` varchar(128) NOT NULL,
	`keyPassword` varchar(255) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `android_release_signing_id` PRIMARY KEY(`id`),
	CONSTRAINT `android_release_signing_key_id_unique` UNIQUE(`keyId`)
);
