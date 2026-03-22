import { internal } from "../_generated/api";
import type { Id, TableNames } from "../_generated/dataModel";
import { httpAction } from "../_generated/server";

// ============================================
// TYPES
// ============================================

type ActionCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

export interface AdminAuth {
  organizationId: Id<"organizations">;
}

// ============================================
// RESPONSE HELPERS
// ============================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export function errorResponse(error: string, status = 400): Response {
  return jsonResponse({ error }, status);
}

function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ============================================
// VALUE EXTRACTORS
// ============================================

export function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function num(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function bool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function strArr(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.every((v): v is string => typeof v === "string")
    ? value
    : undefined;
}

export function parseId<T extends TableNames>(
  value: string | null | undefined,
  fieldName: string
): Id<T> {
  if (!value) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  return value as Id<T>;
}

export function requireStr(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  return value;
}

export function optionalId<T extends TableNames>(
  value: unknown
): Id<T> | undefined {
  return typeof value === "string" && value ? (value as Id<T>) : undefined;
}

// ============================================
// AUTH HELPER
// ============================================

async function authenticateAdminRequest(
  ctx: ActionCtx,
  request: Request
): Promise<
  { success: true; auth: AdminAuth } | { success: false; response: Response }
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
      success: false,
      response: errorResponse(validation.error ?? "Invalid API key", 401),
    };
  }

  if (!validation.isSecretKey) {
    return {
      success: false,
      response: errorResponse(
        "Admin API requires a secret key (fb_sec_*)",
        403
      ),
    };
  }

  // Fire-and-forget: non-critical last-used timestamp update
  ctx.runMutation(internal.feedback.api_auth.updateOrganizationApiKeyLastUsed, {
    apiKeyId: validation.organizationApiKeyId,
  });

  return {
    success: true,
    auth: { organizationId: validation.organizationId },
  };
}

// ============================================
// ROUTE FACTORIES
// ============================================

export function adminGet(
  handler: (ctx: ActionCtx, auth: AdminAuth, url: URL) => Promise<unknown>
): ReturnType<typeof httpAction> {
  return httpAction(async (ctx, request) => {
    try {
      const authResult = await authenticateAdminRequest(ctx, request);
      if (!authResult.success) {
        return authResult.response;
      }

      const url = new URL(request.url);
      const data = await handler(ctx, authResult.auth, url);
      if (data === null) {
        return errorResponse("Not found", 404);
      }
      return jsonResponse(data);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Internal server error",
        500
      );
    }
  });
}

export function adminPost(
  handler: (
    ctx: ActionCtx,
    auth: AdminAuth,
    body: Record<string, unknown>
  ) => Promise<unknown>
): ReturnType<typeof httpAction> {
  return httpAction(async (ctx, request) => {
    try {
      const authResult = await authenticateAdminRequest(ctx, request);
      if (!authResult.success) {
        return authResult.response;
      }

      let body: Record<string, unknown>;
      try {
        const raw: unknown = await request.json();
        if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
          return errorResponse("Invalid JSON body", 400);
        }
        body = raw as Record<string, unknown>;
      } catch {
        return errorResponse("Invalid JSON body", 400);
      }

      const data = await handler(ctx, authResult.auth, body);
      return jsonResponse(data);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Internal server error",
        500
      );
    }
  });
}

export function corsOptionsHandler(): ReturnType<typeof httpAction> {
  return httpAction(async () => corsPreflightResponse());
}
