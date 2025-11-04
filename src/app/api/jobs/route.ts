import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobPostings, user, userProfiles } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

const VALID_JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'] as const;
const VALID_EXPERIENCE_LEVELS = ['entry', 'mid', 'senior', 'executive'] as const;
const VALID_STATUSES = ['active', 'closed', 'draft'] as const;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const jobType = searchParams.get('jobType');
    const experienceLevel = searchParams.get('experienceLevel');
    const location = searchParams.get('location');
    const isRemote = searchParams.get('isRemote');
    const postedById = searchParams.get('postedById');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get single job by ID
    if (id) {
      const jobId = parseInt(id);
      if (isNaN(jobId)) {
        return NextResponse.json({ 
          error: 'Valid job ID is required',
          code: 'INVALID_ID' 
        }, { status: 400 });
      }

      const job = await db.select({
        job: jobPostings,
        poster: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
        posterProfile: {
          company: userProfiles.company,
          currentPosition: userProfiles.currentPosition,
        }
      })
        .from(jobPostings)
        .leftJoin(user, eq(jobPostings.postedById, user.id))
        .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
        .where(eq(jobPostings.id, jobId))
        .limit(1);

      if (job.length === 0) {
        return NextResponse.json({ 
          error: 'Job not found',
          code: 'JOB_NOT_FOUND' 
        }, { status: 404 });
      }

      // Increment view count
      await db.update(jobPostings)
        .set({ viewCount: (job[0].job.viewCount || 0) + 1 })
        .where(eq(jobPostings.id, jobId));

      return NextResponse.json({
        ...job[0].job,
        poster: job[0].poster,
        posterProfile: job[0].posterProfile,
      });
    }

    // Build list query with filters
    let query: any = db
      .select({
        job: jobPostings,
        poster: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
        posterProfile: {
          company: userProfiles.company,
          currentPosition: userProfiles.currentPosition,
        }
      })
      .from(jobPostings)
      .leftJoin(user, eq(jobPostings.postedById, user.id))
      .leftJoin(userProfiles, eq(user.id, userProfiles.userId));

    const conditions = [eq(jobPostings.status, 'active')]; // Only show active jobs by default

    if (search) {
      conditions.push(
        or(
          like(jobPostings.title, `%${search}%`),
          like(jobPostings.description, `%${search}%`),
          like(jobPostings.company, `%${search}%`)
        )
      );
    }

    if (jobType && VALID_JOB_TYPES.includes(jobType as any)) {
      conditions.push(eq(jobPostings.jobType, jobType));
    }

    if (experienceLevel && VALID_EXPERIENCE_LEVELS.includes(experienceLevel as any)) {
      conditions.push(eq(jobPostings.experienceLevel, experienceLevel));
    }

    if (location) {
      conditions.push(like(jobPostings.location, `%${location}%`));
    }

    if (isRemote === 'true') {
      conditions.push(eq(jobPostings.isRemote, true));
    }

    if (postedById) {
      conditions.push(eq(jobPostings.postedById, postedById));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const orderByColumn = sortBy === 'title' ? jobPostings.title :
                         sortBy === 'company' ? jobPostings.company :
                         sortBy === 'location' ? jobPostings.location :
                         jobPostings.createdAt;

    query = query.orderBy(sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn));

    const jobs = await query.limit(limit).offset(offset);

    const formattedJobs = jobs.map((row: any) => ({
      ...row.job,
      poster: row.poster,
      posterProfile: row.posterProfile,
    }));

    return NextResponse.json(formattedJobs);
  } catch (error) {
    console.error('GET jobs error:', error);
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
      company,
      location,
      jobType,
      experienceLevel,
      salaryMin,
      salaryMax,
      currency = 'INR',
      skills,
      requirements,
      benefits,
      applicationDeadline,
      isRemote = false,
      universityId,
      tags,
      status = 'active'
    } = body;

    // Validate required fields
    if (!title || !description || !company || !location || !jobType || !experienceLevel || !requirements) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, description, company, location, jobType, experienceLevel, requirements',
        code: 'MISSING_REQUIRED_FIELDS' 
      }, { status: 400 });
    }

    // Validate job type
    if (!VALID_JOB_TYPES.includes(jobType)) {
      return NextResponse.json({ 
        error: `jobType must be one of: ${VALID_JOB_TYPES.join(', ')}`,
        code: 'INVALID_JOB_TYPE' 
      }, { status: 400 });
    }

    // Validate experience level
    if (!VALID_EXPERIENCE_LEVELS.includes(experienceLevel)) {
      return NextResponse.json({ 
        error: `experienceLevel must be one of: ${VALID_EXPERIENCE_LEVELS.join(', ')}`,
        code: 'INVALID_EXPERIENCE_LEVEL' 
      }, { status: 400 });
    }

    // Validate status
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: 'INVALID_STATUS' 
      }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    const newJob = await db.insert(jobPostings)
      .values({
        title,
        description,
        company,
        location,
        jobType,
        experienceLevel,
        salaryMin: salaryMin || null,
        salaryMax: salaryMax || null,
        currency,
        skills: skills ? JSON.stringify(skills) : null,
        requirements,
        benefits: benefits || null,
        applicationDeadline: applicationDeadline || null,
        isRemote: !!isRemote,
        postedById: user.id,
        universityId: universityId || null,
        status,
        tags: tags ? JSON.stringify(tags) : null,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning();

    return NextResponse.json(newJob[0], { status: 201 });
  } catch (error) {
    console.error('POST jobs error:', error);
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
        error: 'Valid job ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const jobId = parseInt(id);
    const body = await request.json();

    // Check if job exists and user owns it
    const existingJob = await db.select()
      .from(jobPostings)
      .where(eq(jobPostings.id, jobId))
      .limit(1);

    if (existingJob.length === 0) {
      return NextResponse.json({ 
        error: 'Job not found',
        code: 'JOB_NOT_FOUND' 
      }, { status: 404 });
    }

    if (existingJob[0].postedById !== user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized to update this job',
        code: 'UNAUTHORIZED' 
      }, { status: 403 });
    }

    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    // Update only provided fields
    const allowedFields = [
      'title', 'description', 'company', 'location', 'jobType', 'experienceLevel',
      'salaryMin', 'salaryMax', 'currency', 'requirements', 'benefits',
      'applicationDeadline', 'isRemote', 'status'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (body.skills !== undefined) {
      updateData.skills = body.skills ? JSON.stringify(body.skills) : null;
    }

    if (body.tags !== undefined) {
      updateData.tags = body.tags ? JSON.stringify(body.tags) : null;
    }

    const updated = await db.update(jobPostings)
      .set(updateData)
      .where(eq(jobPostings.id, jobId))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT jobs error:', error);
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
        error: 'Valid job ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const jobId = parseInt(id);

    // Check if job exists and user owns it
    const existingJob = await db.select()
      .from(jobPostings)
      .where(eq(jobPostings.id, jobId))
      .limit(1);

    if (existingJob.length === 0) {
      return NextResponse.json({ 
        error: 'Job not found',
        code: 'JOB_NOT_FOUND' 
      }, { status: 404 });
    }

    if (existingJob[0].postedById !== user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized to delete this job',
        code: 'UNAUTHORIZED' 
      }, { status: 403 });
    }

    const deleted = await db.delete(jobPostings)
      .where(eq(jobPostings.id, jobId))
      .returning();

    return NextResponse.json({
      message: 'Job deleted successfully',
      job: deleted[0]
    });
  } catch (error) {
    console.error('DELETE jobs error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}
