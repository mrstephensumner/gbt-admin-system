CREATE TABLE `brand` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brand_slug_idx` ON `brand` (`slug`);--> statement-breakpoint
CREATE TABLE `change_record` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`talent_id` integer NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`field` text,
	`old_value` text,
	`new_value` text,
	`at` text NOT NULL,
	FOREIGN KEY (`talent_id`) REFERENCES `talent`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `change_talent_idx` ON `change_record` (`talent_id`,`id`);--> statement-breakpoint
CREATE TABLE `publication` (
	`talent_id` integer NOT NULL,
	`brand_id` integer NOT NULL,
	`published_at` text NOT NULL,
	`published_by` text NOT NULL,
	PRIMARY KEY(`talent_id`, `brand_id`),
	FOREIGN KEY (`talent_id`) REFERENCES `talent`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`brand_id`) REFERENCES `brand`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ref_counter` (
	`id` integer PRIMARY KEY NOT NULL,
	`next_number` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `talent` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference` text NOT NULL,
	`name` text NOT NULL,
	`headline` text,
	`biography` text,
	`day_rate_pence` integer,
	`location` text,
	`email` text,
	`phone` text,
	`status` text DEFAULT 'available' NOT NULL,
	`archived_at` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL,
	CONSTRAINT "talent_status_check" CHECK(status IN ('available', 'on_hold', 'booked', 'confirmed', 'cancelled')),
	CONSTRAINT "talent_day_rate_check" CHECK(day_rate_pence IS NULL OR day_rate_pence >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `talent_reference_idx` ON `talent` (`reference`);--> statement-breakpoint
CREATE INDEX `talent_name_idx` ON `talent` (`name`);--> statement-breakpoint
CREATE INDEX `talent_status_idx` ON `talent` (`status`);--> statement-breakpoint
CREATE INDEX `talent_archived_idx` ON `talent` (`archived_at`);--> statement-breakpoint
CREATE INDEX `talent_day_rate_idx` ON `talent` (`day_rate_pence`);--> statement-breakpoint
CREATE TABLE `talent_photo` (
	`id` text PRIMARY KEY NOT NULL,
	`talent_id` integer NOT NULL,
	`r2_key_original` text NOT NULL,
	`r2_key_display` text NOT NULL,
	`content_type` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`talent_id`) REFERENCES `talent`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `photo_talent_idx` ON `talent_photo` (`talent_id`);--> statement-breakpoint
CREATE TABLE `talent_topic` (
	`talent_id` integer NOT NULL,
	`topic_id` integer NOT NULL,
	PRIMARY KEY(`talent_id`, `topic_id`),
	FOREIGN KEY (`talent_id`) REFERENCES `talent`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`topic_id`) REFERENCES `topic`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `talent_topic_topic_idx` ON `talent_topic` (`topic_id`);--> statement-breakpoint
CREATE TABLE `topic` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `topic_name_idx` ON `topic` ("name" COLLATE NOCASE);--> statement-breakpoint
INSERT INTO ref_counter (id, next_number) VALUES (1, 1);
