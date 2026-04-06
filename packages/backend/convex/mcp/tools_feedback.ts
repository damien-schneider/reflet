import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { num, optionalId, requireStr, str, strArr } from "../http/helpers";
import type { ToolRegistration } from "./tools_shared";
import { asId, defineTool } from "./tools_shared";

export const feedbackTools: ToolRegistration[] = [
  defineTool(
    "feedback_list",
    "List feedback items. Filter by status, tags, or search text. Sort by votes, newest, oldest, or comments.",
    {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: [
            "open",
            "under_review",
            "planned",
            "in_progress",
            "completed",
            "closed",
          ],
          description: "Filter by feedback status",
        },
        statusId: {
          type: "string",
          description: "Filter by organization status ID",
        },
        tagId: { type: "string", description: "Filter by tag ID" },
        search: {
          type: "string",
          description: "Search in title and description",
        },
        sortBy: {
          type: "string",
          enum: ["votes", "newest", "oldest", "comments"],
          description: "Sort order (default: votes)",
        },
        limit: {
          type: "number",
          description: "Max items to return (default: 50, max: 100)",
        },
        offset: { type: "number", description: "Pagination offset" },
      },
    },
    async (ctx, organizationId, params) =>
      ctx.runQuery(
        internal.feedback.api_public_queries.listFeedbackByOrganization,
        {
          organizationId,
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
          search: str(params.search),
          sortBy: str(params.sortBy) as
            | "votes"
            | "newest"
            | "oldest"
            | "comments"
            | undefined,
          limit: num(params.limit),
          offset: num(params.offset),
        }
      )
  ),

  defineTool(
    "feedback_get",
    "Get a single feedback item by ID with full details including tags, vote count, and status.",
    {
      type: "object",
      properties: {
        feedbackId: { type: "string", description: "The feedback item ID" },
      },
      required: ["feedbackId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runQuery(
        internal.feedback.api_public_reads.getFeedbackByOrganization,
        {
          organizationId,
          feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
        }
      )
  ),

  defineTool(
    "feedback_create",
    "Create a new feedback item (feature request, bug report, etc.).",
    {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Feedback title (max 100 chars)",
        },
        description: {
          type: "string",
          description:
            "Feedback description (rich text or markdown, max 10000 chars)",
        },
        tagId: { type: "string", description: "Tag ID to assign" },
      },
      required: ["title", "description"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(
        internal.feedback.api_public_mutations.createFeedbackByOrganization,
        {
          organizationId,
          title: requireStr(params.title, "title"),
          description: requireStr(params.description, "description"),
          tagId: optionalId<"tags">(params.tagId),
        }
      )
  ),

  defineTool(
    "feedback_update",
    "Update a feedback item's title or description.",
    {
      type: "object",
      properties: {
        feedbackId: { type: "string", description: "The feedback item ID" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" },
      },
      required: ["feedbackId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.feedback.updateFeedback, {
        organizationId,
        feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
        title: str(params.title),
        description: str(params.description),
      })
  ),

  defineTool(
    "feedback_delete",
    "Soft-delete a feedback item. Can be restored later.",
    {
      type: "object",
      properties: {
        feedbackId: {
          type: "string",
          description: "The feedback item ID to delete",
        },
      },
      required: ["feedbackId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.feedback.deleteFeedback, {
        organizationId,
        feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      })
  ),

  defineTool(
    "feedback_restore",
    "Restore a previously deleted feedback item.",
    {
      type: "object",
      properties: {
        feedbackId: {
          type: "string",
          description: "The feedback item ID to restore",
        },
      },
      required: ["feedbackId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.feedback.restoreFeedback, {
        organizationId,
        feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      })
  ),

  defineTool(
    "feedback_assign",
    "Assign a feedback item to a team member, or unassign by omitting assigneeId.",
    {
      type: "object",
      properties: {
        feedbackId: { type: "string", description: "The feedback item ID" },
        assigneeId: {
          type: "string",
          description: "User ID of the assignee (omit to unassign)",
        },
      },
      required: ["feedbackId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.feedback.assignFeedback, {
        organizationId,
        feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
        assigneeId: str(params.assigneeId),
      })
  ),

  defineTool(
    "feedback_set_status",
    "Change a feedback item's status on the roadmap. Provide either statusId (organization status) or status (generic status).",
    {
      type: "object",
      properties: {
        feedbackId: { type: "string", description: "The feedback item ID" },
        statusId: {
          type: "string",
          description: "Organization status ID to set",
        },
        status: {
          type: "string",
          enum: [
            "open",
            "under_review",
            "planned",
            "in_progress",
            "completed",
            "closed",
          ],
          description: "Generic status to set",
        },
      },
      required: ["feedbackId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.feedback.setFeedbackStatus, {
        organizationId,
        feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
        statusId: optionalId<"organizationStatuses">(params.statusId),
        status: str(params.status) as
          | "open"
          | "under_review"
          | "planned"
          | "in_progress"
          | "completed"
          | "closed"
          | undefined,
      })
  ),

  defineTool(
    "feedback_add_tag",
    "Add one or more tags to a feedback item.",
    {
      type: "object",
      properties: {
        feedbackId: { type: "string", description: "The feedback item ID" },
        tagIds: {
          type: "array",
          items: { type: "string" },
          description: "Tag IDs to add",
        },
      },
      required: ["feedbackId", "tagIds"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.feedback.updateFeedbackTags, {
        organizationId,
        feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
        addTagIds: strArr(params.tagIds) as Id<"tags">[] | undefined,
      })
  ),

  defineTool(
    "feedback_remove_tag",
    "Remove one or more tags from a feedback item.",
    {
      type: "object",
      properties: {
        feedbackId: { type: "string", description: "The feedback item ID" },
        tagIds: {
          type: "array",
          items: { type: "string" },
          description: "Tag IDs to remove",
        },
      },
      required: ["feedbackId", "tagIds"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.feedback.updateFeedbackTags, {
        organizationId,
        feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
        removeTagIds: strArr(params.tagIds) as Id<"tags">[] | undefined,
      })
  ),

  defineTool(
    "feedback_set_priority",
    "Set the priority level of a feedback item.",
    {
      type: "object",
      properties: {
        feedbackId: { type: "string", description: "The feedback item ID" },
        priority: {
          type: "string",
          enum: ["critical", "high", "medium", "low", "none"],
          description: "Priority level",
        },
      },
      required: ["feedbackId", "priority"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.feedback.updateFeedbackAnalysis, {
        organizationId,
        feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
        priority: requireStr(params.priority, "priority") as
          | "critical"
          | "high"
          | "medium"
          | "low"
          | "none",
      })
  ),

  defineTool(
    "feedback_set_complexity",
    "Set the complexity level of a feedback item.",
    {
      type: "object",
      properties: {
        feedbackId: { type: "string", description: "The feedback item ID" },
        complexity: {
          type: "string",
          enum: ["trivial", "simple", "moderate", "complex", "very_complex"],
          description: "Complexity level",
        },
      },
      required: ["feedbackId", "complexity"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.feedback.updateFeedbackAnalysis, {
        organizationId,
        feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
        complexity: requireStr(params.complexity, "complexity") as
          | "trivial"
          | "simple"
          | "moderate"
          | "complex"
          | "very_complex",
      })
  ),

  defineTool(
    "feedback_set_deadline",
    "Set a deadline for a feedback item.",
    {
      type: "object",
      properties: {
        feedbackId: { type: "string", description: "The feedback item ID" },
        deadline: {
          type: "number",
          description: "Deadline as Unix timestamp in milliseconds",
        },
      },
      required: ["feedbackId", "deadline"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.feedback.updateFeedbackAnalysis, {
        organizationId,
        feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
        deadline: num(params.deadline),
      })
  ),
];
