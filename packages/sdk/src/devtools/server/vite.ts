import type { ServerResponse } from "node:http";
import { type Connect, loadEnv, type Plugin } from "vite";
import { DEVTOOLS_ROUTE_BASE } from "../protocol";
import { createDevtoolsHandler, type DevtoolsHandler } from "./handler";
import { errorResponse } from "./json-response";
import type { DevtoolsServerOptions } from "./options";

export type { DevtoolsServerOptions } from "./options";

const MAX_BODY_BYTES = 1_048_576;
const ENV_PREFIX = "REFLET_";

async function readBody(
  request: Connect.IncomingMessage
): Promise<string | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.length;
    // Keep draining: leaving the loop early destroys the socket before the 413 is sent.
    if (size <= MAX_BODY_BYTES) {
      chunks.push(buffer);
    }
  }
  return size > MAX_BODY_BYTES ? null : Buffer.concat(chunks).toString("utf8");
}

function toWebRequest(
  request: Connect.IncomingMessage,
  method: string,
  body: string | undefined
): Request {
  const origin = `http://${request.headers.host ?? "localhost"}`;
  const url = new URL(request.originalUrl ?? request.url ?? "/", origin);
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (name.startsWith(":") || value === undefined) {
      continue;
    }
    for (const item of Array.isArray(value) ? value : [value]) {
      headers.append(name, item);
    }
  }
  return new Request(url, { body, headers, method });
}

async function sendWebResponse(
  response: Response,
  serverResponse: ServerResponse
): Promise<void> {
  serverResponse.statusCode = response.status;
  for (const [name, value] of response.headers) {
    serverResponse.setHeader(name, value);
  }
  serverResponse.end(Buffer.from(await response.arrayBuffer()));
}

async function serveDevtoolsRequest(
  handler: DevtoolsHandler,
  request: Connect.IncomingMessage,
  serverResponse: ServerResponse
): Promise<void> {
  const method = request.method ?? "GET";
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await readBody(request) : undefined;
  if (body === null) {
    await sendWebResponse(
      errorResponse("Reflet devtools requests are limited to 1 MB.", 413),
      serverResponse
    );
    return;
  }
  const response = await handler(toWebRequest(request, method, body));
  await sendWebResponse(response, serverResponse);
}

/** Serves the Reflet devtools route from the Vite dev server; never part of a build. */
export function refletDevtools(options: DevtoolsServerOptions = {}): Plugin {
  let handler: DevtoolsHandler | null = null;

  return {
    apply: "serve",
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir, ENV_PREFIX);
      handler = createDevtoolsHandler(
        { ...options, root: options.root ?? config.root },
        { ...process.env, ...env }
      );
    },
    configureServer(server) {
      server.middlewares.use(DEVTOOLS_ROUTE_BASE, (request, response, next) => {
        if (!handler) {
          next();
          return;
        }
        serveDevtoolsRequest(handler, request, response).catch(next);
      });
    },
    name: "reflet-devtools",
  };
}
