import type { DevtoolsErrorBody } from "../protocol";

export type DevtoolsOutcome<T> =
  | { ok: true; value: T }
  | { error: string; ok: false; status: number };

const JSON_RESPONSE_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
};

export function jsonTextResponse(
  text: string | null,
  status: number
): Response {
  return new Response(text, { headers: JSON_RESPONSE_HEADERS, status });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return jsonTextResponse(JSON.stringify(body), status);
}

export function errorResponse(error: string, status: number): Response {
  const body: DevtoolsErrorBody = { error };
  return jsonResponse(body, status);
}

export function failure<T>(error: string, status: number): DevtoolsOutcome<T> {
  return { error, ok: false, status };
}
