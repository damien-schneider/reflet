import { randomBytes } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import {
  errorResponse,
  JSON_RESPONSE_HEADERS,
} from "../../devtools/server/json-response";
import {
  readNodeBody,
  sendWebResponse,
  toWebRequest,
} from "../../devtools/server/node-http";
import { isLoopbackAddress } from "../../devtools/server/request-guard";
import { type LiveWindowMessage, liveWindowUrl } from "../protocol";
import {
  createHubRoutes,
  HUB_PAGE_HEADERS,
  type HubResponse,
  OPEN_WINDOW_STREAM,
} from "./hub-routes";
import { type LiveHubEvent, LiveHubState } from "./hub-state";

const LOOPBACK_HOST = "127.0.0.1";
const PING_INTERVAL_MS = 15_000;

export interface LiveHub {
  close: () => Promise<void>;
  readonly port: number;
  readonly secret: string;
  stopRecording: (timeoutMs: number) => Promise<boolean>;
  readonly url: string;
}

export interface LiveHubOptions {
  onEvent?: (event: LiveHubEvent) => void;
  port: number;
  windowDirectory: string;
}

function openWindowStream(
  state: LiveHubState,
  serverResponse: ServerResponse
): void {
  serverResponse.writeHead(200, {
    ...HUB_PAGE_HEADERS,
    "content-type": "application/x-ndjson; charset=utf-8",
  });
  const send = (message: LiveWindowMessage) => {
    serverResponse.write(`${JSON.stringify(message)}\n`);
  };
  if (!state.attachWindow(send)) {
    send({ kind: "elsewhere" });
    serverResponse.end();
    return;
  }
  serverResponse.once("close", () => state.detachWindow(send));
}

async function readRequest(
  incoming: IncomingMessage
): Promise<Request | Response> {
  if (!isLoopbackAddress(incoming.socket.remoteAddress)) {
    return errorResponse("Reflet Live only answers this machine.", 403);
  }
  const method = incoming.method ?? "GET";
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await readNodeBody(incoming) : undefined;
  if (body === null) {
    return errorResponse("Reflet Live requests are limited to 1 MB.", 413);
  }
  return toWebRequest(incoming, method, body);
}

function failRequest(serverResponse: ServerResponse, error: unknown): void {
  if (serverResponse.headersSent) {
    serverResponse.destroy();
    return;
  }
  const reason = error instanceof Error ? error.message : String(error);
  serverResponse.writeHead(500, JSON_RESPONSE_HEADERS);
  serverResponse.end(
    JSON.stringify({ error: `Reflet Live failed: ${reason}` })
  );
}

async function listen(server: Server, port: number): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, LOOPBACK_HOST, () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("The Reflet Live hub has no port.");
  }
  return address.port;
}

export async function startLiveHub(options: LiveHubOptions): Promise<LiveHub> {
  const secret = randomBytes(32).toString("hex");
  const state = new LiveHubState(options.onEvent ?? (() => undefined));
  const route = createHubRoutes(state, secret, options.windowDirectory);

  const serve = async (
    incoming: IncomingMessage,
    serverResponse: ServerResponse
  ) => {
    const request = await readRequest(incoming);
    const response: HubResponse =
      request instanceof Response ? request : await route(request);
    if (response === OPEN_WINDOW_STREAM) {
      openWindowStream(state, serverResponse);
      return;
    }
    await sendWebResponse(response, serverResponse);
  };

  const server = createServer((incoming, serverResponse) => {
    serve(incoming, serverResponse).catch((error: unknown) =>
      failRequest(serverResponse, error)
    );
  });
  const port = await listen(server, options.port);
  const ping = setInterval(() => state.heartbeat(), PING_INTERVAL_MS);

  return {
    close: async () => {
      clearInterval(ping);
      state.close();
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
    port,
    secret,
    stopRecording: (timeoutMs) => state.stopRecording(timeoutMs),
    url: liveWindowUrl(port),
  };
}
