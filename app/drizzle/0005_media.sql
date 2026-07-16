CREATE TABLE `talent_seo` (
	`talent_id` integer PRIMARY KEY NOT NULL,
	`meta_title` text,
	`meta_description` text,
	`focus_keyword` text,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL,
	FOREIGN KEY (`talent_id`) REFERENCES `talent`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `talent_showreel` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`talent_id` integer NOT NULL,
	`title` text,
	`url` text NOT NULL,
	`provider` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`talent_id`) REFERENCES `talent`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `showreel_talent_idx` ON `talent_showreel` (`talent_id`);--> statement-breakpoint
ALTER TABLE `talent_photo` ADD `category` text DEFAULT 'headshot' NOT NULL;