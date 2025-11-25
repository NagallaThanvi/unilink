import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

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
    const collection = adminDb.collection('connections');
    const [asReq, asRec] = await Promise.all([
      collection.where('requesterId', '==', requesterId).where('recipientId', '==', recipientId).limit(1).get(),
      collection.where('requesterId', '==', recipientId).where('recipientId', '==', requesterId).limit(1).get(),
    ]);

    if (!asReq.empty || !asRec.empty) {
      return NextResponse.json(
        { error: 'Connection already exists', code: 'CONNECTION_ALREADY_EXISTS' },
        { status: 400 }
      );
    }

    // Create new connection request
    const now = new Date().toISOString();
    const ref = await collection.add({
      requesterId,
      recipientId,
      connectionType,
      message: message || null,
      status: 'pending',
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const created = await ref.get();
    return NextResponse.json(
      {
        success: true,
        message: 'Connection request sent successfully',
        connection: { id: created.id, ...created.data() },
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