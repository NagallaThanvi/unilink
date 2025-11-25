import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getCurrentUser } from '@/lib/auth';

const COLLECTION_NAME = 'events';
const REGISTRATIONS_COLLECTION = 'eventRegistrations';

function mapDoc(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data();
  if (!data) return null;
  return {
    id: doc.id,
    title: data.title ?? null,
    description: data.description ?? null,
    eventDate: data.eventDate ?? null,
    eventTime: data.eventTime ?? null,
    location: data.location ?? null,
    organizerId: data.organizerId ?? null,
    universityId: data.universityId ?? null,
    maxAttendees: data.maxAttendees ?? null,
    currentAttendees: data.currentAttendees ?? 0,
    imageUrl: data.imageUrl ?? null,
    tags: data.tags ?? null,
    registrationDeadline: data.registrationDeadline ?? null,
    isPublic: data.isPublic ?? false,
    status: data.status ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

function mapRegistrationDoc(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data();
  if (!data) return null;
  return {
    id: doc.id,
    eventId: data.eventId ?? null,
    userId: data.userId ?? null,
    registeredAt: data.registeredAt ?? null,
    attendanceStatus: data.attendanceStatus ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const universityId = searchParams.get('universityId');
    const status = searchParams.get('status');
    const organizerId = searchParams.get('organizerId');
    const isPublic = searchParams.get('isPublic');
    const upcoming = searchParams.get('upcoming');
    const past = searchParams.get('past');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const collection = adminDb.collection(COLLECTION_NAME);

    // Single event fetch with registration count
    if (id) {
      const doc = await collection.doc(id).get();
      if (!doc.exists) {
        return NextResponse.json({ 
          error: 'Event not found',
          code: 'EVENT_NOT_FOUND' 
        }, { status: 404 });
      }

      // Get registration count
      const regsSnapshot = await adminDb
        .collection(REGISTRATIONS_COLLECTION)
        .where('eventId', '==', id)
        .get();
      const registrationCount = regsSnapshot.size;

      return NextResponse.json({
        ...mapDoc(doc),
        registrationCount
      }, { status: 200 });
    }

    let query: FirebaseFirestore.Query = collection.orderBy('createdAt', 'desc');

    // Filter by universityId
    if (universityId) {
      const univId = parseInt(universityId);
      if (!isNaN(univId)) {
        query = query.where('universityId', '==', univId);
      }
    }

    // Filter by status
    if (status) {
      query = query.where('status', '==', status);
    }

    // Filter by organizerId
    if (organizerId) {
      query = query.where('organizerId', '==', organizerId);
    }

    // Filter by isPublic
    if (isPublic !== null && isPublic !== undefined) {
      const isPublicBool = isPublic === 'true' || isPublic === '1';
      query = query.where('isPublic', '==', isPublicBool);
    }

    // Filter upcoming events
    if (upcoming === 'true' || upcoming === '1') {
      const currentDate = new Date().toISOString().split('T')[0];
      query = query.where('eventDate', '>=', currentDate);
    }

    // Filter past events
    if (past === 'true' || past === '1') {
      const currentDate = new Date().toISOString().split('T')[0];
      query = query.where('eventDate', '<', currentDate);
    }

    // Apply filters and pagination
    const snapshot = await query.limit(limit).offset(offset).get();
    let events = snapshot.docs.map(mapDoc).filter(Boolean);

    // In-memory text search (basic)
    if (search) {
      const lower = search.toLowerCase();
      events = events.filter((e: any) =>
        (e.title && e.title.toLowerCase().includes(lower)) ||
        (e.description && e.description.toLowerCase().includes(lower))
      );
    }

    return NextResponse.json(events, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED' 
      }, { status: 401 });
    }

    const body = await request.json();

    // Security check: reject if organizerId provided in body
    if ('organizerId' in body) {
      return NextResponse.json({ 
        error: "Organizer ID cannot be provided in request body",
        code: "ORGANIZER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { 
      title, 
      description, 
      eventDate, 
      eventTime, 
      location, 
      universityId, 
      maxAttendees, 
      imageUrl, 
      tags, 
      registrationDeadline, 
      isPublic 
    } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ 
        error: "Title is required and must be a non-empty string",
        code: "INVALID_TITLE" 
      }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json({ 
        error: "Description is required and must be a non-empty string",
        code: "INVALID_DESCRIPTION" 
      }, { status: 400 });
    }

    if (!eventDate || typeof eventDate !== 'string') {
      return NextResponse.json({ 
        error: "Event date is required and must be a valid ISO date string",
        code: "INVALID_EVENT_DATE" 
      }, { status: 400 });
    }

    // Validate eventDate is valid ISO date
    const eventDateObj = new Date(eventDate);
    if (isNaN(eventDateObj.getTime())) {
      return NextResponse.json({ 
        error: "Event date must be a valid ISO date string",
        code: "INVALID_EVENT_DATE_FORMAT" 
      }, { status: 400 });
    }

    if (!eventTime || typeof eventTime !== 'string' || eventTime.trim().length === 0) {
      return NextResponse.json({ 
        error: "Event time is required and must be a non-empty string",
        code: "INVALID_EVENT_TIME" 
      }, { status: 400 });
    }

    if (!location || typeof location !== 'string' || location.trim().length === 0) {
      return NextResponse.json({ 
        error: "Location is required and must be a non-empty string",
        code: "INVALID_LOCATION" 
      }, { status: 400 });
    }

    // Validate optional fields
    if (maxAttendees !== undefined && maxAttendees !== null) {
      if (!Number.isInteger(maxAttendees) || maxAttendees <= 0) {
        return NextResponse.json({ 
          error: "Max attendees must be a positive integer",
          code: "INVALID_MAX_ATTENDEES" 
        }, { status: 400 });
      }
    }

    if (tags !== undefined && tags !== null && !Array.isArray(tags)) {
      return NextResponse.json({ 
        error: "Tags must be an array",
        code: "INVALID_TAGS" 
      }, { status: 400 });
    }

    // Validate registrationDeadline if provided
    if (registrationDeadline) {
      const deadlineDate = new Date(registrationDeadline);
      if (isNaN(deadlineDate.getTime())) {
        return NextResponse.json({ 
          error: "Registration deadline must be a valid ISO date string",
          code: "INVALID_REGISTRATION_DEADLINE" 
        }, { status: 400 });
      }

      if (deadlineDate >= eventDateObj) {
        return NextResponse.json({ 
          error: "Registration deadline must be before the event date",
          code: "INVALID_REGISTRATION_DEADLINE_DATE" 
        }, { status: 400 });
      }
    }

    // Prepare insert data
    const now = new Date().toISOString();
    const insertData: any = {
      title: title.trim(),
      description: description.trim(),
      eventDate,
      eventTime: eventTime.trim(),
      location: location.trim(),
      organizerId: authUser.id,
      currentAttendees: 0,
      status: 'upcoming',
      createdAt: now,
      updatedAt: now
    };

    // Add optional fields
    if (universityId !== undefined && universityId !== null) {
      insertData.universityId = universityId;
    }
    if (maxAttendees !== undefined && maxAttendees !== null) {
      insertData.maxAttendees = maxAttendees;
    }
    if (imageUrl) {
      insertData.imageUrl = imageUrl;
    }
    if (tags) {
      insertData.tags = JSON.stringify(tags);
    }
    if (registrationDeadline) {
      insertData.registrationDeadline = registrationDeadline;
    }
    if (isPublic !== undefined && isPublic !== null) {
      insertData.isPublic = isPublic ? 1 : 0;
    }

    const collection = adminDb.collection(COLLECTION_NAME);
    const ref = await collection.add(insertData);
    const created = await ref.get();
    return NextResponse.json(mapDoc(created), { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authentication check
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED' 
      }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const collection = adminDb.collection(COLLECTION_NAME);
    const doc = await collection.doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ 
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND' 
      }, { status: 404 });
    }

    const eventData = mapDoc(doc);
    if (eventData?.organizerId !== authUser.id) {
      return NextResponse.json({ 
        error: 'Forbidden: You are not the organizer of this event',
        code: 'FORBIDDEN_NOT_ORGANIZER' 
      }, { status: 403 });
    }

    const body = await request.json();

    // Security check: reject if organizerId provided in body
    if ('organizerId' in body) {
      return NextResponse.json({ 
        error: "Organizer ID cannot be provided in request body",
        code: "ORGANIZER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const updates: any = {};

    // Validate and update title
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length === 0) {
        return NextResponse.json({ 
          error: "Title must be a non-empty string",
          code: "INVALID_TITLE" 
        }, { status: 400 });
      }
      updates.title = body.title.trim();
    }

    // Validate and update description
    if (body.description !== undefined) {
      if (typeof body.description !== 'string' || body.description.trim().length === 0) {
        return NextResponse.json({ 
          error: "Description must be a non-empty string",
          code: "INVALID_DESCRIPTION" 
        }, { status: 400 });
      }
      updates.description = body.description.trim();
    }

    // Validate and update eventDate
    if (body.eventDate !== undefined) {
      if (typeof body.eventDate !== 'string') {
        return NextResponse.json({ 
          error: "Event date must be a valid ISO date string",
          code: "INVALID_EVENT_DATE" 
        }, { status: 400 });
      }
      const eventDateObj = new Date(body.eventDate);
      if (isNaN(eventDateObj.getTime())) {
        return NextResponse.json({ 
          error: "Event date must be a valid ISO date string",
          code: "INVALID_EVENT_DATE_FORMAT" 
        }, { status: 400 });
      }
      updates.eventDate = body.eventDate;
    }

    // Validate and update eventTime
    if (body.eventTime !== undefined) {
      if (typeof body.eventTime !== 'string' || body.eventTime.trim().length === 0) {
        return NextResponse.json({ 
          error: "Event time must be a non-empty string",
          code: "INVALID_EVENT_TIME" 
        }, { status: 400 });
      }
      updates.eventTime = body.eventTime.trim();
    }

    // Validate and update location
    if (body.location !== undefined) {
      if (typeof body.location !== 'string' || body.location.trim().length === 0) {
        return NextResponse.json({ 
          error: "Location must be a non-empty string",
          code: "INVALID_LOCATION" 
        }, { status: 400 });
      }
      updates.location = body.location.trim();
    }

    // Validate and update maxAttendees
    if (body.maxAttendees !== undefined && body.maxAttendees !== null) {
      if (!Number.isInteger(body.maxAttendees) || body.maxAttendees <= 0) {
        return NextResponse.json({ 
          error: "Max attendees must be a positive integer",
          code: "INVALID_MAX_ATTENDEES" 
        }, { status: 400 });
      }
      
      // Check if maxAttendees is less than currentAttendees
      const current = eventData?.currentAttendees || 0;
      if (body.maxAttendees < current) {
        return NextResponse.json({ 
          error: "Max attendees cannot be less than current attendees",
          code: "MAX_ATTENDEES_TOO_LOW" 
        }, { status: 400 });
      }
      
      updates.maxAttendees = body.maxAttendees;
    }

    // Update universityId
    if (body.universityId !== undefined) {
      updates.universityId = body.universityId;
    }

    // Update imageUrl
    if (body.imageUrl !== undefined) {
      updates.imageUrl = body.imageUrl;
    }

    // Update status
    if (body.status !== undefined) {
      updates.status = body.status;
    }

    // Validate and update tags
    if (body.tags !== undefined && body.tags !== null) {
      if (!Array.isArray(body.tags)) {
        return NextResponse.json({ 
          error: "Tags must be an array",
          code: "INVALID_TAGS" 
        }, { status: 400 });
      }
      updates.tags = JSON.stringify(body.tags);
    }

    // Validate and update registrationDeadline
    if (body.registrationDeadline !== undefined) {
      if (body.registrationDeadline !== null) {
        const deadlineDate = new Date(body.registrationDeadline);
        if (isNaN(deadlineDate.getTime())) {
          return NextResponse.json({ 
            error: "Registration deadline must be a valid ISO date string",
            code: "INVALID_REGISTRATION_DEADLINE" 
          }, { status: 400 });
        }

        const eventDate = new Date(updates.eventDate || eventData?.eventDate);
        if (deadlineDate >= eventDate) {
          return NextResponse.json({ 
            error: "Registration deadline must be before the event date",
            code: "INVALID_REGISTRATION_DEADLINE_DATE" 
          }, { status: 400 });
        }
      }
      updates.registrationDeadline = body.registrationDeadline;
    }

    // Update isPublic
    if (body.isPublic !== undefined) {
      updates.isPublic = body.isPublic ? 1 : 0;
    }

    // Always update updatedAt
    updates.updatedAt = new Date().toISOString();

    await collection.doc(id).update(updates);
    const updated = await collection.doc(id).get();
    return NextResponse.json(mapDoc(updated), { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED' 
      }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const collection = adminDb.collection(COLLECTION_NAME);
    const doc = await collection.doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ 
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND' 
      }, { status: 404 });
    }

    const eventData = mapDoc(doc);
    if (eventData?.organizerId !== authUser.id) {
      return NextResponse.json({ 
        error: 'Forbidden: You are not the organizer of this event',
        code: 'FORBIDDEN_NOT_ORGANIZER' 
      }, { status: 403 });
    }

    await collection.doc(id).delete();
    return NextResponse.json({
      message: 'Event deleted successfully',
      event: mapDoc(doc)
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}