import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

const COLLECTION_NAME = 'userProfiles';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    // Query profile by ID
    const doc = await adminDb.collection(COLLECTION_NAME).doc(id).get();

    // Check if profile exists
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(mapDoc(doc), { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}