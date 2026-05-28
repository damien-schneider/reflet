import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createBridgeApiClient } from "./runtime/api";

const SECRET_KEY = "fb_sec_retry";
const servers = new Set<Server>();

function sendJson(response: ServerResponse, body: unknown): void {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    request.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function listen(server: Server): Promise<string> {
  servers.add(server);
  return new Promise((resolve, reject) => {
    const handleError = (error: Error) => {
      reject(error);
    };
    server.once("error", handleError);
    server.listen({ host: "127.0.0.1", port: 0 }, () => {
      server.off("error", handleError);
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Expected TCP server address"));
        return;
      }
      const socketAddress: AddressInfo = address;
      resolve(`http://127.0.0.1:${socketAddress.port}`);
    });
  });
}

afterEach(async () => {
  await Promise.all(
    Array.from(servers).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          if (!server.listening) {
            servers.delete(server);
            resolve();
            return;
          }
          server.closeAllConnections();
          server.close((error) => {
            servers.delete(server);
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        })
    )
  );
});

describe("Bridge API client", () => {
  it("retries transient socket failures before parsing the response", async () => {
    let requests = 0;
    const server = createServer(async (request, response) => {
      requests += 1;
      if (requests === 1) {
        request.socket.destroy();
        return;
      }
      expect(request.headers.authorization).toBe(`Bearer ${SECRET_KEY}`);
      expect(await readBody(request)).toContain("retry-bridge");
      sendJson(response, { bridgeInstallationId: "bridge-retry" });
    });
    const siteUrl = await listen(server);
    const client = createBridgeApiClient({
      secretKey: SECRET_KEY,
      siteUrl,
    });

    await expect(
      client.register({
        bridgeName: "retry-bridge",
        claudeAvailable: true,
        doctorChecks: [],
        repoFullName: "acme/reflet",
      })
    ).resolves.toEqual({ bridgeInstallationId: "bridge-retry" });
    expect(requests).toBe(2);
  });
});
