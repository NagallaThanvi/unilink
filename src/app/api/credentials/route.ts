import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { credentials, universities } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { uploadJSONToIPFS } from '@/lib/ipfs';

const VALID_CREDENTIAL_TYPES = ['degree', 'certificate', 'exam'] as const;

function isValidCredentialType(type: string): type is typeof VALID_CREDENTIAL_TYPES[number] {
  return VALID_CREDENTIAL_TYPES.includes(type as any);
}

function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === date.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const universityId = searchParams.get('universityId');
    const credentialType = searchParams.get('credentialType');
    const isVerifiedOnChain = searchParams.get('isVerifiedOnChain');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Single credential by ID
    if (id) {
      if (isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: 'Valid ID is required',
          code: 'INVALID_ID' 
        }, { status: 400 });
      }

      const credential = await db.select()
        .from(credentials)
        .where(eq(credentials.id, parseInt(id)))
        .limit(1);

      if (credential.length === 0) {
        return NextResponse.json({ 
          error: 'Credential not found',
          code: 'NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(credential[0], { status: 200 });
    }

    // List credentials with filters
    const conditions = [];

    if (userId) {
      conditions.push(eq(credentials.userId, userId));
    }

    if (universityId) {
      if (isNaN(parseInt(universityId))) {
        return NextResponse.json({ 
          error: 'Valid university ID is required',
          code: 'INVALID_UNIVERSITY_ID' 
        }, { status: 400 });
      }
      conditions.push(eq(credentials.universityId, parseInt(universityId)));
    }

    if (credentialType) {
      if (!isValidCredentialType(credentialType)) {
        return NextResponse.json({ 
          error: 'Invalid credential type. Must be one of: degree, certificate, exam',
          code: 'INVALID_CREDENTIAL_TYPE' 
        }, { status: 400 });
      }
      conditions.push(eq(credentials.credentialType, credentialType));
    }

    if (isVerifiedOnChain !== null) {
      const verified = isVerifiedOnChain === 'true';
      conditions.push(eq(credentials.isVerifiedOnChain, verified));
    }

    if (search) {
      const searchCondition = or(
        like(credentials.title, `%${search}%`),
        like(credentials.description, `%${search}%`)
      );
      conditions.push(searchCondition!);
    }

    let query = db.select().from(credentials);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(credentials.createdAt))
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
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { 
      universityId, 
      credentialType, 
      title, 
      description,
      issueDate,
      expiryDate,
      blockchainTxHash,
      isVerifiedOnChain,
      ipfsHash,
      metadata
    } = body;

    // Validate required fields
    if (!universityId) {
      return NextResponse.json({ 
        error: 'University ID is required',
        code: 'MISSING_UNIVERSITY_ID' 
      }, { status: 400 });
    }

    if (isNaN(parseInt(universityId))) {
      return NextResponse.json({ 
        error: 'Valid university ID is required',
        code: 'INVALID_UNIVERSITY_ID' 
      }, { status: 400 });
    }

    if (!credentialType) {
      return NextResponse.json({ 
        error: 'Credential type is required',
        code: 'MISSING_CREDENTIAL_TYPE' 
      }, { status: 400 });
    }

    if (!isValidCredentialType(credentialType)) {
      return NextResponse.json({ 
        error: 'Invalid credential type. Must be one of: degree, certificate, exam',
        code: 'INVALID_CREDENTIAL_TYPE' 
      }, { status: 400 });
    }

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ 
        error: 'Title is required',
        code: 'MISSING_TITLE' 
      }, { status: 400 });
    }

    if (!issueDate) {
      return NextResponse.json({ 
        error: 'Issue date is required',
        code: 'MISSING_ISSUE_DATE' 
      }, { status: 400 });
    }

    if (!isValidISODate(issueDate)) {
      return NextResponse.json({ 
        error: 'Issue date must be a valid ISO date string',
        code: 'INVALID_ISSUE_DATE' 
      }, { status: 400 });
    }

    if (expiryDate && !isValidISODate(expiryDate)) {
      return NextResponse.json({ 
        error: 'Expiry date must be a valid ISO date string',
        code: 'INVALID_EXPIRY_DATE' 
      }, { status: 400 });
    }

    // Verify university exists
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

    // Validate metadata is object if provided
    if (metadata !== undefined && metadata !== null) {
      if (typeof metadata !== 'object' || Array.isArray(metadata)) {
        return NextResponse.json({ 
          error: 'Metadata must be a valid JSON object',
          code: 'INVALID_METADATA' 
        }, { status: 400 });
      }
    }

    const now = new Date().toISOString();

    // If metadata provided but no ipfsHash, upload metadata to IPFS
    let finalIpfsHash = ipfsHash || null;
    if (!finalIpfsHash && metadata) {
      try {
        const cidUrl = await uploadJSONToIPFS(`credential-${Date.now()}.json`, {
          title: title?.trim(),
          description: description?.trim(),
          universityId,
          credentialType,
          issueDate,
          expiryDate: expiryDate || null,
          metadata,
        });
        if (cidUrl) finalIpfsHash = cidUrl;
      } catch (e) {
        console.warn('IPFS upload failed:', e);
      }
    }

    const newCredential = await db.insert(credentials)
      .values({
        userId: user.id,
        universityId: parseInt(universityId),
        credentialType: credentialType,
        title: title.trim(),
        description: description ? description.trim() : null,
        issueDate,
        expiryDate: expiryDate || null,
        blockchainTxHash: blockchainTxHash || null,
        isVerifiedOnChain: isVerifiedOnChain ?? false,
        ipfsHash: finalIpfsHash,
        metadata: metadata ? JSON.stringify(metadata) : null,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return NextResponse.json(newCredential[0], { status: 201 });

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

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Check if credential exists and belongs to user
    const existing = await db.select()
      .from(credentials)
      .where(and(
        eq(credentials.id, parseInt(id)),
        eq(credentials.userId, user.id)
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Credential not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    const { 
      universityId, 
      credentialType, 
      title, 
      description,
      issueDate,
      expiryDate,
      blockchainTxHash,
      isVerifiedOnChain,
      ipfsHash,
      metadata
    } = body;

    // Validate updates
    const updates: any = {};

    if (universityId !== undefined) {
      if (isNaN(parseInt(universityId))) {
        return NextResponse.json({ 
          error: 'Valid university ID is required',
          code: 'INVALID_UNIVERSITY_ID' 
        }, { status: 400 });
      }

      // Verify university exists
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

      updates.universityId = parseInt(universityId);
    }

    if (credentialType !== undefined) {
      if (!isValidCredentialType(credentialType)) {
        return NextResponse.json({ 
          error: 'Invalid credential type. Must be one of: degree, certificate, exam',
          code: 'INVALID_CREDENTIAL_TYPE' 
        }, { status: 400 });
      }
      updates.credentialType = credentialType;
    }

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return NextResponse.json({ 
          error: 'Title cannot be empty',
          code: 'INVALID_TITLE' 
        }, { status: 400 });
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      updates.description = description ? description.trim() : null;
    }

    if (issueDate !== undefined) {
      if (!isValidISODate(issueDate)) {
        return NextResponse.json({ 
          error: 'Issue date must be a valid ISO date string',
          code: 'INVALID_ISSUE_DATE' 
        }, { status: 400 });
      }
      updates.issueDate = issueDate;
    }

    if (expiryDate !== undefined) {
      if (expiryDate && !isValidISODate(expiryDate)) {
        return NextResponse.json({ 
          error: 'Expiry date must be a valid ISO date string',
          code: 'INVALID_EXPIRY_DATE' 
        }, { status: 400 });
      }
      updates.expiryDate = expiryDate || null;
    }

    if (blockchainTxHash !== undefined) {
      updates.blockchainTxHash = blockchainTxHash || null;
    }

    if (isVerifiedOnChain !== undefined) {
      updates.isVerifiedOnChain = Boolean(isVerifiedOnChain);
    }

    if (ipfsHash !== undefined) {
      updates.ipfsHash = ipfsHash || null;
    }

    if (metadata !== undefined) {
      if (metadata !== null && (typeof metadata !== 'object' || Array.isArray(metadata))) {
        return NextResponse.json({ 
          error: 'Metadata must be a valid JSON object',
          code: 'INVALID_METADATA' 
        }, { status: 400 });
      }
      updates.metadata = metadata ? JSON.stringify(metadata) : null;
    }

    updates.updatedAt = new Date().toISOString();

    const updated = await db.update(credentials)
      .set(updates)
      .where(and(
        eq(credentials.id, parseInt(id)),
        eq(credentials.userId, user.id)
      ))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ 
        error: 'Credential not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
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
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid ID is required',
        code: 'INVALID_ID' 
      }, { status: 400 });
    }

    // Check if credential exists and belongs to user
    const existing = await db.select()
      .from(credentials)
      .where(and(
        eq(credentials.id, parseInt(id)),
        eq(credentials.userId, user.id)
      ))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Credential not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    const deleted = await db.delete(credentials)
      .where(and(
        eq(credentials.id, parseInt(id)),
        eq(credentials.userId, user.id)
      ))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        error: 'Credential not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Credential deleted successfully',
      credential: deleted[0]
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}