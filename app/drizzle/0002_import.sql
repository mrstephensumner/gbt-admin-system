CREATE TABLE `import_candidate` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` text NOT NULL,
	`name` text NOT NULL,
	`headline` text,
	`biography` text,
	`topics_json` text DEFAULT '[]' NOT NULL,
	`day_rate_pence` integer,
	`location` text,
	`email` text,
	`phone` text,
	`photo_url` text,
	`gaps_json` text DEFAULT '[]' NOT NULL,
	`duplicate_of` text,
	`status` text DEFAULT 'new' NOT NULL,
	`talent_reference` text,
	`first_seen_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`decided_at` text,
	`decided_by` text,
	CONSTRAINT "import_candidate_status_check" CHECK(status IN ('new', 'imported', 'skipped'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `import_candidate_source_idx` ON `import_candidate` ("source_id" COLLATE NOCASE);--> statement-breakpoint
CREATE INDEX `import_candidate_status_idx` ON `import_candidate` (`status`);--> statement-breakpoint
CREATE TABLE `import_run` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_name` text NOT NULL,
	`operator` text NOT NULL,
	`at` text NOT NULL,
	`rows_found` integer NOT NULL,
	`rows_staged` integer NOT NULL,
	`rows_problem` integer NOT NULL,
	`problems_json` text DEFAULT '[]' NOT NULL,
	`dry_run` integer DEFAULT false NOT NULL
);
