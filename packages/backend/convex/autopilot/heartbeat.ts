/**
 * Heartbeat — single cron that checks wake conditions for all agents.
 *
 * Replaces 20+ individual crons with a single 3-minute interval.
 * Pure functions exported for testability.
 *
 * WORK-DRIVEN ARCHITECTURE: Agents wake ONLY when there's actual work
 * on the shared board. No time-based fallbacks. The pipeline is self-sustaining:
 *   Growth → documents → PM → stories → CTO → specs → Dev → ships → Growth
 *
 * The only reasons the company stops:
 *   1. Waiting for President approval (items in needsReview)
 *   2. Plan limits / credits exhausted (guards block execution)
 *   3. Pipeline is full (cap reached, waiting for work to complete)
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction, internalQuery } from "../_generated/server";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const THREE_STORY_THRESHOLD = 3;

// ============================================
// PURE WAKE CONDITION FUNCTIONS (for testing)
// ============================================

interface ActivitySummary {
  approvedSpecCount: number;
  discoveredLeadCount: number;
  failedRunCount: number;
  hasInitiatives: boolean;
  hasResearchDocs: boolean;
  leadsNeedingFollowUp: number;
  newNoteCount: number;
  newSupportConversationCount: number;
  now: number;
  readyStoryCount: number;
  recentErrorCount: number;
  shippedFeaturesWithoutContent: number;
  stuckReviewCount: number;
}

/**
 * PM wakes when there's planning work to do:
 * - No initiatives exist (bootstrap the roadmap)
 * - New notes from other agents need processing
 * - Story pipeline is running low (agents need more work)
 */
export const shouldWakePM = (summary: ActivitySummary): boolean => {
  if (!summary.hasInitiatives) {
    return true;
  }
  if (summary.newNoteCount > 0) {
    return true;
  }
  if (summary.readyStoryCount < THREE_STORY_THRESHOLD) {
    return true;
  }
  return false;
};

/**
 * CTO wakes when stories need technical specs.
 * Purely work-driven — only when stories are ready.
 */
export const shouldWakeCTO = (summary: ActivitySummary): boolean => {
  return summary.readyStoryCount > 0;
};

/**
 * Dev wakes when specs are approved or runs need retrying.
 * Purely work-driven — only when code work exists.
 */
export const shouldWakeDev = (summary: ActivitySummary): boolean => {
  return summary.approvedSpecCount > 0 || summary.failedRunCount > 0;
};

/**
 * Growth wakes when there's content or research work:
 * - No research docs exist (bootstrap — prime the pipeline)
 * - Shipped features need content/announcements
 */
export const shouldWakeGrowth = (summary: ActivitySummary): boolean => {
  if (!summary.hasResearchDocs) {
    return true;
  }
  if (summary.shippedFeaturesWithoutContent > 0) {
    return true;
  }
  return false;
};

/**
 * Sales wakes when there's pipeline work:
 * - Discovered leads need initial outreach
 * - Leads have overdue follow-ups
 */
export const shouldWakeSales = (summary: ActivitySummary): boolean => {
  if (summary.discoveredLeadCount > 0) {
    return true;
  }
  if (summary.leadsNeedingFollowUp > 0) {
    return true;
  }
  return false;
};

/**
 * CEO wakes when coordination is needed:
 * - Items stuck in review (bottleneck)
 * - Recent errors need attention (agent issues)
 */
export const shouldWakeCEO = (summary: ActivitySummary): boolean => {
  if (summary.stuckReviewCount > 0) {
    return true;
  }
  if (summary.recentErrorCount > 0) {
    return true;
  }
  return false;
};

/**
 * Support wakes when new conversations arrive.
 * Purely work-driven — only when support threads exist.
 */
export const shouldWakeSupport = (summary: ActivitySummary): boolean => {
  return summary.newSupportConversationCount > 0;
};

// ============================================
// QUERY — collect wake conditions
// ============================================

