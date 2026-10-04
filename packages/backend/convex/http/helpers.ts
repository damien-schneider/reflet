import { internal } from "../_generated/api";
import type { Id, TableNames } from "../_generated/dataModel";
import { httpAction } from "../_generated/server";
import type { ApiCredential } from "./public_api/auth";

// ============================================
// TYPES
// ============================================

type ActionCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

export interface ApiRequestActor {
  credential: ApiCredential;
  organizationId: Id<"organizations">;
}

export type AdminAuth = ApiRequestActor;

type AuthenticationOutcome<TAuth> =
  | { success: true; auth: TAuth }
  | { success: false; response: Response };

// ============================================
// RESPONSE HELPERS
// ============================================

const CORS_HEADERS = {
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-User-Token, X-Visitor-Id",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Max-Age": "86400",
} as const;

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    status,
  });
}

export function errorResponse(error: string, status = 400): Response {
  return jsonResponse({ error }, status);
}

const CONVEX_UNCAUGHT_PREFIX_PATTERN = /^Uncaught \w*Error: /;

/** Keeps the thrown message but drops the stack Convex appends across function boundaries. */
export function clientErrorMessage(error: unknown): string {
  const firstLine =
    error instanceof Error ? (error.message.split("\n")[0] ?? "") : "";
  return (
    firstLine.replace(CONVEX_UNCAUGHT_PREFIX_PATTERN, "") ||
    "Internal server error"
  );
}

export function corsPreflightResponse(): Response {
  return new Response(null, { headers: CORS_HEADERS, status: 204 });
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
    return;
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

// `_storage` is a system table, so it is outside TableNames.
export function parseStorageId(
  value: string | null | undefined,
  fieldName: string
): Id<"_storage"> {
  if (!value) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  return value as Id<"_storage">;
}

export function optionalStorageId(
  value: string | null | undefined
): Id<"_storage"> | undefined {
  return value ? (value as Id<"_storage">) : undefined;
}

// ============================================
// JSON BODY PARSER
// ============================================

export async function parseJsonBody(
  request: Request
): Promise<
  | { success: true; body: Record<string, unknown> }
  | { success: false; response: Response }
> {
  try {
    const raw: unknown = await request.json();
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return {
        response: errorResponse("Invalid JSON body", 400),
        success: false,
      };
    }
    return { body: raw as Record<string, unknown>, success: true };
  } catch {
    return {
      response: errorResponse("Invalid JSON body", 400),
      success: false,
    };
  }
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

  if (!validation.isSecretKey) {
    return {
      response: errorResponse(
        "Admin API requires a secret key (fb_sec_*)",
        403
      ),
      success: false,
    };
  }

  // Fire-and-forget: non-critical last-used timestamp update
  ctx.runMutation(internal.feedback.api_keys.updateOrganizationApiKeyLastUsed, {
    apiKeyId: validation.organizationApiKeyId,
  });

  return {
    auth: {
      credential: { organizationApiKeyId: validation.organizationApiKeyId },
      organizationId: validation.organizationId,
    },
    success: true,
  };
}

// ============================================
// ROUTE FACTORIES
// ============================================

const recordFailedApiRequest = async (
  ctx: ActionCtx,
  request: Request,
  actor: ApiRequestActor,
  response: Response
): Promise<void> => {
  if (response.status < 400) {
    return;
  }
  await ctx.runMutation(internal.feedback.api_auth.logApiRequest, {
    ...actor.credential,
    endpoint: new URL(request.url).pathname,
    method: request.method,
    organizationId: actor.organizationId,
    statusCode: response.status,
    userAgent: request.headers.get("User-Agent") ?? undefined,
  });
};

export function apiRoute<TAuth extends ApiRequestActor>(
  authenticate: (
    ctx: ActionCtx,
    request: Request
  ) => Promise<AuthenticationOutcome<TAuth>>,
  respond: (ctx: ActionCtx, request: Request, auth: TAuth) => Promise<Response>
): ReturnType<typeof httpAction> {
  return httpAction(async (ctx, request) => {
    let auth: TAuth;
    try {
      const authResult = await authenticate(ctx, request);
      if (!authResult.success) {
        return authResult.response;
      }
      auth = authResult.auth;
    } catch (error) {
      return errorResponse(clientErrorMessage(error), 500);
    }

    let response: Response;
    try {
      response = await respond(ctx, request, auth);
    } catch (error) {
      response = errorResponse(clientErrorMessage(error), 500);
    }
    await recordFailedApiRequest(ctx, request, auth, response);
    return response;
  });
}

export function adminGet(
  handler: (ctx: ActionCtx, auth: AdminAuth, url: URL) => Promise<unknown>
): ReturnType<typeof httpAction> {
  return apiRoute(authenticateAdminRequest, async (ctx, request, auth) => {
    const data = await handler(ctx, auth, new URL(request.url));
    if (data === null) {
      return errorResponse("Not found", 404);
    }
    return jsonResponse(data);
  });
}

export function adminPost(
  handler: (
    ctx: ActionCtx,
    auth: AdminAuth,
    body: Record<string, unknown>
  ) => Promise<unknown>
): ReturnType<typeof httpAction> {
  return apiRoute(authenticateAdminRequest, async (ctx, request, auth) => {
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    return jsonResponse(await handler(ctx, auth, bodyResult.body));
  });
}

export function corsOptionsHandler(): ReturnType<typeof httpAction> {
  return httpAction(async () => corsPreflightResponse());
}
