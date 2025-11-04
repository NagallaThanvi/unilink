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

// Job Postings table
export const jobPostings = sqliteTable('job_postings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  company: text('company').notNull(),
  location: text('location').notNull(),
  jobType: text('job_type').notNull(), // "full-time" | "part-time" | "contract" | "internship"
  experienceLevel: text('experience_level').notNull(), // "entry" | "mid" | "senior" | "executive"
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  currency: text('currency').default('INR'),
  skills: text('skills', { mode: 'json' }), // JSON array of required skills
  requirements: text('requirements').notNull(),
  benefits: text('benefits'),
  applicationDeadline: text('application_deadline'),
  isRemote: integer('is_remote', { mode: 'boolean' }).default(false),
  postedById: text('posted_by_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  universityId: integer('university_id').references(() => universities.id),
  status: text('status').notNull().default('active'), // "active" | "closed" | "draft"
  applicationCount: integer('application_count').default(0),
  viewCount: integer('view_count').default(0),
  tags: text('tags', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Job Applications table
export const jobApplications = sqliteTable('job_applications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobPostings.id, { onDelete: 'cascade' }),
  applicantId: text('applicant_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  coverLetter: text('cover_letter'),
  resumeUrl: text('resume_url'),
  status: text('status').notNull().default('pending'), // "pending" | "reviewed" | "shortlisted" | "rejected" | "hired"
  appliedAt: text('applied_at').notNull(),
  reviewedAt: text('reviewed_at'),
  reviewNotes: text('review_notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Mentorship Programs table
export const mentorshipPrograms = sqliteTable('mentorship_programs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  mentorId: text('mentor_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  menteeId: text('mentee_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  programType: text('program_type').notNull(), // "career" | "academic" | "skill-development"
  status: text('status').notNull().default('pending'), // "pending" | "active" | "completed" | "cancelled"
  startDate: text('start_date'),
  endDate: text('end_date'),
  goals: text('goals'),
  meetingFrequency: text('meeting_frequency'), // "weekly" | "bi-weekly" | "monthly"
  notes: text('notes'),
  rating: integer('rating'), // 1-5 rating after completion
  feedback: text('feedback'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Notifications table
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // "connection" | "message" | "job" | "event" | "credential" | "mention"
  title: text('title').notNull(),
  message: text('message').notNull(),
  actionUrl: text('action_url'),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  readAt: text('read_at'),
});

// Skills table for standardized skills
export const skills = sqliteTable('skills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  category: text('category').notNull(), // "technical" | "soft" | "language" | "certification"
  description: text('description'),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
});

// User Skills mapping table
export const userSkills = sqliteTable('user_skills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  skillId: integer('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  proficiencyLevel: text('proficiency_level').notNull(), // "beginner" | "intermediate" | "advanced" | "expert"
  yearsOfExperience: integer('years_of_experience'),
  isEndorsed: integer('is_endorsed', { mode: 'boolean' }).default(false),
  endorsementCount: integer('endorsement_count').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Skill Endorsements table
export const skillEndorsements = sqliteTable('skill_endorsements', {
  userSkillId: integer('user_skill_id').notNull().references(() => userSkills.id, { onDelete: 'cascade' }),
  endorserId: text('endorser_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  comment: text('comment'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userSkillId, table.endorserId] }),
}));

// Scholarships and Funding table
export const scholarships = sqliteTable('scholarships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  amount: integer('amount').notNull(),
  currency: text('currency').default('INR'),
  fundedById: text('funded_by_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  universityId: integer('university_id').references(() => universities.id),
  eligibilityCriteria: text('eligibility_criteria').notNull(),
  applicationDeadline: text('application_deadline').notNull(),
  maxRecipients: integer('max_recipients').default(1),
  currentRecipients: integer('current_recipients').default(0),
  category: text('category').notNull(), // "merit", "need-based", "research", "sports", "arts"
  academicYear: text('academic_year').notNull(),
  requirements: text('requirements', { mode: 'json' }), // JSON array of requirements
  status: text('status').notNull().default('active'), // "active", "closed", "draft"
  isRecurring: integer('is_recurring', { mode: 'boolean' }).default(false),
  recurringFrequency: text('recurring_frequency'), // "yearly", "semester"
  tags: text('tags', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Scholarship Applications table
export const scholarshipApplications = sqliteTable('scholarship_applications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  scholarshipId: integer('scholarship_id').notNull().references(() => scholarships.id, { onDelete: 'cascade' }),
  applicantId: text('applicant_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  applicationEssay: text('application_essay').notNull(),
  academicRecords: text('academic_records'), // File URL or JSON
  recommendationLetters: text('recommendation_letters', { mode: 'json' }), // Array of file URLs
  financialNeedStatement: text('financial_need_statement'),
  additionalDocuments: text('additional_documents', { mode: 'json' }),
  status: text('status').notNull().default('pending'), // "pending", "under_review", "approved", "rejected"
  reviewScore: integer('review_score'), // 1-100
  reviewNotes: text('review_notes'),
  reviewedAt: text('reviewed_at'),
  reviewedById: text('reviewed_by_id').references(() => user.id),
  appliedAt: text('applied_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Guest Lectures and Workshops table
export const guestSessions = sqliteTable('guest_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  sessionType: text('session_type').notNull(), // "lecture", "workshop", "seminar", "panel"
  speakerId: text('speaker_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  universityId: integer('university_id').references(() => universities.id),
  targetAudience: text('target_audience').notNull(), // "students", "faculty", "all"
  department: text('department'),
  sessionDate: text('session_date').notNull(),
  sessionTime: text('session_time').notNull(),
  duration: integer('duration').notNull(), // in minutes
  venue: text('venue'),
  isVirtual: integer('is_virtual', { mode: 'boolean' }).default(false),
  meetingLink: text('meeting_link'),
  maxAttendees: integer('max_attendees'),
  currentAttendees: integer('current_attendees').default(0),
  prerequisites: text('prerequisites'),
  learningObjectives: text('learning_objectives', { mode: 'json' }),
  materials: text('materials', { mode: 'json' }), // Links to slides, resources
  status: text('status').notNull().default('scheduled'), // "scheduled", "ongoing", "completed", "cancelled"
  feedback: text('feedback', { mode: 'json' }), // Post-session feedback
  recordingUrl: text('recording_url'),
  tags: text('tags', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Guest Session Registrations table
export const guestSessionRegistrations = sqliteTable('guest_session_registrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull().references(() => guestSessions.id, { onDelete: 'cascade' }),
  attendeeId: text('attendee_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  registeredAt: text('registered_at').notNull(),
  attendanceStatus: text('attendance_status').notNull().default('registered'), // "registered", "attended", "no_show"
  feedback: text('feedback'),
  rating: integer('rating'), // 1-5
  certificateIssued: integer('certificate_issued', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Curriculum Feedback table
export const curriculumFeedback = sqliteTable('curriculum_feedback', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  submittedById: text('submitted_by_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  universityId: integer('university_id').notNull().references(() => universities.id),
  department: text('department').notNull(),
  courseCode: text('course_code'),
  courseName: text('course_name'),
  feedbackType: text('feedback_type').notNull(), // "course_content", "industry_relevance", "skill_gap", "new_course_suggestion"
  currentIndustryTrends: text('current_industry_trends').notNull(),
  suggestedChanges: text('suggested_changes').notNull(),
  skillsInDemand: text('skills_in_demand', { mode: 'json' }),
  toolsAndTechnologies: text('tools_and_technologies', { mode: 'json' }),
  industryProjects: text('industry_projects', { mode: 'json' }),
  priority: text('priority').notNull().default('medium'), // "low", "medium", "high", "urgent"
  implementationComplexity: text('implementation_complexity'), // "low", "medium", "high"
  potentialImpact: text('potential_impact'), // "low", "medium", "high"
  supportingEvidence: text('supporting_evidence'),
  status: text('status').notNull().default('submitted'), // "submitted", "under_review", "approved", "implemented", "rejected"
  reviewNotes: text('review_notes'),
  reviewedAt: text('reviewed_at'),
  reviewedById: text('reviewed_by_id').references(() => user.id),
  implementationTimeline: text('implementation_timeline'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Industry Insights table
export const industryInsights = sqliteTable('industry_insights', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: text('author_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  industry: text('industry').notNull(),
  insightType: text('insight_type').notNull(), // "trend", "skill_demand", "career_path", "salary_insights", "company_culture"
  targetAudience: text('target_audience').notNull(), // "students", "recent_graduates", "experienced", "all"
  relevantSkills: text('relevant_skills', { mode: 'json' }),
  companiesInvolved: text('companies_involved', { mode: 'json' }),
  salaryRange: text('salary_range'),
  experienceLevel: text('experience_level'), // "entry", "mid", "senior", "executive"
  geographicRelevance: text('geographic_relevance', { mode: 'json' }),
  timeRelevance: text('time_relevance'), // "current", "emerging", "future"
  sources: text('sources', { mode: 'json' }),
  tags: text('tags', { mode: 'json' }),
  upvotes: integer('upvotes').default(0),
  views: integer('views').default(0),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false),
  verifiedAt: text('verified_at'),
  verifiedById: text('verified_by_id').references(() => user.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Project Collaborations table
export const projectCollaborations = sqliteTable('project_collaborations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  projectType: text('project_type').notNull(), // "research", "startup", "internship", "capstone", "hackathon"
  initiatorId: text('initiator_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  universityId: integer('university_id').references(() => universities.id),
  department: text('department'),
  requiredSkills: text('required_skills', { mode: 'json' }),
  teamSize: integer('team_size').notNull(),
  currentTeamSize: integer('current_team_size').default(1),
  duration: text('duration'), // "1 month", "1 semester", "6 months"
  startDate: text('start_date'),
  endDate: text('end_date'),
  budget: integer('budget'),
  fundingSource: text('funding_source'),
  deliverables: text('deliverables', { mode: 'json' }),
  technologies: text('technologies', { mode: 'json' }),
  mentorshipAvailable: integer('mentorship_available', { mode: 'boolean' }).default(false),
  mentorId: text('mentor_id').references(() => user.id),
  applicationDeadline: text('application_deadline'),
  status: text('status').notNull().default('recruiting'), // "recruiting", "in_progress", "completed", "cancelled"
  visibility: text('visibility').notNull().default('public'), // "public", "university_only", "department_only"
  tags: text('tags', { mode: 'json' }),
  repositoryUrl: text('repository_url'),
  projectUrl: text('project_url'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Project Collaboration Applications table
export const projectApplications = sqliteTable('project_applications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projectCollaborations.id, { onDelete: 'cascade' }),
  applicantId: text('applicant_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  applicationMessage: text('application_message').notNull(),
  relevantExperience: text('relevant_experience'),
  portfolioLinks: text('portfolio_links', { mode: 'json' }),
  availableHours: integer('available_hours'), // hours per week
  preferredRole: text('preferred_role'),
  status: text('status').notNull().default('pending'), // "pending", "accepted", "rejected"
  reviewNotes: text('review_notes'),
  reviewedAt: text('reviewed_at'),
  appliedAt: text('applied_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Alumni Donations and Giving table
export const donations = sqliteTable('donations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  donorId: text('donor_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  universityId: integer('university_id').notNull().references(() => universities.id),
  amount: integer('amount').notNull(),
  currency: text('currency').default('INR'),
  donationType: text('donation_type').notNull(), // "general", "scholarship", "infrastructure", "research", "emergency"
  purpose: text('purpose').notNull(),
  isAnonymous: integer('is_anonymous', { mode: 'boolean' }).default(false),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).default(false),
  recurringFrequency: text('recurring_frequency'), // "monthly", "quarterly", "yearly"
  paymentMethod: text('payment_method'),
  transactionId: text('transaction_id'),
  paymentStatus: text('payment_status').notNull().default('pending'), // "pending", "completed", "failed", "refunded"
  taxDeductible: integer('tax_deductible', { mode: 'boolean' }).default(true),
  receiptIssued: integer('receipt_issued', { mode: 'boolean' }).default(false),
  receiptUrl: text('receipt_url'),
  donationDate: text('donation_date').notNull(),
  acknowledgmentSent: integer('acknowledgment_sent', { mode: 'boolean' }).default(false),
  publicRecognition: integer('public_recognition', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Career Guidance Sessions table
export const careerGuidanceSessions = sqliteTable('career_guidance_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  mentorId: text('mentor_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  menteeId: text('mentee_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  sessionType: text('session_type').notNull(), // "one_on_one", "group", "workshop"
  topic: text('topic').notNull(),
  description: text('description'),
  scheduledDate: text('scheduled_date').notNull(),
  scheduledTime: text('scheduled_time').notNull(),
  duration: integer('duration').notNull(), // in minutes
  venue: text('venue'),
  isVirtual: integer('is_virtual', { mode: 'boolean' }).default(true),
  meetingLink: text('meeting_link'),
  agenda: text('agenda', { mode: 'json' }),
  resources: text('resources', { mode: 'json' }),
  status: text('status').notNull().default('scheduled'), // "scheduled", "completed", "cancelled", "rescheduled"
  feedback: text('feedback'),
  rating: integer('rating'), // 1-5
  followUpRequired: integer('follow_up_required', { mode: 'boolean' }).default(false),
  followUpNotes: text('follow_up_notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});