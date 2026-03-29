import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "reflet.app";

export const config = {
  matcher: [
    "/((?!api|_next|static|favicon.ico|ingest|sw.js|robots.txt|llms.txt|downloads|logos|r|widget).*)",
  ],
};

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  // Strip port for local dev
  const host = hostname.split(":")[0];

  // Case 1: Main app — pass through
  if (
    host === `www.${ROOT_DOMAIN}` ||
    host === ROOT_DOMAIN ||
    host === "localhost" ||
    host === "127.0.0.1"
  ) {
    return NextResponse.next();
  }

  // Case 2: Subdomain on root domain (e.g. {slug}.reflet.app)
  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = host.replace(`.${ROOT_DOMAIN}`, "");

    // Ignore multi-level subdomains
    if (slug.includes(".")) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = `/${slug}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Case 3: Custom domain — rewrite to /_custom-domain routes
  const url = request.nextUrl.clone();
  url.pathname = `/_custom-domain${pathname}`;
  const response = NextResponse.rewrite(url);
  response.headers.set("x-custom-domain", host);
  return response;
}
