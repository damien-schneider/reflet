import { v } from "convex/values";
import { internalMutation, mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

/**
 * Save synced GitHub releases
 */
export const saveSyncedReleases = mutation({
  args: {
    organizationId: v.id("organizations"),
    releases: v.array(
      v.object({
        githubReleaseId: v.string(),
        tagName: v.string(),
        name: v.optional(v.string()),
        body: v.optional(v.string()),
        htmlUrl: v.string(),
        isDraft: v.boolean(),
        isPrerelease: v.boolean(),
        publishedAt: v.optional(v.number()),
        createdAt: v.number(),
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
          tagName: release.tagName,
          name: release.name,
          body: release.body,
          htmlUrl: release.htmlUrl,
          isDraft: release.isDraft,
          isPrerelease: release.isPrerelease,
          publishedAt: release.publishedAt,
          lastSyncedAt: now,
        });
      } else {
        await ctx.db.insert("githubReleases", {
          organizationId: args.organizationId,
          githubConnectionId: connection._id,
          githubReleaseId: release.githubReleaseId,
          tagName: release.tagName,
          name: release.name,
          body: release.body,
          htmlUrl: release.htmlUrl,
          isDraft: release.isDraft,
          isPrerelease: release.isPrerelease,
          publishedAt: release.publishedAt,
          createdAt: release.createdAt,
          lastSyncedAt: now,
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

/**
 * Import a GitHub release as a Reflet release
 */
export const importGithubRelease = mutation({
  args: {
    githubReleaseId: v.id("githubReleases"),
    autoPublish: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const githubRelease = await ctx.db.get(args.githubReleaseId);
    if (!githubRelease) {
      throw new Error("GitHub release not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", githubRelease.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can import releases");
    }

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
      organizationId: githubRelease.organizationId,
      title: githubRelease.name || githubRelease.tagName,
      description: githubRelease.body,
      version: githubRelease.tagName,
      publishedAt: args.autoPublish ? now : undefined,
      githubReleaseId: githubRelease.githubReleaseId,
      githubHtmlUrl: githubRelease.htmlUrl,
      syncedFromGithub: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.githubReleaseId, {
      refletReleaseId: releaseId,
    });

    return releaseId;
  },
});

/**
 * Link a GitHub release to a Reflet release after pushing to GitHub
 */
export const linkGithubRelease = internalMutation({
  args: {
    releaseId: v.id("releases"),
    githubReleaseId: v.string(),
    githubHtmlUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.releaseId, {
      githubReleaseId: args.githubReleaseId,
      githubHtmlUrl: args.githubHtmlUrl,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update GitHub push status on a release
 */
export const updateGithubPushStatus = internalMutation({
  args: {
    releaseId: v.id("releases"),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    errorType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.releaseId, {
      githubPushStatus: args.status,
      githubPushError: args.error,
      githubPushErrorType: args.errorType,
      updatedAt: Date.now(),
    });
  },
});
