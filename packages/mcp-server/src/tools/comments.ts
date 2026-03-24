import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RefletAdminClient } from "../client.js";
import { textResult } from "./utils.js";

export function registerCommentTools(
  server: McpServer,
  client: RefletAdminClient
): void {
  server.tool(
    "comment_list",
    "List comments on a feedback item. Returns threaded comments with author info.",
    {
      feedbackId: z.string().describe("The feedback item ID"),
      sortBy: z
        .enum(["newest", "oldest"])
        .optional()
        .describe("Sort order (default: oldest)"),
    },
    async ({ feedbackId, sortBy }) =>
      textResult(await client.listComments(feedbackId, sortBy))
  );

  server.tool(
    "comment_create",
    "Add a comment to a feedback item. Can be a reply to another comment.",
    {
      feedbackId: z.string().describe("The feedback item ID"),
      body: z.string().describe("Comment text (max 5000 chars)"),
      parentId: z
        .string()
        .optional()
        .describe("Parent comment ID for threaded replies"),
    },
    async (params) => textResult(await client.createComment(params))
  );

  server.tool(
    "comment_update",
    "Edit an existing comment's body text.",
    {
      commentId: z.string().describe("The comment ID"),
      body: z.string().describe("New comment text"),
    },
    async ({ commentId, body }) =>
      textResult(await client.updateComment(commentId, body))
  );

  server.tool(
    "comment_delete",
    "Delete a comment.",
    {
      commentId: z.string().describe("The comment ID to delete"),
    },
    async ({ commentId }) => textResult(await client.deleteComment(commentId))
  );

  server.tool(
    "comment_mark_official",
    "Toggle a comment as an official response from the team.",
    {
      commentId: z.string().describe("The comment ID"),
      isOfficial: z
        .boolean()
        .describe("Whether the comment is an official response"),
    },
    async ({ commentId, isOfficial }) =>
      textResult(await client.markCommentOfficial(commentId, isOfficial))
  );
}
