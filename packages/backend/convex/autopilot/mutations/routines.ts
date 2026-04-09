/**
 * Routine CRUD and reset mutations.
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { requireOrgAdmin } from "./auth";

export const createRoutine = mutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    agent: v.union(
      v.literal("pm"),
      v.literal("cto"),
      v.literal("dev"),
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
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);

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
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const routine = await ctx.db.get(args.routineId);
    if (!routine) {
      throw new Error("Routine not found");
    }
    await requireOrgAdmin(ctx, routine.organizationId, user._id);

    const { routineId, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = { updatedAt: Date.now() };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await ctx.db.patch(routineId, cleanUpdates);
  },
});

export const deleteRoutine = mutation({
  args: {
    routineId: v.id("autopilotRoutines"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const routine = await ctx.db.get(args.routineId);
    if (!routine) {
      throw new Error("Routine not found");
    }
    await requireOrgAdmin(ctx, routine.organizationId, user._id);

    await ctx.db.delete(args.routineId);
  },
});

// ============================================
// Reset — wipe all autopilot data for an org
// ============================================

const AUTOPILOT_TABLES_WITH_OTHER_ORG_TABLES = [
  "autopilotActivityLog",
  "autopilotDocuments",
  "autopilotCompetitors",
  "autopilotRevenueSnapshots",
  "autopilotRepoAnalysis",
  "autopilotLeads",
  "autopilotRoutines",
  "autopilotAdapterCredentials",
  "autopilotReports",
  "autopilotAgentMemories",
  "repoAnalysis",
  "websiteReferences",
  "projectSetupResults",
] as const;

export const resetAllData = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    await requireOrgAdmin(ctx, args.organizationId, user._id);

    // 1. Delete knowledge doc versions (linked via docId, no org index)
    const knowledgeDocs = await ctx.db
      .query("autopilotKnowledgeDocs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    for (const doc of knowledgeDocs) {
      const versions = await ctx.db
        .query("autopilotKnowledgeDocVersions")
        .withIndex("by_doc", (q) => q.eq("docId", doc._id))
        .collect();
      for (const version of versions) {
        await ctx.db.delete(version._id);
      }
      await ctx.db.delete(doc._id);
    }

    // 2. Delete agent messages (linked via threadId)
    const threads = await ctx.db
      .query("autopilotAgentThreads")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    for (const thread of threads) {
      const messages = await ctx.db
        .query("autopilotAgentMessages")
        .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
        .collect();
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }
      await ctx.db.delete(thread._id);
    }

    // 3. Delete work items and their associated runs
    const workItems = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    for (const item of workItems) {
      const runs = await ctx.db
        .query("autopilotRuns")
        .withIndex("by_work_item", (q) => q.eq("workItemId", item._id))
        .collect();
      for (const run of runs) {
        await ctx.db.delete(run._id);
      }
      await ctx.db.delete(item._id);
    }

    // 4. Delete all other autopilot tables with by_organization index
    for (const table of AUTOPILOT_TABLES_WITH_OTHER_ORG_TABLES) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }

    // 5. Delete the config itself (last, so we can re-initialize)
    const config = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (config) {
      await ctx.db.delete(config._id);
    }
  },
});
