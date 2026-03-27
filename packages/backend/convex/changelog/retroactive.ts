import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { getAuthUser } from "../shared/utils";

/**
 * Start a retroactive changelog generation job
 */
export const startRetroactiveChangelog = mutation({
  args: {
    organizationId: v.id("organizations"),
    groupingStrategy: v.union(
      v.literal("tags"),
      v.literal("monthly"),
      v.literal("auto")
    ),
    skipExistingVersions: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can start retroactive changelog generation");
    }

    // Check no active job exists for this org
    const existingJobs = await ctx.db
      .query("retroactiveJobs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const terminalStatuses = new Set(["completed", "error", "cancelled"]);
    const activeJob = existingJobs.find(
      (job) => !terminalStatuses.has(job.status)
    );

    if (activeJob) {
      throw new Error(
        "A retroactive changelog job is already in progress for this organization"
      );
    }

    // Get GitHub connection to read targetBranch
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection) {
      throw new Error(
        "No GitHub connection found. Connect a repository before generating a retroactive changelog."
      );
    }

    const targetBranch = connection.repositoryDefaultBranch ?? "main";
    const skipExisting = args.skipExistingVersions ?? true;

    const now = Date.now();
    const jobId = await ctx.db.insert("retroactiveJobs", {
      organizationId: args.organizationId,
      status: "pending",
      groupingStrategy: args.groupingStrategy,
      targetBranch,
      skipExistingVersions: skipExisting,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.changelog.retroactive_actions.fetchTagsPhase,
      { jobId }
    );

    return jobId;
  },
});

/**
 * Cancel an active retroactive changelog job
 */
export const cancelRetroactiveChangelog = mutation({
  args: {
    jobId: v.id("retroactiveJobs"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Retroactive job not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", job.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can cancel retroactive changelog jobs");
    }

    await ctx.db.patch(args.jobId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get the most recent retroactive changelog job for an organization
 */
export const getRetroactiveJob = query({
  args: {
    organizationId: v.id("organizations"),
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

    const jobs = await ctx.db
      .query("retroactiveJobs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    if (jobs.length === 0) {
      return null;
    }

    // Return the most recent job
    jobs.sort((a, b) => b.createdAt - a.createdAt);
    return jobs[0] ?? null;
  },
});

/**
 * Publish retroactive draft releases
 */
export const publishRetroactiveDrafts = mutation({
  args: {
    releaseIds: v.array(v.id("releases")),
    useHistoricalDates: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    if (args.releaseIds.length === 0) {
      throw new Error("No releases provided to publish");
    }

    // Validate admin permission using the first release's organization
    const firstRelease = await ctx.db.get(args.releaseIds[0]);
    if (!firstRelease) {
      throw new Error("Release not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", firstRelease.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can publish releases");
    }

    const now = Date.now();

    for (const releaseId of args.releaseIds) {
      const release = await ctx.db.get(releaseId);
      if (!release) {
        continue;
      }

      if (release.organizationId !== firstRelease.organizationId) {
        throw new Error("All releases must belong to the same organization");
      }

      const publishedAt = args.useHistoricalDates ? release.createdAt : now;

      await ctx.db.patch(releaseId, {
        publishedAt,
        updatedAt: now,
      });

      // Schedule notification sending for each published release
      await ctx.scheduler.runAfter(
        0,
        internal.changelog.notifications.sendReleaseNotifications,
        { releaseId }
      );
    }
  },
});

/**
 * Discard retroactive draft releases and their associated data
 */
export const discardRetroactiveDrafts = mutation({
  args: {
    releaseIds: v.array(v.id("releases")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    if (args.releaseIds.length === 0) {
      throw new Error("No releases provided to discard");
    }

    // Validate admin permission using the first release's organization
    const firstRelease = await ctx.db.get(args.releaseIds[0]);
    if (!firstRelease) {
      throw new Error("Release not found");
    }

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", firstRelease.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can discard releases");
    }

    for (const releaseId of args.releaseIds) {
      const release = await ctx.db.get(releaseId);
      if (!release) {
        continue;
      }

      if (release.organizationId !== firstRelease.organizationId) {
        throw new Error("All releases must belong to the same organization");
      }

      // Delete associated releaseCommits
      const commits = await ctx.db
        .query("releaseCommits")
        .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
        .collect();

      for (const commit of commits) {
        await ctx.db.delete(commit._id);
      }

      // Delete associated releaseFeedback links
      const feedbackLinks = await ctx.db
        .query("releaseFeedback")
        .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
        .collect();

      for (const link of feedbackLinks) {
        await ctx.db.delete(link._id);
      }

      // Delete the release itself
      await ctx.db.delete(releaseId);
    }
  },
});
