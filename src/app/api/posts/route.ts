import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getCurrentUser } from '@/lib/auth';

const COLLECTION_NAME = 'posts';

function mapDoc(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data();
  if (!data) return null;
  return {
    id: doc.id,
    userId: data.userId ?? null,
    content: data.content ?? null,
    mediaUrl: data.mediaUrl ?? null,
    mediaType: data.mediaType ?? null,
    likesCount: data.likesCount ?? 0,
    commentsCount: data.commentsCount ?? 0,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

// GET /api/posts?userId=&limit=&offset=
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const userId = sp.get('userId');
    const limit = Math.min(parseInt(sp.get('limit') || '10'), 50);
    const offset = parseInt(sp.get('offset') || '0');

    let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION_NAME).orderBy('createdAt', 'desc');

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    const snapshot = await query.limit(limit).offset(offset).get();
    const posts = snapshot.docs.map(mapDoc).filter(Boolean);

    return NextResponse.json(posts);
  } catch (error) {
    console.error('GET /api/posts error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}

// POST /api/posts  { content?, mediaDataUrl?, mediaType? }
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { content, mediaDataUrl, mediaType } = body as {
      content?: string; mediaDataUrl?: string | null; mediaType?: 'image' | 'video' | null;
    };

    if (!content && !mediaDataUrl) {
      return NextResponse.json({ error: 'Provide content or media' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const ref = await adminDb.collection(COLLECTION_NAME).add({
      userId: user.id,
      content: content || null,
      mediaUrl: mediaDataUrl || null,
      mediaType: mediaType || null,
      likesCount: 0,
      commentsCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    const created = await ref.get();
    return NextResponse.json(mapDoc(created), { status: 201 });
  } catch (error) {
    console.error('POST /api/posts error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}
