import { randomUUID } from "node:crypto";
import { env } from "@reflet/env/server";
import { NextResponse } from "next/server";
import { writeConnectContext } from "../connect-context";

/**
 * Redirect to the GitHub App installation page. The connection is bound to the
 * session on the callback, so no user id travels through GitHub.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "same-site") {
    return NextResponse.json(
      { error: "GitHub connection must start from Reflet" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);

  const githubAppSlug = env.GITHUB_APP_SLUG;

  if (!githubAppSlug) {
    return NextResponse.json(
      { error: "GitHub App not configured" },
      { status: 500 }
    );
  }

  const nonce = randomUUID();
  await writeConnectContext({
    installationId: null,
    nonce,
    organizationId: searchParams.get("organizationId"),
    orgSlug: searchParams.get("orgSlug"),
    returnTo: searchParams.get("returnTo"),
    setupAction: null,
  });

  const installUrl = new URL(
    `https://github.com/apps/${githubAppSlug}/installations/new`
  );
  installUrl.searchParams.set("state", nonce);

  return NextResponse.redirect(installUrl);
}
