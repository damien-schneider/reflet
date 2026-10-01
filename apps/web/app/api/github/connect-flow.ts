import { randomUUID } from "node:crypto";
import { env } from "@reflet/env/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  type GithubConnectContext,
  writeConnectContext,
} from "./connect-context";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";

const accessTokenResponseSchema = z.union([
  z.object({ access_token: z.string() }),
  z.object({ error: z.string(), error_description: z.string().optional() }),
]);

type ConnectStep = Omit<GithubConnectContext, "nonce">;

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

export async function requestUserAuthorization(
  requestUrl: string,
  step: ConnectStep
): Promise<NextResponse> {
  const { clientId } = githubAppOAuthCredentials();
  const nonce = randomUUID();
  await writeConnectContext({ ...step, nonce });

  const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set(
    "redirect_uri",
    authorizationRedirectUri(requestUrl)
  );
  authorizeUrl.searchParams.set("state", nonce);
  return NextResponse.redirect(authorizeUrl);
}

export async function redirectToAppInstallation(
  step: ConnectStep
): Promise<NextResponse> {
  const githubAppSlug = env.GITHUB_APP_SLUG;
  if (!githubAppSlug) {
    throw new Error("GitHub App not configured");
  }
  const nonce = randomUUID();
  await writeConnectContext({ ...step, installationId: null, nonce });

  const installUrl = new URL(
    `https://github.com/apps/${githubAppSlug}/installations/new`
  );
  installUrl.searchParams.set("state", nonce);
  return NextResponse.redirect(installUrl);
}

export async function exchangeCodeForUserToken(
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
