import type { Id, TableNames } from "../_generated/dataModel";
import type { httpAction } from "../_generated/server";
import { requireStr } from "../http/helpers";

export type McpActionCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

export type ToolHandler = (
  ctx: McpActionCtx,
  organizationId: Id<"organizations">,
  params: Record<string, unknown>
) => Promise<unknown>;

export interface McpToolDefinition {
  description: string;
  inputSchema: Record<string, unknown>;
  name: string;
}

export interface ToolRegistration {
  definition: McpToolDefinition;
  handler: ToolHandler;
}

export function asId<T extends TableNames>(
  value: unknown,
  fieldName: string
): Id<T> {
  return requireStr(value, fieldName) as Id<T>;
}

export function createToolRegistry(): {
  defineTool: (
    name: string,
    description: string,
    inputSchema: Record<string, unknown>,
    handler: ToolHandler
  ) => void;
  tools: ToolRegistration[];
} {
  const tools: ToolRegistration[] = [];

  return {
    defineTool: (name, description, inputSchema, handler) => {
      tools.push({ definition: { description, inputSchema, name }, handler });
    },
    tools,
  };
}
