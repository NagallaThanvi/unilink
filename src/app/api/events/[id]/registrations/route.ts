import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { events, eventRegistrations, user } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const eventId = parseInt(id);

    if (!id || isNaN(eventId)) {
      return NextResponse.json(
        { error: 'Valid event ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const event = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (event.length === 0) {
      return NextResponse.json(
        { error: 'Event not found', code: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (event[0].organizerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only event organizer can view registrations', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const attendanceStatus = searchParams.get('attendanceStatus');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    const validStatuses = ['registered', 'attended', 'no_show', 'cancelled'];
    if (attendanceStatus && !validStatuses.includes(attendanceStatus)) {
      return NextResponse.json(
        { 
          error: 'Invalid attendance status. Must be one of: registered, attended, no_show, cancelled', 
          code: 'INVALID_STATUS' 
        },
        { status: 400 }
      );
    }

    let query = db
      .select({
        id: eventRegistrations.id,
        eventId: eventRegistrations.eventId,
        userId: eventRegistrations.userId,
        registeredAt: eventRegistrations.registeredAt,
        attendanceStatus: eventRegistrations.attendanceStatus,
        createdAt: eventRegistrations.createdAt,
        updatedAt: eventRegistrations.updatedAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      })
      .from(eventRegistrations)
      .innerJoin(user, eq(eventRegistrations.userId, user.id))
      .where(
        attendanceStatus
          ? and(
              eq(eventRegistrations.eventId, eventId),
              eq(eventRegistrations.attendanceStatus, attendanceStatus)
            )
          : eq(eventRegistrations.eventId, eventId)
      )
      .orderBy(desc(eventRegistrations.registeredAt))
      .limit(limit)
      .offset(offset);

    const registrations = await query;

    return NextResponse.json(registrations, { status: 200 });
  } catch (error) {
    console.error('GET /api/events/[id]/registrations error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}