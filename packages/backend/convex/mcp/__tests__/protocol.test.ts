import { describe, expect, test } from "vitest";
import { dispatch, extractArgs, isErrorResult } from "../protocol";

// Stub ActionCtx — tools/call will throw on actual tool execution,
// but we can test all non-execution paths
function createMockCtx() {
  const notAvailable = () => {
    throw new Error("Not available in test");
  };
  return {
    runQuery: notAvailable,
    runMutation: notAvailable,
    runAction: notAvailable,
    scheduler: { runAfter: notAvailable, runAt: notAvailable },
    auth: { getUserIdentity: notAvailable },
    storage: {
      getUrl: notAvailable,
      getMetadata: notAvailable,
      generateUploadUrl: notAvailable,
      delete: notAvailable,
    },
    vectorSearch: notAvailable,
  } as never;
}

const mockCtx = createMockCtx();
const mockOrgId = "test-org-id" as never;

describe("dispatch", () => {
  describe("initialize", () => {
    test("returns protocol version and server info", async () => {
      const response = await dispatch(
        { jsonrpc: "2.0", id: 1, method: "initialize" },
        mockCtx,
        mockOrgId
      );
      expect(response.jsonrpc).toBe("2.0");
      expect(response.id).toBe(1);
      expect(response.error).toBeUndefined();

      const result = response.result as Record<string, unknown>;
      expect(result.protocolVersion).toBe("2025-03-26");
      expect(result.capabilities).toEqual({ tools: {} });

      const serverInfo = result.serverInfo as Record<string, unknown>;
      expect(serverInfo.name).toBe("reflet");
      expect(serverInfo.version).toBeTruthy();
    });
  });

  describe("notifications/initialized", () => {
    test("returns empty result", async () => {
      const response = await dispatch(
        { jsonrpc: "2.0", id: 2, method: "notifications/initialized" },
        mockCtx,
        mockOrgId
      );
      expect(response.result).toEqual({});
      expect(response.error).toBeUndefined();
    });
  });

  describe("tools/list", () => {
    test("returns tools array with valid definitions", async () => {
      const response = await dispatch(
        { jsonrpc: "2.0", id: 3, method: "tools/list" },
        mockCtx,
        mockOrgId
      );
      expect(response.error).toBeUndefined();

      const result = response.result as Record<string, unknown>;
      const tools = result.tools as Record<string, unknown>[];
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      for (const tool of tools) {
        expect(tool.name).toBeTruthy();
        expect(typeof tool.description).toBe("string");
        expect(tool.inputSchema).toBeTruthy();
      }
    });
  });

  describe("tools/call", () => {
    test("returns error for missing tool name", async () => {
      const response = await dispatch(
        { jsonrpc: "2.0", id: 4, method: "tools/call", params: {} },
        mockCtx,
        mockOrgId
      );
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32_602);
      expect(response.error?.data).toContain("Missing");
    });

    test("returns error for unknown tool", async () => {
      const response = await dispatch(
        {
          jsonrpc: "2.0",
          id: 5,
          method: "tools/call",
          params: { name: "nonExistentTool" },
        },
        mockCtx,
        mockOrgId
      );
      // Unknown tool throws, which is caught and returned as isError content
      // The error propagates through the tool execution try/catch
      expect(response.result).toBeDefined();
      const result = response.result as {
        content: { text: string }[];
        isError: boolean;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("nonExistentTool");
    });

    test("returns error for numeric tool name", async () => {
      const response = await dispatch(
        { jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: 123 } },
        mockCtx,
        mockOrgId
      );
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32_602);
    });
  });

  describe("unknown method", () => {
    test("returns method not found error", async () => {
      const response = await dispatch(
        { jsonrpc: "2.0", id: 7, method: "unknown/method" },
        mockCtx,
        mockOrgId
      );
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32_601);
      expect(response.error?.message).toBe("Method not found");
    });
  });

  describe("response envelope", () => {
    test("echoes the request id", async () => {
      const response = await dispatch(
        { jsonrpc: "2.0", id: "abc-123", method: "initialize" },
        mockCtx,
        mockOrgId
      );
      expect(response.id).toBe("abc-123");
    });

    test("uses null id when request has no id", async () => {
      const response = await dispatch(
        { jsonrpc: "2.0", method: "initialize" },
        mockCtx,
        mockOrgId
      );
      expect(response.id).toBeNull();
    });

    test("always includes jsonrpc 2.0", async () => {
      const response = await dispatch(
        { jsonrpc: "2.0", id: 8, method: "unknown" },
        mockCtx,
        mockOrgId
      );
      expect(response.jsonrpc).toBe("2.0");
    });
  });
});

describe("isErrorResult", () => {
  test("returns true for McpError shape", () => {
    expect(isErrorResult({ error: { code: 1, message: "x" } })).toBe(true);
  });

  test("returns false for null", () => {
    expect(isErrorResult(null)).toBe(false);
  });

  test("returns false for undefined", () => {
    expect(isErrorResult(undefined)).toBe(false);
  });

  test("returns false for string", () => {
    expect(isErrorResult("error")).toBe(false);
  });

  test("returns false for empty object", () => {
    expect(isErrorResult({})).toBe(false);
  });

  test("returns false for content result", () => {
    expect(isErrorResult({ content: [{ type: "text", text: "hi" }] })).toBe(
      false
    );
  });
});

describe("extractArgs", () => {
  test("extracts nested object from arguments", () => {
    expect(extractArgs({ arguments: { foo: "bar" } })).toEqual({ foo: "bar" });
  });

  test("returns empty object when arguments is missing", () => {
    expect(extractArgs({})).toEqual({});
  });

  test("returns empty object when arguments is an array", () => {
    expect(extractArgs({ arguments: [1, 2] })).toEqual({});
  });

  test("returns empty object when arguments is a string", () => {
    expect(extractArgs({ arguments: "hello" })).toEqual({});
  });
});
