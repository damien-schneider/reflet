import type { ServerResponse } from "node:http";
import { type Connect, loadEnv, type Plugin } from "vite";
import { DEVTOOLS_ROUTE_BASE } from "../protocol";
import { createDevtoolsHandler, type DevtoolsHandler } from "./handler";
import { errorResponse } from "./json-response";
import { readNodeBody, sendWebResponse, toWebRequest } from "./node-http";
import type { DevtoolsServerOptions } from "./options";
import { isLoopbackAddress } from "./request-guard";

export type { DevtoolsServerOptions } from "./options";

const ENV_PREFIX = "REFLET_";

async function serveDevtoolsRequest(
  handler: DevtoolsHandler,
  request: Connect.IncomingMessage,
  serverResponse: ServerResponse
): Promise<void> {
  if (!isLoopbackAddress(request.socket.remoteAddress)) {
    await sendWebResponse(
      errorResponse("Reflet devtools only answers this machine.", 403),
      serverResponse
    );
    return;
  }
  const method = request.method ?? "GET";
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await readNodeBody(request) : undefined;
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
