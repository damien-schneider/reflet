/**
 * Heartbeat — dispatch and execution entry point.
 *
 * Single cron that evaluates wake conditions and dispatches agent tasks.
 * Wake condition logic lives in heartbeat_conditions.ts.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction, internalQuery } from "../_generated/server";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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
 * Check if an agent was recently woken (has an "action" log within the cooldown window).
 * Prevents the heartbeat from scheduling duplicate runs of the same agent.
 */
const AGENT_WAKE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export const isAgentRecentlyWoken = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - AGENT_WAKE_COOLDOWN_MS;
    const recentLogs = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(50);

    return recentLogs.some(
      (log) =>
        log.agent === args.agent &&
        log.level === "action" &&
        log.createdAt > cutoff
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
        internal.autopilot.agents.growth.market_research
          .runGrowthMarketResearch,
        { organizationId: orgId }
      );
      break;
    case "sales":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.sales_prospecting.runSalesProspecting,
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
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
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
  orgId: Id<"organizations">,
  enabledAgentSet: Set<string>
): Promise<number> => {
  const pendingTasks = await ctx.runQuery(
    internal.autopilot.task_queries.getPendingTasks,
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

    // Use the pre-fetched enabled set instead of querying per task
    if (!enabledAgentSet.has(agent)) {
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
        await ctx.runMutation(
          internal.autopilot.task_mutations.updateTaskStatus,
          {
            taskId: task._id,
            status: "in_progress",
          }
        );

        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
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
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        taskId: task._id,
        agent: "system",
        level: "error",
        message: `Failed to dispatch task to ${agent}: ${msg}`,
      });
    }
  }

  return dispatched;
};

interface WakeResult {
  skipped: string[];
  woken: string[];
}

/**
 * Evaluate each agent and decide whether to wake it.
 * Returns lists of woken and skipped agents with reasons.
 */
const evaluateAndWakeAgents = async (
  ctx: HeartbeatCtx & { runQuery: ActionCtx["runQuery"] },
  orgId: Id<"organizations">,
  shouldWake: Record<string, boolean>,
  enabledSet: Set<string>,
  pipelineFull: boolean
): Promise<WakeResult> => {
  const woken: string[] = [];
  const skipped: string[] = [];

  for (const [agent, wake] of Object.entries(shouldWake)) {
    if (!enabledSet.has(agent)) {
      skipped.push(`${agent} (disabled)`);
      continue;
    }
    if (!wake) {
      skipped.push(`${agent} (no work)`);
      continue;
    }
    if (agent === "pm" && pipelineFull) {
      skipped.push("pm (pipeline full)");
      continue;
    }
    const agentGuard = await ctx.runQuery(
      internal.autopilot.guards.checkGuards,
      { organizationId: orgId, agent }
    );
    if (!agentGuard.allowed) {
      skipped.push(`${agent} (${agentGuard.reason ?? "guard blocked"})`);
      continue;
    }
    const recentlyWoken = await ctx.runQuery(
      internal.autopilot.heartbeat.isAgentRecentlyWoken,
      { organizationId: orgId, agent }
    );
    if (recentlyWoken) {
      skipped.push(`${agent} (recently woken)`);
      continue;
    }
    await wakeAgent(ctx, orgId, agent);
    woken.push(agent);
  }

  return { woken, skipped };
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
        internal.autopilot.heartbeat_conditions.checkWakeConditions,
        { organizationId: orgId }
      );

      const enabledAgents = await ctx.runQuery(
        internal.autopilot.config.getEnabledAgents,
        { organizationId: orgId }
      );
      const enabledSet = new Set(enabledAgents);

      // Check pipeline capacity before waking PM (avoid waking just to skip)
      const taskCapUsage = await ctx.runQuery(
        internal.autopilot.config_task_caps.getTaskCapUsage,
        { organizationId: orgId }
      );
      const pipelineFull = taskCapUsage.totalPending >= taskCapUsage.totalCap;

      const { woken, skipped } = await evaluateAndWakeAgents(
        ctx,
        orgId,
        shouldWake,
        enabledSet,
        pipelineFull
      );

      // Dispatch any pending tasks to their assigned agents
      const tasksDispatched = await dispatchPendingTasks(
        ctx,
        orgId,
        enabledSet
      );

      // Log a single heartbeat summary per org
      const wokenStr = woken.length > 0 ? woken.join(", ") : "none";
      const skippedStr = skipped.length > 0 ? skipped.join(", ") : "none";
      await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
        organizationId: orgId,
        agent: "system",
        level: "info",
        message: `Heartbeat: woke [${wokenStr}], skipped [${skippedStr}], pipeline: ${taskCapUsage.totalPending}/${taskCapUsage.totalCap} active, ${tasksDispatched} dispatched`,
      });
    }

    return null;
  },
});
