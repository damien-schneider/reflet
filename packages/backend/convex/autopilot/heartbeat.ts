/**
 * Heartbeat — dumb clock that consumes the role-skill schedule.
 *
 * Single cron tick. The wake/dispatch decision lives in `role_schedule.ts`
 * (single source of truth). Heartbeat fetches each org's schedule, dispatches
 * every entry whose state is `ready`, and exits silently.
 *
 * Hard rules:
 * - No per-cycle caps. No wake cooldowns. No "no output last run" deprioritization.
 * - Only legitimate blockers — billing/usage, circuit breaker, role disabled,
 *   chain dep / precondition, in-flight idempotency — may stop dispatch.
 * - Tick log only when work was dispatched. Silent clocks are silent.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";
import type { RoleNextAction, RoleScheduleEntry } from "./schedule/types";

interface HeartbeatCtx {
  runMutation: ActionCtx["runMutation"];
  runQuery: ActionCtx["runQuery"];
  scheduler: ActionCtx["scheduler"];
}

const logAction = async (
  ctx: HeartbeatCtx,
  orgId: Id<"organizations">,
  role: RoleSkill | "system",
  message: string,
  taskId?: Id<"autopilotWorkItems">
): Promise<void> => {
  await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
    organizationId: orgId,
    role,
    level: "action",
    message,
    ...(taskId ? { taskId } : {}),
  });
};

type RoleSkill = RoleScheduleEntry["role"];

const scheduleExecution = async (
  ctx: HeartbeatCtx,
  executionId: Id<"autopilotExecutions">
): Promise<boolean> => {
  await ctx.scheduler.runAfter(
    0,
    internal.autopilot.runtime.lifecycle.runExecutionFromRecord,
    { executionId }
  );
  return true;
};

const dispatchChainProducer = async (
  ctx: HeartbeatCtx,
  orgId: Id<"organizations">,
  role: RoleSkill,
  action: Extract<RoleNextAction, { kind: "chain_producer" }>
): Promise<boolean> => {
  await logAction(ctx, orgId, role, `Chain producer queued: ${action.node}`);
  const executionId = await ctx.runMutation(
    internal.autopilot.runtime.lifecycle.queueExecution,
    {
      organizationId: orgId,
      role,
      triggerReason: "dependency_ready",
      actionKind: "chain_producer",
      title: `Produce ${action.node}`,
      chainNode: action.node,
    }
  );
  return await scheduleExecution(ctx, executionId);
};

const dispatchByActionKind = async (
  ctx: HeartbeatCtx,
  orgId: Id<"organizations">,
  entry: RoleScheduleEntry,
  role: RoleSkill,
  action: RoleNextAction
): Promise<boolean> => {
  if (action.kind === "chain_producer") {
    return await dispatchChainProducer(ctx, orgId, role, action);
  }
  if (action.kind === "task_dispatch") {
    await logAction(
      ctx,
      orgId,
      role,
      `Task queued: ${action.title}`,
      action.taskId
    );
    const executionId = await ctx.runMutation(
      internal.autopilot.runtime.lifecycle.queueExecution,
      {
        organizationId: orgId,
        role: entry.role,
        triggerReason: "task_ready",
        actionKind: "task_dispatch",
        title: action.title,
        workItemId: action.taskId,
      }
    );
    return await scheduleExecution(ctx, executionId);
  }
  if (action.kind === "validation_pass") {
    await logAction(
      ctx,
      orgId,
      role,
      `Validator pass queued: ${action.count} item(s)`
    );
    const executionId = await ctx.runMutation(
      internal.autopilot.runtime.lifecycle.queueExecution,
      {
        organizationId: orgId,
        role: entry.role,
        triggerReason: "validation_required",
        actionKind: "validation_pass",
        title: `Validate ${action.count} item(s)`,
      }
    );
    return await scheduleExecution(ctx, executionId);
  }
  if (action.kind === "support_triage") {
    await logAction(
      ctx,
      orgId,
      role,
      `Support triage queued: ${action.count} thread(s)`
    );
    const executionId = await ctx.runMutation(
      internal.autopilot.runtime.lifecycle.queueExecution,
      {
        organizationId: orgId,
        role: entry.role,
        triggerReason: "support_conversation",
        actionKind: "support_triage",
        title: `Triage ${action.count} support thread(s)`,
      }
    );
    return await scheduleExecution(ctx, executionId);
  }
  if (action.kind === "ceo_coordination") {
    await logAction(
      ctx,
      orgId,
      role,
      `CEO coordination queued: ${action.reason}`
    );
    const executionId = await ctx.runMutation(
      internal.autopilot.runtime.lifecycle.queueExecution,
      {
        organizationId: orgId,
        role: entry.role,
        triggerReason: "coordination_required",
        actionKind: "ceo_coordination",
        title: `Coordinate ${action.reason}`,
      }
    );
    return await scheduleExecution(ctx, executionId);
  }
  await logAction(ctx, orgId, role, `Growth content queued: ${action.reason}`);
  const executionId = await ctx.runMutation(
    internal.autopilot.runtime.lifecycle.queueExecution,
    {
      organizationId: orgId,
      role: entry.role,
      triggerReason: "approved_delivery",
      actionKind: "growth_content",
      title: "Generate content for shipped features",
    }
  );
  return await scheduleExecution(ctx, executionId);
};

const dispatchEntry = async (
  ctx: HeartbeatCtx,
  orgId: Id<"organizations">,
  entry: RoleScheduleEntry
): Promise<boolean> => {
  if (entry.state !== "ready" || !entry.nextAction) {
    return false;
  }
  if (
    await ctx.runQuery(
      internal.autopilot.runtime.lifecycle.hasOpenExecutionForRole,
      { organizationId: orgId, role: entry.role }
    )
  ) {
    return false;
  }
  return await dispatchByActionKind(
    ctx,
    orgId,
    entry,
    entry.role,
    entry.nextAction
  );
};

const enabledRolesFromSchedule = (
  schedule: RoleScheduleEntry[]
): Set<string> => {
  const set = new Set<string>();
  for (const entry of schedule) {
    const disabled = entry.blockers.some((b) => b.kind === "role_disabled");
    if (!disabled) {
      set.add(entry.role);
    }
  }
  return set;
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
        { organizationId: orgId, role: "system" }
      );
      if (!guardResult.allowed) {
        continue;
      }

      const schedule = await ctx.runQuery(
        internal.autopilot.role_schedule.getRoleScheduleInternal,
        { organizationId: orgId }
      );

      // Autonomous recovery: if CTO is blocked waiting on repo analysis, kick
      // one off so the chain can self-unblock.
      const ctoEntry = schedule.find((entry) => entry.role === "cto");
      const repoAnalysisBlocked = ctoEntry?.blockers.some(
        (b) =>
          b.kind === "precondition_unmet" && b.node === "codebase_understanding"
      );
      if (repoAnalysisBlocked) {
        await ctx.scheduler.runAfter(
          0,
          internal.autopilot.repo_analysis.bootRepoAnalysisIfStuck,
          { organizationId: orgId }
        );
      }

      let dispatched = 0;
      for (const entry of schedule) {
        const wasDispatched = await dispatchEntry(ctx, orgId, entry);
        if (wasDispatched) {
          dispatched++;
        }
      }

      const enabledSet = enabledRolesFromSchedule(schedule);
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

      // Silent unless work was dispatched. This is the "dumb clock" rule —
      // we don't want the activity log to fill with "skipped [...]" noise.
      if (dispatched > 0) {
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: orgId,
          role: "system",
          level: "info",
          action: "heartbeat",
          message: `Heartbeat dispatched ${dispatched} role skill(s)`,
        });
      }
    }

    return null;
  },
});
