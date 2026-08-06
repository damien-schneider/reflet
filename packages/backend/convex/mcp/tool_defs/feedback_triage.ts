import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { num, optionalId, requireStr, str, strArr } from "../../http/helpers";
import { asId, createToolRegistry } from "../tool_registry";

const { defineTool, tools } = createToolRegistry();

defineTool(
  "feedback_assign",
  "Assign a feedback item to a team member, or unassign by omitting assigneeId.",
  {
    properties: {
      assigneeId: {
        description: "User ID of the assignee (omit to unassign)",
        type: "string",
      },
      feedbackId: { description: "The feedback item ID", type: "string" },
    },
    required: ["feedbackId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.assignFeedback, {
      assigneeId: str(params.assigneeId),
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
    })
);

defineTool(
  "feedback_set_status",
  "Change a feedback item's status on the roadmap. Provide either statusId (organization status) or status (generic status).",
  {
    properties: {
      feedbackId: { description: "The feedback item ID", type: "string" },
      status: {
        description: "Generic status to set",
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
        description: "Organization status ID to set",
        type: "string",
      },
    },
    required: ["feedbackId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.setFeedbackStatus, {
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
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
    })
);

defineTool(
  "feedback_add_tag",
  "Add one or more tags to a feedback item.",
  {
    properties: {
      feedbackId: { description: "The feedback item ID", type: "string" },
      tagIds: {
        description: "Tag IDs to add",
        items: { type: "string" },
        type: "array",
      },
    },
    required: ["feedbackId", "tagIds"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedbackTags, {
      addTagIds: strArr(params.tagIds) as Id<"tags">[] | undefined,
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
    })
);

defineTool(
  "feedback_remove_tag",
  "Remove one or more tags from a feedback item.",
  {
    properties: {
      feedbackId: { description: "The feedback item ID", type: "string" },
      tagIds: {
        description: "Tag IDs to remove",
        items: { type: "string" },
        type: "array",
      },
    },
    required: ["feedbackId", "tagIds"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedbackTags, {
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
      removeTagIds: strArr(params.tagIds) as Id<"tags">[] | undefined,
    })
);

defineTool(
  "feedback_set_priority",
  "Set the priority level of a feedback item.",
  {
    properties: {
      feedbackId: { description: "The feedback item ID", type: "string" },
      priority: {
        description: "Priority level",
        enum: ["critical", "high", "medium", "low", "none"],
        type: "string",
      },
    },
    required: ["feedbackId", "priority"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedbackAnalysis, {
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
      priority: requireStr(params.priority, "priority") as
        | "critical"
        | "high"
        | "medium"
        | "low"
        | "none",
    })
);

defineTool(
  "feedback_set_complexity",
  "Set the complexity level of a feedback item.",
  {
    properties: {
      complexity: {
        description: "Complexity level",
        enum: ["trivial", "simple", "moderate", "complex", "very_complex"],
        type: "string",
      },
      feedbackId: { description: "The feedback item ID", type: "string" },
    },
    required: ["feedbackId", "complexity"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedbackAnalysis, {
      complexity: requireStr(params.complexity, "complexity") as
        | "trivial"
        | "simple"
        | "moderate"
        | "complex"
        | "very_complex",
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
    })
);

defineTool(
  "feedback_set_deadline",
  "Set a deadline for a feedback item.",
  {
    properties: {
      deadline: {
        description: "Deadline as Unix timestamp in milliseconds",
        type: "number",
      },
      feedbackId: { description: "The feedback item ID", type: "string" },
    },
    required: ["feedbackId", "deadline"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.feedback.updateFeedbackAnalysis, {
      deadline: num(params.deadline),
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      organizationId,
    })
);

export const feedbackTriageTools = tools;
