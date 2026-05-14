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
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction, internalQuery } from "../_generated/server";

const MAX_AGENTS_PER_CYCLE = 3;
const NO_OUTPUT_RETRY_COOLDOWN_MS = 30 * 60 * 1000;

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
        q.eq("organizationId", args.organizationId).gt("createdAt", cutoff)
      )
      .filter((q) => q.eq(q.field("agent"), args.agent))
      .collect();

    return recentLogs.some((log) => log.level === "action");
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
    const cutoff = Date.now() - NO_OUTPUT_RETRY_COOLDOWN_MS;
    const recentLogs = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId).gt("createdAt", cutoff)
      )
      .filter((q) => q.eq(q.field("agent"), args.agent))
      .collect();
    recentLogs.sort((a, b) => b.createdAt - a.createdAt);

    // Find the most recent action (wake) for this agent
    const lastAction = recentLogs.find((log) => log.level === "action");

    if (!lastAction) {
      return true; // No recent run — allow waking
    }

    // Check if there's a success log after the last action
    return recentLogs.some(
      (log) => log.level === "success" && log.createdAt >= lastAction.createdAt
    );
  },
});

interface WakeContext {
  chainGated: boolean;
  openTaskCount: number;
  shippedFeaturesWithoutContent: boolean;
  wakeThreshold: number;
}

const logChainProducerWake = async (
  ctx: { runMutation: ActionCtx["runMutation"] },
  params: {
    agent: Doc<"autopilotActivityLog">["agent"];
    organizationId: Id<"organizations">;
    target: string;
  }
): Promise<void> => {
  await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
    organizationId: params.organizationId,
    agent: params.agent,
    level: "action",
    message: `Chain producer scheduled: ${params.target}`,
  });
};

function isChainProducerAgent(
  agent: string
): agent is Doc<"autopilotActivityLog">["agent"] {
  return agent === "cto" || agent === "growth" || agent === "pm";
}

type ChainProducer =
  | typeof internal.autopilot.agents.chain_producers.produceCodebaseUnderstanding
  | typeof internal.autopilot.agents.chain_producers.produceIdentity
  | typeof internal.autopilot.agents.chain_producers.produceBrandVoice
  | typeof internal.autopilot.agents.chain_producers.produceFeatureCatalog
  | typeof internal.autopilot.agents.chain_producers.produceScope
  | typeof internal.autopilot.agents.chain_producers.produceMarketAnalysis
  | typeof internal.autopilot.agents.chain_producers.produceTargetDefinition
  | typeof internal.autopilot.agents.chain_producers.producePersonas
  | typeof internal.autopilot.agents.chain_producers.produceUseCases;

interface ChainProducerCandidate {
  condition: boolean;
  producer: ChainProducer;
}

const buildCtoChainCandidates = (
  chainState: Record<string, string>
): ChainProducerCandidate[] => {
  const codebaseReady = chainState.codebase_understanding === "published";
  return [
    {
      producer:
        internal.autopilot.agents.chain_producers.produceCodebaseUnderstanding,
      condition: chainState.codebase_understanding === "missing",
    },
    {
      producer: internal.autopilot.agents.chain_producers.produceIdentity,
      condition: codebaseReady && chainState.identity === "missing",
    },
    {
      producer: internal.autopilot.agents.chain_producers.produceBrandVoice,
      condition: codebaseReady && chainState.brand_voice === "missing",
    },
    {
      producer: internal.autopilot.agents.chain_producers.produceFeatureCatalog,
      condition: codebaseReady && chainState.feature_catalog === "missing",
    },
    {
      producer: internal.autopilot.agents.chain_producers.produceScope,
      condition: codebaseReady && chainState.scope === "missing",
    },
  ];
};

const buildPmChainCandidates = (
  chainState: Record<string, string>
): ChainProducerCandidate[] => [
  {
    producer: internal.autopilot.agents.chain_producers.produceTargetDefinition,
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
      chainState.personas === "published" && chainState.use_cases === "missing",
  },
];

interface GrowthDispatchTarget {
  scheduledAction:
    | typeof internal.autopilot.agents.chain_producers.produceMarketAnalysis
    | typeof internal.autopilot.agents.community_discovery.runCommunityDiscovery
    | typeof internal.autopilot.agents.growth.drafts.producer.runCommunityDraftGeneration;
  target: string;
}

const isKnowledgeChainPublished = (
  chainState: Record<string, string>
): boolean =>
  chainState.identity === "published" &&
  chainState.brand_voice === "published" &&
  chainState.feature_catalog === "published" &&
  chainState.scope === "published";

