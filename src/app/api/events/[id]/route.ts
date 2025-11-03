import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { events, eventRegistrations } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID is valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const eventId = parseInt(id);

    // Query event by ID
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

    // Get registration count for this event
    const registrationCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, eventId));

    const registrationCount = registrationCountResult[0]?.count || 0;

    // Return event with registration count
    return NextResponse.json(
      {
        ...event[0],
        registrationCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET event error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}