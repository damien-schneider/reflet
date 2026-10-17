import {
  callReflet,
  DevRouteError,
} from "../../devtools/client/route/dev-route";
import { uploadBlob } from "../../feedback/core/submit";
import { sessionApiErrorSchema } from "../protocol";
import type { TeamToolsBridge } from "../team/team-tools-bridge";
import {
  SessionApiError,
  type SessionRequest,
  type SessionTransport,
} from "./session-api";

const TRAILING_SLASHES = /\/+$/;

function toSessionApiError(body: unknown, status: number): SessionApiError {
  const parsed = sessionApiErrorSchema.safeParse(body);
  const message = parsed.success
    ? parsed.data.error
    : `Reflet answered ${status}.`;
  return new SessionApiError(message, {
    limit: parsed.success ? (parsed.data.limit ?? null) : null,
    status,
  });
}

export function devtoolsTransport(): SessionTransport {
  return {
    async request<T>({ body, method, path, query, schema }: SessionRequest<T>) {
      try {
        const response = await callReflet<unknown>(path, {
          body: method === "POST" ? (body ?? {}) : undefined,
          query,
        });
        return schema.parse(response);
      } catch (error) {
        if (error instanceof DevRouteError) {
          throw toSessionApiError(error.body, error.status);
        }
        throw error;
      }
    },
  };
}

export function teamTransport(options: {
  apiUrl: string;
  token: string;
}): SessionTransport {
  const base = options.apiUrl.replace(TRAILING_SLASHES, "");
  return {
    async request<T>({ body, method, path, query, schema }: SessionRequest<T>) {
      const search = query ? `?${new URLSearchParams(query)}` : "";
      const response = await fetch(`${base}${path}${search}`, {
        body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
        headers: {
          Authorization: `Bearer ${options.token}`,
          "Content-Type": "application/json",
        },
        method,
      });
      if (!response.ok) {
        const failure: unknown = await response.json().catch(() => null);
        throw toSessionApiError(failure, response.status);
      }
      return schema.parse(await response.json().catch(() => null));
    },
  };
}

function parseReplyBody(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/** Calls go through the desktop app's privileged process, which holds the credential. Absent keys stay absent: IPC keeps an `undefined` value. */
export function bridgeTransport(bridge: TeamToolsBridge): SessionTransport {
  return {
    async request<T>({ body, method, path, query, schema }: SessionRequest<T>) {
      const reply = await bridge.request({
        method,
        path,
        ...(method === "POST" && { body: JSON.stringify(body ?? {}) }),
        ...(query && { query }),
      });
      const payload = parseReplyBody(reply.body);
      const isSuccess = reply.status >= 200 && reply.status < 300;
      if (!isSuccess) {
        throw toSessionApiError(payload, reply.status);
      }
      return schema.parse(payload);
    },
  };
}

export function uploadSessionBlob(
  uploadUrl: string,
  blob: Blob
): Promise<string> {
  return uploadBlob(uploadUrl, { blob, mimeType: blob.type });
}
