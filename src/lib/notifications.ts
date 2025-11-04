import { db } from '@/db';
import { notifications } from '@/db/schema';

export type NotificationType = 'connection' | 'message' | 'job' | 'event' | 'credential' | 'mention' | 'application';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  static async create(data: CreateNotificationData) {
    try {
      const timestamp = new Date().toISOString();
      
      const notification = await db.insert(notifications)
        .values({
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl || null,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          createdAt: timestamp
        })
        .returning();

      return notification[0];
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  static async createBulk(notificationList: CreateNotificationData[]) {
    try {
      const timestamp = new Date().toISOString();
      
      const notificationData = notificationList.map(data => ({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        createdAt: timestamp
      }));

      const created = await db.insert(notifications)
        .values(notificationData)
        .returning();

      return created;
    } catch (error) {
      console.error('Failed to create bulk notifications:', error);
      throw error;
    }
  }

  // Predefined notification templates
  static async notifyConnectionRequest(recipientId: string, requesterName: string, requesterId: string) {
    return this.create({
      userId: recipientId,
      type: 'connection',
      title: 'New Connection Request',
      message: `${requesterName} wants to connect with you`,
      actionUrl: `/dashboard/connections?tab=requests`,
      metadata: { requesterId, requesterName }
    });
  }

  static async notifyConnectionAccepted(requesterId: string, accepterName: string, accepterId: string) {
    return this.create({
      userId: requesterId,
      type: 'connection',
      title: 'Connection Request Accepted',
      message: `${accepterName} accepted your connection request`,
      actionUrl: `/dashboard/profile/${accepterId}`,
      metadata: { accepterId, accepterName }
    });
  }

  static async notifyNewMessage(recipientId: string, senderName: string, senderId: string, conversationId: number) {
    return this.create({
      userId: recipientId,
      type: 'message',
      title: 'New Message',
      message: `${senderName} sent you a message`,
      actionUrl: `/dashboard/messages?conversation=${conversationId}`,
      metadata: { senderId, senderName, conversationId }
    });
  }

  static async notifyJobApplication(jobPosterId: string, applicantName: string, applicantId: string, jobId: number, jobTitle: string) {
    return this.create({
      userId: jobPosterId,
      type: 'application',
      title: 'New Job Application',
      message: `${applicantName} applied for ${jobTitle}`,
      actionUrl: `/dashboard/jobs/${jobId}/applications`,
      metadata: { applicantId, applicantName, jobId, jobTitle }
    });
  }

  static async notifyApplicationStatusUpdate(applicantId: string, jobTitle: string, status: string, jobId: number) {
    const statusMessages = {
      reviewed: 'Your application has been reviewed',
      shortlisted: 'Congratulations! You have been shortlisted',
      rejected: 'Your application was not selected this time',
      hired: 'Congratulations! You have been selected for the position'
    };

    return this.create({
      userId: applicantId,
      type: 'application',
      title: 'Application Status Update',
      message: `${statusMessages[status as keyof typeof statusMessages] || 'Your application status has been updated'} for ${jobTitle}`,
      actionUrl: `/dashboard/jobs/${jobId}`,
      metadata: { jobId, jobTitle, status }
    });
  }

  static async notifyEventRegistration(organizerId: string, attendeeName: string, attendeeId: string, eventId: number, eventTitle: string) {
    return this.create({
      userId: organizerId,
      type: 'event',
      title: 'New Event Registration',
      message: `${attendeeName} registered for ${eventTitle}`,
      actionUrl: `/dashboard/events/${eventId}`,
      metadata: { attendeeId, attendeeName, eventId, eventTitle }
    });
  }

  static async notifyCredentialIssued(userId: string, credentialTitle: string, credentialId: number) {
    return this.create({
      userId: userId,
      type: 'credential',
      title: 'New Credential Issued',
      message: `Your ${credentialTitle} credential has been verified on the blockchain`,
      actionUrl: `/dashboard/credentials/${credentialId}`,
      metadata: { credentialId, credentialTitle }
    });
  }

  static async notifyMention(userId: string, mentionerName: string, mentionerId: string, postId: number) {
    return this.create({
      userId: userId,
      type: 'mention',
      title: 'You were mentioned',
      message: `${mentionerName} mentioned you in a post`,
      actionUrl: `/dashboard/posts/${postId}`,
      metadata: { mentionerId, mentionerName, postId }
    });
  }

  static async notifyMentorshipRequest(mentorId: string, menteeName: string, menteeId: string, programType: string) {
    return this.create({
      userId: mentorId,
      type: 'connection',
      title: 'New Mentorship Request',
      message: `${menteeName} requested ${programType} mentorship from you`,
      actionUrl: `/dashboard/mentorship?tab=requests`,
      metadata: { menteeId, menteeName, programType }
    });
  }

  static async notifySkillEndorsement(userId: string, endorserName: string, endorserId: string, skillName: string) {
    return this.create({
      userId: userId,
      type: 'connection',
      title: 'Skill Endorsed',
      message: `${endorserName} endorsed your ${skillName} skill`,
      actionUrl: `/dashboard/profile?tab=skills`,
      metadata: { endorserId, endorserName, skillName }
    });
  }
}

// Helper function to get unread notification count
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const { eq, and } = await import('drizzle-orm');
    const result = await db.select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    
    return result.length;
  } catch (error) {
    console.error('Failed to get unread notification count:', error);
    return 0;
  }
}
