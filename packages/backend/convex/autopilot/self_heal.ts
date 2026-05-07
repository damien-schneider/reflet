/**
 * Self-Healing — automatically cleans up stuck and orphaned work items.
 *
 * Runs every 10 minutes via cron. Handles:
 *   1. Work items stuck in_progress > 1 hour with no activity → cancel
 *   2. Work items assigned to disabled agents in todo > 1 hour → cancel
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
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
 * Check if an agent has recent activity (within window).
 * Used by self-heal to avoid cancelling tasks that are actively being worked on.
 */
export const hasRecentAgentActivity = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: v.string(),
    windowMs: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.windowMs;
    const recentLogs = await ctx.db
      .query("autopilotActivityLog")
      .withIndex("by_org_created", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(50);

    return recentLogs.some(
      (log) => log.agent === args.agent && log.createdAt > cutoff
    );
  },
});

// ============================================
// MAIN SELF-HEALING ACTION
// ============================================

/**
 * Run self-healing for all enabled organizations.
 * Called by cron every 10 minutes.
 */
export const runSelfHealing = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(
      internal.autopilot.config.getEnabledConfigs
    );

    for (const org of orgs) {
      try {
        let healed = 0;

        // 1. Work items stuck in_progress > 2 hours → cancel
        //    (but skip if the assigned agent has recent activity)
        const stuckItems = await ctx.runQuery(
          internal.autopilot.self_heal.getStuckInProgressTasks,
          {
            organizationId: org.organizationId,
            thresholdMs: TWO_HOURS,
          }
        );

        for (const item of stuckItems) {
          // Check if the assigned agent has been active recently — if so, task isn't truly stuck
          if (item.assignedAgent) {
            const agentActive = await ctx.runQuery(
              internal.autopilot.self_heal.hasRecentAgentActivity,
              {
                organizationId: org.organizationId,
                agent: item.assignedAgent,
                windowMs: RECENT_ACTIVITY_WINDOW,
              }
            );
            if (agentActive) {
              continue;
            }
          }
          await ctx.runMutation(
            internal.autopilot.self_heal.failTaskWithReason,
            {
              taskId: item._id,
              reason: "Auto-cancelled: no progress for 2 hours",
            }
          );
          healed++;
        }

        // 2. Work items assigned to disabled agents in todo > 2 hours → cancel
        const orphanedItems = await ctx.runQuery(
          internal.autopilot.self_heal.getOrphanedPendingTasks,
          {
            organizationId: org.organizationId,
            thresholdMs: TWO_HOURS,
          }
        );

        for (const item of orphanedItems) {
          await ctx.runMutation(
            internal.autopilot.self_heal.cancelTaskWithReason,
            {
              taskId: item._id,
              reason: `Auto-cancelled: ${item.assignedAgent ?? "unknown"} agent is disabled`,
            }
          );
          healed++;
        }

        // 3. Log ONE summary if anything was healed
        if (healed > 0) {
          await ctx.runMutation(internal.autopilot.task_mutations.logActivity, {
            organizationId: org.organizationId,
            agent: "system",
            level: "success",
            message: `Self-healing: cleaned up ${healed} work items`,
            details: `Stuck: ${stuckItems.length}, Orphaned: ${orphanedItems.length}`,
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
