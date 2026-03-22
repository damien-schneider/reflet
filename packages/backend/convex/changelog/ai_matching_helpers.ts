import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

const MAX_FEEDBACK_ITEMS = 50;

/**
 * Get release data and open feedback items for AI matching.
 */
export const getReleaseAndFeedback = internalQuery({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release) {
      return null;
    }

    // Get existing linked feedback to exclude
    const existingLinks = await ctx.db
      .query("releaseFeedback")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .collect();

    const linkedFeedbackIds = new Set(
      existingLinks.map((l) => l.feedbackId.toString())
    );

    // Get open/planned feedback for this org (not already linked)
    const allFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", release.organizationId)
      )
      .collect();

    const feedbackItems = allFeedback
      .filter(
        (f) =>
          !(f.deletedAt || linkedFeedbackIds.has(f._id.toString())) &&
          ["open", "under_review", "planned", "in_progress"].includes(f.status)
      )
      .slice(0, MAX_FEEDBACK_ITEMS)
      .map((f) => ({
        _id: f._id,
        title: f.title,
        description: f.description,
        status: f.status,
        voteCount: f.voteCount ?? 0,
      }));

    return {
      release: {
        title: release.title,
        description: release.description,
      },
      feedbackItems,
    };
  },
});
