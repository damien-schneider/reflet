import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RefletAdminClient } from "../client.js";

function textResult(data: unknown): {
  content: { type: "text"; text: string }[];
} {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export function registerFeedbackTools(
  server: McpServer,
  client: RefletAdminClient
): void {
  server.tool(
    "feedback_list",
    "List feedback items. Filter by status, tags, or search text. Sort by votes, newest, oldest, or comments.",
    {
      status: z
        .enum([
          "open",
          "under_review",
          "planned",
          "in_progress",
          "completed",
          "closed",
        ])
        .optional()
        .describe("Filter by feedback status"),
      statusId: z
        .string()
        .optional()
        .describe("Filter by organization status ID"),
      tagId: z.string().optional().describe("Filter by tag ID"),
      search: z.string().optional().describe("Search in title and description"),
      sortBy: z
        .enum(["votes", "newest", "oldest", "comments"])
        .optional()
        .describe("Sort order (default: votes)"),
      limit: z
        .number()
        .optional()
        .describe("Max items to return (default: 50, max: 100)"),
      offset: z.number().optional().describe("Pagination offset"),
    },
    async (params) => textResult(await client.listFeedback(params))
  );

  server.tool(
    "feedback_get",
    "Get a single feedback item by ID with full details including tags, vote count, and status.",
    {
      feedbackId: z.string().describe("The feedback item ID"),
    },
    async ({ feedbackId }) => textResult(await client.getFeedback(feedbackId))
  );

  server.tool(
    "feedback_create",
    "Create a new feedback item (feature request, bug report, etc.).",
    {
      title: z.string().describe("Feedback title (max 100 chars)"),
      description: z
        .string()
        .describe(
          "Feedback description (rich text or markdown, max 10000 chars)"
        ),
      tagId: z.string().optional().describe("Tag ID to assign"),
    },
    async (params) => textResult(await client.createFeedback(params))
  );

  server.tool(
    "feedback_update",
    "Update a feedback item's title or description.",
    {
      feedbackId: z.string().describe("The feedback item ID"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
    },
    async (params) => textResult(await client.updateFeedback(params))
  );

  server.tool(
    "feedback_delete",
    "Soft-delete a feedback item. Can be restored later.",
    {
      feedbackId: z.string().describe("The feedback item ID to delete"),
    },
    async ({ feedbackId }) =>
      textResult(await client.deleteFeedback(feedbackId))
  );

  server.tool(
    "feedback_restore",
    "Restore a previously deleted feedback item.",
    {
      feedbackId: z.string().describe("The feedback item ID to restore"),
    },
    async ({ feedbackId }) =>
      textResult(await client.restoreFeedback(feedbackId))
  );

  server.tool(
    "feedback_assign",
    "Assign a feedback item to a team member, or unassign by omitting assigneeId.",
    {
      feedbackId: z.string().describe("The feedback item ID"),
      assigneeId: z
        .string()
        .optional()
        .describe("User ID of the assignee (omit to unassign)"),
    },
    async ({ feedbackId, assigneeId }) =>
      textResult(await client.assignFeedback(feedbackId, assigneeId))
  );

  server.tool(
    "feedback_set_status",
    "Change a feedback item's status on the roadmap. Provide either statusId (organization status) or status (generic status).",
    {
      feedbackId: z.string().describe("The feedback item ID"),
      statusId: z.string().optional().describe("Organization status ID to set"),
      status: z
        .enum([
          "open",
          "under_review",
          "planned",
          "in_progress",
          "completed",
          "closed",
        ])
        .optional()
        .describe("Generic status to set"),
    },
    async ({ feedbackId, statusId, status }) =>
      textResult(await client.setFeedbackStatus(feedbackId, statusId, status))
  );

  server.tool(
    "feedback_add_tag",
    "Add one or more tags to a feedback item.",
    {
      feedbackId: z.string().describe("The feedback item ID"),
      tagIds: z.array(z.string()).describe("Tag IDs to add"),
    },
    async ({ feedbackId, tagIds }) =>
      textResult(await client.updateFeedbackTags(feedbackId, tagIds, undefined))
  );

  server.tool(
    "feedback_remove_tag",
    "Remove one or more tags from a feedback item.",
    {
      feedbackId: z.string().describe("The feedback item ID"),
      tagIds: z.array(z.string()).describe("Tag IDs to remove"),
    },
    async ({ feedbackId, tagIds }) =>
      textResult(await client.updateFeedbackTags(feedbackId, undefined, tagIds))
  );

  server.tool(
    "feedback_vote",
    "Toggle a vote on a feedback item. Requires user identification via X-User-Token header.",
    {
      feedbackId: z.string().describe("The feedback item ID"),
      voteType: z
        .enum(["upvote", "downvote"])
        .optional()
        .describe("Vote type (default: upvote)"),
    },
    async ({ feedbackId, voteType }) =>
      textResult(await client.voteFeedback(feedbackId, voteType))
  );

  server.tool(
    "feedback_set_priority",
    "Set the priority level of a feedback item.",
    {
      feedbackId: z.string().describe("The feedback item ID"),
      priority: z
        .enum(["critical", "high", "medium", "low", "none"])
        .describe("Priority level"),
    },
    async ({ feedbackId, priority }) =>
      textResult(await client.updateFeedbackAnalysis({ feedbackId, priority }))
  );

  server.tool(
    "feedback_set_complexity",
    "Set the complexity level of a feedback item.",
    {
      feedbackId: z.string().describe("The feedback item ID"),
      complexity: z
        .enum(["trivial", "simple", "moderate", "complex", "very_complex"])
        .describe("Complexity level"),
    },
    async ({ feedbackId, complexity }) =>
      textResult(
        await client.updateFeedbackAnalysis({ feedbackId, complexity })
      )
  );

  server.tool(
    "feedback_set_deadline",
    "Set a deadline for a feedback item.",
    {
      feedbackId: z.string().describe("The feedback item ID"),
      deadline: z
        .number()
        .describe("Deadline as Unix timestamp in milliseconds"),
    },
    async ({ feedbackId, deadline }) =>
      textResult(await client.updateFeedbackAnalysis({ feedbackId, deadline }))
  );
}
