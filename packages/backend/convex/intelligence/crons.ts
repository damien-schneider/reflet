import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

// ============================================
// QUERIES
// ============================================

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
  handler: (ctx, args) => {
    return ctx.db
      .query("competitors")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active")
      )
      .collect();
  },
});

/**
 * Get intelligence config for an org (internal use)
 */
export const getConfig = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: (ctx, args) => {
    return ctx.db
      .query("intelligenceConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();
  },
});

// ============================================
// MUTATIONS
// ============================================

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

// ============================================
// ACTIONS
// ============================================

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
        .runAction(internal.intelligence.crons.runOrgScan, {
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
    jobId: v.id("intelligenceJobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    currentStep: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    stats: v.optional(
      v.object({
        itemsFound: v.number(),
        itemsProcessed: v.number(),
        errors: v.number(),
      })
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
const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
};

/** Run an async step, returning the result with error details */
const runStep = async (
  fn: () => Promise<unknown>
): Promise<{ ok: boolean; error?: string }> => {
  try {
    await fn();
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, error: extractErrorMessage(error) };
  }
};

interface PipelineStats {
  completed: number;
  errored: number;
  errorMessages: string[];
}

/** Count step result and collect error messages */
const countStep = (
  result: { ok: boolean; error?: string },
  stats: PipelineStats,
  stepName: string
) => {
  if (result.ok) {
    stats.completed++;
    console.log(`[intelligence] Step "${stepName}" completed successfully`);
  } else {
    stats.errored++;
    stats.errorMessages.push(`${stepName}: ${result.error ?? "Unknown error"}`);
    console.error(
      `[intelligence] Step "${stepName}" failed: ${result.error ?? "Unknown error"}`
    );
  }
};

/** Update the master job's current step (fire-and-forget) */
const reportProgress = async (
  ctx: ActionCtx,
  masterJobId: Id<"intelligenceJobs"> | undefined,
  currentStep: string,
  stats: PipelineStats
) => {
  if (!masterJobId) {
    return;
  }
  await ctx
    .runMutation(internal.intelligence.crons.updateMasterJob, {
      jobId: masterJobId,
      status: "processing",
      currentStep,
      stats: {
        itemsFound: stats.completed + stats.errored,
        itemsProcessed: stats.completed,
        errors: stats.errored,
      },
    })
    .catch(() => {
      // Progress update failure is non-critical
    });
};

/** Run community + competitor pipelines with progress reporting */
const runPipelines = async (
  ctx: ActionCtx,
  orgId: Id<"organizations">,
  hasCommunity: boolean,
  hasCompetitors: boolean,
  masterJobId?: Id<"intelligenceJobs">
): Promise<PipelineStats> => {
  const stats: PipelineStats = {
    completed: 0,
    errored: 0,
    errorMessages: [],
  };

  if (hasCommunity) {
    await reportProgress(
      ctx,
      masterJobId,
      "Searching community discussions...",
      stats
    );
    countStep(
      await runStep(() =>
        ctx.runAction(
          internal.intelligence.intelligence_agent.runCommunitySearch,
          { organizationId: orgId }
        )
      ),
      stats,
      "Community search"
    );
  }

  if (hasCompetitors) {
    await reportProgress(ctx, masterJobId, "Researching competitors...", stats);
    countStep(
      await runStep(() =>
        ctx.runAction(
          internal.intelligence.intelligence_agent.runCompetitorResearch,
          { organizationId: orgId }
        )
      ),
      stats,
      "Competitor research"
    );

    const competitors = await ctx.runQuery(
      internal.intelligence.crons.getActiveCompetitors,
      { organizationId: orgId }
    );

    for (const c of competitors) {
      await reportProgress(
        ctx,
        masterJobId,
        `Scraping competitor: ${c.name ?? "unknown"}...`,
        stats
      );
      countStep(
        await runStep(() =>
          ctx.runAction(
            internal.intelligence.competitor_monitor.scrapeCompetitor,
            { competitorId: c._id }
          )
        ),
        stats,
        `Scrape ${c.name ?? "competitor"}`
      );
    }

    for (const c of competitors) {
      await reportProgress(
        ctx,
        masterJobId,
        `Generating battlecard: ${c.name ?? "unknown"}...`,
        stats
      );
      await runStep(() =>
        ctx.runAction(internal.intelligence.synthesis.generateBattlecard, {
          organizationId: orgId,
          competitorId: c._id,
        })
      );
    }

    await reportProgress(
      ctx,
      masterJobId,
      "Updating feature comparison...",
      stats
    );
    await runStep(() =>
      ctx.runAction(internal.intelligence.synthesis.updateFeatureComparison, {
        organizationId: orgId,
      })
    );
  }

  // Synthesis
  await reportProgress(ctx, masterJobId, "Generating insights...", stats);
  countStep(
    await runStep(() =>
      ctx.runAction(internal.intelligence.synthesis.runSynthesis, {
        organizationId: orgId,
      })
    ),
    stats,
    "Insight synthesis"
  );

  // Non-fatal steps
  await reportProgress(
    ctx,
    masterJobId,
    "Boosting feedback priorities...",
    stats
  );
  await runStep(() =>
    ctx.runAction(
      internal.intelligence.feedback_integration.runPriorityBoostForOrg,
      { organizationId: orgId }
    )
  );
  await reportProgress(ctx, masterJobId, "Sending notifications...", stats);
  await runStep(() =>
    ctx.runAction(
      internal.intelligence.notifications.notifyHighPriorityInsights,
      { organizationId: orgId }
    )
  );

  return stats;
};

export const runOrgScan = internalAction({
  args: {
    organizationId: v.id("organizations"),
    masterJobId: v.optional(v.id("intelligenceJobs")),
  },
  handler: async (ctx, args) => {
    const { masterJobId } = args;

    // Mark master job as processing
    if (masterJobId) {
      await ctx.runMutation(internal.intelligence.crons.updateMasterJob, {
        jobId: masterJobId,
        status: "processing",
        currentStep: "Initializing scan...",
      });
    }

    const config = await ctx.runQuery(internal.intelligence.crons.getConfig, {
      organizationId: args.organizationId,
    });

    const hasCommunity = config?.redditEnabled || config?.webSearchEnabled;
    const hasCompetitors = config?.competitorTrackingEnabled;

    if (!(config && (hasCommunity || hasCompetitors))) {
      if (masterJobId) {
        await ctx.runMutation(internal.intelligence.crons.updateMasterJob, {
          jobId: masterJobId,
          status: "completed",
          currentStep: "No pipelines enabled",
          stats: { itemsFound: 0, itemsProcessed: 0, errors: 0 },
        });
      }
      return;
    }

    try {
      const result = await runPipelines(
        ctx,
        args.organizationId,
        !!hasCommunity,
        !!hasCompetitors,
        masterJobId
      );

      await ctx.runMutation(internal.intelligence.crons.updateScanTimestamps, {
        organizationId: args.organizationId,
      });

      const allFailed = result.errored > 0 && result.completed === 0;

      if (masterJobId) {
        await ctx.runMutation(internal.intelligence.crons.updateMasterJob, {
          jobId: masterJobId,
          status: allFailed ? "failed" : "completed",
          currentStep: allFailed ? "Scan failed" : "Scan complete",
          errorMessage:
            result.errorMessages.length > 0
              ? result.errorMessages.join(" | ")
              : undefined,
          stats: {
            itemsFound: result.completed + result.errored,
            itemsProcessed: result.completed,
            errors: result.errored,
          },
        });
      }
    } catch (error: unknown) {
      if (masterJobId) {
        await ctx
          .runMutation(internal.intelligence.crons.updateMasterJob, {
            jobId: masterJobId,
            status: "failed",
            currentStep: "Unexpected error",
            errorMessage: extractErrorMessage(error),
            stats: {
              itemsFound: 0,
              itemsProcessed: 0,
              errors: 1,
            },
          })
          .catch(() => {
            // Last resort — can't update job either
          });
      }
    }
  },
});
