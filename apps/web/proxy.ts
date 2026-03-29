import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "reflet.app";

const AUTH_PAGES = [
  "/auth/forgot-password",
  "/auth/check-email",
  "/auth/sign-in",
  "/auth/sign-up",
];

const TOKEN_BASED_AUTH_PAGES = ["/auth/verify-email", "/auth/reset-password"];

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const { pathname, searchParams } = request.nextUrl;

  // Strip port for local dev
  const host = hostname.split(":")[0];

  // --- Custom domain / subdomain routing ---

  const isMainApp =
    host === `www.${ROOT_DOMAIN}` ||
    host === ROOT_DOMAIN ||
    host === "localhost" ||
    host === "127.0.0.1";

  // Subdomain on root domain (e.g. {slug}.reflet.app)
  if (!isMainApp && host.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = host.replace(`.${ROOT_DOMAIN}`, "");

    // Ignore multi-level subdomains
    if (!slug.includes(".")) {
      const url = request.nextUrl.clone();
      url.pathname = `/${slug}${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // Custom domain (not root domain at all)
  if (!(isMainApp || host.endsWith(`.${ROOT_DOMAIN}`))) {
    const url = request.nextUrl.clone();
    url.pathname = `/_custom-domain${pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("x-custom-domain", host);
    return response;
  }

  // --- Auth redirects (main app only) ---

  const sessionCookie = getSessionCookie(request);
  const isAuthenticated = Boolean(sessionCookie);

  if (isAuthenticated) {
    // Homepage: redirect authenticated users to dashboard
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

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
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next|static|favicon.ico|ingest|sw.js|robots.txt|llms.txt|downloads|logos|r|widget|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
