import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id } = await params;

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
    if (eventData.organizerId !== authUser.id) {
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

    let query: FirebaseFirestore.Query = adminDb
      .collection('eventRegistrations')
      .where('eventId', '==', id)
      .orderBy('registeredAt', 'desc');

    if (attendanceStatus) {
      query = query.where('attendanceStatus', '==', attendanceStatus);
    }

    const snapshot = await query.limit(limit).offset(offset).get();
    const regs = snapshot.docs;

    // Enrich with Firebase Auth user data
    const registrations = await Promise.all(
      regs.map(async (regDoc) => {
        const data = regDoc.data();
        let user = null;
        try {
          const userRecord = await adminAuth.getUser(data.userId);
          user = {
            id: userRecord.uid,
            name: userRecord.displayName || null,
            email: userRecord.email || null,
            image: userRecord.photoURL || null,
          };
        } catch {}
        return {
          id: regDoc.id,
          eventId: data.eventId,
          userId: data.userId,
          registeredAt: data.registeredAt,
          attendanceStatus: data.attendanceStatus,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          user,
        };
      })
    );

    return NextResponse.json(registrations, { status: 200 });
  } catch (error) {
    console.error('GET /api/events/[id]/registrations error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}