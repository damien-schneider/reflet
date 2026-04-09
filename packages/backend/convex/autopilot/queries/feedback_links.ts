/**
 * Feedback-task link queries — bidirectional lookups.
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgMembership } from "./auth";

export const getTasksForFeedback = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const links = await ctx.db
      .query("feedbackTaskLinks")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    if (links.length === 0) {
      return [];
    }

    await requireOrgMembership(ctx, links[0].organizationId, user._id);

    const tasks = await Promise.all(
      links.map((link) => ctx.db.get(link.workItemId))
    );

    return tasks.filter(
      (t): t is NonNullable<typeof t> => t !== null && t.status !== "cancelled"
    );
  },
});

export const getFeedbackForTask = query({
  args: { workItemId: v.id("autopilotWorkItems") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const item = await ctx.db.get(args.workItemId);
    if (!item) {
      return [];
    }

    await requireOrgMembership(ctx, item.organizationId, user._id);

    const links = await ctx.db
      .query("feedbackTaskLinks")
      .withIndex("by_work_item", (q) => q.eq("workItemId", args.workItemId))
      .collect();

    const feedbackItems = await Promise.all(
      links.map((link) => ctx.db.get(link.feedbackId))
    );

    return feedbackItems.filter((f): f is NonNullable<typeof f> => f !== null);
  },
});
