import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * List all statuses for an organization (ordered)
 */
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return [];
    }

    const statuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return statuses.sort((a, b) => a.order - b.order);
  },
});

/**
 * Get a single status by ID
 */
export const get = query({
  args: { id: v.id("organizationStatuses") },
  handler: (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

/**
 * Get feedback count per status for an organization
 */
export const getCounts = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const statuses = await ctx.db
      .query("organizationStatuses")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const counts: Record<string, number> = {};

    for (const status of statuses) {
      const feedbackItems = await ctx.db
        .query("feedback")
        .withIndex("by_org_status_id", (q) =>
          q.eq("organizationStatusId", status._id)
        )
        .collect();
      counts[status._id] = feedbackItems.length;
    }

    // Also count feedback without organizationStatusId (unassigned)
    const allFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    counts.unassigned = allFeedback.filter(
      (f) => !f.organizationStatusId
    ).length;

    return counts;
  },
});
