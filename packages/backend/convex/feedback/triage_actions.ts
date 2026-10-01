import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import { changeFeedbackStatus } from "./status_change";

export const updateOrganizationStatus = mutation({
  args: {
    feedbackId: v.id("feedback"),
    organizationStatusId: v.optional(v.id("organizationStatuses")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    await changeFeedbackStatus(ctx, feedback, {
      actorId: user._id,
      organizationStatusId: args.organizationStatusId ?? null,
      source: "user",
    });

    return args.feedbackId;
  },
});

export const assign = mutation({
  args: {
    assigneeId: v.optional(v.string()), // User ID or null/undefined to unassign
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can assign feedback");
    }

    if (args.assigneeId) {
      const assigneeId = args.assigneeId;
      const assigneeMembership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q
            .eq("organizationId", feedback.organizationId)
            .eq("userId", assigneeId)
        )
        .unique();

      if (!assigneeMembership) {
        throw new Error("Assignee is not a member of this organization");
      }
    }

    await ctx.db.patch(args.feedbackId, {
      assigneeId: args.assigneeId,
      updatedAt: Date.now(),
    });

    return args.feedbackId;
  },
});

export const updateAnalysis = mutation({
  args: {
    clearComplexity: v.optional(v.boolean()),
    clearDeadline: v.optional(v.boolean()),
    clearPriority: v.optional(v.boolean()),
    clearTimeEstimate: v.optional(v.boolean()),
    complexity: v.optional(
      v.union(
        v.literal("trivial"),
        v.literal("simple"),
        v.literal("moderate"),
        v.literal("complex"),
        v.literal("very_complex")
      )
    ),
    deadline: v.optional(v.number()),
    feedbackId: v.id("feedback"),
    needsClarification: v.optional(v.boolean()),
    priority: v.optional(
      v.union(
        v.literal("critical"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
        v.literal("none")
      )
    ),
    resetClarification: v.optional(v.boolean()),
    resetComplexity: v.optional(v.boolean()),
    resetPriority: v.optional(v.boolean()),
    resetTimeEstimate: v.optional(v.boolean()),
    timeEstimate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update analysis values");
    }

    const updates: Partial<Doc<"feedback">> = { updatedAt: Date.now() };
    if (args.resetPriority) {
      updates.priority = undefined;
    } else if (args.clearPriority) {
      updates.priority = null;
    } else if (args.priority !== undefined) {
      updates.priority = args.priority;
    }
    if (args.resetComplexity) {
      updates.complexity = undefined;
    } else if (args.clearComplexity) {
      updates.complexity = null;
    } else if (args.complexity !== undefined) {
      updates.complexity = args.complexity;
    }
    if (args.clearDeadline) {
      updates.deadline = undefined;
    } else if (args.deadline !== undefined) {
      updates.deadline = args.deadline;
    }
    if (args.resetTimeEstimate) {
      updates.timeEstimate = undefined;
    } else if (args.clearTimeEstimate) {
      updates.timeEstimate = null;
    } else if (args.timeEstimate !== undefined) {
      updates.timeEstimate = args.timeEstimate;
    }

    if (args.resetClarification) {
      updates.needsClarification = undefined;
    } else if (args.needsClarification !== undefined) {
      updates.needsClarification = args.needsClarification;
    }
    await ctx.db.patch(args.feedbackId, updates);

    return args.feedbackId;
  },
});
