import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messages, conversations, user } from '@/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const VALID_MESSAGE_TYPES = ['text', 'file', 'image'];

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

    // Single message fetch
    if (id) {
      const messageId = parseInt(id);
      if (isNaN(messageId)) {
        return NextResponse.json({ 
          error: 'Valid message ID is required',
          code: 'INVALID_ID' 
        }, { status: 400 });
      }

      const message = await db.select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (message.length === 0) {
        return NextResponse.json({ 
          error: 'Message not found',
          code: 'MESSAGE_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(message[0], { status: 200 });
    }

    // List messages with filters
    let conditions = [];

    if (conversationId) {
      const convId = parseInt(conversationId);
      if (!isNaN(convId)) {
        conditions.push(eq(messages.conversationId, convId));
      }
    }

    if (senderId) {
      conditions.push(eq(messages.senderId, senderId));
    }

    if (receiverId) {
      conditions.push(eq(messages.receiverId, receiverId));
    }

    if (isReadParam !== null) {
      const isRead = isReadParam === 'true';
      conditions.push(eq(messages.isRead, isRead));
    }

    let query = db.select().from(messages);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

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

    // Validate conversationId is a number
    const convId = parseInt(conversationId);
    if (isNaN(convId)) {
      return NextResponse.json({ 
        error: 'Valid conversation ID is required',
        code: 'INVALID_CONVERSATION_ID' 
      }, { status: 400 });
    }

    // Verify conversation exists and user is a participant
    const conversation = await db.select()
      .from(conversations)
      .where(eq(conversations.id, convId))
      .limit(1);

    if (conversation.length === 0) {
      return NextResponse.json({ 
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND' 
      }, { status: 404 });
    }

    const participants = conversation[0].participants as string[];
    if (!participants.includes(authUser.id)) {
      return NextResponse.json({ 
        error: 'You are not a participant in this conversation',
        code: 'NOT_PARTICIPANT' 
      }, { status: 403 });
    }

    // Verify receiver exists and is a participant
    if (!participants.includes(receiverId)) {
      return NextResponse.json({ 
        error: 'Receiver is not a participant in this conversation',
        code: 'INVALID_RECEIVER' 
      }, { status: 400 });
    }

    const receiverExists = await db.select()
      .from(user)
      .where(eq(user.id, receiverId))
      .limit(1);

    if (receiverExists.length === 0) {
      return NextResponse.json({ 
        error: 'Receiver user not found',
        code: 'RECEIVER_NOT_FOUND' 
      }, { status: 404 });
    }

    const now = new Date().toISOString();

    const newMessage = await db.insert(messages)
      .values({
        senderId: senderId.trim(),
        receiverId: receiverId.trim(),
        conversationId: convId,
        encryptedContent: encryptedContent.trim(),
        encryptedKey: encryptedKey.trim(),
        messageType: messageType.trim(),
        isRead: false,
        readAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Update conversation with last message info
    await db.update(conversations)
      .set({
        lastMessage: `${messageType === 'text' ? 'Message' : messageType === 'image' ? 'Image' : 'File'}`,
        lastMessageAt: now,
        updatedAt: now,
      })
      .where(eq(conversations.id, convId));

    return NextResponse.json(newMessage[0], { status: 201 });

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

    const messageId = parseInt(id);
    if (isNaN(messageId)) {
      return NextResponse.json({ 
        error: 'Valid message ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    // Check if message exists and user is the receiver
    const existingMessage = await db.select()
      .from(messages)
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.receiverId, authUser.id)
        )
      )
      .limit(1);

    if (existingMessage.length === 0) {
      return NextResponse.json({ 
        error: 'Message not found or you are not authorized to mark it as read',
        code: 'MESSAGE_NOT_FOUND' 
      }, { status: 404 });
    }

    const now = new Date().toISOString();

    const updated = await db.update(messages)
      .set({
        isRead: true,
        readAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.receiverId, authUser.id)
        )
      )
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update message',
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }

    return NextResponse.json(updated[0], { status: 200 });

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

    const messageId = parseInt(id);
    if (isNaN(messageId)) {
      return NextResponse.json({ 
        error: 'Valid message ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    // Check if message exists and user is sender or receiver
    const existingMessage = await db.select()
      .from(messages)
      .where(
        and(
          eq(messages.id, messageId),
          or(
            eq(messages.senderId, authUser.id),
            eq(messages.receiverId, authUser.id)
          )
        )
      )
      .limit(1);

    if (existingMessage.length === 0) {
      return NextResponse.json({ 
        error: 'Message not found or you are not authorized to delete it',
        code: 'MESSAGE_NOT_FOUND' 
      }, { status: 404 });
    }

    const deleted = await db.delete(messages)
      .where(
        and(
          eq(messages.id, messageId),
          or(
            eq(messages.senderId, authUser.id),
            eq(messages.receiverId, authUser.id)
          )
        )
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to delete message',
        code: 'DELETE_FAILED' 
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Message deleted successfully',
      deletedMessage: deleted[0]
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}