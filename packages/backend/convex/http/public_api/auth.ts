import { internal } from "../../_generated/api";
import type { Id, TableNames } from "../../_generated/dataModel";
import type { httpAction } from "../../_generated/server";
import { verifyUserToken } from "../../feedback/user_token";
import { errorResponse } from "../helpers";

export type PublicApiCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

const PUBLIC_KEY_WRITES_PER_MINUTE = 30;
const SECRET_KEY_WRITES_PER_MINUTE = 300;

export interface ApiAuthContext {
  /** Set only for a server-signed token — required to vote, comment, subscribe. */
  externalUserId?: Id<"externalUsers">;
  isSecretKey: boolean;
  organizationApiKeyId: Id<"organizationApiKeys">;
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
  isSecretKey: boolean
): Promise<AccessCheck> {
  const found = await checkOrganizationExists(ctx, organizationId);
  if (!found.allowed) {
    return found;
  }

  if (!(found.isPublic || isSecretKey)) {
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

// Widget ingest: a public key may write into a private org, never read from it.
export async function checkWriteQuota(
  ctx: PublicApiCtx,
  auth: ApiAuthContext
): Promise<AccessCheck> {
  const found = await checkOrganizationExists(ctx, auth.organizationId);
  if (!found.allowed) {
    return found;
  }

  const quota = await ctx.runQuery(internal.feedback.api_auth.checkRateLimit, {
    maxRequests: auth.isSecretKey
      ? SECRET_KEY_WRITES_PER_MINUTE
      : PUBLIC_KEY_WRITES_PER_MINUTE,
    organizationApiKeyId: auth.organizationApiKeyId,
  });

  if (!quota.allowed) {
    return {
      allowed: false,
      response: errorResponse(
        "Too many reports from this key. Try again in a minute.",
        429
      ),
    };
  }

  return found;
}

export async function authenticateApiRequest(
  ctx: PublicApiCtx,
  request: Request
): Promise<
  | { success: true; auth: ApiAuthContext }
  | { success: false; response: Response }
> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      response: errorResponse("Missing or invalid Authorization header", 401),
      success: false,
    };
  }

  const apiKey = authHeader.slice(7);
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
  const isSecretKey = validation.isSecretKey ?? false;

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
      const externalUser = await ctx.runMutation(
        internal.feedback.api_auth.getOrCreateExternalUser,
        {
          email: decoded.user.email,
          externalId: decoded.user.id,
          name: decoded.user.name,
          organizationId,
        }
      );
      if (decoded.verified) {
        externalUserId = externalUser.externalUserId;
      } else {
        unverifiedExternalUserId = externalUser.externalUserId;
      }
    }
  }

  return {
    auth: {
      externalUserId,
      isSecretKey,
      organizationApiKeyId,
      organizationId,
      unverifiedExternalUserId,
    },
    success: true,
  };
}
