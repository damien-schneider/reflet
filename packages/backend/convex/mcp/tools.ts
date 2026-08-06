import type { Id } from "../_generated/dataModel";
import { commentTools } from "./tool_defs/comments";
import { feedbackTools } from "./tool_defs/feedback";
import { feedbackTriageTools } from "./tool_defs/feedback_triage";
import { memberTools } from "./tool_defs/members";
import { milestoneTools } from "./tool_defs/milestones";
import { organizationTools } from "./tool_defs/organization";
import { releaseTools } from "./tool_defs/releases";
import { statusTools } from "./tool_defs/status";
import { tagTools } from "./tool_defs/tags";
import type {
  McpActionCtx,
  McpToolDefinition,
  ToolHandler,
  ToolRegistration,
} from "./tool_registry";

const allTools: ToolRegistration[] = [
  ...feedbackTools,
  ...feedbackTriageTools,
  ...commentTools,
  ...tagTools,
  ...releaseTools,
  ...milestoneTools,
  ...statusTools,
  ...memberTools,
  ...organizationTools,
];

const toolMap = new Map<string, ToolHandler>(
  allTools.map((tool) => [tool.definition.name, tool.handler])
);

export function getMcpToolDefinitions(): McpToolDefinition[] {
  return allTools.map((tool) => tool.definition);
}

export function executeTool(
  name: string,
  ctx: McpActionCtx,
  organizationId: Id<"organizations">,
  params: Record<string, unknown>
): Promise<unknown> {
  const handler = toolMap.get(name);
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return handler(ctx, organizationId, params);
}
