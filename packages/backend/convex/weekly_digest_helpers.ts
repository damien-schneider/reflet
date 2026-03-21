import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalQuery } from "./_generated/server";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Get all organization IDs for digest processing.
 */
export const getAllOrganizationIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect();
    return orgs.filter((org) => !org.deletedAt).map((org) => org._id);
  },
});

/**
 * Get digest data for a specific organization.
 */
export const getDigestData = internalQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("_id"), args.organizationId as never))
      .unique();

    if (!org || org.deletedAt) {
      return null;
    }

    const oneWeekAgo = Date.now() - ONE_WEEK_MS;

    // Get new feedback created this week
    const allFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
      .collect();

    const newFeedback = allFeedback.filter(
      (f) => f.createdAt >= oneWeekAgo && !f.deletedAt
    );

    // Get votes from this week
    const allVotes = await ctx.db.query("feedbackVotes").collect();

    const weekVotes = allVotes.filter((vote) => {
      const feedback = allFeedback.find((f) => f._id === vote.feedbackId);
      return feedback && vote.createdAt >= oneWeekAgo;
    });

    // Get status changes from activity logs
    const activityLogs = await ctx.db
      .query("activityLogs")
      .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
      .collect();

    const statusChangeLogs = activityLogs.filter(
      (log) => log.action === "status_changed" && log.createdAt >= oneWeekAgo
    );

    const statusChanges: { title: string; from: string; to: string }[] = [];
    for (const log of statusChangeLogs.slice(0, 5)) {
      if (log.feedbackId) {
        const feedback = await ctx.db.get(log.feedbackId);
        if (feedback && log.details) {
          try {
            const details = JSON.parse(log.details);
            statusChanges.push({
              title: feedback.title,
              from: details.from ?? "unknown",
              to: details.to ?? "unknown",
            });
          } catch {
            // Skip malformed details
          }
        }
      }
    }

    // Top feedback by votes (top 5)
    const topFeedback = [...allFeedback]
      .filter((f) => !f.deletedAt && f.isApproved)
      .sort((a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0))
      .slice(0, 5)
      .map((f) => ({
        title: f.title,
        voteCount: f.voteCount ?? 0,
        status: f.status,
        feedbackId: f._id,
        url: "",
      }));

    return {
      orgName: org.name,
      orgSlug: org.slug,
      newFeedbackCount: newFeedback.length,
      totalVotes: weekVotes.length,
      topFeedback,
      statusChanges,
    };
  },
});

/**
 * Get members who have weekly digest enabled for a given organization.
 */
export const getDigestRecipients = internalQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId as never)
      )
      .collect();

    const recipients: { email: string; userId: string }[] = [];

    for (const member of members) {
      // Check if user has weekly digest disabled
      const prefs = await ctx.db
        .query("userNotificationPreferences")
        .withIndex("by_user", (q) => q.eq("userId", member.userId))
        .unique();

      // Default to enabled if no preference is set
      if (prefs?.weeklyDigestEnabled === false) {
        continue;
      }

      // Resolve email from Better Auth
      const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "id", operator: "eq", value: member.userId }],
      })) as { email?: string } | null;

      if (user?.email) {
        recipients.push({ email: user.email, userId: member.userId });
      }
    }

    return recipients;
  },
});
