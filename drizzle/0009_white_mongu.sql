CREATE TABLE `call_sessions` (
	`id` varchar(128) NOT NULL,
	`conversationId` int NOT NULL,
	`callerId` int NOT NULL,
	`calleeId` int NOT NULL,
	`mode` enum('voice','video') NOT NULL,
	`status` enum('ringing','answered','declined','missed','cancelled','ended','failed') NOT NULL DEFAULT 'ringing',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`answeredAt` timestamp,
	`endedAt` timestamp,
	`durationSeconds` int NOT NULL DEFAULT 0,
	`lastPingMs` int,
	CONSTRAINT `call_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `call_sessions_conversation_started_idx` ON `call_sessions` (`conversationId`,`startedAt`);--> statement-breakpoint
CREATE INDEX `call_sessions_callee_status_idx` ON `call_sessions` (`calleeId`,`status`);--> statement-breakpoint
CREATE INDEX `call_sessions_caller_started_idx` ON `call_sessions` (`callerId`,`startedAt`);