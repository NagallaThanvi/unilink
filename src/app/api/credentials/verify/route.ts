import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyTransactionSuccess } from '@/lib/blockchain';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credentialId, blockchainTxHash } = body;

    // Validate required fields
    if (!credentialId) {
      return NextResponse.json(
        {
          error: 'credentialId is required',
          code: 'MISSING_CREDENTIAL_ID',
        },
        { status: 400 }
      );
    }

    if (!blockchainTxHash) {
      return NextResponse.json(
        {
          error: 'blockchainTxHash is required',
          code: 'MISSING_BLOCKCHAIN_TX_HASH',
        },
        { status: 400 }
      );
    }

    // Find credential by ID
    const doc = await adminDb.collection('credentials').doc(credentialId).get();
    if (!doc.exists) {
      return NextResponse.json(
        {
          error: 'Credential not found',
          code: 'CREDENTIAL_NOT_FOUND',
        },
        { status: 404 }
      );
    }


    // Verify on-chain transaction succeeded
    const result = await verifyTransactionSuccess(blockchainTxHash.trim() as `0x${string}`);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: `Blockchain verification failed: ${result.reason}`,
          code: 'BLOCKCHAIN_VERIFICATION_FAILED',
        },
        { status: 400 }
      );
    }

    // Update credential with blockchain verification
    await adminDb.collection('credentials').doc(credentialId).update({
      blockchainTxHash: blockchainTxHash.trim(),
      isVerifiedOnChain: true,
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await adminDb.collection('credentials').doc(credentialId).get();
    const credentialData = updatedDoc.data();

    return NextResponse.json(
      {
        success: true,
        message: 'Credential verified on blockchain',
        credential: { id: updatedDoc.id, ...credentialData },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + error,
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}