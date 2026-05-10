/**
 * Self-Healing — automatically cleans up stuck and orphaned work items.
 *
 * Runs every 10 minutes via cron. Handles:
 *   1. Work items stuck in_progress > 1 hour with no activity → cancel
 *   2. Work items assigned to disabled agents in todo > 1 hour → cancel
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";

const TWO_HOURS = 2 * 60 * 60 * 1000;
const RECENT_ACTIVITY_WINDOW = 30 * 60 * 1000;

// ============================================
// QUERIES
// ============================================

/**
 * Find work items stuck in_progress for longer than the threshold.
 */
export const getStuckInProgressTasks = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    thresholdMs: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("autopilotWorkItems"),
      title: v.string(),
      assignedAgent: v.optional(v.string()),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.thresholdMs;

    const inProgressItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "in_progress")
      )
      .collect();

    return inProgressItems
      .filter((t) => t.updatedAt < cutoff)
      .map((t) => ({
        _id: t._id,
        title: t.title,
        assignedAgent: t.assignedAgent,
        updatedAt: t.updatedAt,
      }));
  },
});

/**
 * Find todo work items assigned to disabled agents that have been waiting > threshold.
 */
export const getOrphanedPendingTasks = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    thresholdMs: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("autopilotWorkItems"),
      title: v.string(),
      assignedAgent: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.thresholdMs;

    const enabledAgents: string[] = await ctx.runQuery(
      internal.autopilot.config.getEnabledAgents,
      { organizationId: args.organizationId }
    );
    const enabledSet = new Set<string>(enabledAgents);

    const todoItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "todo")
      )
      .collect();

    return todoItems
      .filter(
        (t) =>
          t.assignedAgent &&
          !enabledSet.has(t.assignedAgent) &&
          t.createdAt < cutoff
      )
      .map((t) => ({
        _id: t._id,
        title: t.title,
        assignedAgent: t.assignedAgent,
      }));
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Cancel a work item with a reason (used by self-healing).
 */
export const cancelTaskWithReason = internalMutation({
  args: {
    taskId: v.id("autopilotWorkItems"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.taskId);
    if (!item) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      status: "cancelled",
      updatedAt: now,
    });

    await ctx.db.insert("autopilotActivityLog", {
      organizationId: item.organizationId,
      workItemId: args.taskId,
      agent: item.assignedAgent ?? "system",
      level: "error",
      message: `Self-heal cancelled work item: ${item.title}`,
      details: args.reason,
      createdAt: now,
    });

    return null;
  },
});

/**
 * Fail a work item (alias for cancel in new schema).
 */
export const failTaskWithReason = internalMutation({
  args: {
    taskId: v.id("autopilotWorkItems"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.taskId);
    if (!item) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      status: "cancelled",
      updatedAt: now,
    });

    await ctx.db.insert("autopilotActivityLog", {
      organizationId: item.organizationId,
      workItemId: args.taskId,
      agent: item.assignedAgent ?? "system",
      level: "error",
      message: `Self-heal failed work item: ${item.title}`,
      details: args.reason,
      createdAt: now,
    });

    return null;
  },
});

/**
 * Check if a work item has recent activity (within window).
 * Used by self-heal to avoid cancelling tasks that are actively being worked on.
 */
export const hasRecentTaskActivity = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: v.string(),
    taskId: v.id("autopilotWorkItems"),
    windowMs: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.windowMs;
    const taskLogs = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_work_item", (q) => q.eq("workItemId", args.taskId))
      .collect();

    return taskLogs.some(
      (log) =>
        log.organizationId === args.organizationId &&
        log.agent === args.agent &&
        log.createdAt > cutoff
    );
  },
});

type SelfHealCtx = Pick<ActionCtx, "runAction" | "runMutation" | "runQuery">;

interface HealResult {
  healed: number;
  scanned: number;
}

async function healStuckTasks(
  ctx: SelfHealCtx,
  organizationId: Id<"organizations">
): Promise<HealResult> {
  const stuckItems = await ctx.runQuery(
    internal.autopilot.self_heal.getStuckInProgressTasks,
    {
      organizationId,
      thresholdMs: TWO_HOURS,
    }
  );
  let healed = 0;

  for (const item of stuckItems) {
    if (item.assignedAgent) {
      const taskActive = await ctx.runQuery(
        internal.autopilot.self_heal.hasRecentTaskActivity,
        {
          agent: item.assignedAgent,
          organizationId,
          taskId: item._id,
          windowMs: RECENT_ACTIVITY_WINDOW,
        }
      );
      if (taskActive) {
        continue;
      }
    }

    const reason = "Auto-cancelled: no progress for 2 hours";
    await ctx.runAction(internal.autopilot.execution_lifecycle.cancelTask, {
      finalStatus: "cancelled",
      organizationId,
      taskId: item._id,
    });
    await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
      agent: item.assignedAgent ?? "system",
      details: reason,
      level: "error",
      message: `Self-heal cancelled work item: ${item.title}`,
      organizationId,
      workItemId: item._id,
    });
    healed++;
  }

  return { healed, scanned: stuckItems.length };
}

async function healOrphanedTasks(
  ctx: SelfHealCtx,
  organizationId: Id<"organizations">
): Promise<HealResult> {
  const orphanedItems = await ctx.runQuery(
    internal.autopilot.self_heal.getOrphanedPendingTasks,
    {
      organizationId,
      thresholdMs: TWO_HOURS,
    }
  );
  let healed = 0;

  for (const item of orphanedItems) {
    await ctx.runMutation(internal.autopilot.self_heal.cancelTaskWithReason, {
      reason: `Auto-cancelled: ${item.assignedAgent ?? "unknown"} agent is disabled`,
      taskId: item._id,
    });
    healed++;
  }

  return { healed, scanned: orphanedItems.length };
}

// ============================================
// MAIN SELF-HEALING ACTION
// ============================================

/**
 * Run self-healing for all active organizations.
 * Called by cron every 10 minutes.
 */
export const runSelfHealing = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(
      internal.autopilot.config.getSelfHealingConfigs
    );

    for (const org of orgs) {
      try {
        const stuck = await healStuckTasks(ctx, org.organizationId);
        const orphaned = await healOrphanedTasks(ctx, org.organizationId);
        const healed = stuck.healed + orphaned.healed;

        if (healed > 0) {
          await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
            organizationId: org.organizationId,
            agent: "system",
            level: "success",
            message: `Self-healing: cleaned up ${healed} work items`,
            details: `Stuck: ${stuck.scanned}, Orphaned: ${orphaned.scanned}`,
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown self-healing error";
        await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
          organizationId: org.organizationId,
          agent: "system",
          level: "error",
          message: "Self-healing failed",
          details: message,
        });
      }
    }

    return null;
  },
});
