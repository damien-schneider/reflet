import { internal } from "../../_generated/api";
import { num, optionalId, requireStr, str } from "../../http/helpers";
import { asId, createToolRegistry } from "../tool_registry";

const { defineTool, tools } = createToolRegistry();

defineTool(
  "feedback_list",
  "List feedback items. Filter by status, tags, or search text. Sort by votes, newest, oldest, or comments.",
  {
    properties: {
      limit: {
        description: "Max items to return (default: 50, max: 100)",
        type: "number",
      },
      offset: { description: "Pagination offset", type: "number" },
      search: {
        description: "Search in title and description",
        type: "string",
      },
      sortBy: {
        description: "Sort order (default: votes)",
        enum: ["votes", "newest", "oldest", "comments"],
        type: "string",
      },
      status: {
        description: "Filter by feedback status",
        enum: [
          "open",
          "under_review",
          "planned",
          "in_progress",
          "completed",
          "closed",
        ],
        type: "string",
      },
      statusId: {
        description: "Filter by organization status ID",
        type: "string",
      },
      tagId: { description: "Filter by tag ID", type: "string" },
    },
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.feedback.api_public_list.listFeedbackByOrganization, {
      includePrivateContext: true,
      limit: num(params.limit),
      offset: num(params.offset),
      organizationId,
      search: str(params.search),
      sortBy: str(params.sortBy) as
        | "votes"
        | "newest"
        | "oldest"
        | "comments"
        | undefined,
      status: str(params.status) as
        | "open"
        | "under_review"
        | "planned"
        | "in_progress"
        | "completed"
        | "closed"
        | undefined,
      statusId: optionalId<"organizationStatuses">(params.statusId),
      tagId: optionalId<"tags">(params.tagId),
    })
);

defineTool(
  "feedback_get",
  "Get a single feedback item by ID with full details including tags, vote count, and status.",
  {
    properties: {
      feedbackId: { description: "The feedback item ID", type: "string" },
    },
    required: ["feedbackId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.feedback.api_public_list.getFeedbackByOrganization, {
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
    })
);

defineTool(
  "feedback_create",
  "Create a new feedback item (feature request, bug report, etc.).",
  {
    properties: {
      description: {
        description:
          "Feedback description (rich text or markdown, max 10000 chars)",
        type: "string",
      },
      tagId: { description: "Tag ID to assign", type: "string" },
      title: {
        description: "Feedback title (max 100 chars)",
        type: "string",
      },
    },
    required: ["title", "description"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(
      internal.feedback.api_public_write.createFeedbackByOrganization,
      {
        description: requireStr(params.description, "description"),
        organizationId,
        tagId: optionalId<"tags">(params.tagId),
        title: requireStr(params.title, "title"),
      }
    )
);

defineTool(
  "feedback_update",
  "Update a feedback item's title or description.",
  {
    properties: {
      description: { description: "New description", type: "string" },
      feedbackId: { description: "The feedback item ID", type: "string" },
      title: { description: "New title", type: "string" },
    },
    required: ["feedbackId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedback, {
      description: str(params.description),
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
      title: str(params.title),
    })
);

defineTool(
  "feedback_delete",
  "Soft-delete a feedback item. Can be restored later.",
  {
    properties: {
      feedbackId: {
        description: "The feedback item ID to delete",
        type: "string",
      },
    },
    required: ["feedbackId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.deleteFeedback, {
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
    })
);

defineTool(
  "feedback_restore",
  "Restore a previously deleted feedback item.",
  {
    properties: {
      feedbackId: {
        description: "The feedback item ID to restore",
        type: "string",
      },
    },
    required: ["feedbackId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.restoreFeedback, {
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
    })
);

export const feedbackTools = tools;
