import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { alumniConnections } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';

const VALID_CONNECTION_TYPES = ['mentorship', 'networking', 'collaboration'] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requesterId, recipientId, connectionType, message } = body;

    // Validate required fields
    if (!requesterId) {
      return NextResponse.json(
        { error: 'Requester ID is required', code: 'MISSING_REQUESTER_ID' },
        { status: 400 }
      );
    }

    if (!recipientId) {
      return NextResponse.json(
        { error: 'Recipient ID is required', code: 'MISSING_RECIPIENT_ID' },
        { status: 400 }
      );
    }

    if (!connectionType) {
      return NextResponse.json(
        { error: 'Connection type is required', code: 'MISSING_CONNECTION_TYPE' },
        { status: 400 }
      );
    }

    // Validate connectionType
    if (!VALID_CONNECTION_TYPES.includes(connectionType as typeof VALID_CONNECTION_TYPES[number])) {
      return NextResponse.json(
        {
          error: `Invalid connection type. Must be one of: ${VALID_CONNECTION_TYPES.join(', ')}`,
          code: 'INVALID_CONNECTION_TYPE'
        },
        { status: 400 }
      );
    }

    // Validate cannot connect to self
    if (requesterId === recipientId) {
      return NextResponse.json(
        { error: 'Cannot send connection request to yourself', code: 'SELF_CONNECTION_NOT_ALLOWED' },
        { status: 400 }
      );
    }

    // Check if connection already exists (in either direction)
    const existingConnection = await db
      .select()
      .from(alumniConnections)
      .where(
        or(
          and(
            eq(alumniConnections.requesterId, requesterId),
            eq(alumniConnections.recipientId, recipientId)
          ),
          and(
            eq(alumniConnections.requesterId, recipientId),
            eq(alumniConnections.recipientId, requesterId)
          )
        )
      )
      .limit(1);

    if (existingConnection.length > 0) {
      return NextResponse.json(
        { error: 'Connection already exists', code: 'CONNECTION_ALREADY_EXISTS' },
        { status: 400 }
      );
    }

    // Create new connection request
    const now = new Date().toISOString();
    const newConnection = await db
      .insert(alumniConnections)
      .values({
        requesterId,
        recipientId,
        connectionType,
        message: message || null,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        message: 'Connection request sent successfully',
        connection: newConnection[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}