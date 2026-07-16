CREATE TABLE `operator` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'operator' NOT NULL,
	`added_at` text NOT NULL,
	`added_by` text NOT NULL,
	CONSTRAINT "operator_role_check" CHECK(role IN ('owner', 'operator'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operator_email_idx` ON `operator` ("email" COLLATE NOCASE);--> statement-breakpoint
CREATE TABLE `operator_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor` text NOT NULL,
	`subject_email` text NOT NULL,
	`action` text NOT NULL,
	`detail` text,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `operator_audit_at_idx` ON `operator_audit` (`id`);--> statement-breakpoint
CREATE TABLE `operator_grant` (
	`operator_id` integer NOT NULL,
	`permission` text NOT NULL,
	`granted_at` text NOT NULL,
	`granted_by` text NOT NULL,
	PRIMARY KEY(`operator_id`, `permission`),
	FOREIGN KEY (`operator_id`) REFERENCES `operator`(`id`) ON UPDATE no action ON DELETE no action
);
