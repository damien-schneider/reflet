import type { Id } from "../_generated/dataModel";
import type { httpAction } from "../_generated/server";
import { executeTool, getMcpToolDefinitions } from "./tools";

type ActionCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

const PROTOCOL_VERSION = "2025-03-26";
const SERVER_NAME = "reflet";
const SERVER_VERSION = "1.0.0";

interface JsonRpcRequest {
  id?: number | string | null;
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  error?: { code: number; message: string; data?: unknown };
  id: number | string | null;
  jsonrpc: "2.0";
  result?: unknown;
}

interface McpError {
  error: { code: number; message: string; data?: unknown };
}

const JSON_RPC_ERRORS = {
  INTERNAL_ERROR: { code: -32_603, message: "Internal error" },
  INVALID_PARAMS: { code: -32_602, message: "Invalid params" },
  METHOD_NOT_FOUND: { code: -32_601, message: "Method not found" },
} as const;

export function isErrorResult(value: unknown): value is McpError {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return "error" in value && typeof (value as McpError).error === "object";
}

export function extractArgs(
  params: Record<string, unknown>
): Record<string, unknown> {
  const raw = params.arguments;
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function handleInitialize(): unknown {
  return {
    capabilities: { tools: {} },
    protocolVersion: PROTOCOL_VERSION,
    serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
  };
}

function handleToolsList(): unknown {
  const tools = getMcpToolDefinitions();
  return { tools };
}

async function handleToolsCall(
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  params: Record<string, unknown>
): Promise<unknown | McpError> {
  const name = params.name;
  if (typeof name !== "string") {
    return {
      error: {
        ...JSON_RPC_ERRORS.INVALID_PARAMS,
        data: "Missing or invalid tool name",
      },
    };
  }

  const args = extractArgs(params);

  try {
    const result = await executeTool(name, ctx, organizationId, args);
    const text = typeof result === "string" ? result : JSON.stringify(result);
    return { content: [{ text, type: "text" }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ text: `Error: ${message}`, type: "text" }],
      isError: true,
    };
  }
}

export async function dispatch(
  request: JsonRpcRequest,
  ctx: ActionCtx,
  organizationId: Id<"organizations">
): Promise<JsonRpcResponse> {
  const { id, method, params } = request;
  const responseId = id ?? null;

  try {
    let result: unknown;

    switch (method) {
      case "initialize":
        result = handleInitialize();
        break;
      case "notifications/initialized":
        return { id: responseId, jsonrpc: "2.0", result: {} };
      case "tools/list":
        result = handleToolsList();
        break;
      case "tools/call":
        result = await handleToolsCall(ctx, organizationId, params ?? {});
        if (isErrorResult(result)) {
          return { error: result.error, id: responseId, jsonrpc: "2.0" };
        }
        break;
      default:
        return {
          error: JSON_RPC_ERRORS.METHOD_NOT_FOUND,
          id: responseId,
          jsonrpc: "2.0",
        };
    }

    return { id: responseId, jsonrpc: "2.0", result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      error: { ...JSON_RPC_ERRORS.INTERNAL_ERROR, data: message },
      id: responseId,
      jsonrpc: "2.0",
    };
  }
}
