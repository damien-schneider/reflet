import { api } from "@reflet/backend/convex/_generated/api";
import { NextResponse } from "next/server";
import { fetchAuthAction } from "@/lib/auth-server";
import { toOrgId } from "@/lib/convex-helpers";
import {
  clearConnectContext,
  type GithubConnectContext,
  readConnectContext,
} from "../connect-context";
import {
  exchangeCodeForUserToken,
  redirectToAppInstallation,
  requestUserAuthorization,
} from "../connect-flow";

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
 * user's own GitHub token proves access to it. Without one, the backend picks
 * among the installations that token can access, so accounts that already have
 * the app installed never need GitHub's install page.
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

  if (context.setupAction === "request") {
    await clearConnectContext();
    return redirectWithError(
      request.url,
      "github_connection_failed",
      "An organization owner must approve the Reflet App installation first"
    );
  }

  const code = searchParams.get("code");
  const isCodeForThisBrowser = code !== null && isStateForThisBrowser;

  try {
    if (!isCodeForThisBrowser) {
      return await requestUserAuthorization(request.url, context);
    }

    const githubUserToken = await exchangeCodeForUserToken(code, request.url);
    const connection = await fetchAuthAction(
      api.integrations.github.actions.connectInstallation,
      {
        githubUserToken,
        installationId: context.installationId ?? undefined,
        organizationId: context.organizationId
          ? toOrgId(context.organizationId)
          : undefined,
      }
    );
    if (connection.status === "needs_installation") {
      return await redirectToAppInstallation(context);
    }

    await clearConnectContext();
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
