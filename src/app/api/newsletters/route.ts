import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getCurrentUser } from '@/lib/auth';

const VALID_STATUSES = ['draft', 'published', 'scheduled'] as const;
type NewsletterStatus = typeof VALID_STATUSES[number];
const COLLECTION_NAME = 'newsletters';

function mapDoc(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data();
  if (!data) return null;
  return {
    id: doc.id,
    universityId: data.universityId ?? null,
    title: data.title ?? null,
    content: data.content ?? null,
    status: data.status ?? 'draft',
    scheduledFor: data.scheduledFor ?? null,
    sentAt: data.sentAt ?? null,
    createdBy: data.createdBy ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

function isValidStatus(status: string): status is NewsletterStatus {
  return VALID_STATUSES.includes(status as NewsletterStatus);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const universityId = searchParams.get('universityId');
    const status = searchParams.get('status');
    const createdBy = searchParams.get('createdBy');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const collection = adminDb.collection(COLLECTION_NAME);

    // Single record fetch
    if (id) {
      const doc = await collection.doc(id).get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
      }
      return NextResponse.json(mapDoc(doc));
    }

    let query: FirebaseFirestore.Query = collection.orderBy('createdAt', 'desc');

    if (universityId) {
      query = query.where('universityId', '==', universityId);
    }

    if (status && isValidStatus(status)) {
      query = query.where('status', '==', status);
    }

    if (createdBy) {
      query = query.where('createdBy', '==', createdBy);
    }

    const snapshot = await query.limit(limit).offset(offset).get();
    let results = snapshot.docs.map(mapDoc).filter(Boolean);

    // In-memory text search if needed
    if (search) {
      const lower = search.toLowerCase();
      results = results.filter(n => 
        (n.title && n.title.toLowerCase().includes(lower)) ||
        (n.content && n.content.toLowerCase().includes(lower))
      );
    }

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

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { 
      universityId, 
      title, 
      content, 
      createdBy,
      htmlContent,
      status,
      publishDate,
      recipientCount,
      openRate,
      aiPrompt
    } = body;

    // Validate required fields
    if (!universityId) {
      return NextResponse.json({ 
        error: "universityId is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ 
        error: "title is required and must be a non-empty string",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ 
        error: "content is required and must be a non-empty string",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!createdBy || typeof createdBy !== 'string' || createdBy.trim() === '') {
      return NextResponse.json({ 
        error: "createdBy is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    // Verify university exists
    const uniDoc = await adminDb.collection('universities').doc(universityId).get();
    if (!uniDoc.exists) {
      return NextResponse.json({ 
        error: 'University not found',
        code: 'UNIVERSITY_NOT_FOUND' 
      }, { status: 400 });
    }

    // Validate status if provided
    const newsletterStatus = status || 'draft';
    if (!isValidStatus(newsletterStatus)) {
      return NextResponse.json({ 
        error: "status must be one of: draft, published, scheduled",
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Validate scheduled status requires publishDate
    if (newsletterStatus === 'scheduled' && !publishDate) {
      return NextResponse.json({ 
        error: "publishDate is required when status is scheduled",
        code: "MISSING_PUBLISH_DATE" 
      }, { status: 400 });
    }

    // Validate recipientCount and openRate are non-negative if provided
    if (recipientCount !== undefined) {
      const count = parseInt(recipientCount);
      if (isNaN(count) || count < 0) {
        return NextResponse.json({ 
          error: "recipientCount must be a non-negative integer",
          code: "INVALID_RECIPIENT_COUNT" 
        }, { status: 400 });
      }
    }

    if (openRate !== undefined) {
      const rate = parseInt(openRate);
      if (isNaN(rate) || rate < 0) {
        return NextResponse.json({ 
          error: "openRate must be a non-negative integer",
          code: "INVALID_OPEN_RATE" 
        }, { status: 400 });
      }
    }

    const now = new Date().toISOString();

    const insertData: any = {
      universityId,
      title: title.trim(),
      content: content.trim(),
      createdBy: createdBy.trim(),
      status: newsletterStatus,
      recipientCount: recipientCount !== undefined ? parseInt(recipientCount) : 0,
      openRate: openRate !== undefined ? parseInt(openRate) : 0,
      createdAt: now,
      updatedAt: now,
    };

    if (htmlContent) {
      insertData.htmlContent = htmlContent;
    }

    if (newsletterStatus === 'scheduled' && publishDate) {
      insertData.scheduledFor = publishDate;
    }

    if (aiPrompt) {
      insertData.aiPrompt = aiPrompt;
    }

    const collection = adminDb.collection(COLLECTION_NAME);
    const ref = await collection.add(insertData);
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
    const { searchParams } = new URL(request.url);
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
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    // Validate and add optional fields
    if (body.universityId !== undefined) {
      const uniDoc = await adminDb.collection('universities').doc(body.universityId).get();
      if (!uniDoc.exists) {
        return NextResponse.json({ 
          error: "University not found",
          code: "INVALID_UNIVERSITY_ID" 
        }, { status: 400 });
      }
      updates.universityId = body.universityId;
    }

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim() === '') {
        return NextResponse.json({ 
          error: "title must be a non-empty string",
          code: "INVALID_TITLE" 
        }, { status: 400 });
      }
      updates.title = body.title.trim();
    }

    if (body.content !== undefined) {
      if (typeof body.content !== 'string' || body.content.trim() === '') {
        return NextResponse.json({ 
          error: "content must be a non-empty string",
          code: "INVALID_CONTENT" 
        }, { status: 400 });
      }
      updates.content = body.content.trim();
    }

    if (body.htmlContent !== undefined) {
      updates.htmlContent = body.htmlContent;
    }

    if (body.status !== undefined) {
      if (!isValidStatus(body.status)) {
        return NextResponse.json({ 
          error: "status must be one of: draft, published, scheduled",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      updates.status = body.status;

      // Validate scheduled status requires publishDate
      if (body.status === 'scheduled' && !body.publishDate && !doc.data()?.scheduledFor) {
        return NextResponse.json({ 
          error: "publishDate is required when status is scheduled",
          code: "MISSING_PUBLISH_DATE" 
        }, { status: 400 });
      }
    }

    if (body.publishDate !== undefined) {
      updates.scheduledFor = body.publishDate;
    }

    if (body.recipientCount !== undefined) {
      const count = parseInt(body.recipientCount);
      if (isNaN(count) || count < 0) {
        return NextResponse.json({ 
          error: "recipientCount must be a non-negative integer",
          code: "INVALID_RECIPIENT_COUNT" 
        }, { status: 400 });
      }
      updates.recipientCount = count;
    }

    if (body.openRate !== undefined) {
      const rate = parseInt(body.openRate);
      if (isNaN(rate) || rate < 0) {
        return NextResponse.json({ 
          error: "openRate must be a non-negative integer",
          code: "INVALID_OPEN_RATE" 
        }, { status: 400 });
      }
      updates.openRate = rate;
    }

    if (body.aiPrompt !== undefined) {
      updates.aiPrompt = body.aiPrompt;
    }

    await collection.doc(id).update(updates);
    const updated = await collection.doc(id).get();
    return NextResponse.json(mapDoc(updated));
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
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
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    await collection.doc(id).delete();
    return NextResponse.json({
      message: 'Newsletter deleted successfully',
      deleted: mapDoc(doc)
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}