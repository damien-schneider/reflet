import { internal } from "../_generated/api";
import { optionalId, requireStr, str } from "../http/helpers";
import type { ToolRegistration } from "./tools_shared";
import { asId, defineTool } from "./tools_shared";

export const commentTools: ToolRegistration[] = [
  defineTool(
    "comment_list",
    "List comments on a feedback item. Returns threaded comments with author info.",
    {
      type: "object",
      properties: {
        feedbackId: { type: "string", description: "The feedback item ID" },
        sortBy: {
          type: "string",
          enum: ["newest", "oldest"],
          description: "Sort order (default: oldest)",
        },
      },
      required: ["feedbackId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runQuery(
        internal.feedback.api_public_reads.listCommentsByOrganization,
        {
          organizationId,
          feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
          sortBy: str(params.sortBy) as "newest" | "oldest" | undefined,
        }
      )
  ),

  defineTool(
    "comment_create",
    "Add a comment to a feedback item. Can be a reply to another comment.",
    {
      type: "object",
      properties: {
        feedbackId: { type: "string", description: "The feedback item ID" },
        body: {
          type: "string",
          description: "Comment text (max 5000 chars)",
        },
        parentId: {
          type: "string",
          description: "Parent comment ID for threaded replies",
        },
      },
      required: ["feedbackId", "body"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(
        internal.feedback.api_public_mutations.addCommentByOrganization,
        {
          organizationId,
          feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
          body: requireStr(params.body, "body"),
          // Admin comments via MCP don't have an external user - use a placeholder
          // Note: addCommentByOrganization requires externalUserId; for admin
          // comments we need to handle this differently. For now, this tool
          // requires the admin to provide context about the commenter.
          externalUserId: asId<"externalUsers">(
            params.externalUserId,
            "externalUserId"
          ),
          parentId: optionalId<"comments">(params.parentId),
        }
      )
  ),

  defineTool(
    "comment_update",
    "Edit an existing comment's body text.",
    {
      type: "object",
      properties: {
        commentId: { type: "string", description: "The comment ID" },
        body: { type: "string", description: "New comment text" },
      },
      required: ["commentId", "body"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.feedback.updateComment, {
        organizationId,
        commentId: asId<"comments">(params.commentId, "commentId"),
        body: requireStr(params.body, "body"),
      })
  ),

  defineTool(
    "comment_delete",
    "Delete a comment.",
    {
      type: "object",
      properties: {
        commentId: {
          type: "string",
          description: "The comment ID to delete",
        },
      },
      required: ["commentId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.feedback.deleteComment, {
        organizationId,
        commentId: asId<"comments">(params.commentId, "commentId"),
      })
  ),

  defineTool(
    "comment_mark_official",
    "Toggle a comment as an official response from the team.",
    {
      type: "object",
      properties: {
        commentId: { type: "string", description: "The comment ID" },
        isOfficial: {
          type: "boolean",
          description: "Whether the comment is an official response",
        },
      },
      required: ["commentId", "isOfficial"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.feedback.markCommentOfficial, {
        organizationId,
        commentId: asId<"comments">(params.commentId, "commentId"),
        isOfficial: params.isOfficial === true,
      })
  ),
];
