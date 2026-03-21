import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

const MS_PER_DAY = 86_400_000;

/**
 * Get stale feedback settings for an organization
 */
export const getSettings = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }
    return org.staleFeedbackSettings ?? null;
  },
});

/**
 * Update stale feedback settings for an organization
 */
export const updateSettings = mutation({
  args: {
    organizationId: v.id("organizations"),
    settings: v.object({
      enabled: v.boolean(),
      daysInactive: v.number(),
      action: v.union(v.literal("archive"), v.literal("close")),
      excludeStatuses: v.optional(
        v.array(
          v.union(
            v.literal("open"),
            v.literal("under_review"),
            v.literal("planned"),
            v.literal("in_progress"),
            v.literal("completed"),
            v.literal("closed")
          )
        )
      ),
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update stale feedback settings");
    }

    await ctx.db.patch(args.organizationId, {
      staleFeedbackSettings: args.settings,
    });
  },
});

/**
 * Archive/close stale feedback items across all orgs with the setting enabled.
 * Called by a daily cron job.
 */
export const archiveStaleFeedback = internalMutation({
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: batch archival logic with multiple status checks
  handler: async (ctx) => {
    const now = Date.now();

    // Get all organizations (iterate through all)
    const orgs = await ctx.db.query("organizations").collect();

    let totalProcessed = 0;

    for (const org of orgs) {
      const settings = org.staleFeedbackSettings;
      if (!settings?.enabled) {
        continue;
      }

      const threshold = now - settings.daysInactive * MS_PER_DAY;
      const excludeStatuses = settings.excludeStatuses ?? [
        "planned",
        "in_progress",
      ];

      const feedbackItems = await ctx.db
        .query("feedback")
        .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
        .collect();

      for (const item of feedbackItems) {
        // Skip if already closed/archived or deleted
        if (item.deletedAt) {
          continue;
        }

        if (item.status === "closed" || item.status === "completed") {
          continue;
        }

        // Skip excluded statuses
        if (excludeStatuses.includes(item.status)) {
          continue;
        }

        // Check last activity: use updatedAt as proxy for last activity
        if (item.updatedAt > threshold) {
          continue;
        }

        const newStatus = settings.action === "archive" ? "closed" : "closed";

        await ctx.db.patch(item._id, {
          status: newStatus,
          updatedAt: now,
        });

        totalProcessed++;
      }
    }

    return { processed: totalProcessed };
  },
});
