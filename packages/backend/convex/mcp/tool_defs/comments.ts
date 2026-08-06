import { internal } from "../../_generated/api";
import { optionalId, requireStr, str } from "../../http/helpers";
import { asId, createToolRegistry } from "../tool_registry";

const { defineTool, tools } = createToolRegistry();

defineTool(
  "comment_list",
  "List comments on a feedback item. Returns threaded comments with author info.",
  {
    properties: {
      feedbackId: { description: "The feedback item ID", type: "string" },
      sortBy: {
        description: "Sort order (default: oldest)",
        enum: ["newest", "oldest"],
        type: "string",
      },
    },
    required: ["feedbackId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.feedback.api_public.listCommentsByOrganization, {
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      includePrivateContext: true,
      organizationId,
      sortBy: str(params.sortBy) as "newest" | "oldest" | undefined,
    })
);

defineTool(
  "comment_create",
  "Add a comment to a feedback item. Can be a reply to another comment.",
  {
    properties: {
      body: {
        description: "Comment text (max 5000 chars)",
        type: "string",
      },
      feedbackId: { description: "The feedback item ID", type: "string" },
      parentId: {
        description: "Parent comment ID for threaded replies",
        type: "string",
      },
    },
    required: ["feedbackId", "body"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(
      internal.feedback.api_public_write.addCommentByOrganization,
      {
        body: requireStr(params.body, "body"),
        // Admin comments via MCP don't have an external user - use a placeholder
        // Note: addCommentByOrganization requires externalUserId; for admin
        // comments we need to handle this differently. For now, this tool
        // requires the admin to provide context about the commenter.
        externalUserId: asId<"externalUsers">(
          params.externalUserId,
          "externalUserId"
        ),
        feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
        organizationId,
        parentId: optionalId<"comments">(params.parentId),
      }
    )
);

defineTool(
  "comment_update",
  "Edit an existing comment's body text.",
  {
    properties: {
      body: { description: "New comment text", type: "string" },
      commentId: { description: "The comment ID", type: "string" },
    },
    required: ["commentId", "body"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateComment, {
      body: requireStr(params.body, "body"),
      commentId: asId<"comments">(params.commentId, "commentId"),
      organizationId,
    })
);

defineTool(
  "comment_delete",
  "Delete a comment.",
  {
    properties: {
      commentId: {
        description: "The comment ID to delete",
        type: "string",
      },
    },
    required: ["commentId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.deleteComment, {
      commentId: asId<"comments">(params.commentId, "commentId"),
      organizationId,
    })
);

defineTool(
  "comment_mark_official",
  "Toggle a comment as an official response from the team.",
  {
    properties: {
      commentId: { description: "The comment ID", type: "string" },
      isOfficial: {
        description: "Whether the comment is an official response",
        type: "boolean",
      },
    },
    required: ["commentId", "isOfficial"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.markCommentOfficial, {
      commentId: asId<"comments">(params.commentId, "commentId"),
      isOfficial: params.isOfficial === true,
      organizationId,
    })
);

export const commentTools = tools;
