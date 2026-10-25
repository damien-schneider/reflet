import type { z } from "zod";
import { DEVTOOLS_REQUEST_HEADER } from "../../../devtools/protocol";
import { sessionApiErrorSchema } from "../../../sessions/protocol";

export const HUB_HEADERS = {
  "Content-Type": "application/json",
  [DEVTOOLS_REQUEST_HEADER]: "1",
} as const;

async function hubError(response: Response): Promise<Error> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = sessionApiErrorSchema.safeParse(body);
  return new Error(
    parsed.success
      ? parsed.data.error
      : `The Reflet Live hub answered ${response.status}.`
  );
}

export async function callHub<T>(
  endpoint: string,
  schema: z.ZodType<T>,
  body?: unknown
): Promise<T> {
  const response = await fetch(endpoint, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: HUB_HEADERS,
    method: body === undefined ? "GET" : "POST",
  });
  if (!response.ok) {
    throw await hubError(response);
  }
  return schema.parse(await response.json());
}
