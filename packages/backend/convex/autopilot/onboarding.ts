/**
 * Autopilot onboarding — paste repo URL → analyze → enable autopilot.
 *
 * Handles the initial setup flow where a user provides a repo URL,
 * the system analyzes the codebase, and configures autopilot with
 * sensible defaults.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../_generated/server";
import { codingAdapterType } from "./tableFields";

/**
 * Initialize autopilot for an org — creates config with defaults.
 *
 * This is an idempotent operation: if config already exists, it returns early.
 */
export const initAutopilot = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    adapter: codingAdapterType,
    repoUrl: v.optional(v.string()),
  },
  returns: v.union(v.id("autopilotConfig"), v.null()),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("autopilotConfig")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (existing) {
      return null;
    }

    const now = Date.now();
    const configId = await ctx.db.insert("autopilotConfig", {
      organizationId: args.organizationId,
      enabled: false,
      adapter: args.adapter,
      autonomyLevel: "review_required",
      maxTasksPerDay: 10,
      tasksUsedToday: 0,
      tasksResetAt: now + 24 * 60 * 60 * 1000,
      autoMergePRs: false,
      requireArchitectReview: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "system",
      level: "success",
      message: "Autopilot initialized",
      details: args.repoUrl
        ? JSON.stringify({ repoUrl: args.repoUrl })
        : undefined,
    });

    return configId;
  },
});

/**
 * Analyze a repo to produce initial tasks and insights.
 *
 * Runs as an action so it can make external API calls to the coding adapter.
 * Creates initial PM analysis tasks that populate the inbox.
 */
export const analyzeRepo = internalAction({
  args: {
    organizationId: v.id("organizations"),
    repoUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify config exists and is initialized
    const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
      organizationId: args.organizationId,
    });

    if (!config) {
      return;
    }

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "orchestrator",
      level: "action",
      message: `Analyzing repository: ${args.repoUrl}`,
    });

    // Create an initial PM analysis task
    const now = Date.now();
    await ctx.runMutation(internal.autopilot.onboarding.createAnalysisTask, {
      organizationId: args.organizationId,
      repoUrl: args.repoUrl,
      createdAt: now,
    });
  },
});

/**
 * Create the initial PM analysis task for a new repo.
 */
export const createAnalysisTask = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    repoUrl: v.string(),
    createdAt: v.number(),
  },
  returns: v.id("autopilotTasks"),
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("autopilotTasks", {
      organizationId: args.organizationId,
      title: "Initial repository analysis",
      description: `Analyze the repository at ${args.repoUrl} to identify improvement opportunities, security issues, and growth potential.`,
      status: "pending",
      priority: "high",
      assignedAgent: "pm",
      origin: "pm_analysis",
      autonomyLevel: "review_required",
      retryCount: 0,
      maxRetries: 3,
      createdAt: args.createdAt,
    });

    // Create inbox item for user awareness
    await ctx.db.insert("autopilotInboxItems", {
      organizationId: args.organizationId,
      type: "task_approval",
      title: "Repository analysis started",
      summary: `Autopilot is analyzing ${args.repoUrl} to generate initial improvement tasks.`,
      status: "auto_approved",
      priority: "medium",
      sourceAgent: "orchestrator",
      relatedTaskId: taskId,
      createdAt: args.createdAt,
    });

    return taskId;
  },
});
