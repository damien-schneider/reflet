import {
  type BoardCall,
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

export function transportOver(boardCall: BoardCall): SessionTransport {
  return {
    async request<T>({ body, method, path, query, schema }: SessionRequest<T>) {
      try {
        const response = await boardCall<unknown>(path, {
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

export function devtoolsTransport(): SessionTransport {
  return transportOver(callReflet);
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
export function bridgeBoardCall(bridge: TeamToolsBridge): BoardCall {
  return async (apiPath, init = {}) => {
    const reply = await bridge.request({
      method: init.body === undefined ? "GET" : "POST",
      path: apiPath,
      ...(init.body !== undefined && { body: JSON.stringify(init.body) }),
      ...(init.query && { query: init.query }),
    });
    const isSuccess = reply.status >= 200 && reply.status < 300;
    if (!isSuccess) {
      throw toSessionApiError(parseReplyBody(reply.body), reply.status);
    }
    // Shapes owned by protocol.ts and the Reflet public API, same trust as the dev route.
    return JSON.parse(reply.body);
  };
}

export function bridgeTransport(bridge: TeamToolsBridge): SessionTransport {
  return transportOver(bridgeBoardCall(bridge));
}

export function uploadSessionBlob(
  uploadUrl: string,
  blob: Blob
): Promise<string> {
  return uploadBlob(uploadUrl, { blob, mimeType: blob.type });
}
