/**
 * Autopilot task cap queries — pending task limits per role and total.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../_generated/server";
import { isRoleSkillEnabledInConfig } from "./config";

// ============================================
// TASK CAP DEFAULTS
// ============================================

export const DEFAULT_MAX_PENDING_PER_ROLE = 4;
export const DEFAULT_MAX_PENDING_TOTAL = 12;
export const DEFAULT_DAILY_COST_CAP_USD = 50;

/**
 * All role names and their corresponding config fields.
 */
const ROLE_CONFIG_FIELDS = ["pm", "cto", "growth", "support", "sales"] as const;

async function fetchEnabledRoleSkills(
  ctx: { db: QueryCtx["db"] },
  organizationId: Id<"organizations">
): Promise<string[]> {
  const config = await ctx.db
    .query("autopilotConfig")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .unique();

  if (!config?.enabled || (config.autonomyMode ?? "supervised") === "stopped") {
    return [];
  }

  return ROLE_CONFIG_FIELDS.filter((name) =>
    isRoleSkillEnabledInConfig(name, config)
  );
}

/**
 * Check if creating a new task would exceed the per-role pending cap.
 */
export const checkRoleTaskCap = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    role: v.string(),
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

    const cap = config?.maxPendingTasksPerRole ?? DEFAULT_MAX_PENDING_PER_ROLE;

    const todoItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "todo")
      )
      .collect();

    const rolePending = todoItems.filter(
      (w) => w.assignedRole === args.role
    ).length;

    return {
      allowed: rolePending < cap,
      current: rolePending,
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
 * Get work item cap usage per role skill (for dashboard display).
 */
export const getTaskCapUsage = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    perRoleCap: v.number(),
    totalCap: v.number(),
    totalPending: v.number(),
    roleUsage: v.array(
      v.object({
        role: v.string(),
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

    const perRoleCap =
      config?.maxPendingTasksPerRole ?? DEFAULT_MAX_PENDING_PER_ROLE;
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

    const enabledRoles = await fetchEnabledRoleSkills(ctx, args.organizationId);
    const roleCounts = new Map<string, number>();

    for (const item of allActiveItems) {
      if (item.assignedRole) {
        roleCounts.set(
          item.assignedRole,
          (roleCounts.get(item.assignedRole) ?? 0) + 1
        );
      }
    }

    const roleUsage = enabledRoles.map((role) => ({
      role,
      pending: roleCounts.get(role) ?? 0,
      cap: perRoleCap,
    }));

    return {
      perRoleCap,
      totalCap,
      totalPending: allActiveItems.length,
      roleUsage,
    };
  },
});

/**
 * Get orphaned work items — items assigned to currently disabled role skills.
 */
export const getOrphanedTasks = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      _id: v.id("autopilotWorkItems"),
      title: v.string(),
      assignedRole: v.optional(v.string()),
      status: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const enabledRoles = await fetchEnabledRoleSkills(ctx, args.organizationId);

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
    const enabledSet = new Set(enabledRoles);

    return allActiveItems
      .filter((w) => w.assignedRole && !enabledSet.has(w.assignedRole))
      .map((w) => ({
        _id: w._id,
        title: w.title,
        assignedRole: w.assignedRole,
        status: w.status,
        createdAt: w.createdAt,
      }));
  },
});
