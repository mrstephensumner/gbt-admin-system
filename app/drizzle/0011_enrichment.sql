CREATE TABLE `enrichment_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`key_ciphertext` text,
	`key_iv` text,
	`key_hint` text,
	`model` text NOT NULL,
	`banned_words` text DEFAULT '[]' NOT NULL,
	`house_style` text,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `talent_site_bio` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`talent_id` integer NOT NULL,
	`brand_id` integer NOT NULL,
	`body` text NOT NULL,
	`state` text NOT NULL,
	`word_count` integer NOT NULL,
	`similarity` integer NOT NULL,
	`model` text,
	`generated_by` text,
	`generated_at` text,
	`admin_approved_by` text,
	`admin_approved_at` text,
	`talent_approved_by` text,
	`talent_approved_at` text,
	`published_at` text,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`talent_id`) REFERENCES `talent`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`brand_id`) REFERENCES `brand`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_bio_talent_brand_idx` ON `talent_site_bio` (`talent_id`,`brand_id`);--> statement-breakpoint
CREATE INDEX `site_bio_talent_idx` ON `talent_site_bio` (`talent_id`);--> statement-breakpoint
ALTER TABLE `brand` ADD `brief_audience` text;--> statement-breakpoint
ALTER TABLE `brand` ADD `brief_tone` text;--> statement-breakpoint
ALTER TABLE `brand` ADD `brief_wordmin` integer;--> statement-breakpoint
ALTER TABLE `brand` ADD `brief_wordmax` integer;--> statement-breakpoint
ALTER TABLE `brand` ADD `brief_include` text;--> statement-breakpoint
ALTER TABLE `brand` ADD `brief_exclude` text;--> statement-breakpoint
ALTER TABLE `talent` ADD `source_material` text;
--> statement-breakpoint
INSERT INTO enrichment_settings (id, model, banned_words, updated_by, updated_at) VALUES (1, 'claude-sonnet-5', '[]', 'system', '2026-07-23T00:00:00Z') ON CONFLICT(id) DO NOTHING;
