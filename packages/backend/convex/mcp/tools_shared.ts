import type { Id, TableNames } from "../_generated/dataModel";
import type { httpAction } from "../_generated/server";
import { requireStr } from "../http/helpers";

// ============================================
// TYPES
// ============================================

type ActionCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

export type ToolHandler = (
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  params: Record<string, unknown>
) => Promise<unknown>;

interface McpToolDefinition {
  description: string;
  inputSchema: Record<string, unknown>;
  name: string;
}

export interface ToolRegistration {
  definition: McpToolDefinition;
  handler: ToolHandler;
}

// ============================================
// SHARED HELPERS
// ============================================

export function asId<T extends TableNames>(
  value: unknown,
  fieldName: string
): Id<T> {
  return requireStr(value, fieldName) as Id<T>;
}

export function defineTool(
  name: string,
  description: string,
  inputSchema: Record<string, unknown>,
  handler: ToolHandler
): ToolRegistration {
  return {
    definition: { name, description, inputSchema },
    handler,
  };
}
