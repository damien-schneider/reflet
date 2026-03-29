import { env } from "@reflet/env/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Redirect to GitHub App installation page.
 * userId is required (user-level connection).
 * organizationId/orgSlug are optional (for redirect-back after install).
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const organizationId = searchParams.get("organizationId");
  const orgSlug = searchParams.get("orgSlug");
  const returnTo = searchParams.get("returnTo");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const githubAppSlug = env.GITHUB_APP_SLUG;

  if (!githubAppSlug) {
    return NextResponse.json(
      { error: "GitHub App not configured" },
      { status: 500 }
    );
  }

  const state = Buffer.from(
    JSON.stringify({
      userId,
      organizationId,
      orgSlug,
      returnTo,
      timestamp: Date.now(),
    })
  ).toString("base64url");

  // Store context in cookies (backup in case state doesn't survive the redirect)
  const cookieStore = await cookies();
  cookieStore.set("github_oauth_user_id", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  if (organizationId) {
    cookieStore.set("github_oauth_org_id", organizationId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });
  }

  const installUrl = `https://github.com/apps/${githubAppSlug}/installations/new?state=${state}`;

  return NextResponse.redirect(installUrl);
}
