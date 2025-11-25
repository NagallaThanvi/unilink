import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

const EVENTS_COLLECTION = 'events';
const REGISTRATIONS_COLLECTION = 'eventRegistrations';

function mapEventDoc(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data();
  if (!data) return null;
  return {
    id: doc.id,
    title: data.title ?? null,
    description: data.description ?? null,
    eventDate: data.eventDate ?? null,
    eventTime: data.eventTime ?? null,
    location: data.location ?? null,
    universityId: data.universityId ?? null,
    organizerId: data.organizerId ?? null,
    maxAttendees: data.maxAttendees ?? 0,
    currentAttendees: data.currentAttendees ?? 0,
    imageUrl: data.imageUrl ?? null,
    status: data.status ?? null,
    tags: data.tags ?? [],
    registrationDeadline: data.registrationDeadline ?? null,
    isPublic: data.isPublic ?? false,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Query event by ID
    const doc = await adminDb.collection(EVENTS_COLLECTION).doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Event not found', code: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get registration count for this event
    const registrationSnapshot = await adminDb.collection(REGISTRATIONS_COLLECTION)
      .where('eventId', '==', id)
      .get();
    const registrationCount = registrationSnapshot.size;

    // Return event with registration count
    return NextResponse.json(
      {
        ...mapEventDoc(doc),
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