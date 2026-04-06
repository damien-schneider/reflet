import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import { mapStatusNameToEnum } from "./status_utils";

/**
 * Soft-delete feedback (moves to trash, permanently deleted after 30 days)
 */
export const remove = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.id);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.deletedAt) {
      throw new Error("Feedback is already deleted");
    }

    // Check permissions
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    const isAdmin =
      membership?.role === "admin" || membership?.role === "owner";
    const isAuthor = feedback.authorId === user._id;

    if (!(isAdmin || isAuthor)) {
      throw new Error("You don't have permission to delete this feedback");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      deletedAt: now,
      updatedAt: now,
    });

    return true;
  },
});

/**
 * Restore a soft-deleted feedback (admin/owner only)
 */
export const restore = mutation({
  args: { id: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.id);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (!feedback.deletedAt) {
      throw new Error("Feedback is not deleted");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (
      !membership ||
      (membership.role !== "admin" && membership.role !== "owner")
    ) {
      throw new Error("Only admins can restore feedback");
    }

    await ctx.db.patch(args.id, {
      deletedAt: undefined,
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Update feedback organization status (for drag & drop in roadmap)
 */
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

    // Check membership (members can update status)
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    // Validate organizationStatusId belongs to the same organization
    let newStatus = feedback.status;
    if (args.organizationStatusId) {
      const status = await ctx.db.get(args.organizationStatusId);
      if (!status || status.organizationId !== feedback.organizationId) {
        throw new Error("Invalid status for this organization");
      }

      // Map custom status name to enum value for the status field
      newStatus = mapStatusNameToEnum(status.name);
    }

    await ctx.db.patch(args.feedbackId, {
      organizationStatusId: args.organizationStatusId,
      status: newStatus,
      updatedAt: Date.now(),
    });

    return args.feedbackId;
  },
});

/**
 * Assign feedback to a team member (admin only)
 */
export const assign = mutation({
  args: {
    feedbackId: v.id("feedback"),
    assigneeId: v.optional(v.string()), // User ID or null/undefined to unassign
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can assign feedback");
    }

    // If assigning to someone, verify they are a member of the org
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

/**
 * Update AI analysis overrides (priority, complexity, time estimate)
 * Allows admins to override AI-suggested values with human-set ones.
 */
export const updateAnalysis = mutation({
  args: {
    feedbackId: v.id("feedback"),
    priority: v.optional(
      v.union(
        v.literal("critical"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
        v.literal("none")
      )
    ),
    complexity: v.optional(
      v.union(
        v.literal("trivial"),
        v.literal("simple"),
        v.literal("moderate"),
        v.literal("complex"),
        v.literal("very_complex")
      )
    ),
    timeEstimate: v.optional(v.string()),
    deadline: v.optional(v.number()),
    clearPriority: v.optional(v.boolean()),
    clearComplexity: v.optional(v.boolean()),
    clearTimeEstimate: v.optional(v.boolean()),
    clearDeadline: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update analysis values");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.clearPriority) {
      updates.priority = undefined;
    } else if (args.priority !== undefined) {
      updates.priority = args.priority;
    }
    if (args.clearComplexity) {
      updates.complexity = undefined;
    } else if (args.complexity !== undefined) {
      updates.complexity = args.complexity;
    }
    if (args.clearDeadline) {
      updates.deadline = undefined;
    } else if (args.deadline !== undefined) {
      updates.deadline = args.deadline;
    }
    if (args.clearTimeEstimate) {
      updates.timeEstimate = undefined;
    } else if (args.timeEstimate !== undefined) {
      updates.timeEstimate = args.timeEstimate;
    }

    await ctx.db.patch(args.feedbackId, updates);

    return args.feedbackId;
  },
});
