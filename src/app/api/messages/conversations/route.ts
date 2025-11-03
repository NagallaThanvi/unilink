import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { conversations } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const isGroupChat = searchParams.get('isGroupChat');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Single conversation by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const conversation = await db.select()
        .from(conversations)
        .where(eq(conversations.id, parseInt(id)))
        .limit(1);

      if (conversation.length === 0) {
        return NextResponse.json({ 
          error: 'Conversation not found',
          code: "CONVERSATION_NOT_FOUND" 
        }, { status: 404 });
      }

      return NextResponse.json(conversation[0], { status: 200 });
    }

    // List conversations with filters
    let query = db.select().from(conversations);

    const conditions = [];

    // Filter by userId in participants array
    if (userId) {
      conditions.push(sql`json_array_length(json_extract(${conversations.participants}, '$')) > 0 AND EXISTS (
        SELECT 1 FROM json_each(${conversations.participants}) 
        WHERE json_each.value = ${userId}
      )`);
    }

    // Filter by isGroupChat
    if (isGroupChat !== null && isGroupChat !== undefined) {
      const isGroup = isGroupChat === 'true';
      conditions.push(eq(conversations.isGroupChat, isGroup));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Order by lastMessageAt DESC (most recent first)
    const results = await query
      .orderBy(desc(conversations.lastMessageAt))
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

    const newConversation = await db.insert(conversations)
      .values({
        participants: participants,
        isGroupChat: isGroupChat,
        groupName: groupName || null,
        encryptionPublicKeys: encryptionPublicKeys || null,
        lastMessage: null,
        lastMessageAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newConversation[0], { status: 201 });
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

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();
    const { lastMessage, lastMessageAt, groupName, encryptionPublicKeys } = body;

    // Check if conversation exists
    const existing = await db.select()
      .from(conversations)
      .where(eq(conversations.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Conversation not found',
        code: "CONVERSATION_NOT_FOUND" 
      }, { status: 404 });
    }

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

    const updated = await db.update(conversations)
      .set(updates)
      .where(eq(conversations.id, parseInt(id)))
      .returning();

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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if conversation exists
    const existing = await db.select()
      .from(conversations)
      .where(eq(conversations.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Conversation not found',
        code: "CONVERSATION_NOT_FOUND" 
      }, { status: 404 });
    }

    const deleted = await db.delete(conversations)
      .where(eq(conversations.id, parseInt(id)))
      .returning();

    return NextResponse.json({ 
      message: 'Conversation deleted successfully',
      conversation: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}