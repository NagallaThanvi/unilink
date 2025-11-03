import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { events, eventRegistrations } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid event ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const eventId = parseInt(id);

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

    const eventData = event[0];

    if (eventData.status !== 'upcoming') {
      return NextResponse.json(
        {
          error: 'Cannot register for non-upcoming events',
          code: 'INVALID_EVENT_STATUS',
        },
        { status: 400 }
      );
    }

    const existingRegistration = await db
      .select()
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.userId, session.user.id)
        )
      )
      .limit(1);

    if (existingRegistration.length > 0) {
      return NextResponse.json(
        {
          error: 'Already registered for this event',
          code: 'ALREADY_REGISTERED',
        },
        { status: 400 }
      );
    }

    if (eventData.maxAttendees !== null) {
      if (eventData.currentAttendees >= eventData.maxAttendees) {
        return NextResponse.json(
          { error: 'Event is full', code: 'EVENT_FULL' },
          { status: 400 }
        );
      }
    }

    if (eventData.registrationDeadline) {
      const deadline = new Date(eventData.registrationDeadline);
      const now = new Date();
      if (now > deadline) {
        return NextResponse.json(
          {
            error: 'Registration deadline has passed',
            code: 'DEADLINE_PASSED',
          },
          { status: 400 }
        );
      }
    }

    const currentTimestamp = new Date().toISOString();

    const newRegistration = await db
      .insert(eventRegistrations)
      .values({
        eventId: eventId,
        userId: session.user.id,
        registeredAt: currentTimestamp,
        attendanceStatus: 'registered',
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
      })
      .returning();

    await db
      .update(events)
      .set({
        currentAttendees: sql`${events.currentAttendees} + 1`,
        updatedAt: currentTimestamp,
      })
      .where(eq(events.id, eventId));

    return NextResponse.json(newRegistration[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { id } = params;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid event ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const eventId = parseInt(id);

    const existingRegistration = await db
      .select()
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.userId, session.user.id)
        )
      )
      .limit(1);

    if (existingRegistration.length === 0) {
      return NextResponse.json(
        { error: 'Registration not found', code: 'REGISTRATION_NOT_FOUND' },
        { status: 404 }
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

    const eventData = event[0];

    if (eventData.status !== 'upcoming') {
      return NextResponse.json(
        {
          error: 'Cannot cancel registration for non-upcoming events',
          code: 'INVALID_EVENT_STATUS',
        },
        { status: 400 }
      );
    }

    const deletedRegistration = await db
      .delete(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.userId, session.user.id)
        )
      )
      .returning();

    const currentTimestamp = new Date().toISOString();

    await db
      .update(events)
      .set({
        currentAttendees: sql`CASE 
          WHEN ${events.currentAttendees} > 0 
          THEN ${events.currentAttendees} - 1 
          ELSE 0 
        END`,
        updatedAt: currentTimestamp,
      })
      .where(eq(events.id, eventId));

    return NextResponse.json(
      {
        message: 'Registration cancelled successfully',
        registration: deletedRegistration[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}