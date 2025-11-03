import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { posts, user, postLikes, postComments } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';

// GET /api/posts?userId=&limit=&offset=
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const userId = sp.get('userId');
    const limit = Math.min(parseInt(sp.get('limit') || '10'), 50);
    const offset = parseInt(sp.get('offset') || '0');

    let query: any = db
      .select()
      .from(posts)
      .leftJoin(user, eq(posts.userId, user.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    if (userId) {
      query = db
        .select()
        .from(posts)
        .leftJoin(user, eq(posts.userId, user.id))
        .where(eq(posts.userId, userId))
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset);
    }

    const rows = await query;
    const payload = rows.map((row: any) => {
      const p = row.posts ?? row;
      const u = row.user ?? {};
      return {
        ...p,
        author: { id: u.id, name: u.name, image: u.image },
        likesCount: 0,
        commentsCount: 0,
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('GET /api/posts error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}

// POST /api/posts  { userId, content?, mediaDataUrl?, mediaType? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, content, mediaDataUrl, mediaType } = body as {
      userId?: string; content?: string; mediaDataUrl?: string | null; mediaType?: 'image' | 'video' | null;
    };

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (!content && !mediaDataUrl) {
      return NextResponse.json({ error: 'Provide content or media' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const inserted = await db.insert(posts).values({
      userId,
      content: content || null,
      mediaUrl: mediaDataUrl || null, // MVP stores data URL directly; replace with IPFS later
      mediaType: mediaType || null,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/posts error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}
