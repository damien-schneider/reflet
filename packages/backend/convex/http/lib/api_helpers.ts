import type { Id, TableNames } from "../../_generated/dataModel";
import type { httpAction } from "../../_generated/server";

export type ActionCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

// ============================================
// CORS
// ============================================

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-User-Token, X-Visitor-Id",
  "Access-Control-Max-Age": "86400",
} as const;

export function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ============================================
// JSON RESPONSES
// ============================================

export function jsonResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

export function errorResponse(error: string, status = 400): Response {
  return jsonResponse({ error }, status);
}

// ============================================
// FIELD EXTRACTORS
// ============================================

export function stringFieldOr(
  body: Record<string, unknown>,
  key: string,
  defaultVal: string
): string {
  const val = body[key];
  return typeof val === "string" ? val : defaultVal;
}

export function optionalNumberField(
  body: Record<string, unknown>,
  key: string
): number | undefined {
  const val = body[key];
  return typeof val === "number" ? val : undefined;
}

export function optionalStringField(
  body: Record<string, unknown>,
  key: string
): string | undefined {
  const val = body[key];
  return typeof val === "string" ? val : undefined;
}

// ============================================
// PARAM PARSING
// ============================================

export function parseEnumParam<T extends string>(
  value: string | null,
  validValues: readonly T[]
): T | undefined {
  if (value && (validValues as readonly string[]).includes(value)) {
    return value as T;
  }
  return undefined;
}

export function parseOptionalId<T extends TableNames>(
  value: string | null | undefined
): Id<T> | undefined {
  return value ? (value as Id<T>) : undefined;
}
