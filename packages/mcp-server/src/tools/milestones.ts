import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RefletAdminClient } from "../client.js";

function textResult(data: unknown): {
  content: { type: "text"; text: string }[];
} {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export function registerMilestoneTools(
  server: McpServer,
  client: RefletAdminClient
): void {
  server.tool(
    "milestone_list",
    "List milestones with their progress (linked feedback count). Filter by status.",
    {
      status: z
        .enum(["active", "completed", "archived", "all"])
        .optional()
        .describe("Filter by milestone status (default: all)"),
    },
    async (params) => textResult(await client.listMilestones(params))
  );

  server.tool(
    "milestone_get",
    "Get a single milestone with its linked feedback items.",
    {
      milestoneId: z.string().describe("The milestone ID"),
    },
    async ({ milestoneId }) =>
      textResult(await client.getMilestone(milestoneId))
  );

  server.tool(
    "milestone_create",
    "Create a new milestone for organizing roadmap goals.",
    {
      name: z.string().describe("Milestone name"),
      description: z.string().optional().describe("Milestone description"),
      emoji: z.string().optional().describe("Emoji icon"),
      color: z.string().describe("Milestone color"),
      timeHorizon: z
        .enum([
          "now",
          "next_month",
          "next_quarter",
          "half_year",
          "next_year",
          "future",
        ])
        .describe("Time horizon for the milestone"),
      targetDate: z
        .number()
        .optional()
        .describe("Target date as Unix timestamp in milliseconds"),
      isPublic: z
        .boolean()
        .optional()
        .describe("Whether the milestone is visible publicly (default: true)"),
    },
    async (params) => textResult(await client.createMilestone(params))
  );

  server.tool(
    "milestone_update",
    "Update a milestone's properties.",
    {
      milestoneId: z.string().describe("The milestone ID"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      emoji: z.string().optional().describe("New emoji"),
      color: z.string().optional().describe("New color"),
      timeHorizon: z
        .enum([
          "now",
          "next_month",
          "next_quarter",
          "half_year",
          "next_year",
          "future",
        ])
        .optional()
        .describe("New time horizon"),
      targetDate: z.number().optional().describe("New target date"),
      isPublic: z
        .boolean()
        .optional()
        .describe("Whether the milestone is visible publicly"),
    },
    async (params) => textResult(await client.updateMilestone(params))
  );

  server.tool(
    "milestone_complete",
    "Mark a milestone as completed.",
    {
      milestoneId: z.string().describe("The milestone ID to complete"),
    },
    async ({ milestoneId }) =>
      textResult(await client.completeMilestone(milestoneId))
  );

  server.tool(
    "milestone_delete",
    "Delete a milestone. Linked feedback items will be unlinked.",
    {
      milestoneId: z.string().describe("The milestone ID to delete"),
    },
    async ({ milestoneId }) =>
      textResult(await client.deleteMilestone(milestoneId))
  );

  server.tool(
    "milestone_link_feedback",
    "Link or unlink a feedback item to/from a milestone.",
    {
      milestoneId: z.string().describe("The milestone ID"),
      feedbackId: z.string().describe("The feedback item ID"),
      action: z.enum(["link", "unlink"]).describe("Whether to link or unlink"),
    },
    async ({ milestoneId, feedbackId, action }) =>
      textResult(
        await client.linkMilestoneFeedback(milestoneId, feedbackId, action)
      )
  );
}
