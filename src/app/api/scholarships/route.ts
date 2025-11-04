import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { scholarships, user, userProfiles, universities } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { NotificationService } from '@/lib/notifications';

const VALID_CATEGORIES = ['merit', 'need-based', 'research', 'sports', 'arts'] as const;
const VALID_STATUSES = ['active', 'closed', 'draft'] as const;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const fundedById = searchParams.get('fundedById');
    const universityId = searchParams.get('universityId');
    const academicYear = searchParams.get('academicYear');
    const status = searchParams.get('status') || 'active';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get single scholarship by ID
    if (id) {
      const scholarshipId = parseInt(id);
      if (isNaN(scholarshipId)) {
        return NextResponse.json({ 
          error: 'Valid scholarship ID is required',
          code: 'INVALID_ID' 
        }, { status: 400 });
      }

      const scholarship = await db.select({
        scholarship: scholarships,
        funder: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
        funderProfile: {
          company: userProfiles.company,
          currentPosition: userProfiles.currentPosition,
          graduationYear: userProfiles.graduationYear,
        },
        university: {
          id: universities.id,
          name: universities.name,
          logo: universities.logo,
        }
      })
        .from(scholarships)
        .leftJoin(user, eq(scholarships.fundedById, user.id))
        .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
        .leftJoin(universities, eq(scholarships.universityId, universities.id))
        .where(eq(scholarships.id, scholarshipId))
        .limit(1);

      if (scholarship.length === 0) {
        return NextResponse.json({ 
          error: 'Scholarship not found',
          code: 'SCHOLARSHIP_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json({
        ...scholarship[0].scholarship,
        funder: scholarship[0].funder,
        funderProfile: scholarship[0].funderProfile,
        university: scholarship[0].university,
      });
    }

    // Build list query with filters
    let query: any = db
      .select({
        scholarship: scholarships,
        funder: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
        funderProfile: {
          company: userProfiles.company,
          currentPosition: userProfiles.currentPosition,
          graduationYear: userProfiles.graduationYear,
        },
        university: {
          id: universities.id,
          name: universities.name,
          logo: universities.logo,
        }
      })
      .from(scholarships)
      .leftJoin(user, eq(scholarships.fundedById, user.id))
      .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
      .leftJoin(universities, eq(scholarships.universityId, universities.id));

    const conditions = [];

    if (status && VALID_STATUSES.includes(status as any)) {
      conditions.push(eq(scholarships.status, status));
    }

    if (search) {
      conditions.push(
        or(
          like(scholarships.title, `%${search}%`),
          like(scholarships.description, `%${search}%`),
          like(scholarships.eligibilityCriteria, `%${search}%`)
        )
      );
    }

    if (category && VALID_CATEGORIES.includes(category as any)) {
      conditions.push(eq(scholarships.category, category));
    }

    if (fundedById) {
      conditions.push(eq(scholarships.fundedById, fundedById));
    }

    if (universityId) {
      const univId = parseInt(universityId);
      if (!isNaN(univId)) {
        conditions.push(eq(scholarships.universityId, univId));
      }
    }

    if (academicYear) {
      conditions.push(eq(scholarships.academicYear, academicYear));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const orderByColumn = sortBy === 'title' ? scholarships.title :
                         sortBy === 'amount' ? scholarships.amount :
                         sortBy === 'applicationDeadline' ? scholarships.applicationDeadline :
                         scholarships.createdAt;

    query = query.orderBy(sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn));

    const results = await query.limit(limit).offset(offset);

    const formattedScholarships = results.map((row: any) => ({
      ...row.scholarship,
      funder: row.funder,
      funderProfile: row.funderProfile,
      university: row.university,
    }));

    return NextResponse.json(formattedScholarships);
  } catch (error) {
    console.error('GET scholarships error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    
    const { 
      title,
      description,
      amount,
      currency = 'INR',
      universityId,
      eligibilityCriteria,
      applicationDeadline,
      maxRecipients = 1,
      category,
      academicYear,
      requirements,
      isRecurring = false,
      recurringFrequency,
      tags,
      status = 'active'
    } = body;

    // Validate required fields
    if (!title || !description || !amount || !eligibilityCriteria || !applicationDeadline || !category || !academicYear) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, description, amount, eligibilityCriteria, applicationDeadline, category, academicYear',
        code: 'MISSING_REQUIRED_FIELDS' 
      }, { status: 400 });
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ 
        error: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
        code: 'INVALID_CATEGORY' 
      }, { status: 400 });
    }

    // Validate status
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: 'INVALID_STATUS' 
      }, { status: 400 });
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ 
        error: 'Amount must be a positive number',
        code: 'INVALID_AMOUNT' 
      }, { status: 400 });
    }

    // Validate application deadline
    const deadline = new Date(applicationDeadline);
    if (isNaN(deadline.getTime()) || deadline <= new Date()) {
      return NextResponse.json({ 
        error: 'Application deadline must be a valid future date',
        code: 'INVALID_DEADLINE' 
      }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    const newScholarship = await db.insert(scholarships)
      .values({
        title,
        description,
        amount,
        currency,
        fundedById: user.id,
        universityId: universityId || null,
        eligibilityCriteria,
        applicationDeadline,
        maxRecipients,
        category,
        academicYear,
        requirements: requirements ? JSON.stringify(requirements) : null,
        status,
        isRecurring: !!isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : null,
        tags: tags ? JSON.stringify(tags) : null,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning();

    // Send notifications to eligible students (this could be done in background)
    // For now, we'll just log it
    console.log(`New scholarship created: ${newScholarship[0].title} by ${user.name}`);

    return NextResponse.json(newScholarship[0], { status: 201 });
  } catch (error) {
    console.error('POST scholarship error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid scholarship ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const scholarshipId = parseInt(id);
    const body = await request.json();

    // Check if scholarship exists and user owns it
    const existingScholarship = await db.select()
      .from(scholarships)
      .where(eq(scholarships.id, scholarshipId))
      .limit(1);

    if (existingScholarship.length === 0) {
      return NextResponse.json({ 
        error: 'Scholarship not found',
        code: 'SCHOLARSHIP_NOT_FOUND' 
      }, { status: 404 });
    }

    if (existingScholarship[0].fundedById !== user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized to update this scholarship',
        code: 'UNAUTHORIZED' 
      }, { status: 403 });
    }

    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    // Update only provided fields
    const allowedFields = [
      'title', 'description', 'amount', 'currency', 'eligibilityCriteria',
      'applicationDeadline', 'maxRecipients', 'category', 'academicYear',
      'isRecurring', 'recurringFrequency', 'status'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (body.requirements !== undefined) {
      updateData.requirements = body.requirements ? JSON.stringify(body.requirements) : null;
    }

    if (body.tags !== undefined) {
      updateData.tags = body.tags ? JSON.stringify(body.tags) : null;
    }

    const updated = await db.update(scholarships)
      .set(updateData)
      .where(eq(scholarships.id, scholarshipId))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT scholarship error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid scholarship ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const scholarshipId = parseInt(id);

    // Check if scholarship exists and user owns it
    const existingScholarship = await db.select()
      .from(scholarships)
      .where(eq(scholarships.id, scholarshipId))
      .limit(1);

    if (existingScholarship.length === 0) {
      return NextResponse.json({ 
        error: 'Scholarship not found',
        code: 'SCHOLARSHIP_NOT_FOUND' 
      }, { status: 404 });
    }

    if (existingScholarship[0].fundedById !== user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized to delete this scholarship',
        code: 'UNAUTHORIZED' 
      }, { status: 403 });
    }

    const deleted = await db.delete(scholarships)
      .where(eq(scholarships.id, scholarshipId))
      .returning();

    return NextResponse.json({
      message: 'Scholarship deleted successfully',
      scholarship: deleted[0]
    });
  } catch (error) {
    console.error('DELETE scholarship error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}
