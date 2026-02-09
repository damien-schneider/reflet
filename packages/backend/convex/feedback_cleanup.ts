import { internalMutation } from "./_generated/server";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Permanently delete feedback items that have been soft-deleted for more than 30 days.
 * This runs as a cron job and performs cascade deletion of all related data.
 */
export const permanentlyDeleteOldFeedback = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - THIRTY_DAYS_MS;

    // Find all feedback soft-deleted more than 30 days ago
    const deletedFeedback = await ctx.db
      .query("feedback")
      .filter((q) =>
        q.and(
          q.neq(q.field("deletedAt"), undefined),
          q.lt(q.field("deletedAt"), cutoff)
        )
      )
      .collect();

    for (const feedback of deletedFeedback) {
      // Votes
      const votes = await ctx.db
        .query("feedbackVotes")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .collect();
      for (const vote of votes) {
        await ctx.db.delete(vote._id);
      }

      // Comments
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .collect();
      for (const comment of comments) {
        await ctx.db.delete(comment._id);
      }

      // Tags
      const tags = await ctx.db
        .query("feedbackTags")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .collect();
      for (const tag of tags) {
        await ctx.db.delete(tag._id);
      }

      // Release links
      const releaseLinks = await ctx.db
        .query("releaseFeedback")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .collect();
      for (const link of releaseLinks) {
        await ctx.db.delete(link._id);
      }

      // Notifications
      const notifications = await ctx.db
        .query("notifications")
        .filter((q) => q.eq(q.field("feedbackId"), feedback._id))
        .collect();
      for (const notification of notifications) {
        await ctx.db.delete(notification._id);
      }

      // Importance votes
      const importanceVotes = await ctx.db
        .query("feedbackImportanceVotes")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .collect();
      for (const vote of importanceVotes) {
        await ctx.db.delete(vote._id);
      }

      // Subscriptions
      const subscriptions = await ctx.db
        .query("feedbackSubscriptions")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .collect();
      for (const sub of subscriptions) {
        await ctx.db.delete(sub._id);
      }

      // Milestone links
      const milestoneLinks = await ctx.db
        .query("milestoneFeedback")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .collect();
      for (const link of milestoneLinks) {
        await ctx.db.delete(link._id);
      }

      // Activity logs
      const activityLogs = await ctx.db
        .query("activityLogs")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .collect();
      for (const log of activityLogs) {
        await ctx.db.delete(log._id);
      }

      // Delete the feedback itself
      await ctx.db.delete(feedback._id);
    }
  },
});
