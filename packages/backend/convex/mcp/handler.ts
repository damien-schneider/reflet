import { z } from "zod";
import { internal } from "../_generated/api";
import { httpAction } from "../_generated/server";
import { dispatch } from "./protocol";

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }
  // Query parameter fallback for clients that only support a URL
  const url = new URL(request.url);
  return url.searchParams.get("key");
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Expose-Headers": "WWW-Authenticate",
  "Access-Control-Max-Age": "86400",
} as const;

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function jsonRpcError(
  id: number | string | null,
  code: number,
  message: string
) {
  return { jsonrpc: "2.0" as const, id, error: { code, message } };
}

const jsonRpcRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.number(), z.string(), z.null()]).optional(),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const mcpHandler = httpAction(async (ctx, request) => {
  const token = extractBearerToken(request);
  if (!token) {
    return jsonResponse(
      jsonRpcError(null, -32_000, "Missing Authorization header"),
      401,
      { "WWW-Authenticate": "Bearer" }
    );
  }

  // Validate the API key
  const validation = await ctx.runQuery(
    internal.feedback.api_auth.validateApiKey,
    { apiKey: token }
  );

  if (
    !(
      validation.success &&
      validation.organizationId &&
      validation.organizationApiKeyId
    )
  ) {
    return jsonResponse(
      jsonRpcError(null, -32_000, validation.error ?? "Invalid API key"),
      401,
      { "WWW-Authenticate": "Bearer" }
    );
  }

  if (!validation.isSecretKey) {
    return jsonResponse(
      jsonRpcError(
        null,
        -32_000,
        "MCP server requires a secret key (fb_sec_*)"
      ),
      403
    );
  }

  // Fire-and-forget: update last-used timestamp
  ctx.scheduler.runAfter(
    0,
    internal.feedback.api_auth.updateOrganizationApiKeyLastUsed,
    { apiKeyId: validation.organizationApiKeyId }
  );

  // Parse JSON-RPC request body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse(jsonRpcError(null, -32_700, "Parse error"), 400);
  }

  const parsed = jsonRpcRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonResponse(
      jsonRpcError(null, -32_600, "Invalid JSON-RPC request"),
      400
    );
  }

  const response = await dispatch(parsed.data, ctx, validation.organizationId);
  return jsonResponse(response);
});

export const mcpCorsHandler = httpAction(async (_ctx, _request) => {
  return await Promise.resolve(
    new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    })
  );
});
