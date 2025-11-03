import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { examResults, universities } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

function calculateGrade(score: number, maxScore: number): string {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

function validateScore(score: number, maxScore: number): { valid: boolean; error?: string } {
  if (score < 0 || maxScore < 0) {
    return { valid: false, error: 'Score and maxScore must be non-negative integers' };
  }
  if (score > maxScore) {
    return { valid: false, error: 'Score cannot be greater than maxScore' };
  }
  return { valid: true };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const universityId = searchParams.get('universityId');
    const subject = searchParams.get('subject');
    const isVerified = searchParams.get('isVerified');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (id) {
      const parsedId = parseInt(id);
      if (isNaN(parsedId)) {
        return NextResponse.json({ 
          error: 'Valid ID is required',
          code: 'INVALID_ID' 
        }, { status: 400 });
      }

      const result = await db.select()
        .from(examResults)
        .where(eq(examResults.id, parsedId))
        .limit(1);

      if (result.length === 0) {
        return NextResponse.json({ error: 'Exam result not found' }, { status: 404 });
      }

      return NextResponse.json(result[0], { status: 200 });
    }

    const conditions = [];

    if (userId) {
      conditions.push(eq(examResults.userId, userId));
    }

    if (universityId) {
      const parsedUniversityId = parseInt(universityId);
      if (!isNaN(parsedUniversityId)) {
        conditions.push(eq(examResults.universityId, parsedUniversityId));
      }
    }

    if (subject) {
      conditions.push(eq(examResults.subject, subject));
    }

    if (isVerified !== null && isVerified !== undefined) {
      const verifiedValue = isVerified === 'true';
      conditions.push(eq(examResults.isVerified, verifiedValue));
    }

    if (search) {
      const searchCondition = or(
        like(examResults.examName, `%${search}%`),
        like(examResults.subject, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    let query = db.select().from(examResults);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(examResults.examDate))
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

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { universityId, examName, subject, score, maxScore, grade, examDate, credentialId, isVerified } = body;

    if (!universityId || !examName || !subject || score === undefined || maxScore === undefined || !examDate) {
      return NextResponse.json({ 
        error: 'Required fields missing: universityId, examName, subject, score, maxScore, examDate',
        code: 'MISSING_REQUIRED_FIELDS' 
      }, { status: 400 });
    }

    if (typeof score !== 'number' || typeof maxScore !== 'number') {
      return NextResponse.json({ 
        error: 'Score and maxScore must be numbers',
        code: 'INVALID_SCORE_TYPE' 
      }, { status: 400 });
    }

    const scoreValidation = validateScore(score, maxScore);
    if (!scoreValidation.valid) {
      return NextResponse.json({ 
        error: scoreValidation.error,
        code: 'INVALID_SCORE' 
      }, { status: 400 });
    }

    const university = await db.select()
      .from(universities)
      .where(eq(universities.id, universityId))
      .limit(1);

    if (university.length === 0) {
      return NextResponse.json({ 
        error: 'University not found',
        code: 'UNIVERSITY_NOT_FOUND' 
      }, { status: 400 });
    }

    const calculatedGrade = grade || calculateGrade(score, maxScore);

    const now = new Date().toISOString();

    const newExamResult = await db.insert(examResults)
      .values({
        userId: 'user_id',
        universityId,
        examName: examName.trim(),
        subject: subject.trim(),
        score,
        maxScore,
        grade: calculatedGrade,
        examDate,
        credentialId: credentialId || null,
        isVerified: isVerified || false,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return NextResponse.json(newExamResult[0], { status: 201 });
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
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const parsedId = parseInt(id);

    const body = await request.json();

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const existing = await db.select()
      .from(examResults)
      .where(eq(examResults.id, parsedId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Exam result not found' }, { status: 404 });
    }

    const { universityId, examName, subject, score, maxScore, grade, examDate, credentialId, isVerified } = body;

    if (score !== undefined || maxScore !== undefined) {
      const finalScore = score !== undefined ? score : existing[0].score;
      const finalMaxScore = maxScore !== undefined ? maxScore : existing[0].maxScore;

      if (typeof finalScore !== 'number' || typeof finalMaxScore !== 'number') {
        return NextResponse.json({ 
          error: 'Score and maxScore must be numbers',
          code: 'INVALID_SCORE_TYPE' 
        }, { status: 400 });
      }

      const scoreValidation = validateScore(finalScore, finalMaxScore);
      if (!scoreValidation.valid) {
        return NextResponse.json({ 
          error: scoreValidation.error,
          code: 'INVALID_SCORE' 
        }, { status: 400 });
      }
    }

    if (universityId !== undefined) {
      const university = await db.select()
        .from(universities)
        .where(eq(universities.id, universityId))
        .limit(1);

      if (university.length === 0) {
        return NextResponse.json({ 
          error: 'University not found',
          code: 'UNIVERSITY_NOT_FOUND' 
        }, { status: 400 });
      }
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (universityId !== undefined) updates.universityId = universityId;
    if (examName !== undefined) updates.examName = examName.trim();
    if (subject !== undefined) updates.subject = subject.trim();
    if (score !== undefined) updates.score = score;
    if (maxScore !== undefined) updates.maxScore = maxScore;
    if (examDate !== undefined) updates.examDate = examDate;
    if (credentialId !== undefined) updates.credentialId = credentialId;
    if (isVerified !== undefined) updates.isVerified = isVerified;

    if (score !== undefined || maxScore !== undefined) {
      const finalScore = score !== undefined ? score : existing[0].score;
      const finalMaxScore = maxScore !== undefined ? maxScore : existing[0].maxScore;
      updates.grade = grade || calculateGrade(finalScore, finalMaxScore);
    } else if (grade !== undefined) {
      updates.grade = grade;
    }

    const updated = await db.update(examResults)
      .set(updates)
      .where(eq(examResults.id, parsedId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Exam result not found' }, { status: 404 });
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const parsedId = parseInt(id);

    const existing = await db.select()
      .from(examResults)
      .where(eq(examResults.id, parsedId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Exam result not found' }, { status: 404 });
    }

    const deleted = await db.delete(examResults)
      .where(eq(examResults.id, parsedId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Exam result not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Exam result deleted successfully',
      deletedRecord: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}