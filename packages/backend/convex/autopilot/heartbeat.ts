/**
 * Heartbeat — single cron that checks wake conditions for all agents.
 *
 * Replaces 20+ individual crons with a single 3-minute interval.
 * Pure functions exported for testability.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction, internalQuery } from "../_generated/server";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const THREE_STORY_THRESHOLD = 3;

// ============================================
// PURE WAKE CONDITION FUNCTIONS (for testing)
// ============================================

interface ActivitySummary {
  approvedSpecCount: number;
  failedRunCount: number;
  lastArchitectActivity: number | null;
  lastCEOActivity: number | null;
  lastDocsActivity: number | null;
  lastGrowthActivity: number | null;
  lastPMActivity: number | null;
  lastSalesActivity: number | null;
  lastSecurityActivity: number | null;
  lastSupportActivity: number | null;
  newNoteCount: number;
  newPRCount: number;
  newSupportConversationCount: number;
  now: number;
  readyStoryCount: number;
  shippedFeaturesWithoutContent: number;
}

export const shouldWakePM = (summary: ActivitySummary): boolean => {
  const { lastPMActivity, readyStoryCount, newNoteCount, now } = summary;
  if (readyStoryCount < THREE_STORY_THRESHOLD) {
    return true;
  }
  if (newNoteCount > 0) {
    return true;
  }
  if (!lastPMActivity || now - lastPMActivity > FOUR_HOURS_MS) {
    return true;
  }
  return false;
};

export const shouldWakeCTO = (summary: ActivitySummary): boolean => {
  return summary.readyStoryCount > 0;
};

export const shouldWakeDev = (summary: ActivitySummary): boolean => {
  return summary.approvedSpecCount > 0 || summary.failedRunCount > 0;
};

export const shouldWakeGrowth = (summary: ActivitySummary): boolean => {
  const { lastGrowthActivity, shippedFeaturesWithoutContent, now } = summary;
  if (shippedFeaturesWithoutContent > 0) {
    return true;
  }
  if (!lastGrowthActivity || now - lastGrowthActivity > THREE_DAYS_MS) {
    return true;
  }
  return false;
};

export const shouldWakeSales = (summary: ActivitySummary): boolean => {
  if (summary.newNoteCount > 0) {
    return true;
  }
  // Daily check for follow-ups
  if (
    !summary.lastSalesActivity ||
    summary.now - summary.lastSalesActivity > ONE_DAY_MS
  ) {
    return true;
  }
  return false;
};

export const shouldWakeSecurity = (summary: ActivitySummary): boolean => {
  const { lastSecurityActivity, now } = summary;
  if (!lastSecurityActivity || now - lastSecurityActivity > ONE_DAY_MS) {
    return true;
  }
  return false;
};

export const shouldWakeCEO = (summary: ActivitySummary): boolean => {
  const { lastCEOActivity, now } = summary;
  if (!lastCEOActivity || now - lastCEOActivity > FOUR_HOURS_MS) {
    return true;
  }
  return false;
};

export const shouldWakeArchitect = (summary: ActivitySummary): boolean => {
  const { lastArchitectActivity, newPRCount, now } = summary;
  if (newPRCount > 0) {
    return true;
  }
  if (!lastArchitectActivity || now - lastArchitectActivity > ONE_WEEK_MS) {
    return true;
  }
  return false;
};

export const shouldWakeSupport = (summary: ActivitySummary): boolean => {
  const { lastSupportActivity, newSupportConversationCount, now } = summary;
  if (newSupportConversationCount > 0) {
    return true;
  }
  if (!lastSupportActivity || now - lastSupportActivity > ONE_DAY_MS) {
    return true;
  }
  return false;
};

export const shouldWakeDocs = (summary: ActivitySummary): boolean => {
  const { lastDocsActivity, now } = summary;
  if (!lastDocsActivity || now - lastDocsActivity > ONE_WEEK_MS) {
    return true;
  }
  return false;
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
      security: v.boolean(),
      ceo: v.boolean(),
      architect: v.boolean(),
      support: v.boolean(),
      docs: v.boolean(),
    }),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Collect activity log ONCE, reuse across all agents
    const recentActivity = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(200);

    const getLastActivity = (agent: string): number | null => {
      const entry = recentActivity.find((a) => a.agent === agent);
      return entry?.createdAt ?? null;
    };

    // Count stories in "ready" status
    const readyStories = await ctx.db
      .query("autopilotUserStories")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "ready")
      )
      .collect();

    // Count approved specs
    const approvedSpecs = await ctx.db
      .query("autopilotTechnicalSpecs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const approvedSpecCount = approvedSpecs.filter(
      (s) => s.status === "approved"
    ).length;

    // Count failed runs (last 24h)
    const failedRuns = await ctx.db
      .query("autopilotRuns")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "failed")
      )
      .collect();
    const recentFailedRuns = failedRuns.filter(
      (r) => now - r.startedAt < ONE_DAY_MS
    );

    // Count new notes
    const newNotes = await ctx.db
      .query("autopilotNotes")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "new")
      )
      .collect();

    // Count new support conversations
    const newConversations = await ctx.db
      .query("autopilotSupportConversations")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "new")
      )
      .collect();

    // Shipped features without content (simple heuristic)
    const completedTasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "completed")
      )
      .collect();
    const recentCompletedTasks = completedTasks.filter(
      (t) => t.completedAt && now - t.completedAt < ONE_WEEK_MS
    );
    const growthItems = await ctx.db
      .query("autopilotGrowthItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    const recentGrowthItems = growthItems.filter(
      (g) => now - g.createdAt < ONE_WEEK_MS
    );

    const summary: ActivitySummary = {
      lastPMActivity: getLastActivity("pm"),
      lastGrowthActivity: getLastActivity("growth"),
      lastSalesActivity: getLastActivity("sales"),
      lastSecurityActivity: getLastActivity("security"),
      lastCEOActivity: getLastActivity("system"),
      lastArchitectActivity: getLastActivity("architect"),
      lastSupportActivity: getLastActivity("support"),
      lastDocsActivity: getLastActivity("docs"),
      readyStoryCount: readyStories.length,
      approvedSpecCount,
      failedRunCount: recentFailedRuns.length,
      newNoteCount: newNotes.length,
      newSupportConversationCount: newConversations.length,
      newPRCount: 0,
      shippedFeaturesWithoutContent: Math.max(
        0,
        recentCompletedTasks.length - recentGrowthItems.length
      ),
      now,
    };

    return {
      shouldWake: {
        pm: shouldWakePM(summary),
        cto: shouldWakeCTO(summary),
        dev: shouldWakeDev(summary),
        growth: shouldWakeGrowth(summary),
        sales: shouldWakeSales(summary),
        security: shouldWakeSecurity(summary),
        ceo: shouldWakeCEO(summary),
        architect: shouldWakeArchitect(summary),
        support: shouldWakeSupport(summary),
        docs: shouldWakeDocs(summary),
      },
    };
  },
});

// ============================================
// ACTION — heartbeat entry point
// ============================================

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
    case "security":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.security.runSecurityScan,
        { organizationId: orgId, triggerReason: "daily_scan" }
      );
      break;
    case "ceo":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.ceo.coordination.runCEOCoordination,
        { organizationId: orgId }
      );
      break;
    case "architect":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.architect.runArchitectReview,
        { organizationId: orgId, triggerReason: "weekly_scan" }
      );
      break;
    case "support":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.support.runSupportTriage,
        { organizationId: orgId }
      );
      break;
    case "docs":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.docs.runDocsCheck,
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
const dispatchPendingTasks = async (
  ctx: {
    runQuery: ActionCtx["runQuery"];
    runMutation: ActionCtx["runMutation"];
    scheduler: ActionCtx["scheduler"];
  },
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

    // Check if agent is enabled
    const agentEnabled = await ctx.runQuery(
      internal.autopilot.config.isAgentEnabled,
      { organizationId: orgId, agent: task.assignedAgent }
    );
    if (!agentEnabled) {
      continue;
    }

    try {
      if (task.assignedAgent === "dev") {
        // Dev tasks need coding adapter credentials — check before dispatching
        const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
          organizationId: orgId,
        });
        if (!config) {
          continue;
        }
        const creds = await ctx.runQuery(
          internal.autopilot.config.getAdapterCredentials,
          { organizationId: orgId, adapter: config.adapter }
        );
        if (!creds?.isValid) {
          // No credentials — skip dev task silently (once per day max via activity log dedup)
          await ctx.runMutation(internal.autopilot.tasks.logActivity, {
            organizationId: orgId,
            taskId: task._id,
            agent: "dev",
            level: "info",
            message:
              "Dev task paused — no coding adapter credentials. Configure in Settings to enable code execution.",
          });
          continue;
        }
        await ctx.scheduler.runAfter(
          0,
          internal.autopilot.execution.executeTask,
          { organizationId: orgId, taskId: task._id }
        );
      } else if (task.assignedAgent === "cto") {
        // CTO tasks need the taskId to generate specs for specific stories
        await ctx.scheduler.runAfter(
          0,
          internal.autopilot.agents.cto.runCTOSpecGeneration,
          { organizationId: orgId, taskId: task._id }
        );
      } else {
        // For other agents (growth, security, architect, docs, sales, support):
        // Mark task as in_progress — the agent's proactive wake handles the work.
        await ctx.runMutation(internal.autopilot.tasks.updateTaskStatus, {
          taskId: task._id,
          status: "in_progress",
        });

        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: orgId,
          taskId: task._id,
          agent: task.assignedAgent,
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
        message: `Failed to dispatch task to ${task.assignedAgent}: ${msg}`,
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