export const checkWakeConditions = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    shouldWake: v.object({
      pm: v.boolean(),
      cto: v.boolean(),
      dev: v.boolean(),
      growth: v.boolean(),
      sales: v.boolean(),
      ceo: v.boolean(),
      support: v.boolean(),
    }),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

    // ---- Work items by type/status ----

    const readyStories = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "story")
      )
      .collect();
    const readyStoryCount = readyStories.filter(
      (s) => s.status === "todo"
    ).length;

    const specItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "spec")
      )
      .collect();
    const approvedSpecCount = specItems.filter(
      (s) => s.status === "in_review" || s.status === "done"
    ).length;

    // Bootstrap: check if initiatives exist
    const initiatives = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "initiative")
      )
      .take(1);
    const hasInitiatives = initiatives.length > 0;

    // ---- Failed runs (last 24h) ----

    const failedRuns = await ctx.db
      .query("autopilotRuns")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "failed")
      )
      .collect();
    const recentFailedRuns = failedRuns.filter(
      (r) => now - r.startedAt < ONE_DAY_MS
    );

    // ---- Documents (notes, support, research) ----

    const draftDocs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "draft")
      )
      .collect();
    const newNoteCount = draftDocs.filter((d) => d.type === "note").length;
    const newSupportConversationCount = draftDocs.filter(
      (d) => d.type === "support_thread"
    ).length;

    // Bootstrap: check if any research docs exist
    const researchDocs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "market_research")
      )
      .take(1);
    const hasResearchDocs = researchDocs.length > 0;

    // ---- Shipped features without content (Growth signal) ----

    const doneItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "done")
      )
      .collect();
    const recentDoneItems = doneItems.filter(
      (t) => now - t.updatedAt < ONE_WEEK_MS
    );
    const allDocs = await ctx.db
      .query("autopilotDocuments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const recentContentDocs = allDocs.filter(
      (g) => now - g.createdAt < ONE_WEEK_MS
    );

    // ---- Sales signals ----

    const leads = await ctx.db
      .query("autopilotLeads")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const discoveredLeadCount = leads.filter(
      (l) => l.status === "discovered"
    ).length;
    const leadsNeedingFollowUp = leads.filter(
      (l) =>
        l.nextFollowUpAt !== undefined &&
        l.nextFollowUpAt <= now &&
        l.status !== "converted" &&
        l.status !== "churned" &&
        l.status !== "disqualified"
    ).length;

    // ---- CEO coordination signals ----

    const reviewItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_review", (q) =>
        q.eq("organizationId", args.organizationId).eq("needsReview", true)
      )
      .collect();
    const stuckReviewCount = reviewItems.filter(
      (item) => now - item.updatedAt > ONE_DAY_MS
    ).length;

    const recentActivity = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(100);
    const recentErrorCount = recentActivity.filter(
      (a) => a.level === "error" && now - a.createdAt < ONE_DAY_MS
    ).length;

    // ---- Build summary ----

    const summary: ActivitySummary = {
      readyStoryCount,
      approvedSpecCount,
      failedRunCount: recentFailedRuns.length,
      newNoteCount,
      newSupportConversationCount,
      shippedFeaturesWithoutContent: Math.max(
        0,
        recentDoneItems.length - recentContentDocs.length
      ),
      hasInitiatives,
      hasResearchDocs,
      discoveredLeadCount,
      leadsNeedingFollowUp,
      stuckReviewCount,
      recentErrorCount,
      now,
    };

    return {
      shouldWake: {
        pm: shouldWakePM(summary),
        cto: shouldWakeCTO(summary),
        dev: shouldWakeDev(summary),
        growth: shouldWakeGrowth(summary),
        sales: shouldWakeSales(summary),
        ceo: shouldWakeCEO(summary),
        support: shouldWakeSupport(summary),
      },
    };
  },
});

// ============================================
// ACTION — heartbeat entry point
// ============================================

/**
 * Check if a "Dev task paused" message was logged in the last 24h.
 * Used to deduplicate the noisy "no credentials" log.
 */
export const hasRecentDevPauseLog = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - ONE_DAY_MS;
    const recentLogs = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(100);

    return recentLogs.some(
      (log) =>
        log.agent === "dev" &&
        log.createdAt > cutoff &&
        log.message.includes("Dev task paused")
    );
  },
});

/**
 * Schedule an agent to run asynchronously.
 * Uses ctx.scheduler.runAfter(0) so the heartbeat returns immediately.
 * Agents run in parallel, not blocking the heartbeat.
 */
const wakeAgent = async (
  ctx: { scheduler: ActionCtx["scheduler"] },
  orgId: Id<"organizations">,
  agent: string
): Promise<void> => {
  switch (agent) {
    case "pm":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.pm.analysis.runPMAnalysis,
        { organizationId: orgId }
      );
      break;
    case "cto":
      // CTO needs a specific taskId — dispatched by dispatchPendingTasks
      break;
    case "dev":
      // Dev needs a specific taskId — dispatched by dispatchPendingTasks
      break;
    case "growth":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.growth.content.runGrowthMarketResearch,
        { organizationId: orgId }
      );
      break;
    case "sales":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.sales.runSalesProspecting,
        { organizationId: orgId }
      );
      break;
    case "ceo":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.ceo.coordination.runCEOCoordination,
        { organizationId: orgId }
      );
      break;
    case "support":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.support.runSupportTriage,
        { organizationId: orgId }
      );
      break;
    default:
      break;
  }
};

