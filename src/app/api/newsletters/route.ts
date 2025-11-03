import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { newsletters } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const VALID_STATUSES = ['draft', 'published', 'scheduled'] as const;
type NewsletterStatus = typeof VALID_STATUSES[number];

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

    // Single record fetch
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: 'Valid ID is required',
          code: 'INVALID_ID' 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(newsletters)
        .where(eq(newsletters.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
      }

      return NextResponse.json(record[0]);
    }

    // List with filters
    let query = db.select().from(newsletters);
    const conditions = [];

    if (universityId) {
      const univId = parseInt(universityId);
      if (!isNaN(univId)) {
        conditions.push(eq(newsletters.universityId, univId));
      }
    }

    if (status && isValidStatus(status)) {
      conditions.push(eq(newsletters.status, status));
    }

    if (createdBy) {
      conditions.push(eq(newsletters.createdBy, createdBy));
    }

    if (search) {
      conditions.push(
        or(
          like(newsletters.title, `%${search}%`),
          like(newsletters.content, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(newsletters.createdAt))
      .limit(limit)
      .offset(offset);

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

    // Validate universityId is a valid integer
    const univId = parseInt(universityId);
    if (isNaN(univId)) {
      return NextResponse.json({ 
        error: "universityId must be a valid integer",
        code: "INVALID_UNIVERSITY_ID" 
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
      universityId: univId,
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

    if (publishDate) {
      insertData.publishDate = publishDate;
    }

    if (aiPrompt) {
      insertData.aiPrompt = aiPrompt;
    }

    const newNewsletter = await db.insert(newsletters)
      .values(insertData)
      .returning();

    return NextResponse.json(newNewsletter[0], { status: 201 });
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

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Check if record exists
    const existing = await db.select()
      .from(newsletters)
      .where(eq(newsletters.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    // Validate and add optional fields
    if (body.universityId !== undefined) {
      const univId = parseInt(body.universityId);
      if (isNaN(univId)) {
        return NextResponse.json({ 
          error: "universityId must be a valid integer",
          code: "INVALID_UNIVERSITY_ID" 
        }, { status: 400 });
      }
      updates.universityId = univId;
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
      if (body.status === 'scheduled' && !body.publishDate && !existing[0].publishDate) {
        return NextResponse.json({ 
          error: "publishDate is required when status is scheduled",
          code: "MISSING_PUBLISH_DATE" 
        }, { status: 400 });
      }
    }

    if (body.publishDate !== undefined) {
      updates.publishDate = body.publishDate;
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

    if (body.createdBy !== undefined) {
      if (typeof body.createdBy !== 'string' || body.createdBy.trim() === '') {
        return NextResponse.json({ 
          error: "createdBy must be a non-empty string",
          code: "INVALID_CREATED_BY" 
        }, { status: 400 });
      }
      updates.createdBy = body.createdBy.trim();
    }

    const updated = await db.update(newsletters)
      .set(updates)
      .where(eq(newsletters.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0]);
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

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if record exists
    const existing = await db.select()
      .from(newsletters)
      .where(eq(newsletters.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    const deleted = await db.delete(newsletters)
      .where(eq(newsletters.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Newsletter deleted successfully',
      deleted: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}