import type { z } from "zod";
import type { SessionApiPath } from "../api-paths";
import type { SessionTransport } from "./session-api";

export interface SessionRequests {
  get: <T>(
    path: SessionApiPath,
    schema: z.ZodType<T>,
    query?: Record<string, string>
  ) => Promise<T>;
  post: <T>(
    path: SessionApiPath,
    body: unknown,
    schema: z.ZodType<T>
  ) => Promise<T>;
}

export function createSessionRequests(
  transport: SessionTransport
): SessionRequests {
  return {
    get: (path, schema, query) =>
      transport.request({ method: "GET", path, query, schema }),
    post: (path, body, schema) =>
      transport.request({ body, method: "POST", path, schema }),
  };
}