/**
 * Dispatch pending tasks from the task board.
 * Each pending task is assigned to an agent. When the heartbeat runs,
 * it picks up pending tasks and routes them to execution.
 * Max 2 tasks per heartbeat tick to avoid overwhelming.
 */

interface HeartbeatCtx {
  runMutation: ActionCtx["runMutation"];
  runQuery: ActionCtx["runQuery"];
  scheduler: ActionCtx["scheduler"];
}

const dispatchDevTask = async (
  ctx: HeartbeatCtx,
  orgId: Id<"organizations">,
  task: {
    _id: Id<"autopilotWorkItems">;
    title: string;
    assignedAgent?: string | undefined;
  }
): Promise<boolean> => {
  const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
    organizationId: orgId,
  });
  if (!config) {
    return false;
  }
  const creds = await ctx.runQuery(
    internal.autopilot.config.getAdapterCredentials,
    { organizationId: orgId, adapter: config.adapter }
  );
  if (!creds?.isValid) {
    const recentDevPauseLogs = await ctx.runQuery(
      internal.autopilot.heartbeat.hasRecentDevPauseLog,
      { organizationId: orgId }
    );
    if (!recentDevPauseLogs) {
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: orgId,
        taskId: task._id,
        agent: "dev",
        level: "info",
        message:
          "Dev task paused — no coding adapter credentials. Configure in Settings to enable code execution.",
      });
    }
    return false;
  }
  await ctx.scheduler.runAfter(0, internal.autopilot.execution.executeTask, {
    organizationId: orgId,
    taskId: task._id,
  });
  return true;
};

const dispatchPendingTasks = async (
  ctx: HeartbeatCtx,
  orgId: Id<"organizations">
): Promise<void> => {
  const pendingTasks = await ctx.runQuery(
    internal.autopilot.tasks.getPendingTasks,
    { organizationId: orgId }
  );

  const MAX_DISPATCH_PER_TICK = 2;
  let dispatched = 0;

  for (const task of pendingTasks) {
    if (dispatched >= MAX_DISPATCH_PER_TICK) {
      break;
    }

    const agent = task.assignedAgent;
    if (!agent) {
      continue;
    }

    // Check if agent is enabled
    const agentEnabled = await ctx.runQuery(
      internal.autopilot.config.isAgentEnabled,
      { organizationId: orgId, agent }
    );
    if (!agentEnabled) {
      continue;
    }

    try {
      if (agent === "dev") {
        const dispatcedDev = await dispatchDevTask(ctx, orgId, task);
        if (!dispatcedDev) {
          continue;
        }
      } else if (agent === "cto") {
        await ctx.scheduler.runAfter(
          0,
          internal.autopilot.agents.cto.runCTOSpecGeneration,
          { organizationId: orgId, taskId: task._id }
        );
      } else {
        await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
          taskId: task._id,
          status: "in_progress",
        });

        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: orgId,
          taskId: task._id,
          agent,
          level: "action",
          message: `Task picked up: ${task.title}`,
        });
      }

      dispatched++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.autopilot.tasks.logActivity, {
        organizationId: orgId,
        taskId: task._id,
        agent: "system",
        level: "error",
        message: `Failed to dispatch task to ${agent}: ${msg}`,
      });
    }
  }
};

export const runHeartbeat = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const configs = await ctx.runQuery(
      internal.autopilot.config.getEnabledConfigs,
      {}
    );

    for (const config of configs) {
      const orgId = config.organizationId;

      const guardResult = await ctx.runQuery(
        internal.autopilot.guards.checkGuards,
        { organizationId: orgId, agent: "system" }
      );

      if (!guardResult.allowed) {
        continue;
      }

      const { shouldWake } = await ctx.runQuery(
        internal.autopilot.heartbeat.checkWakeConditions,
        { organizationId: orgId }
      );

      const enabledAgents = await ctx.runQuery(
        internal.autopilot.config.getEnabledAgents,
        { organizationId: orgId }
      );
      const enabledSet = new Set(enabledAgents);

      // Check pipeline capacity before waking PM (avoid waking just to skip)
      const taskCapUsage = await ctx.runQuery(
        internal.autopilot.config.getTaskCapUsage,
        { organizationId: orgId }
      );
      const pipelineFull = taskCapUsage.totalPending >= taskCapUsage.totalCap;

      for (const [agent, wake] of Object.entries(shouldWake)) {
        if (!(wake && enabledSet.has(agent))) {
          continue;
        }
        // Don't wake PM if pipeline is full — it can't create tasks anyway
        if (agent === "pm" && pipelineFull) {
          continue;
        }
        await wakeAgent(ctx, orgId, agent);
      }

      // Also: dispatch any pending tasks to their assigned agents.
      // This handles the task board work (assigned tasks from PM/onboarding).
      await dispatchPendingTasks(ctx, orgId);
    }

    return null;
  },
});
