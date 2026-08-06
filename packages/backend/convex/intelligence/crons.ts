import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

/**
 * Get all organizations with intelligence enabled that are due for a scan
 */
export const getOrgsDueForScan = internalQuery({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("intelligenceConfig").collect();
    const now = Date.now();

    const dueOrgs: {
      organizationId: (typeof configs)[number]["organizationId"];
    }[] = [];

    for (const config of configs) {
      const hasAnyPipeline =
        config.competitorTrackingEnabled ||
        config.redditEnabled ||
        config.webSearchEnabled;
      if (!hasAnyPipeline) {
        continue;
      }

      const lastScan = config.lastScanAt ?? 0;
      const hoursSinceLastScan = (now - lastScan) / (1000 * 60 * 60);

      let isDue = false;
      switch (config.scanFrequency) {
        case "daily":
          isDue = hoursSinceLastScan >= 24;
          break;
        case "twice_weekly":
          isDue = hoursSinceLastScan >= 84;
          break;
        case "weekly":
          isDue = hoursSinceLastScan >= 168;
          break;
        default:
          isDue = hoursSinceLastScan >= 168;
          break;
      }

      if (isDue) {
        dueOrgs.push({ organizationId: config.organizationId });
      }
    }

    return dueOrgs;
  },
});

/**
 * Get active competitors for an organization
 */
export const getActiveCompetitors = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: (ctx, args) =>
    ctx.db
      .query("competitors")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect(),
});

/**
 * Get intelligence config for an org (internal use)
 */
export const getConfig = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: (ctx, args) =>
    ctx.db
      .query("intelligenceConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique(),
});

/**
 * Update scan timestamps on intelligence config
 */
export const updateScanTimestamps = internalMutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("intelligenceConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!config) {
      return;
    }

    const now = Date.now();
    let nextScanMs = 0;

    switch (config.scanFrequency) {
      case "daily":
        nextScanMs = 24 * 60 * 60 * 1000;
        break;
      case "twice_weekly":
        nextScanMs = 84 * 60 * 60 * 1000;
        break;
      case "weekly":
        nextScanMs = 168 * 60 * 60 * 1000;
        break;
      default:
        nextScanMs = 168 * 60 * 60 * 1000;
        break;
    }

    await ctx.db.patch(config._id, {
      lastScanAt: now,
      nextScanAt: now + nextScanMs,
      updatedAt: now,
    });
  },
});

/**
 * Main cron entry point: check all orgs and run scans for those that are due
 */
export const runScheduledScans = internalAction({
  args: {},
  handler: async (ctx) => {
    const dueOrgs = await ctx.runQuery(
      internal.intelligence.crons.getOrgsDueForScan,
      {}
    );

    for (const { organizationId } of dueOrgs) {
      await ctx
        .runAction(internal.intelligence.scan_pipeline.runOrgScan, {
          organizationId,
        })
        .catch(() => {
          // Individual org scan failure doesn't block others
        });
    }
  },
});

/**
 * Run the intelligence scan for a single organization.
 * Uses the unified AI agent for community + competitor research,
 * then runs synthesis, priority boost, and notifications.
 */
/**
 * Update the master scan job status and stats
 */
export const updateMasterJob = internalMutation({
  args: {
    currentStep: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    jobId: v.id("intelligenceJobs"),
    stats: v.optional(
      v.object({
        errors: v.number(),
        itemsFound: v.number(),
        itemsProcessed: v.number(),
      })
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      return;
    }

    const updates: Record<string, unknown> = { status: args.status };
    if (args.stats) {
      updates.stats = args.stats;
    }
    if (args.currentStep !== undefined) {
      updates.currentStep = args.currentStep;
    }
    if (args.errorMessage !== undefined) {
      updates.errorMessage = args.errorMessage;
    }
    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.jobId, updates);
  },
});

/** Extract a human-readable error message from an unknown error */
