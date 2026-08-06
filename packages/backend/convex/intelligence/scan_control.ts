import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { requireOrgMember } from "../shared/access";
import { getAuthUser } from "../shared/utils";

export const getActiveScan = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);

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
        return { ...mostRecentJob, _stale: true, status: "failed" as const };
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
      startedAt: now,
      status: "pending",
      type: "synthesis",
    });

    // Schedule the actual scan with reference to the master job
    await ctx.scheduler.runAfter(
      0,
      internal.intelligence.scan_pipeline.runOrgScan,
      {
        masterJobId,
        organizationId: args.organizationId,
      }
    );

    return { started: true };
  },
});

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