const pickGrowthDispatch = (
  chainState: Record<string, string>
): GrowthDispatchTarget | null => {
  if (
    isKnowledgeChainPublished(chainState) &&
    chainState.market_analysis === "missing"
  ) {
    return {
      target: "market_analysis",
      scheduledAction:
        internal.autopilot.agents.chain_producers.produceMarketAnalysis,
    };
  }
  if (
    chainState.personas === "published" &&
    chainState.use_cases === "published" &&
    chainState.community_posts === "missing"
  ) {
    return {
      target: "community_posts",
      scheduledAction:
        internal.autopilot.agents.community_discovery.runCommunityDiscovery,
    };
  }
  if (
    chainState.community_posts === "published" &&
    chainState.drafts === "missing"
  ) {
    return {
      target: "drafts",
      scheduledAction:
        internal.autopilot.agents.growth.drafts.producer
          .runCommunityDraftGeneration,
    };
  }
  return null;
};

/**
 * Dispatch the chain producer for an agent's next actionable node.
 * Returns true if a producer was dispatched; false if no chain work for this agent.
 */
const dispatchChainProducer = async (
  ctx: {
    runMutation: ActionCtx["runMutation"];
    runQuery: ActionCtx["runQuery"];
    scheduler: ActionCtx["scheduler"];
  },
  orgId: Id<"organizations">,
  agent: string
): Promise<boolean> => {
  if (!isChainProducerAgent(agent)) {
    return false;
  }

  const chainState = (await ctx.runQuery(
    internal.autopilot.chain.getChainState,
    { organizationId: orgId }
  )) as Record<string, string>;

  if (agent === "growth") {
    const dispatch = pickGrowthDispatch(chainState);
    if (!dispatch) {
      return false;
    }
    await logChainProducerWake(ctx, {
      agent,
      organizationId: orgId,
      target: dispatch.target,
    });
    await ctx.scheduler.runAfter(0, dispatch.scheduledAction, {
      organizationId: orgId,
    });
    return true;
  }

  let candidates: ChainProducerCandidate[] = [];
  if (agent === "cto") {
    candidates = buildCtoChainCandidates(chainState);
  } else if (agent === "pm") {
    candidates = buildPmChainCandidates(chainState);
  }

  for (const { producer, condition } of candidates) {
    if (condition) {
      await logChainProducerWake(ctx, {
        agent,
        organizationId: orgId,
        target: "chain artifact",
      });
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
  ctx: {
    runMutation: ActionCtx["runMutation"];
    runQuery: ActionCtx["runQuery"];
    scheduler: ActionCtx["scheduler"];
  },
  orgId: Id<"organizations">,
  agent: string,
  wakeContext: WakeContext
): Promise<void> => {
  // Try chain producer first — chain takes precedence over legacy endpoints
  const dispatchedChain = await dispatchChainProducer(ctx, orgId, agent);
  if (dispatchedChain) {
    return;
  }

  // Chain gate: free-form (non-producer) agent work only runs when the
  // agent's chain dependencies are published. Producers handle their own
  // gating via dispatchChainProducer above; this protects everything else.
  const chainGate = await ctx.runQuery(
    internal.autopilot.chain.getAgentChainGate,
    { organizationId: orgId, agent }
  );
  if (!chainGate.ready) {
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      organizationId: orgId,
      agent: "system",
      level: "info",
      message: `Wake skipped for ${agent} — chain not ready (waiting on: ${chainGate.missing.join(", ")})`,
    });
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
      await ctx.scheduler.runAfter(
        0,
        internal.autopilot.agents.validation.community_posts
          .runCommunityPostValidatorPass,
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

interface PendingDispatchTask {
  _id: Id<"autopilotWorkItems">;
  assignedAgent?: string | undefined;
  title: string;
}

type DispatchableAgent = "cto" | "growth" | "sales" | "support";

const checkoutTaskForAgent = async (
  ctx: HeartbeatCtx,
  orgId: Id<"organizations">,
  task: PendingDispatchTask,
  agent: DispatchableAgent
): Promise<boolean> => {
  const checkedOut = await ctx.runMutation(
    internal.autopilot.execution_lifecycle.checkoutTask,
    {
      taskId: task._id,
      agent,
    }
  );
  if (!checkedOut) {
    return false;
  }

  await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
    organizationId: orgId,
    taskId: task._id,
    agent,
    level: "action",
    message: `Task picked up: ${task.title}`,
  });
  return true;
};

const dispatchCtoTask = async (
  ctx: HeartbeatCtx,
  orgId: Id<"organizations">,
  task: PendingDispatchTask
): Promise<boolean> => {
  const checkedOut = await checkoutTaskForAgent(ctx, orgId, task, "cto");
  if (!checkedOut) {
    return false;
  }

  await ctx.scheduler.runAfter(
    0,
    internal.autopilot.agents.cto.runCTOSpecGeneration,
    { organizationId: orgId, taskId: task._id }
  );
  return true;
};

const dispatchGrowthTask = async (
  ctx: HeartbeatCtx,
  orgId: Id<"organizations">,
  task: PendingDispatchTask
): Promise<boolean> => {
  const checkedOut = await checkoutTaskForAgent(ctx, orgId, task, "growth");
  if (!checkedOut) {
    return false;
  }

  await ctx.scheduler.runAfter(
    0,
    internal.autopilot.agents.growth.market_research.runGrowthMarketResearch,
    { organizationId: orgId, taskId: task._id }
  );
  return true;
};

const dispatchSalesTask = async (
  ctx: HeartbeatCtx,
  orgId: Id<"organizations">,
  task: PendingDispatchTask
): Promise<boolean> => {
  const checkedOut = await checkoutTaskForAgent(ctx, orgId, task, "sales");
  if (!checkedOut) {
    return false;
  }

  await ctx.scheduler.runAfter(
    0,
    internal.autopilot.agents.sales_prospecting.runSalesProspecting,
    { organizationId: orgId, taskId: task._id }
  );
  return true;
};

const dispatchSupportTask = async (
  ctx: HeartbeatCtx,
  orgId: Id<"organizations">,
  task: PendingDispatchTask
): Promise<boolean> => {
  const checkedOut = await checkoutTaskForAgent(ctx, orgId, task, "support");
  if (!checkedOut) {
    return false;
  }

  await ctx.scheduler.runAfter(
    0,
    internal.autopilot.agents.support.runSupportTriage,
    { organizationId: orgId, taskId: task._id }
  );
  return true;
};

const dispatchTaskToAgent = async (
  ctx: HeartbeatCtx,
  orgId: Id<"organizations">,
  task: PendingDispatchTask,
  agent: string
): Promise<boolean> => {
  if (agent === "cto") {
    return await dispatchCtoTask(ctx, orgId, task);
  }
  if (agent === "growth") {
    return await dispatchGrowthTask(ctx, orgId, task);
  }
  if (agent === "sales") {
    return await dispatchSalesTask(ctx, orgId, task);
  }
  if (agent === "support") {
    return await dispatchSupportTask(ctx, orgId, task);
  }
  return false;
};

const dispatchPendingTasks = async (
  ctx: HeartbeatCtx,
  orgId: Id<"organizations">,
  enabledAgentSet: Set<string>
): Promise<number> => {
  const pendingTasks = await ctx.runQuery(
    internal.autopilot.task_queries.getDispatchableTasks,
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
      const wasDispatched = await dispatchTaskToAgent(ctx, orgId, task, agent);
      if (!wasDispatched) {
        continue;
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
  wakeBlockers: Record<string, string>,
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
      skipped.push(`${agent} (${wakeBlockers[agent] ?? "no work"})`);
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

    await ctx.runMutation(internal.autopilot.routines.evaluateRoutines, {});

    for (const config of configs) {
      const orgId = config.organizationId;

      const guardResult = await ctx.runQuery(
        internal.autopilot.guards.checkGuards,
        { organizationId: orgId, agent: "system" }
      );

      if (!guardResult.allowed) {
        continue;
      }

      const { shouldWake, wakeBlockers, signals } = await ctx.runQuery(
        internal.autopilot.heartbeat_conditions.checkWakeConditions,
        { organizationId: orgId }
      );

      // Autonomous recovery: if CTO is stuck waiting for a repo analysis,
      // kick one off in the background so the chain can self-unblock.
      if (wakeBlockers.cto === "waiting for repo analysis") {
        await ctx.scheduler.runAfter(
          0,
          internal.autopilot.repo_analysis.bootRepoAnalysisIfStuck,
          { organizationId: orgId }
        );
      }

      const enabledAgents: string[] = await ctx.runQuery(
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
        wakeBlockers,
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

      if (enabledSet.has("sales")) {
        await ctx.scheduler.runAfter(
          0,
          internal.autopilot.integrations.email.sendApprovedOutreach,
          { organizationId: orgId }
        );
      }
      if (enabledSet.has("growth")) {
        await ctx.scheduler.runAfter(
          0,
          internal.autopilot.integrations.social.publishApprovedContent,
          { organizationId: orgId }
        );
      }

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
