CREATE TABLE `talent_press_mention` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`talent_id` integer NOT NULL,
	`title` text NOT NULL,
	`outlet` text NOT NULL,
	`url` text NOT NULL,
	`published_on` text NOT NULL,
	`added_at` text NOT NULL,
	`added_by` text NOT NULL,
	FOREIGN KEY (`talent_id`) REFERENCES `talent`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `press_mention_talent_idx` ON `talent_press_mention` (`talent_id`,`published_on`);--> statement-breakpoint
CREATE TABLE `talent_social_link` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`talent_id` integer NOT NULL,
	`platform` text NOT NULL,
	`url` text NOT NULL,
	`handle` text,
	`followers` integer,
	`followers_set_at` text,
	`followers_set_by` text,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`talent_id`) REFERENCES `talent`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `social_link_talent_idx` ON `talent_social_link` (`talent_id`);