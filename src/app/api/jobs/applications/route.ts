import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobApplications, jobPostings, user, userProfiles } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

const VALID_STATUSES = ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'] as const;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');
    const applicantId = searchParams.get('applicantId');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query: any = db
      .select({
        application: jobApplications,
        job: {
          id: jobPostings.id,
          title: jobPostings.title,
          company: jobPostings.company,
          postedById: jobPostings.postedById,
        },
        applicant: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
        applicantProfile: {
          currentPosition: userProfiles.currentPosition,
          company: userProfiles.company,
          location: userProfiles.location,
          skills: userProfiles.skills,
        }
      })
      .from(jobApplications)
      .leftJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
      .leftJoin(user, eq(jobApplications.applicantId, user.id))
      .leftJoin(userProfiles, eq(user.id, userProfiles.userId));

    const conditions = [];

    if (jobId) {
      const jobIdNum = parseInt(jobId);
      if (!isNaN(jobIdNum)) {
        conditions.push(eq(jobApplications.jobId, jobIdNum));
      }
    }

    if (applicantId) {
      conditions.push(eq(jobApplications.applicantId, applicantId));
    }

    if (status && VALID_STATUSES.includes(status as any)) {
      conditions.push(eq(jobApplications.status, status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const applications = await query
      .orderBy(desc(jobApplications.appliedAt))
      .limit(limit)
      .offset(offset);

    const formattedApplications = applications.map((row: any) => ({
      ...row.application,
      job: row.job,
      applicant: row.applicant,
      applicantProfile: row.applicantProfile,
    }));

    return NextResponse.json(formattedApplications);
  } catch (error) {
    console.error('GET job applications error:', error);
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
      jobId,
      coverLetter,
      resumeUrl
    } = body;

    // Validate required fields
    if (!jobId) {
      return NextResponse.json({ 
        error: 'jobId is required',
        code: 'MISSING_JOB_ID' 
      }, { status: 400 });
    }

    // Check if job exists and is active
    const job = await db.select()
      .from(jobPostings)
      .where(eq(jobPostings.id, jobId))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json({ 
        error: 'Job not found',
        code: 'JOB_NOT_FOUND' 
      }, { status: 404 });
    }

    if (job[0].status !== 'active') {
      return NextResponse.json({ 
        error: 'Job is no longer accepting applications',
        code: 'JOB_CLOSED' 
      }, { status: 400 });
    }

    // Check if application deadline has passed
    if (job[0].applicationDeadline) {
      const deadline = new Date(job[0].applicationDeadline);
      if (new Date() > deadline) {
        return NextResponse.json({ 
          error: 'Application deadline has passed',
          code: 'DEADLINE_PASSED' 
        }, { status: 400 });
      }
    }

    // Check if user has already applied
    const existingApplication = await db.select()
      .from(jobApplications)
      .where(and(
        eq(jobApplications.jobId, jobId),
        eq(jobApplications.applicantId, user.id)
      ))
      .limit(1);

    if (existingApplication.length > 0) {
      return NextResponse.json({ 
        error: 'You have already applied to this job',
        code: 'ALREADY_APPLIED' 
      }, { status: 400 });
    }

    const timestamp = new Date().toISOString();

    const newApplication = await db.insert(jobApplications)
      .values({
        jobId,
        applicantId: user.id,
        coverLetter: coverLetter || null,
        resumeUrl: resumeUrl || null,
        appliedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      })
      .returning();

    // Increment application count on job
    await db.update(jobPostings)
      .set({ applicationCount: (job[0].applicationCount || 0) + 1 })
      .where(eq(jobPostings.id, jobId));

    return NextResponse.json(newApplication[0], { status: 201 });
  } catch (error) {
    console.error('POST job application error:', error);
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
        error: 'Valid application ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const applicationId = parseInt(id);
    const body = await request.json();

    // Get application with job details
    const application = await db.select({
      application: jobApplications,
      job: jobPostings
    })
      .from(jobApplications)
      .leftJoin(jobPostings, eq(jobApplications.jobId, jobPostings.id))
      .where(eq(jobApplications.id, applicationId))
      .limit(1);

    if (application.length === 0) {
      return NextResponse.json({ 
        error: 'Application not found',
        code: 'APPLICATION_NOT_FOUND' 
      }, { status: 404 });
    }

    const app = application[0].application;
    const job = application[0].job;

    // Check permissions: applicant can update their own application, job poster can update status/notes
    const canUpdate = app.applicantId === user.id || (job && job.postedById === user.id);
    
    if (!canUpdate) {
      return NextResponse.json({ 
        error: 'Unauthorized to update this application',
        code: 'UNAUTHORIZED' 
      }, { status: 403 });
    }

    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    // Applicants can only update cover letter and resume
    if (app.applicantId === user.id) {
      if (body.coverLetter !== undefined) updateData.coverLetter = body.coverLetter;
      if (body.resumeUrl !== undefined) updateData.resumeUrl = body.resumeUrl;
    }

    // Job posters can update status and review notes
    if (job?.postedById === user.id) {
      if (body.status !== undefined) {
        if (!VALID_STATUSES.includes(body.status)) {
          return NextResponse.json({ 
            error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
            code: 'INVALID_STATUS' 
          }, { status: 400 });
        }
        updateData.status = body.status;
        updateData.reviewedAt = new Date().toISOString();
      }
      if (body.reviewNotes !== undefined) updateData.reviewNotes = body.reviewNotes;
    }

    const updated = await db.update(jobApplications)
      .set(updateData)
      .where(eq(jobApplications.id, applicationId))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT job application error:', error);
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
        error: 'Valid application ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const applicationId = parseInt(id);

    // Check if application exists and user owns it
    const existingApplication = await db.select()
      .from(jobApplications)
      .where(eq(jobApplications.id, applicationId))
      .limit(1);

    if (existingApplication.length === 0) {
      return NextResponse.json({ 
        error: 'Application not found',
        code: 'APPLICATION_NOT_FOUND' 
      }, { status: 404 });
    }

    if (existingApplication[0].applicantId !== user.id) {
      return NextResponse.json({ 
        error: 'Unauthorized to delete this application',
        code: 'UNAUTHORIZED' 
      }, { status: 403 });
    }

    const deleted = await db.delete(jobApplications)
      .where(eq(jobApplications.id, applicationId))
      .returning();

    // Decrement application count on job
    const jobToUpdate = await db.select().from(jobPostings).where(eq(jobPostings.id, deleted[0].jobId)).limit(1);
    if (jobToUpdate.length > 0) {
      await db.update(jobPostings)
        .set({ applicationCount: Math.max(0, (jobToUpdate[0].applicationCount || 0) - 1) })
        .where(eq(jobPostings.id, deleted[0].jobId));
    }

    return NextResponse.json({
      message: 'Application deleted successfully',
      application: deleted[0]
    });
  } catch (error) {
    console.error('DELETE job application error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}
