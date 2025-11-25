import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
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

const COLLECTION_NAME = 'examResults';

function mapDoc(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data();
  if (!data) return null;
  return {
    id: doc.id,
    userId: data.userId ?? null,
    universityId: data.universityId ?? null,
    examName: data.examName ?? null,
    subject: data.subject ?? null,
    score: data.score ?? 0,
    maxScore: data.maxScore ?? 0,
    grade: data.grade ?? null,
    examDate: data.examDate ?? null,
    verificationHash: data.verificationHash ?? null,
    isVerified: data.isVerified ?? false,
    blockchainTxHash: data.blockchainTxHash ?? null,
    ipfsHash: data.ipfsHash ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
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

    const collection = adminDb.collection(COLLECTION_NAME);

    if (id) {
      const doc = await collection.doc(id).get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Exam result not found' }, { status: 404 });
      }
      return NextResponse.json(mapDoc(doc), { status: 200 });
    }

    let query: FirebaseFirestore.Query = collection.orderBy('createdAt', 'desc');

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    if (universityId) {
      query = query.where('universityId', '==', universityId);
    }

    if (subject) {
      query = query.where('subject', '==', subject);
    }

    if (isVerified !== null && isVerified !== undefined) {
      const verifiedValue = isVerified === 'true';
      query = query.where('isVerified', '==', verifiedValue);
    }

    const snapshot = await query.limit(limit).offset(offset).get();
    let results = snapshot.docs.map(mapDoc).filter(Boolean);

    // In-memory text search if needed
    if (search) {
      const lower = search.toLowerCase();
      results = results.filter(r => 
        (r.examName && r.examName.toLowerCase().includes(lower)) ||
        (r.subject && r.subject.toLowerCase().includes(lower))
      );
    }

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

    // Verify university exists
    const uniDoc = await adminDb.collection('universities').doc(universityId).get();
    if (!uniDoc.exists) {
      return NextResponse.json({ 
        error: 'University not found',
        code: 'UNIVERSITY_NOT_FOUND' 
      }, { status: 400 });
    }

    const calculatedGrade = grade || calculateGrade(score, maxScore);

    const now = new Date().toISOString();

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const newExamResult = await adminDb.collection(COLLECTION_NAME).add({
      userId: user.id,
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
    });

    const created = await newExamResult.get();
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
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const collection = adminDb.collection(COLLECTION_NAME);
    const doc = await collection.doc(id).get();
    if (!doc.exists || doc.data()?.userId !== user.id) {
      return NextResponse.json({ error: 'Exam result not found' }, { status: 404 });
    }

    const body = await request.json();

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const existingData = doc.data();
    const { universityId, examName, subject, score, maxScore, grade, examDate, credentialId, isVerified } = body;

    if (score !== undefined || maxScore !== undefined) {
      const finalScore = score !== undefined ? score : existingData.score;
      const finalMaxScore = maxScore !== undefined ? maxScore : existingData.maxScore;

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
      const uniDoc = await adminDb.collection('universities').doc(universityId).get();
      if (!uniDoc.exists) {
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
      const finalScore = score !== undefined ? score : existingData.score;
      const finalMaxScore = maxScore !== undefined ? maxScore : existingData.maxScore;
      updates.grade = grade || calculateGrade(finalScore, finalMaxScore);
    } else if (grade !== undefined) {
      updates.grade = grade;
    }
    await collection.doc(id).update(updates);
    const updated = await collection.doc(id).get();
    return NextResponse.json(mapDoc(updated), { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const collection = adminDb.collection(COLLECTION_NAME);
    const doc = await collection.doc(id).get();
    if (!doc.exists || doc.data()?.userId !== user.id) {
      return NextResponse.json({ error: 'Exam result not found' }, { status: 404 });
    }

    await collection.doc(id).delete();
    return NextResponse.json({ 
      message: 'Exam result deleted successfully',
      deletedRecord: mapDoc(doc)
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}