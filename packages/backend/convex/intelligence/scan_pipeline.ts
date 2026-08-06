import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { type ActionCtx, internalAction } from "../_generated/server";

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
    return { error: extractErrorMessage(error), ok: false };
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
      currentStep,
      jobId: masterJobId,
      stats: {
        errors: stats.errored,
        itemsFound: stats.completed + stats.errored,
        itemsProcessed: stats.completed,
      },
      status: "processing",
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
            internal.intelligence.competitor_scrape_action.scrapeCompetitor,
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
        ctx.runAction(internal.intelligence.battlecards.generateBattlecard, {
          competitorId: c._id,
          organizationId: orgId,
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
      ctx.runAction(
        internal.intelligence.feature_comparison.updateFeatureComparison,
        {
          organizationId: orgId,
        }
      )
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
    masterJobId: v.optional(v.id("intelligenceJobs")),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { masterJobId } = args;

    // Mark master job as processing
    if (masterJobId) {
      await ctx.runMutation(internal.intelligence.crons.updateMasterJob, {
        currentStep: "Initializing scan...",
        jobId: masterJobId,
        status: "processing",
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
          currentStep: "No pipelines enabled",
          jobId: masterJobId,
          stats: { errors: 0, itemsFound: 0, itemsProcessed: 0 },
          status: "completed",
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
          currentStep: allFailed ? "Scan failed" : "Scan complete",
          errorMessage:
            result.errorMessages.length > 0
              ? result.errorMessages.join(" | ")
              : undefined,
          jobId: masterJobId,
          stats: {
            errors: result.errored,
            itemsFound: result.completed + result.errored,
            itemsProcessed: result.completed,
          },
          status: allFailed ? "failed" : "completed",
        });
      }
    } catch (error: unknown) {
      if (masterJobId) {
        await ctx
          .runMutation(internal.intelligence.crons.updateMasterJob, {
            currentStep: "Unexpected error",
            errorMessage: extractErrorMessage(error),
            jobId: masterJobId,
            stats: {
              errors: 1,
              itemsFound: 0,
              itemsProcessed: 0,
            },
            status: "failed",
          })
          .catch(() => {
            // Last resort — can't update job either
          });
      }
    }
  },
});
