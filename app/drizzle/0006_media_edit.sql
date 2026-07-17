ALTER TABLE `talent_photo` ADD `caption` text;--> statement-breakpoint
ALTER TABLE `talent_showreel` ADD `sort_order` integer DEFAULT 0 NOT NULL;