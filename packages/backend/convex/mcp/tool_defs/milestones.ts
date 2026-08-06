import { internal } from "../../_generated/api";
import { bool, num, requireStr, str } from "../../http/helpers";
import { asId, createToolRegistry } from "../tool_registry";

const { defineTool, tools } = createToolRegistry();

defineTool(
  "milestone_list",
  "List milestones with their progress (linked feedback count). Filter by status.",
  {
    properties: {
      status: {
        description: "Filter by milestone status (default: all)",
        enum: ["active", "completed", "archived", "all"],
        type: "string",
      },
    },
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.admin_api.milestones.listMilestones, {
      organizationId,
      status: str(params.status) as
        | "active"
        | "completed"
        | "archived"
        | "all"
        | undefined,
    })
);

defineTool(
  "milestone_get",
  "Get a single milestone with its linked feedback items.",
  {
    properties: {
      milestoneId: { description: "The milestone ID", type: "string" },
    },
    required: ["milestoneId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runQuery(internal.admin_api.milestones.getMilestone, {
      milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
      organizationId,
    })
);

defineTool(
  "milestone_create",
  "Create a new milestone for organizing roadmap goals.",
  {
    properties: {
      color: { description: "Milestone color", type: "string" },
      description: { description: "Milestone description", type: "string" },
      emoji: { description: "Emoji icon", type: "string" },
      isPublic: {
        description:
          "Whether the milestone is visible publicly (default: true)",
        type: "boolean",
      },
      name: { description: "Milestone name", type: "string" },
      targetDate: {
        description: "Target date as Unix timestamp in milliseconds",
        type: "number",
      },
      timeHorizon: {
        description: "Time horizon for the milestone",
        enum: [
          "now",
          "next_month",
          "next_quarter",
          "half_year",
          "next_year",
          "future",
        ],
        type: "string",
      },
    },
    required: ["name", "color", "timeHorizon"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.milestones.createMilestone, {
      color: requireStr(params.color, "color"),
      description: str(params.description),
      emoji: str(params.emoji),
      isPublic: bool(params.isPublic),
      name: requireStr(params.name, "name"),
      organizationId,
      targetDate: num(params.targetDate),
      timeHorizon: requireStr(params.timeHorizon, "timeHorizon") as
        | "now"
        | "next_month"
        | "next_quarter"
        | "half_year"
        | "next_year"
        | "future",
    })
);

defineTool(
  "milestone_update",
  "Update a milestone's properties.",
  {
    properties: {
      color: { description: "New color", type: "string" },
      description: { description: "New description", type: "string" },
      emoji: { description: "New emoji", type: "string" },
      isPublic: {
        description: "Whether the milestone is visible publicly",
        type: "boolean",
      },
      milestoneId: { description: "The milestone ID", type: "string" },
      name: { description: "New name", type: "string" },
      targetDate: { description: "New target date", type: "number" },
      timeHorizon: {
        description: "New time horizon",
        enum: [
          "now",
          "next_month",
          "next_quarter",
          "half_year",
          "next_year",
          "future",
        ],
        type: "string",
      },
    },
    required: ["milestoneId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.milestones.updateMilestone, {
      color: str(params.color),
      description: str(params.description),
      emoji: str(params.emoji),
      isPublic: bool(params.isPublic),
      milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
      name: str(params.name),
      organizationId,
      targetDate: num(params.targetDate),
      timeHorizon: str(params.timeHorizon) as
        | "now"
        | "next_month"
        | "next_quarter"
        | "half_year"
        | "next_year"
        | "future"
        | undefined,
    })
);

defineTool(
  "milestone_complete",
  "Mark a milestone as completed.",
  {
    properties: {
      milestoneId: {
        description: "The milestone ID to complete",
        type: "string",
      },
    },
    required: ["milestoneId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.milestones.completeMilestone, {
      milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
      organizationId,
    })
);

defineTool(
  "milestone_delete",
  "Delete a milestone. Linked feedback items will be unlinked.",
  {
    properties: {
      milestoneId: {
        description: "The milestone ID to delete",
        type: "string",
      },
    },
    required: ["milestoneId"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.milestones.deleteMilestone, {
      milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
      organizationId,
    })
);

defineTool(
  "milestone_link_feedback",
  "Link or unlink a feedback item to/from a milestone.",
  {
    properties: {
      action: {
        description: "Whether to link or unlink",
        enum: ["link", "unlink"],
        type: "string",
      },
      feedbackId: { description: "The feedback item ID", type: "string" },
      milestoneId: { description: "The milestone ID", type: "string" },
    },
    required: ["milestoneId", "feedbackId", "action"],
    type: "object",
  },
  async (ctx, organizationId, params) =>
    ctx.runMutation(internal.admin_api.milestones.linkMilestoneFeedback, {
      action: requireStr(params.action, "action") as "link" | "unlink",
      feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
      milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
      organizationId,
    })
);

export const milestoneTools = tools;
