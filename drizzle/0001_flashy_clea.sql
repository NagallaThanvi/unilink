CREATE TABLE `alumni_connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requester_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`message` text,
	`connection_type` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`requester_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipient_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`participants` text NOT NULL,
	`last_message` text,
	`last_message_at` text,
	`is_group_chat` integer DEFAULT false,
	`group_name` text,
	`encryption_public_keys` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `credentials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`university_id` integer NOT NULL,
	`credential_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`issue_date` text NOT NULL,
	`expiry_date` text,
	`blockchain_tx_hash` text,
	`is_verified_on_chain` integer DEFAULT false,
	`ipfs_hash` text,
	`metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exam_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`university_id` integer NOT NULL,
	`exam_name` text NOT NULL,
	`subject` text NOT NULL,
	`score` integer NOT NULL,
	`max_score` integer NOT NULL,
	`grade` text,
	`exam_date` text NOT NULL,
	`credential_id` integer,
	`is_verified` integer DEFAULT false,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`credential_id`) REFERENCES `credentials`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sender_id` text NOT NULL,
	`receiver_id` text NOT NULL,
	`conversation_id` integer NOT NULL,
	`encrypted_content` text NOT NULL,
	`encrypted_key` text NOT NULL,
	`message_type` text DEFAULT 'text' NOT NULL,
	`is_read` integer DEFAULT false,
	`read_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`sender_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`receiver_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `newsletters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`university_id` integer NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`html_content` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`publish_date` text,
	`recipient_count` integer DEFAULT 0,
	`open_rate` integer DEFAULT 0,
	`ai_prompt` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `universities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`domain` text NOT NULL,
	`logo` text,
	`country` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true,
	`admin_ids` text,
	`tenant_id` text NOT NULL,
	`settings` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `universities_domain_unique` ON `universities` (`domain`);--> statement-breakpoint
CREATE UNIQUE INDEX `universities_tenant_id_unique` ON `universities` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`university_id` integer,
	`graduation_year` integer,
	`major` text,
	`degree` text,
	`current_position` text,
	`company` text,
	`location` text,
	`bio` text,
	`skills` text,
	`interests` text,
	`phone_number` text,
	`linkedin_url` text,
	`is_verified` integer DEFAULT false,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_user_id_unique` ON `user_profiles` (`user_id`);