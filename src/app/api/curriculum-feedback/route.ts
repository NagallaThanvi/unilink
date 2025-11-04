import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { curriculumFeedback, user, userProfiles, universities } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { NotificationService } from '@/lib/notifications';

const VALID_FEEDBACK_TYPES = ['course_content', 'industry_relevance', 'skill_gap', 'new_course_suggestion'] as const;
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const VALID_STATUSES = ['submitted', 'under_review', 'approved', 'implemented', 'rejected'] as const;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const submittedById = searchParams.get('submittedById');
    const universityId = searchParams.get('universityId');
    const department = searchParams.get('department');
    const feedbackType = searchParams.get('feedbackType');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get single feedback by ID
    if (id) {
      const feedbackId = parseInt(id);
      if (isNaN(feedbackId)) {
        return NextResponse.json({ 
          error: 'Valid feedback ID is required',
          code: 'INVALID_ID' 
        }, { status: 400 });
      }

      const feedback = await db.select({
        feedback: curriculumFeedback,
        submitter: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
        submitterProfile: {
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
        .from(curriculumFeedback)
        .leftJoin(user, eq(curriculumFeedback.submittedById, user.id))
        .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
        .leftJoin(universities, eq(curriculumFeedback.universityId, universities.id))
        .where(eq(curriculumFeedback.id, feedbackId))
        .limit(1);

      if (feedback.length === 0) {
        return NextResponse.json({ 
          error: 'Feedback not found',
          code: 'FEEDBACK_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json({
        ...feedback[0].feedback,
        submitter: feedback[0].submitter,
        submitterProfile: feedback[0].submitterProfile,
        university: feedback[0].university,
      });
    }

    // Build list query with filters
    let query: any = db
      .select({
        feedback: curriculumFeedback,
        submitter: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
        submitterProfile: {
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
      .from(curriculumFeedback)
      .leftJoin(user, eq(curriculumFeedback.submittedById, user.id))
      .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
      .leftJoin(universities, eq(curriculumFeedback.universityId, universities.id));

    const conditions = [];

    if (submittedById) {
      conditions.push(eq(curriculumFeedback.submittedById, submittedById));
    }

    if (universityId) {
      const univId = parseInt(universityId);
      if (!isNaN(univId)) {
        conditions.push(eq(curriculumFeedback.universityId, univId));
      }
    }

    if (department) {
      conditions.push(eq(curriculumFeedback.department, department));
    }

    if (feedbackType && VALID_FEEDBACK_TYPES.includes(feedbackType as any)) {
      conditions.push(eq(curriculumFeedback.feedbackType, feedbackType));
    }

    if (status && VALID_STATUSES.includes(status as any)) {
      conditions.push(eq(curriculumFeedback.status, status));
    }

    if (priority && VALID_PRIORITIES.includes(priority as any)) {
      conditions.push(eq(curriculumFeedback.priority, priority));
    }

    if (search) {
      conditions.push(
        or(
          like(curriculumFeedback.courseName, `%${search}%`),
          like(curriculumFeedback.currentIndustryTrends, `%${search}%`),
          like(curriculumFeedback.suggestedChanges, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const orderByColumn = sortBy === 'priority' ? curriculumFeedback.priority :
                         sortBy === 'status' ? curriculumFeedback.status :
                         sortBy === 'department' ? curriculumFeedback.department :
                         curriculumFeedback.createdAt;

    query = query.orderBy(sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn));

    const results = await query.limit(limit).offset(offset);

    const formattedFeedback = results.map((row: any) => ({
      ...row.feedback,
      submitter: row.submitter,
      submitterProfile: row.submitterProfile,
      university: row.university,
    }));

    return NextResponse.json(formattedFeedback);
  } catch (error) {
    console.error('GET curriculum feedback error:', error);
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
      universityId,
      department,
      courseCode,
      courseName,
      feedbackType,
      currentIndustryTrends,
      suggestedChanges,
      skillsInDemand,
      toolsAndTechnologies,
      industryProjects,
      priority = 'medium',
      implementationComplexity,
      potentialImpact,
      supportingEvidence
    } = body;

    // Validate required fields
    if (!universityId || !department || !feedbackType || !currentIndustryTrends || !suggestedChanges) {
      return NextResponse.json({ 
        error: 'Missing required fields: universityId, department, feedbackType, currentIndustryTrends, suggestedChanges',
        code: 'MISSING_REQUIRED_FIELDS' 
      }, { status: 400 });
    }

    // Validate feedback type
    if (!VALID_FEEDBACK_TYPES.includes(feedbackType)) {
      return NextResponse.json({ 
        error: `feedbackType must be one of: ${VALID_FEEDBACK_TYPES.join(', ')}`,
        code: 'INVALID_FEEDBACK_TYPE' 
      }, { status: 400 });
    }

    // Validate priority
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ 
        error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}`,
        code: 'INVALID_PRIORITY' 
      }, { status: 400 });
    }

    // Validate university exists
    const university = await db.select()
      .from(universities)
      .where(eq(universities.id, parseInt(universityId)))
      .limit(1);

    if (university.length === 0) {
      return NextResponse.json({ 
        error: 'University not found',
        code: 'UNIVERSITY_NOT_FOUND' 
      }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    const newFeedback = await db.insert(curriculumFeedback)
      .values({
        submittedById: user.id,
        universityId: parseInt(universityId),
        department,
        courseCode: courseCode || null,
        courseName: courseName || null,
        feedbackType,
        currentIndustryTrends,
        suggestedChanges,
        skillsInDemand: skillsInDemand ? JSON.stringify(skillsInDemand) : null,
        toolsAndTechnologies: toolsAndTechnologies ? JSON.stringify(toolsAndTechnologies) : null,
        industryProjects: industryProjects ? JSON.stringify(industryProjects) : null,
        priority,
        implementationComplexity: implementationComplexity || null,
        potentialImpact: potentialImpact || null,
        supportingEvidence: supportingEvidence || null,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning();

    // Notify university administrators about new feedback
    console.log(`New curriculum feedback submitted by ${user.name} for ${department}`);

    return NextResponse.json(newFeedback[0], { status: 201 });
  } catch (error) {
    console.error('POST curriculum feedback error:', error);
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
        error: 'Valid feedback ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const feedbackId = parseInt(id);
    const body = await request.json();

    // Check if feedback exists
    const existingFeedback = await db.select()
      .from(curriculumFeedback)
      .where(eq(curriculumFeedback.id, feedbackId))
      .limit(1);

    if (existingFeedback.length === 0) {
      return NextResponse.json({ 
        error: 'Feedback not found',
        code: 'FEEDBACK_NOT_FOUND' 
      }, { status: 404 });
    }

    // Check permissions: only submitter or university admin can update
    const canUpdate = existingFeedback[0].submittedById === user.id;
    
    if (!canUpdate) {
      return NextResponse.json({ 
        error: 'Unauthorized to update this feedback',
        code: 'UNAUTHORIZED' 
      }, { status: 403 });
    }

    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    // Update only provided fields
    const allowedFields = [
      'department', 'courseCode', 'courseName', 'feedbackType',
      'currentIndustryTrends', 'suggestedChanges', 'priority',
      'implementationComplexity', 'potentialImpact', 'supportingEvidence'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle JSON fields
    if (body.skillsInDemand !== undefined) {
      updateData.skillsInDemand = body.skillsInDemand ? JSON.stringify(body.skillsInDemand) : null;
    }

    if (body.toolsAndTechnologies !== undefined) {
      updateData.toolsAndTechnologies = body.toolsAndTechnologies ? JSON.stringify(body.toolsAndTechnologies) : null;
    }

    if (body.industryProjects !== undefined) {
      updateData.industryProjects = body.industryProjects ? JSON.stringify(body.industryProjects) : null;
    }

    // Admin-only fields
    if (body.status !== undefined && VALID_STATUSES.includes(body.status)) {
      updateData.status = body.status;
      updateData.reviewedAt = new Date().toISOString();
      updateData.reviewedById = user.id;
    }

    if (body.reviewNotes !== undefined) {
      updateData.reviewNotes = body.reviewNotes;
    }

    if (body.implementationTimeline !== undefined) {
      updateData.implementationTimeline = body.implementationTimeline;
    }

    const updated = await db.update(curriculumFeedback)
      .set(updateData)
      .where(eq(curriculumFeedback.id, feedbackId))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT curriculum feedback error:', error);
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
        error: 'Valid feedback ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const feedbackId = parseInt(id);

    // Check if feedback exists and user owns it
    const existingFeedback = await db.select()
      .from(curriculumFeedback)
      .where(eq(curriculumFeedback.id, feedbackId))
      .limit(1);

    if (existingFeedback.length === 0) {
      return NextResponse.json({ 
        error: 'Feedback not found',
        code: 'FEEDBACK_NOT_FOUND' 
      }, { status: 404 });
    }

    if (existingFeedback[0].submittedById !== user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized to delete this feedback',
        code: 'UNAUTHORIZED' 
      }, { status: 403 });
    }

    const deleted = await db.delete(curriculumFeedback)
      .where(eq(curriculumFeedback.id, feedbackId))
      .returning();

    return NextResponse.json({
      message: 'Feedback deleted successfully',
      feedback: deleted[0]
    });
  } catch (error) {
    console.error('DELETE curriculum feedback error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}
