import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Redirect to GitHub App installation page
 * Stores the organization ID in a cookie for the callback
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");

  if (!organizationId) {
    return NextResponse.json(
      { error: "Organization ID is required" },
      { status: 400 }
    );
  }

  const githubAppSlug = process.env.GITHUB_APP_SLUG;

  if (!githubAppSlug) {
    return NextResponse.json(
      { error: "GitHub App not configured" },
      { status: 500 }
    );
  }

  // Store org ID in cookie for callback
  const cookieStore = await cookies();
  cookieStore.set("github_oauth_org_id", organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  // Redirect to GitHub App installation page
  const installUrl = `https://github.com/apps/${githubAppSlug}/installations/new`;

  return NextResponse.redirect(installUrl);
}
