import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalQuery, mutation, query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

// ============================================
// QUERIES
// ============================================

/**
 * Get intelligence config for an organization
 */
export const get = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    const config = await ctx.db
      .query("intelligenceConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    return config;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Get intelligence config, creating a default one if none exists
 */
export const getOrCreate = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    const existing = await ctx.db
      .query("intelligenceConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (existing) {
      return existing;
    }

    const now = Date.now();

    const configId = await ctx.db.insert("intelligenceConfig", {
      organizationId: args.organizationId,
      scanFrequency: "weekly",
      redditEnabled: false,
      webSearchEnabled: false,
      competitorTrackingEnabled: false,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(configId);
  },
});

/**
 * Update intelligence config fields (admin-only)
 */
export const update = mutation({
  args: {
    organizationId: v.id("organizations"),
    scanFrequency: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("twice_weekly"),
        v.literal("weekly")
      )
    ),
    redditEnabled: v.optional(v.boolean()),
    webSearchEnabled: v.optional(v.boolean()),
    competitorTrackingEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can update intelligence config");
    }

    const config = await ctx.db
      .query("intelligenceConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!config) {
      throw new Error("Intelligence config not found");
    }

    const { organizationId: _, ...updates } = args;

    await ctx.db.patch(config._id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(config._id);
  },
});

// ============================================
// INTERNAL QUERIES
// ============================================

/**
 * Get intelligence config for a scan (no auth check, used by cron)
 */
export const getConfigForScan = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("intelligenceConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    return config;
  },
});

/**
 * Get the active intelligence scan job for an organization.
 * Returns the most recent job that is either:
 * - Active (pending/processing)
 * - Recently completed (within last 15 seconds)
 */
export const getActiveScan = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("intelligenceJobs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter out dismissed jobs
    const activeJobs = jobs.filter((job) => !job.dismissedAt);

    if (activeJobs.length === 0) {
      return null;
    }

    const sortedJobs = activeJobs.sort((a, b) => b.startedAt - a.startedAt);
    const mostRecentJob = sortedJobs[0];

    if (!mostRecentJob) {
      return null;
    }

    // Return active jobs — but auto-expire jobs stuck for >2 minutes
    if (
      mostRecentJob.status === "pending" ||
      mostRecentJob.status === "processing"
    ) {
      const twoMinutesAgo = Date.now() - 120_000;
      if (mostRecentJob.startedAt < twoMinutesAgo) {
        // Job is stale — treat as failed so UI doesn't get stuck
        return { ...mostRecentJob, status: "failed" as const, _stale: true };
      }
      return mostRecentJob;
    }

    // Return recently completed/failed jobs (within 15 seconds)
    const fifteenSecondsAgo = Date.now() - 15_000;
    if (
      mostRecentJob.completedAt &&
      mostRecentJob.completedAt > fifteenSecondsAgo
    ) {
      return mostRecentJob;
    }

    return null;
  },
});

/**
 * Start a manual intelligence scan (admin-only).
 * Creates a marker job and schedules the org scan action.
 */
export const startManualScan = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can start intelligence scans");
    }

    // Validate there's something to scan
    const config = await ctx.db
      .query("intelligenceConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const hasCommunity = config?.redditEnabled || config?.webSearchEnabled;
    const hasCompetitors = config?.competitorTrackingEnabled;

    if (!(hasCommunity || hasCompetitors)) {
      throw new Error(
        "Enable at least one pipeline (Community Monitoring or Competitor Tracking) in settings before running a scan."
      );
    }

    // Check there's actual data to scan
    const keywords = await ctx.db
      .query("intelligenceKeywords")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    const competitor = await ctx.db
      .query("competitors")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .first();

    if (hasCommunity && !keywords && !hasCompetitors) {
      throw new Error(
        "Add at least one keyword in Community Pulse before running a community scan."
      );
    }

    if (hasCompetitors && !competitor && !hasCommunity) {
      throw new Error(
        "Add at least one competitor before running a competitor scan."
      );
    }

    if (!(keywords || competitor)) {
      throw new Error(
        "Add keywords or competitors before running a scan. There's nothing to search for yet."
      );
    }

    // Check no active scan exists
    const existingJobs = await ctx.db
      .query("intelligenceJobs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const hasActiveScan = existingJobs.some(
      (job) =>
        !job.dismissedAt &&
        (job.status === "pending" || job.status === "processing")
    );

    if (hasActiveScan) {
      throw new Error("A scan is already in progress");
    }

    // Create a master tracking job
    const now = Date.now();
    const masterJobId = await ctx.db.insert("intelligenceJobs", {
      organizationId: args.organizationId,
      type: "synthesis",
      status: "pending",
      startedAt: now,
    });

    // Schedule the actual scan with reference to the master job
    await ctx.scheduler.runAfter(
      0,
      internal.autopilot.intelligence.crons.runOrgScan,
      {
        organizationId: args.organizationId,
        masterJobId,
      }
    );

    return { started: true };
  },
});

/**
 * Dismiss a completed intelligence scan job (admin-only).
 */
export const dismissScan = mutation({
  args: { jobId: v.id("intelligenceJobs") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const job = await ctx.db.get(args.jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", job.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can dismiss scan jobs");
    }

    await ctx.db.patch(args.jobId, { dismissedAt: Date.now() });
  },
});

/**
 * Cancel a stuck intelligence scan (admin-only).
 * Force-deletes the job so a new scan can be started.
 */
export const cancelScan = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can cancel scans");
    }

    // Delete all pending/processing jobs for this org
    const jobs = await ctx.db
      .query("intelligenceJobs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activeJobs = jobs.filter(
      (j) => j.status === "pending" || j.status === "processing"
    );

    for (const job of activeJobs) {
      await ctx.db.delete(job._id);
    }

    return { cancelled: activeJobs.length };
  },
});
