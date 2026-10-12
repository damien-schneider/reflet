import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { httpAction } from "../../_generated/server";
import { DEVTOOLS_TOKEN_PREFIX } from "../../devtools/constants";
import { hashSecretKey } from "../../feedback/api_auth";
import { SESSION_MEMBER_REQUIRED } from "../../sessions/constants";
import { TEAM_TOKEN_PREFIX } from "../../team_access/constants";
import { errorResponse } from "../helpers";
import { verifyDevtoolsToken } from "../public_api/auth";

type ActionCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

export interface SessionMember {
  credential:
    | { devtoolsTokenId: Id<"devtoolsTokens"> }
    | { teamTokenId: Id<"teamAccessTokens"> };
  organizationId: Id<"organizations">;
  userId: string;
}

type MemberAuthentication =
  | { success: true; auth: SessionMember }
  | { success: false; response: Response };

const INVALID_TEAM_TOKEN =
  "Your Reflet team sign-in expired. Sign in again to keep recording sessions.";

async function authenticateTeamToken(
  ctx: ActionCtx,
  request: Request,
  token: string
): Promise<MemberAuthentication> {
  const origin = request.headers.get("Origin");
  const member = origin
    ? await ctx.runQuery(internal.team_access.tokens.validateTeamToken, {
        origin,
        tokenHash: await hashSecretKey(token),
      })
    : null;
  if (!member) {
    return { response: errorResponse(INVALID_TEAM_TOKEN, 401), success: false };
  }
  await ctx.runMutation(internal.team_access.tokens.touchTeamToken, {
    teamTokenId: member.teamTokenId,
  });
  return {
    auth: {
      credential: { teamTokenId: member.teamTokenId },
      organizationId: member.organizationId,
      userId: member.userId,
    },
    success: true,
  };
}

export async function authenticateSessionMember(
  ctx: ActionCtx,
  request: Request
): Promise<MemberAuthentication> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      response: errorResponse("Missing or invalid Authorization header", 401),
      success: false,
    };
  }
  const token = authHeader.slice("Bearer ".length);
  if (token.startsWith(TEAM_TOKEN_PREFIX)) {
    return await authenticateTeamToken(ctx, request, token);
  }
  if (!token.startsWith(DEVTOOLS_TOKEN_PREFIX)) {
    return {
      response: errorResponse(SESSION_MEMBER_REQUIRED, 403),
      success: false,
    };
  }
  const verified = await verifyDevtoolsToken(ctx, request, token);
  if (!verified.success) {
    return verified;
  }
  const { devtoolsTokenId, organizationId, userId } = verified.member;
  return {
    auth: { credential: { devtoolsTokenId }, organizationId, userId },
    success: true,
  };
}
