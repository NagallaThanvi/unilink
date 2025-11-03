import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { events, eventRegistrations } from '@/db/schema';
import { eq, like, and, or, desc, asc, gte, lt, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

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

    // Single event fetch with registration count
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const eventResult = await db.select()
        .from(events)
        .where(eq(events.id, parseInt(id)))
        .limit(1);

      if (eventResult.length === 0) {
        return NextResponse.json({ 
          error: 'Event not found',
          code: 'EVENT_NOT_FOUND' 
        }, { status: 404 });
      }

      // Get registration count
      const registrationCount = await db.select({ count: sql<number>`count(*)` })
        .from(eventRegistrations)
        .where(eq(eventRegistrations.eventId, parseInt(id)));

      return NextResponse.json({
        ...eventResult[0],
        registrationCount: registrationCount[0]?.count || 0
      }, { status: 200 });
    }

    // List events with filters
    let query = db.select().from(events);
    const conditions = [];

    // Filter by universityId
    if (universityId) {
      conditions.push(eq(events.universityId, parseInt(universityId)));
    }

    // Filter by status
    if (status) {
      conditions.push(eq(events.status, status));
    }

    // Filter by organizerId
    if (organizerId) {
      conditions.push(eq(events.organizerId, organizerId));
    }

    // Filter by isPublic
    if (isPublic !== null && isPublic !== undefined) {
      const isPublicBool = isPublic === 'true' || isPublic === '1';
      conditions.push(eq(events.isPublic, isPublicBool ? 1 : 0));
    }

    // Filter upcoming events
    if (upcoming === 'true' || upcoming === '1') {
      const currentDate = new Date().toISOString().split('T')[0];
      conditions.push(gte(events.eventDate, currentDate));
    }

    // Filter past events
    if (past === 'true' || past === '1') {
      const currentDate = new Date().toISOString().split('T')[0];
      conditions.push(lt(events.eventDate, currentDate));
    }

    // Search in title and description
    if (search) {
      const searchCondition = or(
        like(events.title, `%${search}%`),
        like(events.description, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    // Apply all conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Order by eventDate
    if (past === 'true' || past === '1') {
      query = query.orderBy(desc(events.eventDate));
    } else {
      query = query.orderBy(asc(events.eventDate));
    }

    // Apply pagination
    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
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
      organizerId: session.user.id,
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

    // Insert into database
    const newEvent = await db.insert(events)
      .values(insertData)
      .returning();

    return NextResponse.json(newEvent[0], { status: 201 });
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
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED' 
      }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check event exists
    const existingEvent = await db.select()
      .from(events)
      .where(eq(events.id, parseInt(id)))
      .limit(1);

    if (existingEvent.length === 0) {
      return NextResponse.json({ 
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND' 
      }, { status: 404 });
    }

    // Check if user is the organizer
    if (existingEvent[0].organizerId !== session.user.id) {
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
      if (body.maxAttendees < existingEvent[0].currentAttendees) {
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

        const eventDate = new Date(updates.eventDate || existingEvent[0].eventDate);
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

    // Perform update
    const updatedEvent = await db.update(events)
      .set(updates)
      .where(eq(events.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedEvent[0], { status: 200 });
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
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED' 
      }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check event exists
    const existingEvent = await db.select()
      .from(events)
      .where(eq(events.id, parseInt(id)))
      .limit(1);

    if (existingEvent.length === 0) {
      return NextResponse.json({ 
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND' 
      }, { status: 404 });
    }

    // Check if user is the organizer
    if (existingEvent[0].organizerId !== session.user.id) {
      return NextResponse.json({ 
        error: 'Forbidden: You are not the organizer of this event',
        code: 'FORBIDDEN_NOT_ORGANIZER' 
      }, { status: 403 });
    }

    // Delete event (cascade will delete registrations)
    const deletedEvent = await db.delete(events)
      .where(eq(events.id, parseInt(id)))
      .returning();

    return NextResponse.json({ 
      message: 'Event deleted successfully',
      event: deletedEvent[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}