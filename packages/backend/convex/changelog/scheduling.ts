import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, mutation } from "../_generated/server";
import { getAuthUser } from "../shared/utils";
import { feedbackStatus } from "../shared/validators";

/**
 * Schedule a release for future publication
 */
export const schedulePublish = mutation({
  args: {
    id: v.id("releases"),
    scheduledPublishAt: v.number(),
    feedbackStatus: v.optional(feedbackStatus),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    if (args.scheduledPublishAt < Date.now()) {
      throw new Error("Scheduled time must be in the future");
    }

    const release = await ctx.db.get(args.id);
    if (!release) {
      throw new Error("Release not found");
    }

    if (release.publishedAt) {
      throw new Error("Release is already published");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", release.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can schedule releases");
    }

    // Cancel existing schedule if any
    if (release.scheduledJobId) {
      await ctx.scheduler.cancel(release.scheduledJobId);
    }

    const jobId = await ctx.scheduler.runAt(
      args.scheduledPublishAt,
      internal.changelog.scheduling.executeScheduledPublish,
      { releaseId: args.id }
    );

    await ctx.db.patch(args.id, {
      scheduledPublishAt: args.scheduledPublishAt,
      scheduledBy: user._id,
      scheduledFeedbackStatus: args.feedbackStatus,
      scheduledJobId: jobId,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Cancel a scheduled release publication
 */
export const cancelScheduledPublish = mutation({
  args: {
    id: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const release = await ctx.db.get(args.id);
    if (!release) {
      throw new Error("Release not found");
    }

    if (!release.scheduledPublishAt) {
      throw new Error("Release is not scheduled");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", release.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can cancel scheduled releases");
    }

    if (release.scheduledJobId) {
      await ctx.scheduler.cancel(release.scheduledJobId);
    }

    await ctx.db.patch(args.id, {
      scheduledPublishAt: undefined,
      scheduledBy: undefined,
      scheduledFeedbackStatus: undefined,
      scheduledJobId: undefined,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Reschedule a release publication
 */
export const reschedulePublish = mutation({
  args: {
    id: v.id("releases"),
    scheduledPublishAt: v.number(),
    feedbackStatus: v.optional(feedbackStatus),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    if (args.scheduledPublishAt < Date.now()) {
      throw new Error("Scheduled time must be in the future");
    }

    const release = await ctx.db.get(args.id);
    if (!release) {
      throw new Error("Release not found");
    }

    if (release.publishedAt) {
      throw new Error("Release is already published");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", release.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can reschedule releases");
    }

    // Cancel existing schedule
    if (release.scheduledJobId) {
      await ctx.scheduler.cancel(release.scheduledJobId);
    }

    const jobId = await ctx.scheduler.runAt(
      args.scheduledPublishAt,
      internal.changelog.scheduling.executeScheduledPublish,
      { releaseId: args.id }
    );

    await ctx.db.patch(args.id, {
      scheduledPublishAt: args.scheduledPublishAt,
      scheduledBy: user._id,
      scheduledFeedbackStatus: args.feedbackStatus,
      scheduledJobId: jobId,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * Internal mutation executed at the scheduled time to publish a release.
 * No-ops if release was already published, deleted, or cancelled.
 */
export const executeScheduledPublish = internalMutation({
  args: {
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);

    // No-op if release was deleted or already published
    if (!release || release.publishedAt) {
      return;
    }

    // No-op if schedule was cancelled (scheduledPublishAt cleared)
    if (!release.scheduledPublishAt) {
      return;
    }

    const now = Date.now();

    // Publish the release
    await ctx.db.patch(args.releaseId, {
      publishedAt: now,
      scheduledPublishAt: undefined,
      scheduledBy: undefined,
      scheduledFeedbackStatus: undefined,
      scheduledJobId: undefined,
      updatedAt: now,
    });

    // Update linked feedback status on publish
    if (release.scheduledFeedbackStatus) {
      const links = await ctx.db
        .query("releaseFeedback")
        .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
        .collect();

      for (const link of links) {
        const feedback = await ctx.db.get(link.feedbackId);
        if (feedback && feedback.status !== release.scheduledFeedbackStatus) {
          await ctx.db.patch(link.feedbackId, {
            status: release.scheduledFeedbackStatus,
          });
        }
      }
    }

    // Schedule email notifications to subscribers
    await ctx.scheduler.runAfter(
      0,
      internal.changelog.notifications.sendReleaseNotifications,
      { releaseId: args.releaseId }
    );

    // Schedule push to GitHub if enabled
    await ctx.scheduler.runAfter(
      0,
      internal.integrations.github.node_actions.pushReleaseToGithub,
      { releaseId: args.releaseId }
    );

    // Schedule shipped notifications for linked feedback voters
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.shipped.sendShippedNotifications,
      { releaseId: args.releaseId }
    );
  },
});

/**
 * Cron fallback: checks for missed scheduled releases and publishes them.
 * Handles edge cases where the scheduled function didn't fire.
 */
export const checkMissedScheduledReleases = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const missedReleases = await ctx.db
      .query("releases")
      .withIndex("by_scheduled", (q) => q.lte("scheduledPublishAt", now))
      .collect();

    for (const release of missedReleases) {
      // Only process releases that are still scheduled and unpublished
      if (
        release.scheduledPublishAt &&
        release.scheduledPublishAt <= now &&
        !release.publishedAt
      ) {
        // Publish the release
        await ctx.db.patch(release._id, {
          publishedAt: now,
          scheduledPublishAt: undefined,
          scheduledBy: undefined,
          scheduledFeedbackStatus: undefined,
          scheduledJobId: undefined,
          updatedAt: now,
        });

        // Update linked feedback status
        if (release.scheduledFeedbackStatus) {
          const links = await ctx.db
            .query("releaseFeedback")
            .withIndex("by_release", (q) => q.eq("releaseId", release._id))
            .collect();

          for (const link of links) {
            const feedback = await ctx.db.get(link.feedbackId);
            if (
              feedback &&
              feedback.status !== release.scheduledFeedbackStatus
            ) {
              await ctx.db.patch(link.feedbackId, {
                status: release.scheduledFeedbackStatus,
              });
            }
          }
        }

        // Schedule notifications
        await ctx.scheduler.runAfter(
          0,
          internal.changelog.notifications.sendReleaseNotifications,
          { releaseId: release._id }
        );

        await ctx.scheduler.runAfter(
          0,
          internal.integrations.github.node_actions.pushReleaseToGithub,
          { releaseId: release._id }
        );

        await ctx.scheduler.runAfter(
          0,
          internal.notifications.shipped.sendShippedNotifications,
          { releaseId: release._id }
        );
      }
    }
  },
});
