import { env } from "@reflet/env/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const INSTALL_CONTEXT_MAX_AGE_SECONDS = 60 * 10;

/**
 * Redirect to GitHub App installation page.
 * The connection is bound to the session on the callback, so no user id travels
 * through the state parameter.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  const orgSlug = searchParams.get("orgSlug");
  const returnTo = searchParams.get("returnTo");

  const githubAppSlug = env.GITHUB_APP_SLUG;

  if (!githubAppSlug) {
    return NextResponse.json(
      { error: "GitHub App not configured" },
      { status: 500 }
    );
  }

  const state = Buffer.from(
    JSON.stringify({
      organizationId,
      orgSlug,
      returnTo,
      timestamp: Date.now(),
    })
  ).toString("base64url");

  // Backup in case the state parameter does not survive the redirect
  if (organizationId) {
    const cookieStore = await cookies();
    cookieStore.set("github_oauth_org_id", organizationId, {
      httpOnly: true,
      maxAge: INSTALL_CONTEXT_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  const installUrl = `https://github.com/apps/${githubAppSlug}/installations/new?state=${state}`;

  return NextResponse.redirect(installUrl);
}
