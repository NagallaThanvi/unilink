import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';

const USERS_COLLECTION = 'users';
const PROFILES_COLLECTION = 'userProfiles';

function mapUserDoc(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data();
  if (!data) return null;
  return {
    id: doc.id,
    name: data.name ?? null,
    email: data.email ?? null,
    emailVerified: data.emailVerified ?? false,
    image: data.image ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

function mapProfileDoc(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
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
    skills: data.skills ?? [],
    interests: data.interests ?? [],
    phoneNumber: data.phoneNumber ?? null,
    linkedinUrl: data.linkedinUrl ?? null,
    isVerified: data.isVerified ?? false,
    verificationStatus: data.verificationStatus ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const email = searchParams.get('email');
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Single user by ID
    if (id) {
      const userDoc = await adminDb.collection(USERS_COLLECTION).doc(id).get();
      if (!userDoc.exists) {
        return NextResponse.json(
          { error: 'User not found', code: 'USER_NOT_FOUND' },
          { status: 404 }
        );
      }

      const userData = mapUserDoc(userDoc);
      const profileDoc = await adminDb.collection(PROFILES_COLLECTION).where('userId', '==', id).limit(1).get();
      const profile = !profileDoc.empty ? mapProfileDoc(profileDoc.docs[0]) : null;

      return NextResponse.json({ ...userData, profile });
    }

    // Single user by email
    if (email) {
      const userSnapshot = await adminAuth.getUserByEmail(email);
      if (!userSnapshot) {
        return NextResponse.json(
          { error: 'User not found', code: 'USER_NOT_FOUND' },
          { status: 404 }
        );
      }

      const userDoc = await adminDb.collection(USERS_COLLECTION).doc(userSnapshot.uid).get();
      const userData = mapUserDoc(userDoc);
      const profileDoc = await adminDb.collection(PROFILES_COLLECTION).where('userId', '==', userSnapshot.uid).limit(1).get();
      const profile = !profileDoc.empty ? mapProfileDoc(profileDoc.docs[0]) : null;

      return NextResponse.json({ ...userData, profile });
    }

    // List users with filters
    let query: FirebaseFirestore.Query = adminDb.collection(USERS_COLLECTION).orderBy('createdAt', 'desc');
    const usersSnapshot = await query.limit(limit).offset(offset).get();
    const users = usersSnapshot.docs.map(mapUserDoc).filter(Boolean);

    // Attach profiles and apply filters in-memory
    const results = [];
    for (const user of users) {
      const profileSnapshot = await adminDb.collection(PROFILES_COLLECTION).where('userId', '==', user.id).limit(1).get();
      const profile = !profileSnapshot.empty ? mapProfileDoc(profileSnapshot.docs[0]) : null;

      // Apply role filter if specified
      if (role && (!profile || profile.role !== role)) continue;

      // Apply search filter if specified
      if (search) {
        const lower = search.toLowerCase();
        const matchesName = user.name && user.name.toLowerCase().includes(lower);
        const matchesEmail = user.email && user.email.toLowerCase().includes(lower);
        if (!matchesName && !matchesEmail) continue;
      }

      results.push({ ...user, profile });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, email, emailVerified } = body;

    // Check if user exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: 'Name must be a non-empty string', code: 'INVALID_NAME' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || !email.includes('@')) {
        return NextResponse.json(
          { error: 'Valid email is required', code: 'INVALID_EMAIL' },
          { status: 400 }
        );
      }
      updateData.email = email.toLowerCase().trim();
    }

    if (emailVerified !== undefined) {
      if (typeof emailVerified !== 'boolean') {
        return NextResponse.json(
          {
            error: 'emailVerified must be a boolean',
            code: 'INVALID_EMAIL_VERIFIED',
          },
          { status: 400 }
        );
      }
      updateData.emailVerified = emailVerified;
    }

    // Update user
    await adminDb.collection(USERS_COLLECTION).doc(id).update(updateData);
    const updatedDoc = await adminDb.collection(USERS_COLLECTION).doc(id).get();
    const userData = mapUserDoc(updatedDoc);
    
    // Fetch profile
    const profileDoc = await adminDb.collection(PROFILES_COLLECTION).where('userId', '==', id).limit(1).get();
    const profile = !profileDoc.empty ? mapProfileDoc(profileDoc.docs[0]) : null;

    return NextResponse.json({ ...userData, profile });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    // Check if user exists
    const userDoc = await adminDb.collection(USERS_COLLECTION).doc(id).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete user profile if exists
    const profileSnapshot = await adminDb.collection(PROFILES_COLLECTION).where('userId', '==', id).get();
    const batch = adminDb.batch();
    profileSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(adminDb.collection(USERS_COLLECTION).doc(id));
    await batch.commit();

    return NextResponse.json({
      message: 'User deleted successfully',
      deletedUser: mapUserDoc(userDoc),
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}