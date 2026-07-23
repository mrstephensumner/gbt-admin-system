CREATE TABLE `talent_availability` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`talent_id` integer NOT NULL,
	`state` text NOT NULL,
	`title` text NOT NULL,
	`detail` text,
	`location` text,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`talent_id`) REFERENCES `talent`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `availability_talent_idx` ON `talent_availability` (`talent_id`);--> statement-breakpoint
CREATE INDEX `availability_range_idx` ON `talent_availability` (`talent_id`,`start_date`,`end_date`);--> statement-breakpoint
ALTER TABLE `talent` ADD `working_week` text;