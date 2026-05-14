/**
 * Routine CRUD and reset mutations.
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import {
  deleteAutopilotResetData,
  getAutopilotResetScope,
  resetScopeGroup,
} from "../reset/scope";
import { isRoutineDispatchAgent } from "../schema/validators";
import { requireAutopilotAccess, requireOrgAdmin } from "./auth";

export const createRoutine = mutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    agent: v.union(
      v.literal("pm"),
      v.literal("cto"),
      v.literal("growth"),
      v.literal("orchestrator"),
      v.literal("system"),
      v.literal("support"),
      v.literal("sales")
    ),
    cronExpression: v.string(),
    timezone: v.optional(v.string()),
    taskTemplate: v.string(),
  },
  returns: v.id("autopilotRoutines"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);
    await requireAutopilotAccess(ctx, args.organizationId);
    if (!isRoutineDispatchAgent(args.agent)) {
      throw new Error(
        `Routine agent ${args.agent} cannot dispatch routine tasks`
      );
    }

    const now = Date.now();

    return ctx.db.insert("autopilotRoutines", {
      organizationId: args.organizationId,
      title: args.title,
      description: args.description,
      agent: args.agent,
      cronExpression: args.cronExpression,
      timezone: args.timezone,
      taskTemplate: args.taskTemplate,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateRoutine = mutation({
  args: {
    routineId: v.id("autopilotRoutines"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    cronExpression: v.optional(v.string()),
    timezone: v.optional(v.string()),
    taskTemplate: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const routine = await ctx.db.get(args.routineId);
    if (!routine) {
      throw new Error("Routine not found");
    }
    await requireOrgAdmin(ctx, routine.organizationId, user._id);
    await requireAutopilotAccess(ctx, routine.organizationId);

    const { routineId, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await ctx.db.patch(routineId, cleanUpdates);
    return null;
  },
});

export const deleteRoutine = mutation({
  args: {
    routineId: v.id("autopilotRoutines"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const routine = await ctx.db.get(args.routineId);
    if (!routine) {
      throw new Error("Routine not found");
    }
    await requireOrgAdmin(ctx, routine.organizationId, user._id);
    await requireAutopilotAccess(ctx, routine.organizationId);

    await ctx.db.delete(args.routineId);
    return null;
  },
});

// ============================================
// Reset — wipe all autopilot data for an org
// ============================================

export const getResetScope = query({
  args: {},
  returns: v.array(resetScopeGroup),
  handler: getAutopilotResetScope,
});

export const resetAllData = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);

    await deleteAutopilotResetData(ctx, args.organizationId);

    return null;
  },
});
