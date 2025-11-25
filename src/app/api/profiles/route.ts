import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { getCurrentUser } from '@/lib/auth';

const VALID_ROLES = ['alumni', 'student', 'university_admin'] as const;
const VALID_VERIFICATION_STATUSES = ['pending', 'verified', 'rejected'] as const;

const COLLECTION_NAME = 'profiles';

function mapDoc(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data();
  if (!data) return null;
  return {
    id: doc.id,
    userId: data.userId ?? null,
    role: data.role ?? null,
    universityId: data.universityId ?? null,
    graduationYear: data.graduationYear ?? null,
    major: data.major ?? null,
    degree: data.degree ?? null,
    currentPosition: data.currentPosition ?? null,
    company: data.company ?? null,
    location: data.location ?? null,
    bio: data.bio ?? null,
    skills: data.skills ?? null,
    interests: data.interests ?? null,
    phoneNumber: data.phoneNumber ?? null,
    linkedinUrl: data.linkedinUrl ?? null,
    isVerified: data.isVerified ?? false,
    verificationStatus: data.verificationStatus ?? 'pending',
    name: data.name ?? null,
    image: data.image ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const universityId = searchParams.get('universityId');
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const collection = adminDb.collection(COLLECTION_NAME);

    // Get single profile by ID
    if (id) {
      const doc = await collection.doc(id).get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Profile not found', code: 'PROFILE_NOT_FOUND' }, { status: 404 });
      }
      return NextResponse.json(mapDoc(doc), { status: 200 });
    }

    // Get single profile by userId
    if (userId) {
      const snapshot = await collection.where('userId', '==', userId).limit(1).get();
      if (snapshot.empty) {
        return NextResponse.json({ error: 'Profile not found', code: 'PROFILE_NOT_FOUND' }, { status: 404 });
      }
      return NextResponse.json(mapDoc(snapshot.docs[0]), { status: 200 });
    }

    let query: FirebaseFirestore.Query = collection.orderBy('createdAt', 'desc');

    if (universityId) {
      const univId = parseInt(universityId);
      if (!isNaN(univId)) {
        query = query.where('universityId', '==', univId);
      }
    }

    if (role) {
      query = query.where('role', '==', role);
    }

    const snapshot = await query.limit(limit).offset(offset).get();
    let profiles = snapshot.docs.map(mapDoc).filter(Boolean);

    // In-memory text search (basic)
    if (search) {
      const lower = search.toLowerCase();
      profiles = profiles.filter((p: any) =>
        (p.major && p.major.toLowerCase().includes(lower)) ||
        (p.company && p.company.toLowerCase().includes(lower)) ||
        (p.currentPosition && p.currentPosition.toLowerCase().includes(lower)) ||
        (p.bio && p.bio.toLowerCase().includes(lower))
      );
    }

    return NextResponse.json(profiles, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      role,
      universityId,
      graduationYear,
      major,
      degree,
      currentPosition,
      company,
      location,
      bio,
      skills,
      interests,
      phoneNumber,
      linkedinUrl,
      isVerified,
      verificationStatus
    } = body;

    const normalizedRole = typeof role === 'string' ? role.toLowerCase() : role;
    let normalizedUniversityId: any = universityId;
    if (typeof normalizedUniversityId === 'string' && normalizedUniversityId.trim() !== '') {
      const parsed = parseInt(normalizedUniversityId);
      if (!isNaN(parsed)) normalizedUniversityId = parsed;
    }
    const skillsArr = typeof skills === 'string'
      ? skills.split(',').map((s: string) => s.trim()).filter(Boolean)
      : skills;
    const interestsArr = typeof interests === 'string'
      ? interests.split(',').map((s: string) => s.trim()).filter(Boolean)
      : interests;

    // Validate required fields
    if (!userId) {
      return NextResponse.json({
        error: 'userId is required',
        code: 'MISSING_USER_ID'
      }, { status: 400 });
    }

    if (!normalizedRole) {
      return NextResponse.json({
        error: 'role is required',
        code: 'MISSING_ROLE'
      }, { status: 400 });
    }

    if (!VALID_ROLES.includes(normalizedRole)) {
      return NextResponse.json({
        error: `role must be one of: ${VALID_ROLES.join(', ')}`,
        code: 'INVALID_ROLE'
      }, { status: 400 });
    }

    if (verificationStatus && !VALID_VERIFICATION_STATUSES.includes(verificationStatus)) {
      return NextResponse.json({
        error: `verificationStatus must be one of: ${VALID_VERIFICATION_STATUSES.join(', ')}`,
        code: 'INVALID_VERIFICATION_STATUS'
      }, { status: 400 });
    }

    if (skillsArr && !Array.isArray(skillsArr)) {
      return NextResponse.json({
        error: 'skills must be an array',
        code: 'INVALID_SKILLS_FORMAT'
      }, { status: 400 });
    }

    if (interestsArr && !Array.isArray(interestsArr)) {
      return NextResponse.json({
        error: 'interests must be an array',
        code: 'INVALID_INTERESTS_FORMAT'
      }, { status: 400 });
    }

    const collection = adminDb.collection(COLLECTION_NAME);
    const existing = await collection.where('userId', '==', userId).limit(1).get();
    const timestamp = new Date().toISOString();

    // Fetch name/image from Firebase Auth if available
    let name = null;
    let image = null;
    try {
      const userRecord = await adminAuth.getUser(userId);
      name = userRecord.displayName || null;
      image = userRecord.photoURL || null;
    } catch {}

    const data: any = {
      userId,
      role: normalizedRole,
      universityId: normalizedUniversityId || null,
      graduationYear: graduationYear || null,
      major: major || null,
      degree: degree || null,
      currentPosition: currentPosition || null,
      company: company || null,
      location: location || null,
      bio: bio || null,
      skills: skillsArr ? JSON.stringify(skillsArr) : null,
      interests: interestsArr ? JSON.stringify(interestsArr) : null,
      phoneNumber: phoneNumber || null,
      linkedinUrl: linkedinUrl || null,
      isVerified: !!isVerified,
      verificationStatus: verificationStatus || 'pending',
      name,
      image,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (!existing.empty) {
      // Update existing
      const docId = existing.docs[0].id;
      await collection.doc(docId).update({ ...data, updatedAt: timestamp });
      const updated = await collection.doc(docId).get();
      return NextResponse.json(mapDoc(updated), { status: 200 });
    } else {
      // Create new
      const ref = await collection.add(data);
      const created = await ref.get();
      return NextResponse.json(mapDoc(created), { status: 201 });
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        error: 'Valid profile ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const collection = adminDb.collection(COLLECTION_NAME);
    const doc = await collection.doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Profile not found', code: 'PROFILE_NOT_FOUND' }, { status: 404 });
    }

    const body = await request.json();
    const {
      role,
      universityId,
      graduationYear,
      major,
      degree,
      currentPosition,
      company,
      location,
      bio,
      skills,
      interests,
      phoneNumber,
      linkedinUrl,
      isVerified,
      verificationStatus
    } = body;

    const normalizedRole = typeof role === 'string' ? role.toLowerCase() : role;
    let normalizedUniversityId: any = universityId;
    if (typeof normalizedUniversityId === 'string' && normalizedUniversityId.trim() !== '') {
      const parsed = parseInt(normalizedUniversityId);
      if (!isNaN(parsed)) normalizedUniversityId = parsed;
    }
    const skillsArr = typeof skills === 'string'
      ? skills.split(',').map((s: string) => s.trim()).filter(Boolean)
      : skills;
    const interestsArr = typeof interests === 'string'
      ? interests.split(',').map((s: string) => s.trim()).filter(Boolean)
      : interests;

    if (role && !VALID_ROLES.includes(normalizedRole)) {
      return NextResponse.json({
        error: `role must be one of: ${VALID_ROLES.join(', ')}`,
        code: 'INVALID_ROLE'
      }, { status: 400 });
    }

    if (verificationStatus && !VALID_VERIFICATION_STATUSES.includes(verificationStatus)) {
      return NextResponse.json({
        error: `verificationStatus must be one of: ${VALID_VERIFICATION_STATUSES.join(', ')}`,
        code: 'INVALID_VERIFICATION_STATUS'
      }, { status: 400 });
    }

    if (skillsArr && !Array.isArray(skillsArr)) {
      return NextResponse.json({
        error: 'skills must be an array',
        code: 'INVALID_SKILLS_FORMAT'
      }, { status: 400 });
    }

    if (interestsArr && !Array.isArray(interestsArr)) {
      return NextResponse.json({
        error: 'interests must be an array',
        code: 'INVALID_INTERESTS_FORMAT'
      }, { status: 400 });
    }

    const updateData: any = { updatedAt: new Date().toISOString() };
    if (normalizedRole !== undefined) updateData.role = normalizedRole;
    if (normalizedUniversityId !== undefined) updateData.universityId = normalizedUniversityId;
    if (graduationYear !== undefined) updateData.graduationYear = graduationYear;
    if (major !== undefined) updateData.major = major;
    if (degree !== undefined) updateData.degree = degree;
    if (currentPosition !== undefined) updateData.currentPosition = currentPosition;
    if (company !== undefined) updateData.company = company;
    if (location !== undefined) updateData.location = location;
    if (bio !== undefined) updateData.bio = bio;
    if (skillsArr !== undefined) updateData.skills = skillsArr ? JSON.stringify(skillsArr) : null;
    if (interestsArr !== undefined) updateData.interests = interestsArr ? JSON.stringify(interestsArr) : null;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl;
    if (isVerified !== undefined) updateData.isVerified = !!isVerified;
    if (verificationStatus !== undefined) updateData.verificationStatus = verificationStatus;

    await collection.doc(id).update(updateData);
    const updated = await collection.doc(id).get();
    return NextResponse.json(mapDoc(updated));
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        error: 'Valid profile ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const collection = adminDb.collection(COLLECTION_NAME);
    const doc = await collection.doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Profile not found', code: 'PROFILE_NOT_FOUND' }, { status: 404 });
    }

    await collection.doc(id).delete();
    return NextResponse.json({
      message: 'Profile deleted successfully',
      profile: mapDoc(doc)
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}