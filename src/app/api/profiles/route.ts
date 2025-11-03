import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userProfiles, user } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';

const VALID_ROLES = ['alumni', 'student', 'university_admin'] as const;
const VALID_VERIFICATION_STATUSES = ['pending', 'verified', 'rejected'] as const;

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

    // Get single profile by ID
    if (id) {
      const profileId = parseInt(id);
      if (isNaN(profileId)) {
        return NextResponse.json({ 
          error: 'Valid profile ID is required',
          code: 'INVALID_ID' 
        }, { status: 400 });
      }

      const profile = await db.select()
        .from(userProfiles)
        .where(eq(userProfiles.id, profileId))
        .limit(1);

      if (profile.length === 0) {
        return NextResponse.json({ 
          error: 'Profile not found',
          code: 'PROFILE_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(profile[0]);
    }

    // Get single profile by userId
    if (userId) {
      const profile = await db.select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (profile.length === 0) {
        return NextResponse.json({ 
          error: 'Profile not found',
          code: 'PROFILE_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(profile[0]);
    }

    // Build list query with filters. We join the auth user table to fetch display name and image
    // and later flatten the response.
    let query: any = db
      .select()
      .from(userProfiles)
      .leftJoin(user, eq(userProfiles.userId, user.id));
    const conditions = [];

    if (universityId) {
      const univId = parseInt(universityId);
      if (!isNaN(univId)) {
        conditions.push(eq(userProfiles.universityId, univId));
      }
    }

    if (role) {
      conditions.push(eq(userProfiles.role, role));
    }

    if (search) {
      conditions.push(
        or(
          like(userProfiles.major, `%${search}%`),
          like(userProfiles.company, `%${search}%`),
          like(userProfiles.currentPosition, `%${search}%`),
          like(userProfiles.bio, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const rows = await query
      .orderBy(desc(userProfiles.createdAt))
      .limit(limit)
      .offset(offset);

    // Flatten drizzle leftJoin result: { user_profiles: {...}, user: {...} }
    const profiles = rows.map((row: any) => {
      const profile = row.user_profiles ?? row; // in case the driver returns flat
      const u = row.user ?? {};
      return {
        ...profile,
        name: u.name ?? null,
        image: u.image ?? null,
      };
    });

    return NextResponse.json(profiles);
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
    const skillsArr: any = typeof skills === 'string' 
      ? skills.split(',').map((s: string) => s.trim()).filter(Boolean)
      : skills;
    const interestsArr: any = typeof interests === 'string' 
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

    // Validate role
    if (!VALID_ROLES.includes(normalizedRole)) {
      return NextResponse.json({ 
        error: `role must be one of: ${VALID_ROLES.join(', ')}`,
        code: 'INVALID_ROLE' 
      }, { status: 400 });
    }

    // Validate verificationStatus if provided
    if (verificationStatus && !VALID_VERIFICATION_STATUSES.includes(verificationStatus)) {
      return NextResponse.json({ 
        error: `verificationStatus must be one of: ${VALID_VERIFICATION_STATUSES.join(', ')}`,
        code: 'INVALID_VERIFICATION_STATUS' 
      }, { status: 400 });
    }

    // Validate skills and interests are arrays if provided
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

    // Check if profile already exists for this userId (upsert behavior)
    const existingProfile = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    const timestamp = new Date().toISOString();

    if (existingProfile.length > 0) {
      // Update existing profile
      const updateData: any = {
        role: normalizedRole,
        updatedAt: timestamp
      };

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

      const updated = await db.update(userProfiles)
        .set(updateData)
        .where(eq(userProfiles.userId, userId))
        .returning();

      return NextResponse.json(updated[0], { status: 200 });
    } else {
      // Create new profile
      const newProfile = await db.insert(userProfiles)
        .values({
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
          createdAt: timestamp,
          updatedAt: timestamp
        })
        .returning();

      return NextResponse.json(newProfile[0], { status: 201 });
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid profile ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const profileId = parseInt(id);
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
    const skillsArr: any = typeof skills === 'string'
      ? skills.split(',').map((s: string) => s.trim()).filter(Boolean)
      : skills;
    const interestsArr: any = typeof interests === 'string'
      ? interests.split(',').map((s: string) => s.trim()).filter(Boolean)
      : interests;

    // Validate role if provided
    if (role && !VALID_ROLES.includes(normalizedRole)) {
      return NextResponse.json({ 
        error: `role must be one of: ${VALID_ROLES.join(', ')}`,
        code: 'INVALID_ROLE' 
      }, { status: 400 });
    }

    // Validate verificationStatus if provided
    if (verificationStatus && !VALID_VERIFICATION_STATUSES.includes(verificationStatus)) {
      return NextResponse.json({ 
        error: `verificationStatus must be one of: ${VALID_VERIFICATION_STATUSES.join(', ')}`,
        code: 'INVALID_VERIFICATION_STATUS' 
      }, { status: 400 });
    }

    // Validate skills and interests are arrays if provided
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

    // Check if profile exists
    const existingProfile = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.id, profileId))
      .limit(1);

    if (existingProfile.length === 0) {
      return NextResponse.json({ 
        error: 'Profile not found',
        code: 'PROFILE_NOT_FOUND' 
      }, { status: 404 });
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

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
    if (isVerified !== undefined) updateData.isVerified = isVerified ? 1 : 0;
    if (verificationStatus !== undefined) updateData.verificationStatus = verificationStatus;

    const updated = await db.update(userProfiles)
      .set(updateData)
      .where(eq(userProfiles.id, profileId))
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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid profile ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const profileId = parseInt(id);

    // Check if profile exists
    const existingProfile = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.id, profileId))
      .limit(1);

    if (existingProfile.length === 0) {
      return NextResponse.json({ 
        error: 'Profile not found',
        code: 'PROFILE_NOT_FOUND' 
      }, { status: 404 });
    }

    const deleted = await db.delete(userProfiles)
      .where(eq(userProfiles.id, profileId))
      .returning();

    return NextResponse.json({
      message: 'Profile deleted successfully',
      profile: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}