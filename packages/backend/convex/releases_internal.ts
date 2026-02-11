import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Internal query to get a release by ID (no auth check)
 * Used by server-side actions for reverse sync
 */
export const get = internalQuery({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.releaseId);
  },
});

/**
 * Internal mutation to link a Reflet release to a GitHub release
 * Called after creating a GitHub release from Reflet (reverse sync)
 * Prevents duplicate creation when the webhook fires back
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
 * Internal query to get the latest published release version for an organization
 * Used by the version suggestion system
 */
export const getLatestVersion = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const releases = await ctx.db
      .query("releases")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter to published releases with versions
    const publishedWithVersion = releases.filter(
      (r) => r.publishedAt !== undefined && r.version
    );

    if (publishedWithVersion.length === 0) {
      return null;
    }

    // Sort by publishedAt descending to get the latest
    publishedWithVersion.sort(
      (a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0)
    );

    return publishedWithVersion[0]?.version ?? null;
  },
});
