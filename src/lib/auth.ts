import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { NextRequest } from 'next/server';
import { headers } from "next/headers"
import { db } from "@/db";
 
export const auth = betterAuth({
	baseURL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
	database: drizzleAdapter(db, {
		provider: "sqlite",
	}),
	emailAndPassword: {    
		enabled: true,
		requireEmailVerification: false, // Disable for development
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 60 * 60 * 24 * 7, // 7 days
		},
	},
	advanced: {
		crossSubDomainCookies: {
			enabled: true,
		},
	},
	plugins: [bearer()],
	trustedOrigins: [process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"],
});

// Session validation helper
export async function getCurrentUser(request?: NextRequest) {
  try {
    const session = await auth.api.getSession({ 
      headers: request ? request.headers : await headers() 
    });
    return session?.user || null;
  } catch (error) {
    console.error("Session validation error:", error);
    return null;
  }
}

// Authorization middleware
export async function requireAuth(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

// Role-based authorization
export async function requireRole(request: NextRequest, allowedRoles: string[]) {
  const user = await requireAuth(request);
  
  // Get user profile to check role
  const { userProfiles } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  
  const profile = await db.select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id))
    .limit(1);
    
  if (!profile.length || !allowedRoles.includes(profile[0].role)) {
    throw new Error("Insufficient permissions");
  }
  
  return { user, profile: profile[0] };
}
