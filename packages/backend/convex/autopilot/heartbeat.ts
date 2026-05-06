/**
 * Heartbeat — dispatch and execution entry point.
 *
 * Single cron that evaluates wake conditions and dispatches agent tasks.
 * Wake condition logic lives in heartbeat_conditions.ts.
 *
 * Includes per-cycle budget enforcement:
 * - Max agents woken per cycle (prevents all agents firing at once)
 * - Agents that produced no user-visible output last cycle are deprioritized
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction, internalQuery } from "../_generated/server";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_AGENTS_PER_CYCLE = 3;

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
 * Check if an agent produced user-visible output in its last run.
 * "Output" = success log, new document created, or task status change.
 * If agent ran but produced nothing, it's deprioritized this cycle.
 */
export const didAgentProduceOutput = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const recentLogs = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(100);

    // Find the most recent action (wake) for this agent
    const lastAction = recentLogs.find(
      (log) => log.agent === args.agent && log.level === "action"
    );

    if (!lastAction) {
      return true; // No recent run — allow waking
    }

    // Check if there's a success log after the last action
    return recentLogs.some(
      (log) =>
        log.agent === args.agent &&
        log.level === "success" &&
        log.createdAt >= lastAction.createdAt
    );
  },
});

interface WakeContext {
  chainGated: boolean;
  openTaskCount: number;
  shippedFeaturesWithoutContent: boolean;
  wakeThreshold: number;
}

/**
 * Dispatch the chain producer for an agent's next actionable node.
 * Returns true if a producer was dispatched; false if no chain work for this agent.
 */
const dispatchChainProducer = async (
  ctx: { scheduler: ActionCtx["scheduler"]; runQuery: ActionCtx["runQuery"] },
  orgId: Id<"organizations">,
  agent: string
): Promise<boolean> => {
  const chainState = await ctx.runQuery(
    internal.autopilot.chain.getChainState,
    { organizationId: orgId }
  );

  type Producer =
    | typeof internal.autopilot.agents.chain_producers.produceCodebaseUnderstanding
    | typeof internal.autopilot.agents.chain_producers.produceAppDescription
    | typeof internal.autopilot.agents.chain_producers.produceMarketAnalysis
    | typeof internal.autopilot.agents.chain_producers.produceTargetDefinition
    | typeof internal.autopilot.agents.chain_producers.producePersonas
    | typeof internal.autopilot.agents.chain_producers.produceUseCases;

  const candidates: Array<{ producer: Producer; condition: boolean }> = [];

  if (agent === "cto") {
    candidates.push(
      {
        producer:
          internal.autopilot.agents.chain_producers
            .produceCodebaseUnderstanding,
        condition: chainState.codebase_understanding === "missing",
      },
      {
        producer:
          internal.autopilot.agents.chain_producers.produceAppDescription,
        condition:
          chainState.codebase_understanding === "published" &&
          chainState.app_description === "missing",
      }
    );
  } else if (agent === "growth") {
    if (
      chainState.app_description === "published" &&
      chainState.market_analysis === "missing"
    ) {
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.chain_producers.produceMarketAnalysis,
        { organizationId: orgId }
      );
      return true;
    }
    if (
      chainState.personas === "published" &&
      chainState.use_cases === "published" &&
      chainState.community_posts === "missing"
    ) {
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.community_discovery.runCommunityDiscovery,
        { organizationId: orgId }
      );
      return true;
    }
  } else if (agent === "pm") {
    candidates.push(
      {
        producer:
          internal.autopilot.agents.chain_producers.produceTargetDefinition,
        condition:
          chainState.market_analysis === "published" &&
          chainState.target_definition === "missing",
      },
      {
        producer: internal.autopilot.agents.chain_producers.producePersonas,
        condition:
          chainState.target_definition === "published" &&
          chainState.personas === "missing",
      },
      {
        producer: internal.autopilot.agents.chain_producers.produceUseCases,
        condition:
          chainState.personas === "published" &&
          chainState.use_cases === "missing",
      }
    );
  }

  for (const { producer, condition } of candidates) {
    if (condition) {
      await ctx.scheduler.runAfter(0, producer, { organizationId: orgId });
      return true;
    }
  }
  return false;
};

/**
 * Schedule an agent to run asynchronously.
 * Uses ctx.scheduler.runAfter(0) so the heartbeat returns immediately.
 * Agents run in parallel, not blocking the heartbeat.
 */
const wakeAgent = async (
  ctx: { scheduler: ActionCtx["scheduler"]; runQuery: ActionCtx["runQuery"] },
  orgId: Id<"organizations">,
  agent: string,
  wakeContext: WakeContext
): Promise<void> => {
  // Try chain producer first — chain takes precedence over legacy endpoints
  const dispatchedChain = await dispatchChainProducer(ctx, orgId, agent);
  if (dispatchedChain) {
    return;
  }

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
      if (wakeContext.shippedFeaturesWithoutContent) {
        // Shipped features need content — generate Reddit, HN, X, LinkedIn posts
        await ctx.scheduler.runAfter(
          0,
          internal.autopilot.agents.growth.content_generation
            .runGrowthGeneration,
          { organizationId: orgId, triggerReason: "scheduled" }
        );
      } else {
        // No content needed — run market research instead
        await ctx.scheduler.runAfter(
          0,
          internal.autopilot.agents.growth.market_research
            .runGrowthMarketResearch,
          { organizationId: orgId }
        );
      }
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
    case "validator":
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.validator.runValidatorPass,
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
 * Enforces MAX_AGENTS_PER_CYCLE to prevent all agents firing at once.
 * Deprioritizes agents that produced no output in their last run.
 */
const evaluateAndWakeAgents = async (
  ctx: HeartbeatCtx & { runQuery: ActionCtx["runQuery"] },
  orgId: Id<"organizations">,
  shouldWake: Record<string, boolean>,
  enabledSet: Set<string>,
  pipelineFull: boolean,
  wakeContext: WakeContext
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
    // Per-cycle budget: max N agents per heartbeat tick
    if (woken.length >= MAX_AGENTS_PER_CYCLE) {
      skipped.push(`${agent} (cycle budget exhausted)`);
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
    // Deprioritize agents that ran last cycle but produced no output
    const producedOutput = await ctx.runQuery(
      internal.autopilot.heartbeat.didAgentProduceOutput,
      { organizationId: orgId, agent }
    );
    if (!producedOutput) {
      skipped.push(`${agent} (no output last run)`);
      continue;
    }
    await wakeAgent(ctx, orgId, agent, wakeContext);
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

      const { shouldWake, signals } = await ctx.runQuery(
        internal.autopilot.heartbeat_conditions.checkWakeConditions,
        { organizationId: orgId }
      );

      const enabledAgents = await ctx.runQuery(
        internal.autopilot.config.getEnabledAgents,
        { organizationId: orgId }
      );
      const enabledSet = new Set(enabledAgents);
      // CEO, support, validator always allowed (orchestrator + safety roles)
      enabledSet.add("ceo");
      enabledSet.add("validator");

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
        pipelineFull,
        signals
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
