import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, userProfiles } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';

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
      const users = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          profile: {
            id: userProfiles.id,
            userId: userProfiles.userId,
            role: userProfiles.role,
            universityId: userProfiles.universityId,
            graduationYear: userProfiles.graduationYear,
            major: userProfiles.major,
            degree: userProfiles.degree,
            currentPosition: userProfiles.currentPosition,
            company: userProfiles.company,
            location: userProfiles.location,
            bio: userProfiles.bio,
            skills: userProfiles.skills,
            interests: userProfiles.interests,
            phoneNumber: userProfiles.phoneNumber,
            linkedinUrl: userProfiles.linkedinUrl,
            isVerified: userProfiles.isVerified,
            verificationStatus: userProfiles.verificationStatus,
            createdAt: userProfiles.createdAt,
            updatedAt: userProfiles.updatedAt,
          },
        })
        .from(user)
        .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
        .where(eq(user.id, id))
        .limit(1);

      if (users.length === 0) {
        return NextResponse.json(
          { error: 'User not found', code: 'USER_NOT_FOUND' },
          { status: 404 }
        );
      }

      const userData = users[0];
      const result = {
        ...userData,
        profile: userData.profile.id ? userData.profile : null,
      };

      return NextResponse.json(result);
    }

    // Single user by email
    if (email) {
      const users = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          profile: {
            id: userProfiles.id,
            userId: userProfiles.userId,
            role: userProfiles.role,
            universityId: userProfiles.universityId,
            graduationYear: userProfiles.graduationYear,
            major: userProfiles.major,
            degree: userProfiles.degree,
            currentPosition: userProfiles.currentPosition,
            company: userProfiles.company,
            location: userProfiles.location,
            bio: userProfiles.bio,
            skills: userProfiles.skills,
            interests: userProfiles.interests,
            phoneNumber: userProfiles.phoneNumber,
            linkedinUrl: userProfiles.linkedinUrl,
            isVerified: userProfiles.isVerified,
            verificationStatus: userProfiles.verificationStatus,
            createdAt: userProfiles.createdAt,
            updatedAt: userProfiles.updatedAt,
          },
        })
        .from(user)
        .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
        .where(eq(user.email, email))
        .limit(1);

      if (users.length === 0) {
        return NextResponse.json(
          { error: 'User not found', code: 'USER_NOT_FOUND' },
          { status: 404 }
        );
      }

      const userData = users[0];
      const result = {
        ...userData,
        profile: userData.profile.id ? userData.profile : null,
      };

      return NextResponse.json(result);
    }

    // List users with filters
    let query = db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: {
          id: userProfiles.id,
          userId: userProfiles.userId,
          role: userProfiles.role,
          universityId: userProfiles.universityId,
          graduationYear: userProfiles.graduationYear,
          major: userProfiles.major,
          degree: userProfiles.degree,
          currentPosition: userProfiles.currentPosition,
          company: userProfiles.company,
          location: userProfiles.location,
          bio: userProfiles.bio,
          skills: userProfiles.skills,
          interests: userProfiles.interests,
          phoneNumber: userProfiles.phoneNumber,
          linkedinUrl: userProfiles.linkedinUrl,
          isVerified: userProfiles.isVerified,
          verificationStatus: userProfiles.verificationStatus,
          createdAt: userProfiles.createdAt,
          updatedAt: userProfiles.updatedAt,
        },
      })
      .from(user)
      .leftJoin(userProfiles, eq(user.id, userProfiles.userId));

    // Build WHERE conditions
    const conditions = [];

    if (role) {
      conditions.push(eq(userProfiles.role, role));
    }

    if (search) {
      conditions.push(
        or(
          like(user.name, `%${search}%`),
          like(user.email, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Execute query with ordering and pagination
    const users = await query
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset);

    // Transform results to handle null profiles
    const results = users.map((userData) => ({
      ...userData,
      profile: userData.profile.id ? userData.profile : null,
    }));

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
    const updateData: {
      name?: string;
      email?: string;
      emailVerified?: boolean;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
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
    const updatedUser = await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, id))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update user', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    // Fetch updated user with profile
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile: {
          id: userProfiles.id,
          userId: userProfiles.userId,
          role: userProfiles.role,
          universityId: userProfiles.universityId,
          graduationYear: userProfiles.graduationYear,
          major: userProfiles.major,
          degree: userProfiles.degree,
          currentPosition: userProfiles.currentPosition,
          company: userProfiles.company,
          location: userProfiles.location,
          bio: userProfiles.bio,
          skills: userProfiles.skills,
          interests: userProfiles.interests,
          phoneNumber: userProfiles.phoneNumber,
          linkedinUrl: userProfiles.linkedinUrl,
          isVerified: userProfiles.isVerified,
          verificationStatus: userProfiles.verificationStatus,
          createdAt: userProfiles.createdAt,
          updatedAt: userProfiles.updatedAt,
        },
      })
      .from(user)
      .leftJoin(userProfiles, eq(user.id, userProfiles.userId))
      .where(eq(user.id, id))
      .limit(1);

    const userData = users[0];
    const result = {
      ...userData,
      profile: userData.profile.id ? userData.profile : null,
    };

    return NextResponse.json(result);
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

    // Delete user (cascade will handle related records)
    const deleted = await db
      .delete(user)
      .where(eq(user.id, id))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete user', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'User deleted successfully',
      deletedUser: deleted[0],
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}