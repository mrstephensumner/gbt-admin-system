CREATE TABLE `talent_onboarding_step` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`talent_id` integer NOT NULL,
	`step_key` text NOT NULL,
	`status` text NOT NULL,
	`note` text,
	`actor` text NOT NULL,
	`at` text NOT NULL,
	FOREIGN KEY (`talent_id`) REFERENCES `talent`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `onboarding_step_talent_key_idx` ON `talent_onboarding_step` (`talent_id`,`step_key`);--> statement-breakpoint
CREATE INDEX `onboarding_step_talent_idx` ON `talent_onboarding_step` (`talent_id`);--> statement-breakpoint
ALTER TABLE `talent` ADD `half_day_rate_pence` integer;--> statement-breakpoint
ALTER TABLE `talent` ADD `after_dinner_rate_pence` integer;--> statement-breakpoint
ALTER TABLE `talent` ADD `travel_terms` text;--> statement-breakpoint
ALTER TABLE `talent` ADD `fees_vary_by_site` integer DEFAULT false NOT NULL;