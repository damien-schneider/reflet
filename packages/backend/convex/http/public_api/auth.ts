import { internal } from "../../_generated/api";
import type { Id, TableNames } from "../../_generated/dataModel";
import type { httpAction } from "../../_generated/server";
import {
  DEVTOOLS_TOKEN_API_PATHS,
  DEVTOOLS_TOKEN_PREFIX,
} from "../../devtools/constants";
import { hashSecretKey } from "../../feedback/api_auth";
import { verifyUserToken } from "../../feedback/user_token";
import { rateLimiter } from "../../shared/rate_limits";
import { errorResponse } from "../helpers";

export type PublicApiCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

export type ApiCredential =
  | { organizationApiKeyId: Id<"organizationApiKeys"> }
  | { devtoolsTokenId: Id<"devtoolsTokens"> };

export interface ApiAuthContext {
  credential: ApiCredential;
  /** Set only for a server-signed token — required to vote, comment, subscribe. */
  externalUserId?: Id<"externalUsers">;
  /** Secret keys and devtools tokens: private orgs, internal notes, private fields. */
  hasPrivateAccess: boolean;
  memberUserId?: string;
  organizationId: Id<"organizations">;
  /** Client-asserted identity: good enough to attribute a report, nothing else. */
  unverifiedExternalUserId?: Id<"externalUsers">;
}

export type AccessCheck =
  | { allowed: true; isPublic: boolean }
  | { allowed: false; response: Response };

export function parseEnumParam<T extends string>(
  value: string | null,
  validValues: readonly T[]
): T | undefined {
  return (validValues as readonly string[]).includes(value ?? "")
    ? (value as T)
    : undefined;
}

export function parseOptionalId<T extends TableNames>(
  value: string | null | undefined
): Id<T> | undefined {
  return value ? (value as Id<T>) : undefined;
}

export function parseIntParam(value: string | null): number | undefined {
  if (!value) {
    return;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

async function checkOrganizationExists(
  ctx: PublicApiCtx,
  organizationId: Id<"organizations">
): Promise<AccessCheck> {
  const org = await ctx.runQuery(
    internal.feedback.api_public.getOrganizationConfig,
    { organizationId }
  );

  if (!org) {
    return {
      allowed: false,
      response: errorResponse("Organization not found", 404),
    };
  }

  return { allowed: true, isPublic: org.isPublic ?? false };
}

export async function checkOrganizationAccess(
  ctx: PublicApiCtx,
  organizationId: Id<"organizations">,
  hasPrivateAccess: boolean
): Promise<AccessCheck> {
  const found = await checkOrganizationExists(ctx, organizationId);
  if (!found.allowed) {
    return found;
  }

  if (!(found.isPublic || hasPrivateAccess)) {
    return {
      allowed: false,
      response: errorResponse(
        "This organization is not public. Use a secret key for private access.",
        403
      ),
    };
  }

  return found;
}

type PublicKeyWriteLimit =
  | "publicApiScreenshotUploadPerPublicKey"
  | "publicApiSurveyAnswerPerPublicKey"
  | "publicApiSurveyStartPerPublicKey"
  | "publicApiWritePerPublicKey";

// Widget ingest: a public key may write into a private org, never read from it.
export async function checkWriteQuota(
  ctx: PublicApiCtx,
  auth: ApiAuthContext,
  publicKeyLimit: PublicKeyWriteLimit = "publicApiWritePerPublicKey"
): Promise<AccessCheck> {
  const found = await checkOrganizationExists(ctx, auth.organizationId);
  if (!found.allowed) {
    return found;
  }

  const { ok } = await rateLimiter.limit(
    ctx,
    auth.hasPrivateAccess ? "publicApiWritePerSecretKey" : publicKeyLimit,
    {
      key:
        "devtoolsTokenId" in auth.credential
          ? auth.credential.devtoolsTokenId
          : auth.credential.organizationApiKeyId,
    }
  );

  if (!ok) {
    return {
      allowed: false,
      response: errorResponse(
        "Too many requests from this key. Try again in a minute.",
        429
      ),
    };
  }

  return found;
}

type AuthenticationResult =
  | { success: true; auth: ApiAuthContext }
  | { success: false; response: Response };

async function authenticateDevtoolsToken(
  ctx: PublicApiCtx,
  request: Request,
  token: string
): Promise<AuthenticationResult> {
  const { pathname } = new URL(request.url);
  if (!DEVTOOLS_TOKEN_API_PATHS.some((path) => path === pathname)) {
    return {
      response: errorResponse(
        "Devtools tokens only reach the devtools endpoints.",
        403
      ),
      success: false,
    };
  }

  const validation = await ctx.runQuery(
    internal.devtools.tokens.validateDevtoolsToken,
    { tokenHash: await hashSecretKey(token) }
  );
  if (!validation) {
    return {
      response: errorResponse(
        "Invalid or expired devtools token. Reconnect from the devtools Board tab.",
        401
      ),
      success: false,
    };
  }

  await ctx.runMutation(internal.devtools.tokens.touchDevtoolsToken, {
    devtoolsTokenId: validation.devtoolsTokenId,
  });

  return {
    auth: {
      credential: { devtoolsTokenId: validation.devtoolsTokenId },
      hasPrivateAccess: true,
      memberUserId: validation.userId,
      organizationId: validation.organizationId,
    },
    success: true,
  };
}

export async function authenticateApiRequest(
  ctx: PublicApiCtx,
  request: Request
): Promise<AuthenticationResult> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      response: errorResponse("Missing or invalid Authorization header", 401),
      success: false,
    };
  }

  const apiKey = authHeader.slice(7);
  if (apiKey.startsWith(DEVTOOLS_TOKEN_PREFIX)) {
    return await authenticateDevtoolsToken(ctx, request, apiKey);
  }

  const validation = await ctx.runQuery(
    internal.feedback.api_auth.validateApiKey,
    { apiKey }
  );

  if (
    !(
      validation.success &&
      validation.organizationId &&
      validation.organizationApiKeyId
    )
  ) {
    return {
      response: errorResponse(validation.error ?? "Invalid API key", 401),
      success: false,
    };
  }

  const organizationId = validation.organizationId;
  const organizationApiKeyId = validation.organizationApiKeyId;
  const hasPrivateAccess = validation.isSecretKey ?? false;

  await ctx.runMutation(
    internal.feedback.api_keys.updateOrganizationApiKeyLastUsed,
    { apiKeyId: organizationApiKeyId }
  );

  const userToken = request.headers.get("X-User-Token");
  let externalUserId: Id<"externalUsers"> | undefined;
  let unverifiedExternalUserId: Id<"externalUsers"> | undefined;

  if (userToken) {
    const decoded = await verifyUserToken(
      userToken,
      validation.secretKeyHash ?? ""
    );
    if (decoded) {
      const resolvedId = await ctx.runMutation(
        internal.feedback.api_auth.getOrCreateExternalUser,
        {
          email: decoded.user.email,
          externalId: decoded.user.id,
          name: decoded.user.name,
          organizationId,
          verified: decoded.verified,
        }
      );
      if (decoded.verified) {
        externalUserId = resolvedId ?? undefined;
      } else {
        unverifiedExternalUserId = resolvedId ?? undefined;
      }
    }
  }

  return {
    auth: {
      credential: { organizationApiKeyId },
      externalUserId,
      hasPrivateAccess,
      organizationId,
      unverifiedExternalUserId,
    },
    success: true,
  };
}
