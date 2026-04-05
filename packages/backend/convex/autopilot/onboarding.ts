/**
 * Autopilot onboarding — connect repo → boot company.
 *
 * V6 enhanced: When a user connects their GitHub repository, Reflet boots
 * a virtual company that immediately starts working. This handles:
 * 1. Config initialization
 * 2. Repository analysis
 * 3. Primary task generation based on repo analysis
 * 4. Agent activation
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { codingAdapterType } from "./schema/validators";

/**
 * Initialize autopilot for an org — creates config with V6 defaults.
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
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    const configId = await ctx.db.insert("autopilotConfig", {
      organizationId: args.organizationId,
      enabled: false,
      adapter: args.adapter,
      autonomyLevel: "review_required",
      autonomyMode: "supervised",
      maxTasksPerDay: 10,
      tasksUsedToday: 0,
      tasksResetAt: now + TWENTY_FOUR_HOURS,
      autoMergePRs: false,
      autoMergeThreshold: 80,
      fullAutoDelay: 15 * 60 * 1000,
      requireArchitectReview: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "system",
      level: "success",
      message: "Autopilot initialized with V6 defaults (supervised mode)",
      details: args.repoUrl
        ? JSON.stringify({ repoUrl: args.repoUrl })
        : undefined,
    });

    return configId;
  },
});

/**
 * Analyze a repo to produce initial tasks and insights.
 * V6: Creates a repo analysis record, then generates primary onboarding tasks.
 */
export const analyzeRepo = internalAction({
  args: {
    organizationId: v.id("organizations"),
    repoUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const config = await ctx.runQuery(internal.autopilot.config.getConfig, {
      organizationId: args.organizationId,
    });

    if (!config) {
      return;
    }

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "system",
      level: "action",
      message: `Analyzing repository: ${args.repoUrl}`,
    });

    // Step 1: Create repo analysis record
    await ctx.runMutation(internal.autopilot.repo_analysis.createRepoAnalysis, {
      organizationId: args.organizationId,
      repoUrl: args.repoUrl,
    });

    // Step 2: Generate company brief (7 knowledge docs from repo data)
    await ctx.scheduler.runAfter(
      0,
      internal.autopilot.company_brief.generateCompanyBrief,
      { organizationId: args.organizationId }
    );

    // Step 3: Create initial PM analysis task
    await ctx.runMutation(
      internal.autopilot.onboarding_tasks.createAnalysisTask,
      {
        organizationId: args.organizationId,
        repoUrl: args.repoUrl,
        createdAt: Date.now(),
      }
    );

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "system",
      level: "success",
      message:
        "Onboarding pipeline complete — company brief generation scheduled",
    });
  },
});

/**
 * Bootstrap — runs immediately when autopilot is enabled.
 *
 * Detects the current state and schedules appropriate initial work:
 * 1. If no pending/in_progress tasks exist → create onboarding tasks
 * 2. Trigger PM analysis immediately
 * 3. Trigger a CEO report
 * 4. Log the activation
 */
export const bootstrapAutopilot = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Check if brief exists — if not, generate it in background
    const briefApproved = await ctx.runQuery(
      internal.autopilot.company_brief.isCompanyBriefApproved,
      { organizationId: args.organizationId }
    );

    if (!briefApproved) {
      const knowledgeDocs = await ctx.runQuery(
        internal.autopilot.knowledge.getKnowledgeDocsByOrg,
        { organizationId: args.organizationId, summaryOnly: true }
      );

      if (knowledgeDocs.length === 0) {
        await ctx.scheduler.runAfter(
          0,
          internal.autopilot.company_brief.generateCompanyBrief,
          { organizationId: args.organizationId }
        );

        await ctx.runMutation(internal.autopilot.tasks.logActivity, {
          organizationId: args.organizationId,
          agent: "system",
          level: "action",
          message:
            "Company brief not found — generating in background. Agents starting now.",
        });
      }
    }

    // Start agents regardless of brief status — they work with available data
    const activeTasks = await ctx.runQuery(
      internal.autopilot.onboarding.getActiveTaskCount,
      { organizationId: args.organizationId }
    );

    const repoUrl = await ctx.runQuery(
      internal.autopilot.onboarding.getConnectedRepoUrl,
      { organizationId: args.organizationId }
    );

    if (activeTasks === 0) {
      const bootstrapRepoUrl = repoUrl ?? "https://github.com/unknown/unknown";
      await ctx.runMutation(
        internal.autopilot.onboarding_tasks.createPrimaryOnboardingTasks,
        {
          organizationId: args.organizationId,
          repoUrl: bootstrapRepoUrl,
        }
      );
    }

    await ctx.scheduler.runAfter(
      0,
      internal.autopilot.agents.pm.analysis.runPMAnalysis,
      { organizationId: args.organizationId }
    );

    await ctx.scheduler.runAfter(
      0,
      internal.autopilot.agents.ceo.reports.generateCEOReport,
      {
        organizationId: args.organizationId,
        reportType: "daily",
      }
    );

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "system",
      level: "success",
      message:
        activeTasks === 0
          ? "Autopilot activated — bootstrap tasks created, PM analysis and CEO report scheduled"
          : "Autopilot activated — PM analysis and CEO report scheduled",
    });
  },
});

/**
 * Count active (todo/in_progress/in_review/backlog) work items for the org.
 */
export const getActiveTaskCount = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("autopilotWorkItems")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return items.filter(
      (w) =>
        w.status === "todo" ||
        w.status === "in_progress" ||
        w.status === "in_review" ||
        w.status === "backlog"
    ).length;
  },
});

/**
 * Find the connected GitHub repo URL for this org (if any).
 */
export const getConnectedRepoUrl = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection?.repositoryFullName) {
      return null;
    }

    return `https://github.com/${connection.repositoryFullName}`;
  },
});
