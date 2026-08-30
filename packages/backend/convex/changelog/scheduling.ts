import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  mutation,
} from "../_generated/server";
import { requireOrgAdmin } from "../shared/access";
import { feedbackStatus } from "../shared/validators";

async function publishScheduledRelease(
  ctx: MutationCtx,
  release: Doc<"releases">
): Promise<void> {
  const now = Date.now();

  await ctx.db.patch(release._id, {
    publishedAt: now,
    scheduledBy: undefined,
    scheduledFeedbackStatus: undefined,
    scheduledJobId: undefined,
    scheduledPublishAt: undefined,
    updatedAt: now,
  });

  if (release.scheduledFeedbackStatus) {
    const links = await ctx.db
      .query("releaseFeedback")
      .withIndex("by_release", (q) => q.eq("releaseId", release._id))
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

export const schedulePublish = mutation({
  args: {
    feedbackStatus: v.optional(feedbackStatus),
    id: v.id("releases"),
    scheduledPublishAt: v.number(),
  },
  handler: async (ctx, args) => {
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

    const { user } = await requireOrgAdmin(
      ctx,
      release.organizationId,
      "schedule releases"
    );

    if (release.scheduledJobId) {
      await ctx.scheduler.cancel(release.scheduledJobId);
    }

    const jobId = await ctx.scheduler.runAt(
      args.scheduledPublishAt,
      internal.changelog.scheduling.executeScheduledPublish,
      { releaseId: args.id }
    );

    await ctx.db.patch(args.id, {
      scheduledBy: user._id,
      scheduledFeedbackStatus: args.feedbackStatus,
      scheduledJobId: jobId,
      scheduledPublishAt: args.scheduledPublishAt,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const cancelScheduledPublish = mutation({
  args: {
    id: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.id);
    if (!release) {
      throw new Error("Release not found");
    }

    if (!release.scheduledPublishAt) {
      throw new Error("Release is not scheduled");
    }

    await requireOrgAdmin(
      ctx,
      release.organizationId,
      "cancel scheduled releases"
    );

    if (release.scheduledJobId) {
      await ctx.scheduler.cancel(release.scheduledJobId);
    }

    await ctx.db.patch(args.id, {
      scheduledBy: undefined,
      scheduledFeedbackStatus: undefined,
      scheduledJobId: undefined,
      scheduledPublishAt: undefined,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const executeScheduledPublish = internalMutation({
  args: {
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);

    if (!release?.scheduledPublishAt || release.publishedAt) {
      return;
    }

    await publishScheduledRelease(ctx, release);
  },
});

export const checkMissedScheduledReleases = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const dueReleases = await ctx.db
      .query("releases")
      .withIndex("by_scheduled", (q) =>
        q.gte("scheduledPublishAt", 0).lte("scheduledPublishAt", now)
      )
      .collect();

    for (const release of dueReleases) {
      if (!release.publishedAt) {
        await publishScheduledRelease(ctx, release);
      }
    }
  },
});
