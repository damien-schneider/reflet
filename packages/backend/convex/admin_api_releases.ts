import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { MAX_CHANGELOG_VERSION_LENGTH } from "./constants";
import { validateInputLength } from "./validators";

// ============================================
// RELEASE QUERIES
// ============================================

export const listReleases = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(
      v.union(v.literal("draft"), v.literal("published"), v.literal("all"))
    ),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  returns: v.object({
    items: v.array(
      v.object({
        id: v.id("releases"),
        title: v.string(),
        description: v.optional(v.string()),
        version: v.optional(v.string()),
        publishedAt: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number(),
        feedbackCount: v.number(),
      })
    ),
    total: v.number(),
    hasMore: v.boolean(),
  }),
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
          id: r._id,
          title: r.title,
          description: r.description,
          version: r.version,
          publishedAt: r.publishedAt,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          feedbackCount: feedbackLinks.length,
        };
      })
    );

    return { items, total, hasMore: offset + limit < total };
  },
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
          title: f.title,
          status: f.status,
          voteCount: f.voteCount,
        };
      })
    );

    return {
      id: release._id,
      title: release.title,
      description: release.description,
      version: release.version,
      publishedAt: release.publishedAt,
      createdAt: release.createdAt,
      updatedAt: release.updatedAt,
      linkedFeedback: linkedFeedback.filter(Boolean),
    };
  },
});

// ============================================
// RELEASE MUTATIONS
// ============================================

export const createRelease = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    version: v.optional(v.string()),
  },
  returns: v.object({ id: v.id("releases") }),
  handler: async (ctx, args) => {
    validateInputLength(args.version, MAX_CHANGELOG_VERSION_LENGTH, "Version");

    const now = Date.now();
    const id = await ctx.db.insert("releases", {
      organizationId: args.organizationId,
      title: args.title,
      description: args.description,
      version: args.version,
      createdAt: now,
      updatedAt: now,
    });

    return { id };
  },
});

export const updateRelease = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    releaseId: v.id("releases"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    version: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
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
});

export const publishRelease = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    releaseId: v.id("releases"),
  },
  returns: v.object({ success: v.boolean() }),
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
});

export const unpublishRelease = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    releaseId: v.id("releases"),
  },
  returns: v.object({ success: v.boolean() }),
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
});

export const deleteRelease = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    releaseId: v.id("releases"),
  },
  returns: v.object({ success: v.boolean() }),
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
});

export const linkReleaseFeedback = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    releaseId: v.id("releases"),
    feedbackId: v.id("feedback"),
    action: v.union(v.literal("link"), v.literal("unlink")),
  },
  returns: v.object({ success: v.boolean() }),
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
          releaseId: args.releaseId,
          feedbackId: args.feedbackId,
          createdAt: Date.now(),
        });
      }
    } else if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});
