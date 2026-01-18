import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(_request: NextRequest) {
  // Add any request interception logic here
  // For example: redirects, rewrites, header modifications, etc.

  return NextResponse.next();
}

export const config = {
  // Matcher for routes that should be processed by the proxy
  // Exclude static files and API routes unless needed
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
