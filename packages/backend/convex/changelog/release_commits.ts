import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { getAuthUser } from "../shared/utils";

const commitValidator = v.object({
  sha: v.string(),
  message: v.string(),
  fullMessage: v.string(),
  author: v.string(),
  date: v.string(),
});

const fileValidator = v.object({
  filename: v.string(),
  status: v.string(),
  additions: v.number(),
  deletions: v.number(),
});

/**
 * Save commits used for a release (upsert: replaces existing)
 */
export const saveReleaseCommits = mutation({
  args: {
    releaseId: v.id("releases"),
    commits: v.array(commitValidator),
    files: v.optional(v.array(fileValidator)),
    previousTag: v.optional(v.string()),
  },
  returns: v.id("releaseCommits"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const release = await ctx.db.get(args.releaseId);
    if (!release) {
      throw new Error("Release not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", release.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can save release commits");
    }

    // Delete existing commits for this release
    const existing = await ctx.db
      .query("releaseCommits")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .collect();

    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }

    return ctx.db.insert("releaseCommits", {
      releaseId: args.releaseId,
      commits: args.commits,
      files: args.files,
      previousTag: args.previousTag,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get commits associated with a release
 */
export const getReleaseCommits = query({
  args: { releaseId: v.id("releases") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const release = await ctx.db.get(args.releaseId);
    if (!release) {
      return null;
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", release.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    return ctx.db
      .query("releaseCommits")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .first();
  },
});

/**
 * Get the latest commit SHA from the most recent published release that has stored commits.
 * Used as a fallback when the repo has no tags to determine the commit range.
 */
export const getLatestCommitFromPreviousRelease = query({
  args: {
    organizationId: v.id("organizations"),
    excludeReleaseId: v.optional(v.id("releases")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return null;
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    // Get published releases ordered by publishedAt descending
    const releases = await ctx.db
      .query("releases")
      .withIndex("by_published", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .collect();

    // Find the most recent published release (with commits) that isn't the current one
    for (const release of releases) {
      if (!release.publishedAt) {
        continue;
      }
      if (args.excludeReleaseId && release._id === args.excludeReleaseId) {
        continue;
      }

      const commitDoc = await ctx.db
        .query("releaseCommits")
        .withIndex("by_release", (q) => q.eq("releaseId", release._id))
        .first();

      if (commitDoc && commitDoc.commits.length > 0) {
        // Return the latest commit SHA (first commit is the most recent)
        return { sha: commitDoc.commits[0].sha };
      }
    }

    return null;
  },
});
