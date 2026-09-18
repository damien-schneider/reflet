import { describe, expect, it } from "vitest";
import { handleDocumentationRequest } from "./server";

async function rpc(method: string, params = {}) {
  const response = await handleDocumentationRequest(
    new Request("https://www.reflet.app/api/mcp", {
      body: JSON.stringify({ id: 1, jsonrpc: "2.0", method, params }),
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        host: "www.reflet.app",
      },
      method: "POST",
    })
  );
  const body = await response.text();
  const event = body.split("\n").find((line) => line.startsWith("data: "));
  return {
    payload: JSON.parse(event ? event.slice(6) : body),
    status: response.status,
  };
}

describe("public documentation MCP", () => {
  it("initializes and serves actual documentation through a read-only tool", async () => {
    const initialized = await rpc("initialize", {
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
      protocolVersion: "2025-11-25",
    });
    expect(initialized.status).toBe(200);
    expect(initialized.payload.result.capabilities).toHaveProperty("resources");
    const tools = await rpc("tools/list");
    expect(tools.payload.result.tools).toHaveLength(1);
    expect(tools.payload.result.tools[0].annotations.readOnlyHint).toBe(true);
    const result = await rpc("tools/call", {
      arguments: { document: "overview" },
      name: "read_documentation",
    });
    expect(result.payload.result.content[0].resource.text).toContain(
      "# Reflet"
    );
  });

  it("lists only public documents and rejects arbitrary resource access", async () => {
    const resources = await rpc("resources/list");
    expect(resources.payload.result.resources).toHaveLength(3);
    const result = await rpc("resources/read", { uri: "file:///etc/passwd" });
    expect(result.payload).toHaveProperty("error");
    const invalid = await rpc("tools/call", {
      arguments: { document: "../../.env.local" },
      name: "read_documentation",
    });
    expect(invalid.payload.result.isError).toBe(true);
  });
});

describe("MCP request boundaries", () => {
  it.each([
    { host: "untrusted.example" },
    { origin: "https://untrusted.example" },
  ])("rejects an untrusted host or origin", async (headers) => {
    const response = await handleDocumentationRequest(
      new Request("https://www.reflet.app/api/mcp", {
        headers: { host: "www.reflet.app", ...headers },
      })
    );
    expect(response.status).toBe(403);
  });

  it("does not open session streams for GET requests", async () => {
    const response = await handleDocumentationRequest(
      new Request("https://www.reflet.app/api/mcp", {
        headers: { host: "www.reflet.app" },
      })
    );
    expect(response.status).toBe(405);
  });
});
