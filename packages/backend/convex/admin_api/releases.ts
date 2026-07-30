import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";
import { MAX_CHANGELOG_VERSION_LENGTH } from "../shared/constants";
import { validateInputLength } from "../shared/validators";

// ============================================
// RELEASE QUERIES
// ============================================

export const listReleases = internalQuery({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    organizationId: v.id("organizations"),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("all"))
    ),
  },
  handler: async (ctx, args) => {
    let releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter by status
    const status = args.status ?? "all";
    if (status === "published") {
      releases = releases.filter((r) => r.publishedAt !== undefined);
    } else if (status === "draft") {
      releases = releases.filter((r) => r.publishedAt === undefined);
    }

    // Sort by newest first
    releases.sort((a, b) => b.createdAt - a.createdAt);

    const total = releases.length;
    const offset = args.offset ?? 0;
    const limit = Math.min(args.limit ?? 50, 100);
    releases = releases.slice(offset, offset + limit);

    const items = await Promise.all(
      releases.map(async (r) => {
        const feedbackLinks = await ctx.db
          .query("releaseFeedback")
          .withIndex("by_release", (q) => q.eq("releaseId", r._id))
          .collect();
        return {
          createdAt: r.createdAt,
          description: r.description,
          feedbackCount: feedbackLinks.length,
          id: r._id,
          publishedAt: r.publishedAt,
          title: r.title,
          updatedAt: r.updatedAt,
          version: r.version,
        };
      })
    );

    return { hasMore: offset + limit < total, items, total };
  },
  returns: v.object({
    hasMore: v.boolean(),
    items: v.array(
      v.object({
        createdAt: v.number(),
        description: v.optional(v.string()),
        feedbackCount: v.number(),
        id: v.id("releases"),
        publishedAt: v.optional(v.number()),
        title: v.string(),
        updatedAt: v.number(),
        version: v.optional(v.string()),
      })
    ),
    total: v.number(),
  }),
});

export const getRelease = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release || release.organizationId !== args.organizationId) {
      return null;
    }

    const feedbackLinks = await ctx.db
      .query("releaseFeedback")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .collect();

    const linkedFeedback = await Promise.all(
      feedbackLinks.map(async (link) => {
        const f = await ctx.db.get(link.feedbackId);
        if (!f) {
          return null;
        }
        return {
          id: f._id,
          status: f.status,
          title: f.title,
          voteCount: f.voteCount,
        };
      })
    );

    return {
      createdAt: release.createdAt,
      description: release.description,
      id: release._id,
      linkedFeedback: linkedFeedback.filter(Boolean),
      publishedAt: release.publishedAt,
      title: release.title,
      updatedAt: release.updatedAt,
      version: release.version,
    };
  },
});

// ============================================
// RELEASE MUTATIONS
// ============================================

export const createRelease = internalMutation({
  args: {
    description: v.optional(v.string()),
    organizationId: v.id("organizations"),
    title: v.string(),
    version: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateInputLength(args.version, MAX_CHANGELOG_VERSION_LENGTH, "Version");

    const now = Date.now();
    const id = await ctx.db.insert("releases", {
      createdAt: now,
      description: args.description,
      organizationId: args.organizationId,
      title: args.title,
      updatedAt: now,
      version: args.version,
    });

    return { id };
  },
  returns: v.object({ id: v.id("releases") }),
});

export const updateRelease = internalMutation({
  args: {
    description: v.optional(v.string()),
    organizationId: v.id("organizations"),
    releaseId: v.id("releases"),
    title: v.optional(v.string()),
    version: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release || release.organizationId !== args.organizationId) {
      throw new Error("Release not found");
    }

    validateInputLength(args.version, MAX_CHANGELOG_VERSION_LENGTH, "Version");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) {
      updates.title = args.title;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }
    if (args.version !== undefined) {
      updates.version = args.version;
    }

    await ctx.db.patch(args.releaseId, updates);
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});

export const publishRelease = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release || release.organizationId !== args.organizationId) {
      throw new Error("Release not found");
    }

    await ctx.db.patch(args.releaseId, {
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});

export const unpublishRelease = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release || release.organizationId !== args.organizationId) {
      throw new Error("Release not found");
    }

    await ctx.db.patch(args.releaseId, {
      publishedAt: undefined,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});

export const deleteRelease = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release || release.organizationId !== args.organizationId) {
      throw new Error("Release not found");
    }

    // Remove feedback links
    const links = await ctx.db
      .query("releaseFeedback")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .collect();
    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(args.releaseId);
    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});

export const linkReleaseFeedback = internalMutation({
  args: {
    action: v.union(v.literal("link"), v.literal("unlink")),
    feedbackId: v.id("feedback"),
    organizationId: v.id("organizations"),
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release || release.organizationId !== args.organizationId) {
      throw new Error("Release not found");
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== args.organizationId) {
      throw new Error("Feedback not found");
    }

    const existing = await ctx.db
      .query("releaseFeedback")
      .withIndex("by_release_feedback", (q) =>
        q.eq("releaseId", args.releaseId).eq("feedbackId", args.feedbackId)
      )
      .unique();

    if (args.action === "link") {
      if (!existing) {
        await ctx.db.insert("releaseFeedback", {
          createdAt: Date.now(),
          feedbackId: args.feedbackId,
          releaseId: args.releaseId,
        });
      }
    } else if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});

// ============================================
// SCHEDULING
// ============================================

export const scheduleRelease = internalMutation({
  args: {
    feedbackStatus: v.optional(
      v.union(
        v.literal("open"),
        v.literal("under_review"),
        v.literal("planned"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("closed")
      )
    ),
    organizationId: v.id("organizations"),
    releaseId: v.id("releases"),
    scheduledPublishAt: v.number(),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release || release.organizationId !== args.organizationId) {
      throw new Error("Release not found");
    }
    if (release.publishedAt) {
      throw new Error("Release is already published");
    }
    if (args.scheduledPublishAt <= Date.now()) {
      throw new Error("Scheduled time must be in the future");
    }

    // Cancel existing schedule if any
    if (release.scheduledJobId) {
      try {
        await ctx.scheduler.cancel(release.scheduledJobId);
      } catch {
        // Job may have already completed
      }
    }

    const jobId = await ctx.scheduler.runAt(
      args.scheduledPublishAt,
      internal.changelog.scheduling.executeScheduledPublish,
      { releaseId: args.releaseId }
    );

    await ctx.db.patch(args.releaseId, {
      scheduledFeedbackStatus: args.feedbackStatus,
      scheduledJobId: jobId,
      scheduledPublishAt: args.scheduledPublishAt,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});

export const cancelScheduledRelease = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db.get(args.releaseId);
    if (!release || release.organizationId !== args.organizationId) {
      throw new Error("Release not found");
    }
    if (!release.scheduledPublishAt) {
      throw new Error("Release is not scheduled");
    }

    if (release.scheduledJobId) {
      try {
        await ctx.scheduler.cancel(release.scheduledJobId);
      } catch {
        // Job may have already completed
      }
    }

    await ctx.db.patch(args.releaseId, {
      scheduledBy: undefined,
      scheduledFeedbackStatus: undefined,
      scheduledJobId: undefined,
      scheduledPublishAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
  returns: v.object({ success: v.boolean() }),
});
