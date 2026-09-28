import type { HttpRouter } from "convex/server";
import { z } from "zod";
import { internal } from "../_generated/api";
import { httpAction } from "../_generated/server";
import { DEVTOOLS_TOKEN_PREFIX } from "../devtools/constants";
import { pkceChallengeFor } from "../devtools/pkce";
import { hashSecretKey } from "../feedback/api_auth";
import { randomSecretHex } from "../shared/hmac";
import { errorResponse, jsonResponse } from "./helpers";
import { readJsonBody } from "./public_api/route";

const INVALID_CONNECT_CODE =
  "This connect code is invalid or has expired. Start again from the devtools Board tab.";

const tokenExchangeSchema = z.object({
  code: z.string().min(1).max(200),
  codeVerifier: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
  redirectUri: z.string().max(500),
});

function hostOf(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function registerDevtoolsRoutes(http: HttpRouter): void {
  http.route({
    handler: httpAction(async (ctx, request) => {
      const parsed = await readJsonBody(request, tokenExchangeSchema);
      if (!parsed.success) {
        return parsed.response;
      }
      const { code, codeVerifier, redirectUri } = parsed.data;
      const label = hostOf(redirectUri);
      if (!label) {
        return errorResponse(INVALID_CONNECT_CODE, 400);
      }

      const token = `${DEVTOOLS_TOKEN_PREFIX}${randomSecretHex(32)}`;
      const result = await ctx.runMutation(
        internal.devtools.connect.redeemConnectCode,
        {
          codeChallenge: await pkceChallengeFor(codeVerifier),
          codeHash: await hashSecretKey(code),
          label,
          redirectUri,
          tokenHash: await hashSecretKey(token),
        }
      );
      if (!result.ok) {
        return errorResponse(INVALID_CONNECT_CODE, 400);
      }
      const response = jsonResponse({
        organizationName: result.organizationName,
        token,
      });
      response.headers.set("Cache-Control", "no-store");
      return response;
    }),
    method: "POST",
    path: "/api/v1/devtools/token",
  });

  http.route({
    handler: httpAction(async (ctx, request) => {
      const authHeader = request.headers.get("Authorization") ?? "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!token.startsWith(DEVTOOLS_TOKEN_PREFIX)) {
        return errorResponse("Missing devtools token", 401);
      }
      await ctx.runMutation(internal.devtools.tokens.revokeByHash, {
        tokenHash: await hashSecretKey(token),
      });
      return jsonResponse({ revoked: true });
    }),
    method: "POST",
    path: "/api/v1/devtools/revoke",
  });
}
