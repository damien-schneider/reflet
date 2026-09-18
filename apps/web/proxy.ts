import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { agentOverviewResponse } from "@/lib/agents/overview-response";

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

  const host = hostname.split(":")[0];

  const isMainApp =
    host === `www.${ROOT_DOMAIN}` ||
    host === ROOT_DOMAIN ||
    host === "localhost" ||
    host === "127.0.0.1";

  if (!isMainApp && host.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = host.replace(`.${ROOT_DOMAIN}`, "");

    if (!slug.includes(".")) {
      const url = request.nextUrl.clone();
      url.pathname = `/${slug}${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  if (!(isMainApp || host.endsWith(`.${ROOT_DOMAIN}`))) {
    const url = request.nextUrl.clone();
    url.pathname = `/_custom-domain${pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("x-custom-domain", host);
    return response;
  }

  const sessionCookie = getSessionCookie(request);
  const isAuthenticated = Boolean(sessionCookie);

  if (isAuthenticated) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (TOKEN_BASED_AUTH_PAGES.some((page) => pathname.startsWith(page))) {
      if (!searchParams.has("token")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return NextResponse.next();
    }

    if (AUTH_PAGES.some((page) => pathname.startsWith(page))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return agentOverviewResponse(request) ?? NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next|static|favicon.ico|ingest|sw.js|robots.txt|llms.txt|downloads|logos|r|widget|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
