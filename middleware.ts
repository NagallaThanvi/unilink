import { NextResponse } from "next/server";

export function middleware() {
  // No-op middleware to ensure Edge compatibility. Auth and role checks
  // should be performed within server components or API routes instead.
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/messages", "/credentials", "/admin/:path*"],
};