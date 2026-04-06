import type { Id } from "../_generated/dataModel";
import type { httpAction } from "../_generated/server";
import { commentTools } from "./tools_comments";
import { feedbackTools } from "./tools_feedback";
import { milestoneTools } from "./tools_milestones";
import { organizationTools } from "./tools_organization";
import { releaseTools } from "./tools_releases";
import type { ToolRegistration } from "./tools_shared";
import { tagTools } from "./tools_tags";

// ============================================
// TYPES
// ============================================

type ActionCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

type ToolHandler = ToolRegistration["handler"];

interface McpToolDefinition {
  description: string;
  inputSchema: Record<string, unknown>;
  name: string;
}

// ============================================
// TOOL REGISTRY
// ============================================

const tools: ToolRegistration[] = [
  ...feedbackTools,
  ...commentTools,
  ...tagTools,
  ...releaseTools,
  ...milestoneTools,
  ...organizationTools,
];

const toolMap = new Map<string, ToolHandler>();
for (const tool of tools) {
  toolMap.set(tool.definition.name, tool.handler);
}

// ============================================
// PUBLIC EXPORTS
// ============================================

export function getMcpToolDefinitions(): McpToolDefinition[] {
  return tools.map((t) => t.definition);
}

export function executeTool(
  name: string,
  ctx: ActionCtx,
  organizationId: Id<"organizations">,
  params: Record<string, unknown>
): Promise<unknown> {
  const handler = toolMap.get(name);
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return handler(ctx, organizationId, params);
}
