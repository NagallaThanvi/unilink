CREATE TABLE `event_registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`registered_at` text NOT NULL,
	`attendance_status` text DEFAULT 'registered' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`event_date` text NOT NULL,
	`event_time` text NOT NULL,
	`location` text NOT NULL,
	`university_id` integer,
	`organizer_id` text NOT NULL,
	`max_attendees` integer,
	`current_attendees` integer DEFAULT 0,
	`image_url` text,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`tags` text,
	`registration_deadline` text,
	`is_public` integer DEFAULT true,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organizer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
