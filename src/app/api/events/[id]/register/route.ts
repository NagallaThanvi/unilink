import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Valid event ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const eventsColl = adminDb.collection('events');
    const eventDoc = await eventsColl.doc(id).get();
    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found', code: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }
    const eventData = eventDoc.data()!;

    if (eventData.status !== 'upcoming') {
      return NextResponse.json(
        {
          error: 'Cannot register for non-upcoming events',
          code: 'INVALID_EVENT_STATUS',
        },
        { status: 400 }
      );
    }

    const regsColl = adminDb.collection('eventRegistrations');
    const existingReg = await regsColl
      .where('eventId', '==', id)
      .where('userId', '==', authUser.id)
      .limit(1)
      .get();
    if (!existingReg.empty) {
      return NextResponse.json(
        {
          error: 'Already registered for this event',
          code: 'ALREADY_REGISTERED',
        },
        { status: 400 }
      );
    }

    if (eventData.maxAttendees != null) {
      const currentCount = eventData.currentAttendees ?? 0;
      if (currentCount >= eventData.maxAttendees) {
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

    const regRef = await regsColl.add({
      eventId: id,
      userId: authUser.id,
      registeredAt: currentTimestamp,
      attendanceStatus: 'registered',
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
    });

    // Increment currentAttendees on the event
    const newCurrent = (eventData.currentAttendees || 0) + 1;
    await eventsColl.doc(id).update({ currentAttendees: newCurrent, updatedAt: currentTimestamp });

    const created = await regRef.get();
    return NextResponse.json({ id: created.id, ...created.data() }, { status: 201 });
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
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Valid event ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const regsColl = adminDb.collection('eventRegistrations');
    const existingReg = await regsColl
      .where('eventId', '==', id)
      .where('userId', '==', authUser.id)
      .limit(1)
      .get();

    if (existingReg.empty) {
      return NextResponse.json(
        { error: 'Registration not found', code: 'REGISTRATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    const eventsColl = adminDb.collection('events');
    const eventDoc = await eventsColl.doc(id).get();
    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found', code: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const eventData = eventDoc.data()!;

    if (eventData.status !== 'upcoming') {
      return NextResponse.json(
        {
          error: 'Cannot cancel registration for non-upcoming events',
          code: 'INVALID_EVENT_STATUS',
        },
        { status: 400 }
      );
    }

    const regDocId = existingReg.docs[0].id;
    await regsColl.doc(regDocId).delete();

    const currentTimestamp = new Date().toISOString();
    const newCurrent = Math.max((eventData.currentAttendees || 0) - 1, 0);
    await eventsColl.doc(id).update({ currentAttendees: newCurrent, updatedAt: currentTimestamp });

    return NextResponse.json(
      {
        message: 'Registration cancelled successfully',
        registration: { id: regDocId, ...existingReg.docs[0].data() },
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