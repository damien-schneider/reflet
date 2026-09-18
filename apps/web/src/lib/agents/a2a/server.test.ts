import { A2A_ERROR_CODE } from "@a2a-js/sdk/errors";
import { expect, it } from "vitest";
import { handleAgentMessage } from "@/lib/agents/a2a/server";
import { readDocumentation } from "@/lib/agents/documents";

function request(body: unknown, headers: HeadersInit = {}) {
  return new Request("http://localhost/api/a2a", {
    body: JSON.stringify(body),
    headers: {
      "A2A-Version": "1.0",
      "Content-Type": "application/a2a+json",
      Host: "localhost",
      ...headers,
    },
    method: "POST",
  });
}

function messageRequest(text: string) {
  return {
    id: "request-1",
    jsonrpc: "2.0",
    method: "SendMessage",
    params: {
      message: {
        contextId: "context-1",
        messageId: "message-1",
        parts: [{ text }],
        role: "ROLE_USER",
      },
    },
  };
}

it.each(["overview", "authentication", "integration"] as const)(
  "returns the published %s document without creating a task",
  async (document) => {
    const response = await handleAgentMessage(
      request(messageRequest(document))
    );
    const expected = await readDocumentation(document);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      id: "request-1",
      jsonrpc: "2.0",
      result: {
        message: {
          contextId: "context-1",
          parts: [{ mediaType: "text/markdown", text: expected.text }],
          role: "ROLE_AGENT",
        },
      },
    });
  }
);

it("rejects arbitrary document paths", async () => {
  const response = await handleAgentMessage(
    request(messageRequest("../../.env.local"))
  );
  expect(await response.json()).toMatchObject({
    error: { code: A2A_ERROR_CODE.INVALID_PARAMS },
    id: "request-1",
  });
});

it("rejects file inputs without fetching their URLs", async () => {
  const message = messageRequest("overview");
  const response = await handleAgentMessage(
    request({
      ...message,
      params: {
        message: {
          ...message.params.message,
          parts: [{ url: "https://example.com/private.txt" }],
        },
      },
    })
  );
  expect(await response.json()).toMatchObject({
    error: { code: A2A_ERROR_CODE.CONTENT_TYPE_NOT_SUPPORTED },
    id: "request-1",
  });
});

it("does not advertise or accept streaming", async () => {
  const response = await handleAgentMessage(
    request({ ...messageRequest("overview"), method: "SendStreamingMessage" })
  );
  expect(await response.json()).toMatchObject({
    error: { code: A2A_ERROR_CODE.UNSUPPORTED_OPERATION },
    id: "request-1",
  });
});

it("does not retain or expose conversation tasks", async () => {
  await handleAgentMessage(request(messageRequest("overview")));
  const response = await handleAgentMessage(
    request({ id: 2, jsonrpc: "2.0", method: "ListTasks", params: {} })
  );
  expect(await response.json()).toMatchObject({
    id: 2,
    result: { tasks: [] },
  });
});

it("rejects unsupported versions", async () => {
  const response = await handleAgentMessage(
    request(messageRequest("overview"), { "A2A-Version": "99.0" })
  );
  expect(await response.json()).toMatchObject({
    error: { code: A2A_ERROR_CODE.VERSION_NOT_SUPPORTED },
  });
});

it("returns a protocol error for malformed JSON", async () => {
  const response = await handleAgentMessage(
    new Request("http://localhost/api/a2a", {
      body: "{",
      headers: {
        "A2A-Version": "1.0",
        "Content-Type": "application/json",
        Host: "localhost",
      },
      method: "POST",
    })
  );
  expect(await response.json()).toMatchObject({
    error: { code: A2A_ERROR_CODE.PARSE_ERROR },
    id: null,
    jsonrpc: "2.0",
  });
});

it("rejects hostile origins", async () => {
  const response = await handleAgentMessage(
    request(messageRequest("overview"), {
      Origin: "https://attacker.example",
    })
  );
  expect(response.status).toBe(403);
});

it.each([null, [], 17, { id: 1, jsonrpc: "1.0", method: "SendMessage" }])(
  "rejects invalid RPC envelopes",
  async (body) => {
    const response = await handleAgentMessage(request(body));
    expect(await response.json()).toMatchObject({
      error: { code: A2A_ERROR_CODE.INVALID_REQUEST },
      id: null,
      jsonrpc: "2.0",
    });
  }
);

it("rejects oversized messages", async () => {
  const response = await handleAgentMessage(
    request(messageRequest("x".repeat(70_000)))
  );
  expect(response.status).toBe(413);
});

it("does not accept push notification destinations", async () => {
  const body = messageRequest("overview");
  const response = await handleAgentMessage(
    request({
      ...body,
      params: {
        ...body.params,
        configuration: {
          taskPushNotificationConfig: { url: "https://example.com/webhook" },
        },
      },
    })
  );
  expect(await response.json()).toMatchObject({
    error: { code: A2A_ERROR_CODE.PUSH_NOTIFICATION_NOT_SUPPORTED },
    id: "request-1",
  });
});

it.each(["overview", "../../.env.local"])(
  "returns no JSON-RPC response to a notification for %s",
  async (document) => {
    const { id: _id, ...notification } = messageRequest(document);
    const response = await handleAgentMessage(request(notification));
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  }
);
