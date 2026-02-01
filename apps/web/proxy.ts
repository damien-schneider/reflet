import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AUTH_PAGES = [
  "/auth/forgot-password",
  "/auth/check-email",
  "/auth/sign-in",
  "/auth/sign-up",
];

const TOKEN_BASED_AUTH_PAGES = ["/auth/verify-email", "/auth/reset-password"];

const PROTECTED_ROUTES = ["/dashboard"];

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);
  const isAuthenticated = Boolean(sessionCookie);

  if (isAuthenticated) {
    // Token-based pages: redirect only if no token
    if (TOKEN_BASED_AUTH_PAGES.some((page) => pathname.startsWith(page))) {
      if (!searchParams.has("token")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return NextResponse.next();
    }

    // Regular auth pages: always redirect authenticated users away
    if (AUTH_PAGES.some((page) => pathname.startsWith(page))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } else if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    // Unauthenticated users: redirect away from protected routes
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (svg, png, jpg, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
