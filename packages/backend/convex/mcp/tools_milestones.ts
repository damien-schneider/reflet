import { internal } from "../_generated/api";
import { bool, num, requireStr, str } from "../http/helpers";
import type { ToolRegistration } from "./tools_shared";
import { asId, defineTool } from "./tools_shared";

export const milestoneTools: ToolRegistration[] = [
  defineTool(
    "milestone_list",
    "List milestones with their progress (linked feedback count). Filter by status.",
    {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["active", "completed", "archived", "all"],
          description: "Filter by milestone status (default: all)",
        },
      },
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
  ),

  defineTool(
    "milestone_get",
    "Get a single milestone with its linked feedback items.",
    {
      type: "object",
      properties: {
        milestoneId: { type: "string", description: "The milestone ID" },
      },
      required: ["milestoneId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runQuery(internal.admin_api.milestones.getMilestone, {
        organizationId,
        milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
      })
  ),

  defineTool(
    "milestone_create",
    "Create a new milestone for organizing roadmap goals.",
    {
      type: "object",
      properties: {
        name: { type: "string", description: "Milestone name" },
        description: { type: "string", description: "Milestone description" },
        emoji: { type: "string", description: "Emoji icon" },
        color: { type: "string", description: "Milestone color" },
        timeHorizon: {
          type: "string",
          enum: [
            "now",
            "next_month",
            "next_quarter",
            "half_year",
            "next_year",
            "future",
          ],
          description: "Time horizon for the milestone",
        },
        targetDate: {
          type: "number",
          description: "Target date as Unix timestamp in milliseconds",
        },
        isPublic: {
          type: "boolean",
          description:
            "Whether the milestone is visible publicly (default: true)",
        },
      },
      required: ["name", "color", "timeHorizon"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.milestones.createMilestone, {
        organizationId,
        name: requireStr(params.name, "name"),
        description: str(params.description),
        emoji: str(params.emoji),
        color: requireStr(params.color, "color"),
        timeHorizon: requireStr(params.timeHorizon, "timeHorizon") as
          | "now"
          | "next_month"
          | "next_quarter"
          | "half_year"
          | "next_year"
          | "future",
        targetDate: num(params.targetDate),
        isPublic: bool(params.isPublic),
      })
  ),

  defineTool(
    "milestone_update",
    "Update a milestone's properties.",
    {
      type: "object",
      properties: {
        milestoneId: { type: "string", description: "The milestone ID" },
        name: { type: "string", description: "New name" },
        description: { type: "string", description: "New description" },
        emoji: { type: "string", description: "New emoji" },
        color: { type: "string", description: "New color" },
        timeHorizon: {
          type: "string",
          enum: [
            "now",
            "next_month",
            "next_quarter",
            "half_year",
            "next_year",
            "future",
          ],
          description: "New time horizon",
        },
        targetDate: { type: "number", description: "New target date" },
        isPublic: {
          type: "boolean",
          description: "Whether the milestone is visible publicly",
        },
      },
      required: ["milestoneId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.milestones.updateMilestone, {
        organizationId,
        milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
        name: str(params.name),
        description: str(params.description),
        emoji: str(params.emoji),
        color: str(params.color),
        timeHorizon: str(params.timeHorizon) as
          | "now"
          | "next_month"
          | "next_quarter"
          | "half_year"
          | "next_year"
          | "future"
          | undefined,
        targetDate: num(params.targetDate),
        isPublic: bool(params.isPublic),
      })
  ),

  defineTool(
    "milestone_complete",
    "Mark a milestone as completed.",
    {
      type: "object",
      properties: {
        milestoneId: {
          type: "string",
          description: "The milestone ID to complete",
        },
      },
      required: ["milestoneId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.milestones.completeMilestone, {
        organizationId,
        milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
      })
  ),

  defineTool(
    "milestone_delete",
    "Delete a milestone. Linked feedback items will be unlinked.",
    {
      type: "object",
      properties: {
        milestoneId: {
          type: "string",
          description: "The milestone ID to delete",
        },
      },
      required: ["milestoneId"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.milestones.deleteMilestone, {
        organizationId,
        milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
      })
  ),

  defineTool(
    "milestone_link_feedback",
    "Link or unlink a feedback item to/from a milestone.",
    {
      type: "object",
      properties: {
        milestoneId: { type: "string", description: "The milestone ID" },
        feedbackId: { type: "string", description: "The feedback item ID" },
        action: {
          type: "string",
          enum: ["link", "unlink"],
          description: "Whether to link or unlink",
        },
      },
      required: ["milestoneId", "feedbackId", "action"],
    },
    async (ctx, organizationId, params) =>
      ctx.runMutation(internal.admin_api.milestones.linkMilestoneFeedback, {
        organizationId,
        milestoneId: asId<"milestones">(params.milestoneId, "milestoneId"),
        feedbackId: asId<"feedback">(params.feedbackId, "feedbackId"),
        action: requireStr(params.action, "action") as "link" | "unlink",
      })
  ),
];
