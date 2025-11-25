import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getCurrentUser } from '@/lib/auth';
import { uploadJSONToIPFS } from '@/lib/ipfs';

const VALID_CREDENTIAL_TYPES = ['degree', 'certificate', 'exam'] as const;
const COLLECTION_NAME = 'credentials';

function mapDoc(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data();
  if (!data) return null;
  return {
    id: doc.id,
    userId: data.userId ?? null,
    universityId: data.universityId ?? null,
    credentialType: data.credentialType ?? null,
    title: data.title ?? null,
    issuerName: data.issuerName ?? null,
    issueDate: data.issueDate ?? null,
    completionDate: data.completionDate ?? null,
    verificationHash: data.verificationHash ?? null,
    metadata: data.metadata ?? null,
    isVerifiedOnChain: data.isVerifiedOnChain ?? false,
    blockchainTxHash: data.blockchainTxHash ?? null,
    ipfsHash: data.ipfsHash ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

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

    const collection = adminDb.collection(COLLECTION_NAME);

    // Single credential by ID
    if (id) {
      const doc = await collection.doc(id).get();
      if (!doc.exists) {
        return NextResponse.json({ 
          error: 'Credential not found',
          code: 'NOT_FOUND' 
        }, { status: 404 });
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

    if (credentialType) {
      if (!isValidCredentialType(credentialType)) {
        return NextResponse.json({ 
          error: 'Invalid credential type. Must be one of: degree, certificate, exam',
          code: 'INVALID_CREDENTIAL_TYPE' 
        }, { status: 400 });
      }
      query = query.where('credentialType', '==', credentialType);
    }

    if (isVerifiedOnChain !== null) {
      const verified = isVerifiedOnChain === 'true';
      query = query.where('isVerifiedOnChain', '==', verified);
    }

    const snapshot = await query.limit(limit).offset(offset).get();
    let results = snapshot.docs.map(mapDoc).filter(Boolean);

    // In-memory text search if needed
    if (search) {
      const lower = search.toLowerCase();
      results = results.filter(c => 
        (c.title && c.title.toLowerCase().includes(lower)) ||
        (c.issuerName && c.issuerName.toLowerCase().includes(lower))
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
    const uniDoc = await adminDb.collection('universities').doc(universityId).get();
    if (!uniDoc.exists) {
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

    const newCredential = await adminDb.collection(COLLECTION_NAME).add({
      userId: user.id,
      universityId,
      credentialType,
      title: title.trim(),
      issuerName: uniDoc.data()?.name || null,
      issueDate,
      completionDate: expiryDate || null,
      blockchainTxHash: blockchainTxHash || null,
      isVerifiedOnChain: isVerifiedOnChain ?? false,
      ipfsHash: finalIpfsHash,
      metadata: metadata || null,
      createdAt: now,
      updatedAt: now
    });

    const created = await newCredential.get();
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

    const searchParams = request.nextUrl.searchParams;
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
      return NextResponse.json({ 
        error: 'Credential not found or unauthorized',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    const body = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate updates
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (universityId !== undefined) {
      const uniDoc = await adminDb.collection('universities').doc(universityId).get();
      if (!uniDoc.exists) {
        return NextResponse.json({ 
          error: 'University not found',
          code: 'UNIVERSITY_NOT_FOUND' 
        }, { status: 400 });
      }
      updates.universityId = universityId;
      updates.issuerName = uniDoc.data()?.name || null;
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
      updates.completionDate = expiryDate || null;
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
      updates.metadata = metadata;
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

    const searchParams = request.nextUrl.searchParams;
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
      return NextResponse.json({ 
        error: 'Credential not found',
        code: 'NOT_FOUND' 
      }, { status: 404 });
    }

    await collection.doc(id).delete();
    return NextResponse.json({
      message: 'Credential deleted successfully',
      credential: mapDoc(doc)
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}