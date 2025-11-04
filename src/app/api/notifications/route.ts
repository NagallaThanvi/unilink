import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications, user } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

const VALID_TYPES = ['connection', 'message', 'job', 'event', 'credential', 'mention', 'application'] as const;

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const isRead = searchParams.get('isRead');
    const type = searchParams.get('type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query: any = db
      .select({
        notification: notifications,
        sender: {
          id: user.id,
          name: user.name,
          image: user.image,
        }
      })
      .from(notifications)
      .leftJoin(user, eq(notifications.userId, user.id))
      .where(eq(notifications.userId, currentUser.id));

    const conditions = [eq(notifications.userId, currentUser.id)];

    if (isRead !== null) {
      conditions.push(eq(notifications.isRead, isRead === 'true'));
    }

    if (type && VALID_TYPES.includes(type as any)) {
      conditions.push(eq(notifications.type, type));
    }

    if (conditions.length > 1) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    const formattedNotifications = results.map((row: any) => ({
      ...row.notification,
      sender: row.sender,
    }));

    return NextResponse.json(formattedNotifications);
  } catch (error) {
    console.error('GET notifications error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      userId,
      type,
      title,
      message,
      actionUrl,
      metadata
    } = body;

    // Validate required fields
    if (!userId || !type || !title || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, type, title, message',
        code: 'MISSING_REQUIRED_FIELDS' 
      }, { status: 400 });
    }

    // Validate type
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ 
        error: `type must be one of: ${VALID_TYPES.join(', ')}`,
        code: 'INVALID_TYPE' 
      }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    const newNotification = await db.insert(notifications)
      .values({
        userId,
        type,
        title,
        message,
        actionUrl: actionUrl || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        createdAt: timestamp
      })
      .returning();

    return NextResponse.json(newNotification[0], { status: 201 });
  } catch (error) {
    console.error('POST notification error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const action = searchParams.get('action'); // 'mark-read', 'mark-unread', 'mark-all-read'

    if (action === 'mark-all-read') {
      // Mark all notifications as read for the current user
      await db.update(notifications)
        .set({ 
          isRead: true, 
          readAt: new Date().toISOString() 
        })
        .where(and(
          eq(notifications.userId, currentUser.id),
          eq(notifications.isRead, false)
        ));

      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid notification ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const notificationId = parseInt(id);

    // Check if notification exists and belongs to user
    const existingNotification = await db.select()
      .from(notifications)
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, currentUser.id)
      ))
      .limit(1);

    if (existingNotification.length === 0) {
      return NextResponse.json({ 
        error: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND' 
      }, { status: 404 });
    }

    const updateData: any = {};

    if (action === 'mark-read') {
      updateData.isRead = true;
      updateData.readAt = new Date().toISOString();
    } else if (action === 'mark-unread') {
      updateData.isRead = false;
      updateData.readAt = null;
    }

    const updated = await db.update(notifications)
      .set(updateData)
      .where(eq(notifications.id, notificationId))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT notification error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid notification ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const notificationId = parseInt(id);

    // Check if notification exists and belongs to user
    const existingNotification = await db.select()
      .from(notifications)
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, currentUser.id)
      ))
      .limit(1);

    if (existingNotification.length === 0) {
      return NextResponse.json({ 
        error: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND' 
      }, { status: 404 });
    }

    const deleted = await db.delete(notifications)
      .where(eq(notifications.id, notificationId))
      .returning();

    return NextResponse.json({
      message: 'Notification deleted successfully',
      notification: deleted[0]
    });
  } catch (error) {
    console.error('DELETE notification error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}
