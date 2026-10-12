import type { HttpRouter } from "convex/server";
import { z } from "zod";
import { internal } from "../../_generated/api";
import { httpAction } from "../../_generated/server";
import { PKCE_CODE_VERIFIER, pkceChallengeFor } from "../../devtools/pkce";
import { hashSecretKey } from "../../feedback/api_auth";
import { randomSecretHex } from "../../shared/hmac";
import { TEAM_TOKEN_PREFIX } from "../../team_access/constants";
import { corsPreflightResponse, errorResponse, jsonResponse } from "../helpers";
import { readJsonBody } from "../public_api/route";

const TEAM_TOKEN_PATH = "/api/v1/team/token";
const TEAM_REVOKE_PATH = "/api/v1/team/revoke";

const INVALID_TEAM_CODE =
  "This sign-in code is invalid or has expired. Sign in again from your app.";

const tokenExchangeSchema = z.object({
  code: z.string().min(1).max(200),
  codeVerifier: z.string().regex(PKCE_CODE_VERIFIER),
});

const exchangeTeamCode = httpAction(async (ctx, request) => {
  const parsed = await readJsonBody(request, tokenExchangeSchema);
  if (!parsed.success) {
    return parsed.response;
  }
  const origin = request.headers.get("Origin") ?? "";
  const token = `${TEAM_TOKEN_PREFIX}${randomSecretHex(32)}`;
  const result = await ctx.runMutation(
    internal.team_access.connect.redeemCode,
    {
      codeChallenge: await pkceChallengeFor(parsed.data.codeVerifier),
      codeHash: await hashSecretKey(parsed.data.code),
      origin,
      tokenHash: await hashSecretKey(token),
    }
  );
  if (!result.ok) {
    return errorResponse(INVALID_TEAM_CODE, 400);
  }
  const response = jsonResponse({
    expiresAt: result.expiresAt,
    organizationName: result.organizationName,
    token,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
});

const revokeTeamToken = httpAction(async (ctx, request) => {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token.startsWith(TEAM_TOKEN_PREFIX)) {
    return errorResponse("Missing team token", 401);
  }
  await ctx.runMutation(internal.team_access.tokens.revokeByHash, {
    tokenHash: await hashSecretKey(token),
  });
  return jsonResponse({ revoked: true });
});

export function registerTeamAccessRoutes(http: HttpRouter): void {
  for (const path of [TEAM_TOKEN_PATH, TEAM_REVOKE_PATH]) {
    http.route({
      handler: httpAction(async () => corsPreflightResponse()),
      method: "OPTIONS",
      path,
    });
  }
  http.route({
    handler: exchangeTeamCode,
    method: "POST",
    path: TEAM_TOKEN_PATH,
  });
  http.route({
    handler: revokeTeamToken,
    method: "POST",
    path: TEAM_REVOKE_PATH,
  });
}
