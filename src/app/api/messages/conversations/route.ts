import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

const COLLECTION_NAME = 'conversations';

function mapDoc(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data();
  if (!data) return null;
  return {
    id: doc.id,
    participants: data.participants ?? [],
    isGroupChat: data.isGroupChat ?? false,
    groupName: data.groupName ?? null,
    encryptionPublicKeys: data.encryptionPublicKeys ?? {},
    lastMessage: data.lastMessage ?? null,
    lastMessageAt: data.lastMessageAt ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const isGroupChat = searchParams.get('isGroupChat');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const collection = adminDb.collection(COLLECTION_NAME);

    // Single conversation by ID
    if (id) {
      const doc = await collection.doc(id).get();
      if (!doc.exists) {
        return NextResponse.json({ 
          error: 'Conversation not found',
          code: 'CONVERSATION_NOT_FOUND' 
        }, { status: 404 });
      }
      return NextResponse.json(mapDoc(doc), { status: 200 });
    }

    let query: FirebaseFirestore.Query = collection.orderBy('lastMessageAt', 'desc');

    // Filter by userId in participants array (array-contains)
    if (userId) {
      query = query.where('participants', 'array-contains', userId);
    }

    // Filter by isGroupChat
    if (isGroupChat !== null && isGroupChat !== undefined) {
      const isGroup = isGroupChat === 'true';
      query = query.where('isGroupChat', '==', isGroup);
    }

    const snapshot = await query.limit(limit).offset(offset).get();
    const results = snapshot.docs.map(mapDoc).filter(Boolean);

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
    const body = await request.json();
    const { participants, groupName, encryptionPublicKeys } = body;

    // Validate participants
    if (!participants) {
      return NextResponse.json({ 
        error: "participants field is required",
        code: "MISSING_PARTICIPANTS" 
      }, { status: 400 });
    }

    if (!Array.isArray(participants)) {
      return NextResponse.json({ 
        error: "participants must be an array",
        code: "INVALID_PARTICIPANTS_TYPE" 
      }, { status: 400 });
    }

    if (participants.length < 2) {
      return NextResponse.json({ 
        error: "participants must contain at least 2 user ids",
        code: "INSUFFICIENT_PARTICIPANTS" 
      }, { status: 400 });
    }

    // Determine if it's a group chat
    const isGroupChat = participants.length > 2;

    // Validate groupName if it's a group chat
    if (isGroupChat && !groupName) {
      return NextResponse.json({ 
        error: "groupName is required for group chats",
        code: "MISSING_GROUP_NAME" 
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    const collection = adminDb.collection(COLLECTION_NAME);
    const ref = await collection.add({
      participants,
      isGroupChat,
      groupName: groupName || null,
      encryptionPublicKeys: encryptionPublicKeys || {},
      lastMessage: null,
      lastMessageAt: null,
      createdAt: now,
      updatedAt: now,
    });

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
        error: 'Conversation not found',
        code: "CONVERSATION_NOT_FOUND" 
      }, { status: 404 });
    }

    const body = await request.json();
    const { lastMessage, lastMessageAt, groupName, encryptionPublicKeys } = body;

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (lastMessage !== undefined) {
      updates.lastMessage = lastMessage;
    }

    if (lastMessageAt !== undefined) {
      updates.lastMessageAt = lastMessageAt;
    }

    if (groupName !== undefined) {
      updates.groupName = groupName;
    }

    if (encryptionPublicKeys !== undefined) {
      updates.encryptionPublicKeys = encryptionPublicKeys;
    }

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
        error: 'Conversation not found',
        code: "CONVERSATION_NOT_FOUND" 
      }, { status: 404 });
    }

    await collection.doc(id).delete();
    return NextResponse.json({
      message: 'Conversation deleted successfully',
      conversation: mapDoc(doc)
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}