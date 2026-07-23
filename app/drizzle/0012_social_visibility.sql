CREATE TABLE `talent_notable_post` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`talent_id` integer NOT NULL,
	`platform` text NOT NULL,
	`url` text NOT NULL,
	`caption` text,
	`interactions` integer DEFAULT 0 NOT NULL,
	`posted_on` text NOT NULL,
	`public` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`talent_id`) REFERENCES `talent`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notable_post_talent_idx` ON `talent_notable_post` (`talent_id`,`posted_on`);--> statement-breakpoint
ALTER TABLE `talent_press_mention` ADD `public` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `talent_social_link` ADD `public` integer DEFAULT 1 NOT NULL;