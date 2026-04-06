import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { decodeUserToken } from "../../feedback/api_auth";
import { type ActionCtx, errorResponse } from "./api_helpers";

// ============================================
// TYPES
// ============================================

export interface ApiAuthContext {
  externalUserId?: Id<"externalUsers">;
  isSecretKey: boolean;
  organizationApiKeyId: Id<"organizationApiKeys">;
  organizationId: Id<"organizations">;
}

// ============================================
// ORGANIZATION ACCESS CHECK
// ============================================

export async function checkOrganizationAccess(
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  isSecretKey: boolean
): Promise<{ allowed: true } | { allowed: false; response: Response }> {
  const org = await ctx.runQuery(
    internal.feedback.api_public_queries.getOrganizationConfig,
    {
      organizationId,
    }
  );

  if (!org) {
    return {
      allowed: false,
      response: errorResponse("Organization not found", 404),
    };
  }

  if (!(org.isPublic || isSecretKey)) {
    return {
      allowed: false,
      response: errorResponse(
        "This organization is not public. Use a secret key for private access.",
        403
      ),
    };
  }

  return { allowed: true };
}

// ============================================
// API KEY AUTHENTICATION
// ============================================

export async function authenticateApiRequest(
  ctx: ActionCtx,
  request: Request
): Promise<
  | { success: true; auth: ApiAuthContext }
  | { success: false; response: Response }
> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      success: false,
      response: errorResponse("Missing or invalid Authorization header", 401),
    };
  }

  const apiKey = authHeader.slice(7);
  const validation = await ctx.runQuery(
    internal.feedback.api_auth.validateApiKey,
    {
      apiKey,
    }
  );

  if (
    !(
      validation.success &&
      validation.organizationId &&
      validation.organizationApiKeyId
    )
  ) {
    return {
      success: false,
      response: errorResponse(validation.error ?? "Invalid API key", 401),
    };
  }

  const organizationId = validation.organizationId;
  const organizationApiKeyId = validation.organizationApiKeyId;
  const isSecretKey = validation.isSecretKey ?? false;

  ctx.runMutation(internal.feedback.api_auth.updateOrganizationApiKeyLastUsed, {
    apiKeyId: organizationApiKeyId,
  });

  const userToken = request.headers.get("X-User-Token");
  let externalUserId: Id<"externalUsers"> | undefined;

  if (userToken) {
    const decoded = decodeUserToken(userToken);
    if (decoded) {
      const externalUser = await ctx.runMutation(
        internal.feedback.api_auth.getOrCreateExternalUser,
        {
          organizationId,
          externalId: decoded.id,
          email: decoded.email,
          name: decoded.name,
        }
      );
      externalUserId = externalUser.externalUserId;
    }
  }

  return {
    success: true,
    auth: {
      organizationId,
      organizationApiKeyId,
      isSecretKey,
      externalUserId,
    },
  };
}
