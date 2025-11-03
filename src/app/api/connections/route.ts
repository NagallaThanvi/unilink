import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { alumniConnections } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';

const VALID_CONNECTION_TYPES = ['mentorship', 'networking', 'collaboration'];
const VALID_STATUSES = ['pending', 'accepted', 'rejected'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const requesterId = searchParams.get('requesterId');
    const recipientId = searchParams.get('recipientId');
    const status = searchParams.get('status');
    const connectionType = searchParams.get('connectionType');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Single connection by ID
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const connection = await db
        .select()
        .from(alumniConnections)
        .where(eq(alumniConnections.id, parseInt(id)))
        .limit(1);

      if (connection.length === 0) {
        return NextResponse.json(
          { error: 'Connection not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(connection[0]);
    }

    // List connections with filters
    let query = db.select().from(alumniConnections);
    const conditions = [];

    // Filter by userId (connections where user is either requester or recipient)
    if (userId) {
      conditions.push(
        or(
          eq(alumniConnections.requesterId, userId),
          eq(alumniConnections.recipientId, userId)
        )
      );
    }

    // Filter by requesterId
    if (requesterId) {
      conditions.push(eq(alumniConnections.requesterId, requesterId));
    }

    // Filter by recipientId
    if (recipientId) {
      conditions.push(eq(alumniConnections.recipientId, recipientId));
    }

    // Filter by status
    if (status) {
      conditions.push(eq(alumniConnections.status, status));
    }

    // Filter by connectionType
    if (connectionType) {
      conditions.push(eq(alumniConnections.connectionType, connectionType));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply pagination and sorting
    const results = await query
      .orderBy(desc(alumniConnections.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requesterId, recipientId, connectionType, message } = body;

    // Validate required fields
    if (!requesterId) {
      return NextResponse.json(
        { error: 'requesterId is required', code: 'MISSING_REQUESTER_ID' },
        { status: 400 }
      );
    }

    if (!recipientId) {
      return NextResponse.json(
        { error: 'recipientId is required', code: 'MISSING_RECIPIENT_ID' },
        { status: 400 }
      );
    }

    if (!connectionType) {
      return NextResponse.json(
        { error: 'connectionType is required', code: 'MISSING_CONNECTION_TYPE' },
        { status: 400 }
      );
    }

    // Validate connectionType
    if (!VALID_CONNECTION_TYPES.includes(connectionType)) {
      return NextResponse.json(
        {
          error: `connectionType must be one of: ${VALID_CONNECTION_TYPES.join(', ')}`,
          code: 'INVALID_CONNECTION_TYPE',
        },
        { status: 400 }
      );
    }

    // Validate requesterId != recipientId
    if (requesterId === recipientId) {
      return NextResponse.json(
        {
          error: 'Cannot create connection request to yourself',
          code: 'SELF_CONNECTION_NOT_ALLOWED',
        },
        { status: 400 }
      );
    }

    // Create connection request
    const now = new Date().toISOString();
    const newConnection = await db
      .insert(alumniConnections)
      .values({
        requesterId: requesterId.trim(),
        recipientId: recipientId.trim(),
        connectionType,
        message: message ? message.trim() : null,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newConnection[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, message } = body;

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    // Check if connection exists
    const existing = await db
      .select()
      .from(alumniConnections)
      .where(eq(alumniConnections.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (status !== undefined) {
      updates.status = status;
    }

    if (message !== undefined) {
      updates.message = message ? message.trim() : null;
    }

    // Update connection
    const updated = await db
      .update(alumniConnections)
      .set(updates)
      .where(eq(alumniConnections.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if connection exists
    const existing = await db
      .select()
      .from(alumniConnections)
      .where(eq(alumniConnections.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Delete connection
    const deleted = await db
      .delete(alumniConnections)
      .where(eq(alumniConnections.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Connection deleted successfully',
      deleted: deleted[0],
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}