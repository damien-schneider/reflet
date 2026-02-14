import { api } from "@reflet/backend/convex/_generated/api";
import { env } from "@reflet/env/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { toOrgId } from "@/lib/convex-helpers";

/**
 * GitHub App installation callback handler
 * This is called after a user installs the GitHub App
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");
  const stateParam = searchParams.get("state");

  if (!installationId) {
    return NextResponse.redirect(
      new URL("/dashboard?error=missing_installation_id", request.url)
    );
  }

  // Try to get organization ID and slug from state parameter first (more reliable)
  // Fall back to cookie if state is not available
  let organizationId: string | null = null;
  let orgSlug: string | null = null;

  if (stateParam) {
    try {
      const stateData = JSON.parse(
        Buffer.from(stateParam, "base64url").toString()
      ) as { organizationId: string; orgSlug: string; timestamp: number };
      organizationId = stateData.organizationId;
      orgSlug = stateData.orgSlug;
    } catch {
      // State parsing failed, fall back to cookie
    }
  }

  // Fall back to cookie for organizationId
  const cookieStore = await cookies();
  if (!organizationId) {
    const orgIdCookie = cookieStore.get("github_oauth_org_id");
    organizationId = orgIdCookie?.value ?? null;
  }

  if (!organizationId) {
    return NextResponse.redirect(
      new URL("/dashboard?error=missing_org_context", request.url)
    );
  }

  // Clear the cookie
  cookieStore.delete("github_oauth_org_id");

  try {
    // Fetch installation details from GitHub
    const appId = env.GITHUB_APP_ID;
    const privateKey = env.GITHUB_APP_PRIVATE_KEY;

    if (!(appId && privateKey)) {
      throw new Error("GitHub App credentials not configured");
    }

    // Create JWT for GitHub App authentication
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,
      exp: now + 600,
      iss: appId,
    };

    const crypto = await import("node:crypto");
    const header = Buffer.from(
      JSON.stringify({ alg: "RS256", typ: "JWT" })
    ).toString("base64url");
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString(
      "base64url"
    );
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(`${header}.${payloadBase64}`);
    const signature = sign.sign(privateKey.replace(/\\n/g, "\n"), "base64url");
    const jwt = `${header}.${payloadBase64}.${signature}`;

    // Get installation details
    const installationResponse = await fetch(
      `https://api.github.com/app/installations/${installationId}`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!installationResponse.ok) {
      throw new Error(
        `Failed to fetch installation: ${installationResponse.statusText}`
      );
    }

    const installation = (await installationResponse.json()) as {
      account: {
        login: string;
        type: string;
        avatar_url: string;
      };
    };

    // Save the installation to the database using fetchAction
    // (actions don't require user auth, and we've already verified the installation via GitHub's API)
    const { fetchAction } = await import("convex/nextjs");
    await fetchAction(api.github_actions.saveInstallationFromCallback, {
      organizationId: toOrgId(organizationId),
      installationId,
      accountType:
        installation.account.type === "Organization" ? "organization" : "user",
      accountLogin: installation.account.login,
      accountAvatarUrl: installation.account.avatar_url,
    });

    // Build redirect URL using the org slug from state
    const redirectPath = orgSlug
      ? `/dashboard/${orgSlug}/settings/github`
      : "/dashboard";

    const redirectUrl = new URL(redirectPath, request.url);
    redirectUrl.searchParams.set("success", "connected");
    if (setupAction === "install") {
      redirectUrl.searchParams.set("step", "select_repo");
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("GitHub callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/dashboard?error=github_connection_failed&message=${encodeURIComponent(
          error instanceof Error ? error.message : "Unknown error"
        )}`,
        request.url
      )
    );
  }
}
