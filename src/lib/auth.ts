import { NextRequest } from 'next/server';
import { adminAuth } from './firebaseAdmin';

type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  image?: string | null;
};

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

// Session validation helper using Firebase ID tokens
export async function getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = extractBearerToken(request);
    if (!token) return null;

    const decoded = await adminAuth.verifyIdToken(token);

    return {
      id: decoded.uid,
      email: decoded.email ?? null,
      name: (decoded.name as string | undefined) ?? null,
      image: (decoded.picture as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
}

// Simple authorization middleware used by API routes
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// Placeholder role-based authorization. If you later store roles in Firestore,
// you can extend this to fetch and check roles. For now it just ensures auth.
export async function requireRole(request: NextRequest, _allowedRoles: string[]): Promise<{ user: AuthUser }> {
  const user = await requireAuth(request);
  return { user };
}
