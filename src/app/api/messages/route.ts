import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { getCurrentUser } from '@/lib/auth';

const VALID_MESSAGE_TYPES = ['text', 'file', 'image'];
const COLLECTION_NAME = 'messages';

function mapDoc(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data();
  if (!data) return null;
  return {
    id: doc.id,
    conversationId: data.conversationId ?? null,
    senderId: data.senderId ?? null,
    receiverId: data.receiverId ?? null,
    content: data.content ?? null,
    messageType: data.messageType ?? 'text',
    fileUrl: data.fileUrl ?? null,
    isRead: data.isRead ?? false,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const conversationId = searchParams.get('conversationId');
    const senderId = searchParams.get('senderId');
    const receiverId = searchParams.get('receiverId');
    const isReadParam = searchParams.get('isRead');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    const collection = adminDb.collection(COLLECTION_NAME);

    // Single message fetch
    if (id) {
      const doc = await collection.doc(id).get();
      if (!doc.exists) {
        return NextResponse.json({ 
          error: 'Message not found',
          code: 'MESSAGE_NOT_FOUND' 
        }, { status: 404 });
      }
      return NextResponse.json(mapDoc(doc), { status: 200 });
    }

    let query: FirebaseFirestore.Query = collection.orderBy('createdAt', 'desc');

    if (conversationId) {
      query = query.where('conversationId', '==', conversationId);
    }

    if (senderId) {
      query = query.where('senderId', '==', senderId);
    }

    if (receiverId) {
      query = query.where('receiverId', '==', receiverId);
    }

    if (isReadParam !== null) {
      const isRead = isReadParam === 'true';
      query = query.where('isRead', '==', isRead);
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
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      senderId, 
      receiverId, 
      conversationId, 
      encryptedContent, 
      encryptedKey, 
      messageType = 'text' 
    } = body;

    // Validate required fields
    if (!senderId) {
      return NextResponse.json({ 
        error: 'Sender ID is required',
        code: 'MISSING_SENDER_ID' 
      }, { status: 400 });
    }

    if (!receiverId) {
      return NextResponse.json({ 
        error: 'Receiver ID is required',
        code: 'MISSING_RECEIVER_ID' 
      }, { status: 400 });
    }

    if (!conversationId) {
      return NextResponse.json({ 
        error: 'Conversation ID is required',
        code: 'MISSING_CONVERSATION_ID' 
      }, { status: 400 });
    }

    if (!encryptedContent) {
      return NextResponse.json({ 
        error: 'Encrypted content is required',
        code: 'MISSING_ENCRYPTED_CONTENT' 
      }, { status: 400 });
    }

    if (!encryptedKey) {
      return NextResponse.json({ 
        error: 'Encrypted key is required',
        code: 'MISSING_ENCRYPTED_KEY' 
      }, { status: 400 });
    }

    // Validate authenticated user is the sender
    if (senderId !== authUser.id) {
      return NextResponse.json({ 
        error: 'You can only send messages as yourself',
        code: 'UNAUTHORIZED_SENDER' 
      }, { status: 403 });
    }

    // Validate messageType
    if (!VALID_MESSAGE_TYPES.includes(messageType)) {
      return NextResponse.json({ 
        error: `Invalid message type. Must be one of: ${VALID_MESSAGE_TYPES.join(', ')}`,
        code: 'INVALID_MESSAGE_TYPE' 
      }, { status: 400 });
    }

    // Validate conversationId is a string
    if (typeof conversationId !== 'string' || conversationId.trim() === '') {
      return NextResponse.json({ 
        error: 'Valid conversation ID is required',
        code: 'INVALID_CONVERSATION_ID' 
      }, { status: 400 });
    }

    // Verify conversation exists and user is a participant
    const convColl = adminDb.collection('conversations');
    const convDoc = await convColl.doc(conversationId).get();
    if (!convDoc.exists) {
      return NextResponse.json({ 
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND' 
      }, { status: 404 });
    }

    const convData = convDoc.data()!;
    const participants = convData.participants || [];
    if (!participants.includes(authUser.id)) {
      return NextResponse.json({ 
        error: 'You are not a participant in this conversation',
        code: 'NOT_PARTICIPANT' 
      }, { status: 403 });
    }

    // Verify receiver is a participant
    if (!participants.includes(receiverId)) {
      return NextResponse.json({ 
        error: 'Receiver is not a participant in this conversation',
        code: 'INVALID_RECEIVER' 
      }, { status: 400 });
    }

    // Verify receiver exists via Firebase Auth
    try {
      await adminAuth.getUser(receiverId);
    } catch {
      return NextResponse.json({ 
        error: 'Receiver user not found',
        code: 'RECEIVER_NOT_FOUND' 
      }, { status: 404 });
    }

    const now = new Date().toISOString();

    const msgColl = adminDb.collection(COLLECTION_NAME);
    const ref = await msgColl.add({
      senderId: senderId.trim(),
      receiverId: receiverId.trim(),
      conversationId,
      content: encryptedContent.trim(),
      messageType: messageType.trim(),
      isRead: false,
      createdAt: now,
      updatedAt: now,
    });

    // Update conversation with last message info
    await convColl.doc(conversationId).update({
      lastMessage: `${messageType === 'text' ? 'Message' : messageType === 'image' ? 'Image' : 'File'}`,
      lastMessageAt: now,
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
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: 'Message ID is required',
        code: 'MISSING_ID' 
      }, { status: 400 });
    }

    const collection = adminDb.collection(COLLECTION_NAME);
    const doc = await collection.doc(id).get();
    if (!doc.exists || doc.data()?.receiverId !== authUser.id) {
      return NextResponse.json({ 
        error: 'Message not found or you are not authorized to mark it as read',
        code: 'MESSAGE_NOT_FOUND' 
      }, { status: 404 });
    }

    const now = new Date().toISOString();
    await collection.doc(id).update({
      isRead: true,
      updatedAt: now,
    });

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
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: 'Message ID is required',
        code: 'MISSING_ID' 
      }, { status: 400 });
    }

    const collection = adminDb.collection(COLLECTION_NAME);
    const doc = await collection.doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ 
        error: 'Message not found',
        code: 'MESSAGE_NOT_FOUND' 
      }, { status: 404 });
    }

    const data = doc.data()!;
    if (data.senderId !== authUser.id && data.receiverId !== authUser.id) {
      return NextResponse.json({ 
        error: 'You are not authorized to delete this message',
        code: 'UNAUTHORIZED_DELETE' 
      }, { status: 403 });
    }

    await collection.doc(id).delete();
    return NextResponse.json({
      message: 'Message deleted successfully',
      deletedMessage: mapDoc(doc)
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}