import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getCurrentUser } from '@/lib/auth';

const VALID_CONNECTION_TYPES = ['mentorship', 'networking', 'collaboration'];
const VALID_STATUSES = ['pending', 'accepted', 'rejected'];
const COLLECTION_NAME = 'connections';

function mapDoc(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data();
  if (!data) return null;
  return {
    id: doc.id,
    requesterId: data.requesterId ?? null,
    recipientId: data.recipientId ?? null,
    connectionType: data.connectionType ?? null,
    status: data.status ?? 'pending',
    message: data.message ?? null,
    requestedAt: data.requestedAt ?? null,
    respondedAt: data.respondedAt ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

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

    const collection = adminDb.collection(COLLECTION_NAME);

    // Single connection by ID
    if (id) {
      const doc = await collection.doc(id).get();
      if (!doc.exists) {
        return NextResponse.json(
          { error: 'Connection not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(mapDoc(doc));
    }

    // List connections with filters
    let query: FirebaseFirestore.Query = collection.orderBy('createdAt', 'desc');

    // Filter by userId (connections where user is either requester or recipient)
    if (userId) {
      // Firestore doesn't support OR directly; we'll fetch both and merge in memory
      const [asReq, asRec] = await Promise.all([
        collection.where('requesterId', '==', userId).get(),
        collection.where('recipientId', '==', userId).get(),
      ]);
      const merged = [...asReq.docs, ...asRec.docs];
      // Remove duplicates (if any) and apply other filters in memory
      const unique = Array.from(new Map(merged.map(doc => [doc.id, doc])).values());
      let results = unique.map(mapDoc).filter(Boolean);
      if (status) results = results.filter(c => c.status === status);
      if (connectionType) results = results.filter(c => c.connectionType === connectionType);
      if (requesterId) results = results.filter(c => c.requesterId === requesterId);
      if (recipientId) results = results.filter(c => c.recipientId === recipientId);
      return NextResponse.json(results.slice(offset, offset + limit));
    }

    // Filter by requesterId
    if (requesterId) {
      query = query.where('requesterId', '==', requesterId);
    }

    // Filter by recipientId
    if (recipientId) {
      query = query.where('recipientId', '==', recipientId);
    }

    // Filter by status
    if (status) {
      query = query.where('status', '==', status);
    }

    // Filter by connectionType
    if (connectionType) {
      query = query.where('connectionType', '==', connectionType);
    }

    const snapshot = await query.limit(limit).offset(offset).get();
    const results = snapshot.docs.map(mapDoc).filter(Boolean);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
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
    const collection = adminDb.collection(COLLECTION_NAME);
    const ref = await collection.add({
      requesterId: requesterId.trim(),
      recipientId: recipientId.trim(),
      connectionType,
      message: message ? message.trim() : null,
      status: 'pending',
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const created = await ref.get();
    return NextResponse.json(mapDoc(created), { status: 201 });
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
    if (!id) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const collection = adminDb.collection(COLLECTION_NAME);
    const doc = await collection.doc(id).get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Connection not found', code: 'CONNECTION_NOT_FOUND' },
        { status: 404 }
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

    // Build update object
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (status !== undefined) {
      updates.status = status;
      if (status === 'accepted' || status === 'rejected') {
        updates.respondedAt = new Date().toISOString();
      }
    }

    if (message !== undefined) {
      updates.message = message ? message.trim() : null;
    }

    // Update connection
    await collection.doc(id).update(updates);
    const updated = await collection.doc(id).get();
    return NextResponse.json(mapDoc(updated));
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
    if (!id) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const collection = adminDb.collection(COLLECTION_NAME);
    const doc = await collection.doc(id).get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    await collection.doc(id).delete();
    return NextResponse.json({
      message: 'Connection deleted successfully',
      deleted: mapDoc(doc),
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}