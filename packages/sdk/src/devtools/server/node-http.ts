import type { IncomingMessage, ServerResponse } from "node:http";

const MAX_BODY_BYTES = 1_048_576;

export async function readNodeBody(
  request: IncomingMessage
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

export function toWebRequest(
  request: IncomingMessage & { originalUrl?: string },
  method: string,
  body: string | undefined
): Request {
  const isTls =
    "encrypted" in request.socket && request.socket.encrypted === true;
  const protocol = isTls ? "https" : "http";
  const origin = `${protocol}://${request.headers.host ?? "localhost"}`;
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

export async function sendWebResponse(
  response: Response,
  serverResponse: ServerResponse
): Promise<void> {
  serverResponse.statusCode = response.status;
  for (const [name, value] of response.headers) {
    serverResponse.setHeader(name, value);
  }
  serverResponse.end(Buffer.from(await response.arrayBuffer()));
}
