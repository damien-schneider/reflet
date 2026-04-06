/**
 * Autopilot task cap queries — pending task limits per agent and total.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../_generated/server";

// ============================================
// TASK CAP DEFAULTS
// ============================================

const DEFAULT_MAX_PENDING_PER_AGENT = 2;
const DEFAULT_MAX_PENDING_TOTAL = 5;

/**
 * All agent names and their corresponding config fields.
 */
const AGENT_CONFIG_FIELDS = [
  { name: "pm", field: "pmEnabled" },
  { name: "cto", field: "ctoEnabled" },
  { name: "dev", field: "devEnabled" },
  { name: "growth", field: "growthEnabled" },
  { name: "support", field: "supportEnabled" },
  { name: "sales", field: "salesEnabled" },
] as const;

async function fetchEnabledAgents(
  ctx: { db: QueryCtx["db"] },
  organizationId: Id<"organizations">
): Promise<string[]> {
  const config = await ctx.db
    .query("autopilotConfig")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .unique();

  if (!config || (config.autonomyMode ?? "supervised") === "stopped") {
    return [];
  }

  return AGENT_CONFIG_FIELDS.filter(
    ({ field }) =>
      (config[field as keyof typeof config] as boolean | undefined) !== false
  ).map(({ name }) => name);
}

/**
 * Check if creating a new task would exceed the per-agent pending cap.
 */
export const checkAgentTaskCap = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    agent: v.string(),
  },
  returns: v.object({
    allowed: v.boolean(),
    current: v.number(),
    cap: v.number(),
  }),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const cap =
      config?.maxPendingTasksPerAgent ?? DEFAULT_MAX_PENDING_PER_AGENT;

    const todoItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "todo")
      )
      .collect();

    const agentPending = todoItems.filter(
      (w) => w.assignedAgent === args.agent
    ).length;

    return {
      allowed: agentPending < cap,
      current: agentPending,
      cap,
    };
  },
});

/**
 * Check if creating a new work item would exceed the total pending cap.
 */
export const checkTotalTaskCap = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    allowed: v.boolean(),
    current: v.number(),
    cap: v.number(),
  }),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const cap = config?.maxPendingTasksTotal ?? DEFAULT_MAX_PENDING_TOTAL;

    const todoItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "todo")
      )
      .collect();

    return {
      allowed: todoItems.length < cap,
      current: todoItems.length,
      cap,
    };
  },
});

/**
 * Get work item cap usage per agent (for dashboard display).
 */
export const getTaskCapUsage = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    perAgentCap: v.number(),
    totalCap: v.number(),
    totalPending: v.number(),
    agentUsage: v.array(
      v.object({
        agent: v.string(),
        pending: v.number(),
        cap: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const perAgentCap =
      config?.maxPendingTasksPerAgent ?? DEFAULT_MAX_PENDING_PER_AGENT;
    const totalCap = config?.maxPendingTasksTotal ?? DEFAULT_MAX_PENDING_TOTAL;

    // Count ALL active work items (todo + in_progress) to prevent pile-up
    const todoItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "todo")
      )
      .collect();

    const inProgressItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "in_progress")
      )
      .collect();

    const allActiveItems = [...todoItems, ...inProgressItems];

    const enabledAgents = await fetchEnabledAgents(ctx, args.organizationId);
    const agentCounts = new Map<string, number>();

    for (const item of allActiveItems) {
      if (item.assignedAgent) {
        agentCounts.set(
          item.assignedAgent,
          (agentCounts.get(item.assignedAgent) ?? 0) + 1
        );
      }
    }

    const agentUsage = enabledAgents.map((agent) => ({
      agent,
      pending: agentCounts.get(agent) ?? 0,
      cap: perAgentCap,
    }));

    return {
      perAgentCap,
      totalCap,
      totalPending: allActiveItems.length,
      agentUsage,
    };
  },
});

/**
 * Get orphaned work items — items assigned to currently disabled agents.
 */
export const getOrphanedTasks = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      _id: v.id("autopilotWorkItems"),
      title: v.string(),
      assignedAgent: v.optional(v.string()),
      status: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const enabledAgents = await fetchEnabledAgents(ctx, args.organizationId);

    const todoItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "todo")
      )
      .collect();

    const inProgressItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "in_progress")
      )
      .collect();

    const allActiveItems = [...todoItems, ...inProgressItems];
    const enabledSet = new Set(enabledAgents);

    return allActiveItems
      .filter((w) => w.assignedAgent && !enabledSet.has(w.assignedAgent))
      .map((w) => ({
        _id: w._id,
        title: w.title,
        assignedAgent: w.assignedAgent,
        status: w.status,
        createdAt: w.createdAt,
      }));
  },
});
