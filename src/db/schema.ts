import { sqliteTable, integer, text, primaryKey } from 'drizzle-orm/sqlite-core';



// Auth tables for better-auth
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

// UserProfile table (extends auth user)
export const userProfiles = sqliteTable('user_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }).unique(),
  role: text('role').notNull(), // "alumni" | "student" | "university_admin"
  universityId: integer('university_id').references(() => universities.id),
  graduationYear: integer('graduation_year'),
  major: text('major'),
  degree: text('degree'),
  currentPosition: text('current_position'),
  company: text('company'),
  location: text('location'),
  bio: text('bio'),
  skills: text('skills', { mode: 'json' }), // JSON array
  interests: text('interests', { mode: 'json' }), // JSON array
  phoneNumber: text('phone_number'), // encrypted
  linkedinUrl: text('linkedin_url'),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false),
  verificationStatus: text('verification_status').notNull().default('pending'), // "pending" | "verified" | "rejected"
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Posts (global feed)
export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  content: text('content'),
  mediaUrl: text('media_url'),
  mediaType: text('media_type'), // 'image' | 'video' | null
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const postLikes = sqliteTable('post_likes', {
  postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.postId, table.userId] }),
}));

export const postComments = sqliteTable('post_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: text('created_at').notNull(),
});

// University table
export const universities = sqliteTable('universities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  domain: text('domain').notNull().unique(),
  logo: text('logo'),
  country: text('country').notNull(),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  adminIds: text('admin_ids', { mode: 'json' }), // JSON array of user ids
  tenantId: text('tenant_id').notNull().unique(),
  settings: text('settings', { mode: 'json' }), // GDPR compliance flags
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Credential table (blockchain verified)
export const credentials = sqliteTable('credentials', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  universityId: integer('university_id').notNull().references(() => universities.id),
  credentialType: text('credential_type').notNull(), // "degree" | "certificate" | "exam"
  title: text('title').notNull(),
  description: text('description'),
  issueDate: text('issue_date').notNull(),
  expiryDate: text('expiry_date'),
  blockchainTxHash: text('blockchain_tx_hash'),
  isVerifiedOnChain: integer('is_verified_on_chain', { mode: 'boolean' }).default(false),
  ipfsHash: text('ipfs_hash'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Message table (encrypted chat)
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  senderId: text('sender_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  receiverId: text('receiver_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  encryptedContent: text('encrypted_content').notNull(),
  encryptedKey: text('encrypted_key').notNull(),
  messageType: text('message_type').notNull().default('text'), // "text" | "file" | "image"
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  readAt: text('read_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Conversation table
export const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  participants: text('participants', { mode: 'json' }).notNull(), // JSON array of user ids
  lastMessage: text('last_message'),
  lastMessageAt: text('last_message_at'),
  isGroupChat: integer('is_group_chat', { mode: 'boolean' }).default(false),
  groupName: text('group_name'),
  encryptionPublicKeys: text('encryption_public_keys', { mode: 'json' }), // JSON for E2EE
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ExamResult table
export const examResults = sqliteTable('exam_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  universityId: integer('university_id').notNull().references(() => universities.id),
  examName: text('exam_name').notNull(),
  subject: text('subject').notNull(),
  score: integer('score').notNull(),
  maxScore: integer('max_score').notNull(),
  grade: text('grade'),
  examDate: text('exam_date').notNull(),
  credentialId: integer('credential_id').references(() => credentials.id),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// AlumniConnection table
export const alumniConnections = sqliteTable('alumni_connections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  requesterId: text('requester_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  recipientId: text('recipient_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), // "pending" | "accepted" | "rejected"
  message: text('message'),
  connectionType: text('connection_type').notNull(), // "mentorship" | "networking" | "collaboration"
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Newsletter table
export const newsletters = sqliteTable('newsletters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  universityId: integer('university_id').notNull().references(() => universities.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  htmlContent: text('html_content'),
  status: text('status').notNull().default('draft'), // "draft" | "published" | "scheduled"
  publishDate: text('publish_date'),
  recipientCount: integer('recipient_count').default(0),
  openRate: integer('open_rate').default(0),
  aiPrompt: text('ai_prompt'),
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Events table
export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  eventDate: text('event_date').notNull(),
  eventTime: text('event_time').notNull(),
  location: text('location').notNull(),
  universityId: integer('university_id').references(() => universities.id),
  organizerId: text('organizer_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  maxAttendees: integer('max_attendees'),
  currentAttendees: integer('current_attendees').default(0),
  imageUrl: text('image_url'),
  status: text('status').notNull().default('upcoming'),
  tags: text('tags', { mode: 'json' }),
  registrationDeadline: text('registration_deadline'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Event Registrations table
export const eventRegistrations = sqliteTable('event_registrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  registeredAt: text('registered_at').notNull(),
  attendanceStatus: text('attendance_status').notNull().default('registered'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});