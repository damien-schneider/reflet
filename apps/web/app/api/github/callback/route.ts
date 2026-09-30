import { randomUUID } from "node:crypto";
import { api } from "@reflet/backend/convex/_generated/api";
import { env } from "@reflet/env/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchAuthAction } from "@/lib/auth-server";
import { toOrgId } from "@/lib/convex-helpers";
import {
  clearConnectContext,
  type GithubConnectContext,
  readConnectContext,
  writeConnectContext,
} from "../connect-context";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";

const accessTokenResponseSchema = z.union([
  z.object({ access_token: z.string() }),
  z.object({ error: z.string(), error_description: z.string().optional() }),
]);

function githubAppOAuthCredentials(): {
  clientId: string;
  clientSecret: string;
} {
  const clientId = env.GITHUB_APP_CLIENT_ID;
  const clientSecret = env.GITHUB_APP_CLIENT_SECRET;
  if (!(clientId && clientSecret)) {
    throw new Error("GitHub App OAuth credentials not configured");
  }
  return { clientId, clientSecret };
}

/** GitHub rejects the code exchange unless both steps send the same URI. */
function authorizationRedirectUri(requestUrl: string): string {
  return new URL("/api/github/callback", requestUrl).toString();
}

async function requestUserAuthorization(
  requestUrl: string,
  context: GithubConnectContext
): Promise<NextResponse> {
  const { clientId } = githubAppOAuthCredentials();
  const nonce = randomUUID();
  await writeConnectContext({ ...context, nonce });

  const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set(
    "redirect_uri",
    authorizationRedirectUri(requestUrl)
  );
  authorizeUrl.searchParams.set("state", nonce);
  return NextResponse.redirect(authorizeUrl);
}

async function exchangeCodeForUserToken(
  code: string,
  requestUrl: string
): Promise<string> {
  const { clientId, clientSecret } = githubAppOAuthCredentials();
  const response = await fetch(GITHUB_ACCESS_TOKEN_URL, {
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: authorizationRedirectUri(requestUrl),
    }),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(
      `GitHub authorization failed with status ${response.status}`
    );
  }

  const result = accessTokenResponseSchema.parse(await response.json());
  if ("error" in result) {
    throw new Error(result.error_description ?? result.error);
  }
  return result.access_token;
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
    redirectPath = `/dashboard/${orgSlug}/project/github`;
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

function redirectWithError(
  requestUrl: string,
  error: string,
  message?: string
): NextResponse {
  const redirectUrl = new URL("/dashboard", requestUrl);
  redirectUrl.searchParams.set("error", error);
  if (message) {
    redirectUrl.searchParams.set("message", message);
  }
  return NextResponse.redirect(redirectUrl);
}

/**
 * GitHub App installation and user authorization callback. The installation id
 * GitHub appends is spoofable, so the connection is saved only after the
 * user's own GitHub token proves access to it.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const storedContext = await readConnectContext();
  if (!storedContext) {
    return redirectWithError(request.url, "github_connection_expired");
  }

  const githubError = searchParams.get("error");
  if (githubError) {
    await clearConnectContext();
    return redirectWithError(
      request.url,
      "github_connection_failed",
      searchParams.get("error_description") ?? githubError
    );
  }

  const isStateForThisBrowser =
    searchParams.get("state") === storedContext.nonce;
  const context: GithubConnectContext = isStateForThisBrowser
    ? {
        ...storedContext,
        installationId:
          searchParams.get("installation_id") ?? storedContext.installationId,
        setupAction:
          searchParams.get("setup_action") ?? storedContext.setupAction,
      }
    : storedContext;
  if (!context.installationId) {
    await clearConnectContext();
    return redirectWithError(request.url, "missing_installation_id");
  }

  const code = searchParams.get("code");
  const isCodeForThisBrowser = code !== null && isStateForThisBrowser;

  try {
    if (!isCodeForThisBrowser) {
      return await requestUserAuthorization(request.url, context);
    }

    await clearConnectContext();
    const githubUserToken = await exchangeCodeForUserToken(code, request.url);
    await fetchAuthAction(api.integrations.github.actions.connectInstallation, {
      githubUserToken,
      installationId: context.installationId,
      organizationId: context.organizationId
        ? toOrgId(context.organizationId)
        : undefined,
    });

    return NextResponse.redirect(
      buildRedirectUrl(
        request.url,
        context.orgSlug,
        context.returnTo,
        context.setupAction
      )
    );
  } catch (error) {
    console.error("GitHub callback error:", error);
    await clearConnectContext();
    return redirectWithError(
      request.url,
      "github_connection_failed",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
