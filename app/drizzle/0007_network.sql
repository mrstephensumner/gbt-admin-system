ALTER TABLE `brand` ADD `url` text;--> statement-breakpoint
ALTER TABLE `brand` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `brand` ADD `sort_order` integer DEFAULT 0 NOT NULL;