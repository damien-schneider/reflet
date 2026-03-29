import { env } from "@reflet/env/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Redirect to GitHub App installation page
 * Now user-level: userId is required, organizationId/orgSlug are optional (for redirect-back)
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const organizationId = searchParams.get("organizationId");
  const orgSlug = searchParams.get("orgSlug");
  const returnTo = searchParams.get("returnTo");

  // userId is optional — when provided, we create a user-level GitHub connection
  // When absent (legacy callers), we fall back to org-level connection via organizationId

  const githubAppSlug = env.GITHUB_APP_SLUG;

  if (!githubAppSlug) {
    return NextResponse.json(
      { error: "GitHub App not configured" },
      { status: 500 }
    );
  }

  // Generate a state parameter for CSRF protection and to pass context
  const state = Buffer.from(
    JSON.stringify({
      userId,
      organizationId,
      orgSlug,
      returnTo,
      timestamp: Date.now(),
    })
  ).toString("base64url");

  // Store context in cookies for callback (backup in case state doesn't work)
  const cookieStore = await cookies();

  if (userId) {
    cookieStore.set("github_oauth_user_id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });
  }

  if (organizationId) {
    cookieStore.set("github_oauth_org_id", organizationId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });
  }

  // Redirect to GitHub App installation page with state parameter
  const installUrl = `https://github.com/apps/${githubAppSlug}/installations/new?state=${state}`;

  return NextResponse.redirect(installUrl);
}
