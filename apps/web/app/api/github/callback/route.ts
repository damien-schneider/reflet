import { api } from "@reflet/backend/convex/_generated/api";
import { env } from "@reflet/env/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { toOrgId } from "@/lib/convex-helpers";

interface CallbackState {
  organizationId: string | null;
  orgSlug: string | null;
  returnTo: string | null;
  userId: string | null;
}

function parseStateParam(stateParam: string | null): CallbackState {
  const state: CallbackState = {
    userId: null,
    organizationId: null,
    orgSlug: null,
    returnTo: null,
  };

  if (!stateParam) {
    return state;
  }

  try {
    const stateData = JSON.parse(
      Buffer.from(stateParam, "base64url").toString()
    ) as {
      userId?: string;
      organizationId?: string;
      orgSlug?: string;
      returnTo?: string;
      timestamp: number;
    };
    state.userId = stateData.userId ?? null;
    state.organizationId = stateData.organizationId ?? null;
    state.orgSlug = stateData.orgSlug ?? null;
    state.returnTo = stateData.returnTo ?? null;
  } catch {
    // State parsing failed, caller will fall back to cookies
  }

  return state;
}

async function createGitHubAppJwt(
  appId: string,
  privateKey: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now - 60, exp: now + 600, iss: appId };

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
  return `${header}.${payloadBase64}.${signature}`;
}

function buildRedirectUrl(
  requestUrl: string,
  orgSlug: string | null,
  returnTo: string | null,
  setupAction: string | null
): URL {
  let redirectPath: string;
  if (orgSlug && returnTo === "setup") {
    redirectPath = `/dashboard/${orgSlug}/setup`;
  } else if (orgSlug) {
    redirectPath = `/dashboard/${orgSlug}/settings/github`;
  } else {
    redirectPath = "/dashboard";
  }

  const redirectUrl = new URL(redirectPath, requestUrl);
  redirectUrl.searchParams.set("success", "connected");
  if (setupAction === "install") {
    redirectUrl.searchParams.set("step", "select_repo");
  }
  return redirectUrl;
}

/**
 * GitHub App installation callback handler
 * Creates a user-level GitHub connection and optionally links to an org
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");

  if (!installationId) {
    return NextResponse.redirect(
      new URL("/dashboard?error=missing_installation_id", request.url)
    );
  }

  const state = parseStateParam(searchParams.get("state"));

  // Fall back to cookies for missing state values
  const cookieStore = await cookies();
  if (!state.userId) {
    state.userId = cookieStore.get("github_oauth_user_id")?.value ?? null;
  }
  if (!state.organizationId) {
    state.organizationId =
      cookieStore.get("github_oauth_org_id")?.value ?? null;
  }

  if (!state.userId) {
    return NextResponse.redirect(
      new URL("/dashboard?error=missing_user_context", request.url)
    );
  }

  cookieStore.delete("github_oauth_user_id");
  cookieStore.delete("github_oauth_org_id");

  try {
    const appId = env.GITHUB_APP_ID;
    const privateKey = env.GITHUB_APP_PRIVATE_KEY;

    if (!(appId && privateKey)) {
      throw new Error("GitHub App credentials not configured");
    }

    const jwt = await createGitHubAppJwt(appId, privateKey);

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
      account: { login: string; type: string; avatar_url: string };
    };

    const { fetchAction } = await import("convex/nextjs");
    await fetchAction(
      api.integrations.github.actions.saveInstallationFromCallback,
      {
        userId: state.userId,
        installationId,
        accountType:
          installation.account.type === "Organization"
            ? "organization"
            : "user",
        accountLogin: installation.account.login,
        accountAvatarUrl: installation.account.avatar_url,
        organizationId: state.organizationId
          ? toOrgId(state.organizationId)
          : undefined,
      }
    );

    const redirectUrl = buildRedirectUrl(
      request.url,
      state.orgSlug,
      state.returnTo,
      setupAction
    );
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
