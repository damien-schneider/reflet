import { v } from "convex/values";
import { internalMutation, mutation } from "../../_generated/server";
import { requireOrgAdmin } from "../../shared/access";

export const updateSyncStatus = internalMutation({
  args: {
    connectionId: v.id("githubConnections"),
    error: v.optional(v.string()),
    status: v.union(
      v.literal("idle"),
      v.literal("syncing"),
      v.literal("success"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      lastSyncAt: Date.now(),
      lastSyncError: args.error,
      lastSyncStatus: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const saveSyncedReleases = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    releases: v.array(
      v.object({
        body: v.optional(v.string()),
        createdAt: v.number(),
        githubReleaseId: v.string(),
        htmlUrl: v.string(),
        isDraft: v.boolean(),
        isPrerelease: v.boolean(),
        name: v.optional(v.string()),
        publishedAt: v.optional(v.number()),
        tagName: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection) {
      throw new Error("No GitHub connection found");
    }

    const now = Date.now();

    for (const release of args.releases) {
      const existing = await ctx.db
        .query("githubReleases")
        .withIndex("by_github_release_id", (q) =>
          q
            .eq("githubConnectionId", connection._id)
            .eq("githubReleaseId", release.githubReleaseId)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          body: release.body,
          htmlUrl: release.htmlUrl,
          isDraft: release.isDraft,
          isPrerelease: release.isPrerelease,
          lastSyncedAt: now,
          name: release.name,
          publishedAt: release.publishedAt,
          tagName: release.tagName,
        });
      } else {
        await ctx.db.insert("githubReleases", {
          body: release.body,
          createdAt: release.createdAt,
          githubConnectionId: connection._id,
          githubReleaseId: release.githubReleaseId,
          htmlUrl: release.htmlUrl,
          isDraft: release.isDraft,
          isPrerelease: release.isPrerelease,
          lastSyncedAt: now,
          name: release.name,
          organizationId: args.organizationId,
          publishedAt: release.publishedAt,
          tagName: release.tagName,
        });
      }
    }

    await ctx.db.patch(connection._id, {
      lastSyncAt: now,
      lastSyncStatus: "success",
      updatedAt: now,
    });

    return { synced: args.releases.length };
  },
});

export const importGithubRelease = mutation({
  args: {
    autoPublish: v.optional(v.boolean()),
    githubReleaseId: v.id("githubReleases"),
  },
  handler: async (ctx, args) => {
    const githubRelease = await ctx.db.get(args.githubReleaseId);
    if (!githubRelease) {
      throw new Error("GitHub release not found");
    }

    await requireOrgAdmin(ctx, githubRelease.organizationId, "import releases");

    const existingRelease = await ctx.db
      .query("releases")
      .withIndex("by_github_release", (q) =>
        q
          .eq("organizationId", githubRelease.organizationId)
          .eq("githubReleaseId", githubRelease.githubReleaseId)
      )
      .first();

    if (existingRelease) {
      throw new Error("This release has already been imported");
    }

    const now = Date.now();

    const releaseId = await ctx.db.insert("releases", {
      createdAt: now,
      description: githubRelease.body,
      githubHtmlUrl: githubRelease.htmlUrl,
      githubReleaseId: githubRelease.githubReleaseId,
      organizationId: githubRelease.organizationId,
      publishedAt: args.autoPublish ? now : undefined,
      syncedFromGithub: true,
      title: githubRelease.name || githubRelease.tagName,
      updatedAt: now,
      version: githubRelease.tagName,
    });

    await ctx.db.patch(args.githubReleaseId, {
      refletReleaseId: releaseId,
    });

    return releaseId;
  },
});

export const linkGithubRelease = internalMutation({
  args: {
    githubHtmlUrl: v.string(),
    githubReleaseId: v.string(),
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.releaseId, {
      githubHtmlUrl: args.githubHtmlUrl,
      githubReleaseId: args.githubReleaseId,
      updatedAt: Date.now(),
    });
  },
});

export const updateGithubPushStatus = internalMutation({
  args: {
    error: v.optional(v.string()),
    errorType: v.optional(v.string()),
    releaseId: v.id("releases"),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.releaseId, {
      githubPushError: args.error,
      githubPushErrorType: args.errorType,
      githubPushStatus: args.status,
      updatedAt: Date.now(),
    });
  },
});
