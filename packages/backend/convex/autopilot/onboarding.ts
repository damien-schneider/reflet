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
import { codingAdapterType } from "./tableFields";

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
      agent: "orchestrator",
      level: "action",
      message: `Analyzing repository: ${args.repoUrl}`,
    });

    // Step 1: Create repo analysis record
    await ctx.runMutation(internal.autopilot.onboarding.createRepoAnalysis, {
      organizationId: args.organizationId,
      repoUrl: args.repoUrl,
    });

    // Step 2: Create primary onboarding tasks
    await ctx.runMutation(
      internal.autopilot.onboarding.createPrimaryOnboardingTasks,
      {
        organizationId: args.organizationId,
        repoUrl: args.repoUrl,
      }
    );

    // Step 3: Create initial PM analysis task (legacy compat)
    await ctx.runMutation(internal.autopilot.onboarding.createAnalysisTask, {
      organizationId: args.organizationId,
      repoUrl: args.repoUrl,
      createdAt: Date.now(),
    });

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "orchestrator",
      level: "success",
      message: "V6 onboarding pipeline complete — primary tasks generated",
    });
  },
});

// ============================================
// V6 REPO ANALYSIS
// ============================================

/**
 * Create repo analysis record.
 */
export const createRepoAnalysis = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    repoUrl: v.string(),
  },
  returns: v.id("autopilotRepoAnalysis"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("autopilotRepoAnalysis", {
      organizationId: args.organizationId,
      repoUrl: args.repoUrl,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update repo analysis with findings.
 */
export const updateRepoAnalysis = internalMutation({
  args: {
    analysisId: v.id("autopilotRepoAnalysis"),
    techStack: v.optional(v.string()),
    framework: v.optional(v.string()),
    hasCI: v.optional(v.boolean()),
    hasTests: v.optional(v.boolean()),
    hasDocs: v.optional(v.boolean()),
    hasLandingPage: v.optional(v.boolean()),
    hasAnalytics: v.optional(v.boolean()),
    hasMonitoring: v.optional(v.boolean()),
    projectStructure: v.optional(v.string()),
    maturityLevel: v.optional(
      v.union(
        v.literal("new"),
        v.literal("early"),
        v.literal("established"),
        v.literal("mature")
      )
    ),
    findings: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { analysisId, ...updates } = args;
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filtered[key] = value;
      }
    }
    await ctx.db.patch(analysisId, filtered);
    return null;
  },
});

/**
 * Get repo analysis for an organization.
 */
export const getRepoAnalysis = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("autopilotRepoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();
  },
});

// ============================================
// V6 PRIMARY ONBOARDING TASKS
// ============================================

/**
 * Create primary onboarding tasks — the first things a virtual CTO would do.
 *
 * Always creates: widget, changelog, market analysis, SEO, security, arch, docs.
 * Conditionally creates tasks based on what's missing from the repo.
 */
export const createPrimaryOnboardingTasks = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    repoUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    const createTask = async (task: {
      title: string;
      description: string;
      assignedAgent:
        | "dev"
        | "security"
        | "architect"
        | "growth"
        | "analytics"
        | "docs"
        | "pm"
        | "qa"
        | "ops";
      priority: "critical" | "high" | "medium" | "low";
      origin:
        | "onboarding"
        | "security_scan"
        | "architect_review"
        | "docs_update";
    }) => {
      await ctx.db.insert("autopilotTasks", {
        organizationId: args.organizationId,
        title: task.title,
        description: task.description,
        status: "pending",
        priority: task.priority,
        assignedAgent: task.assignedAgent,
        origin: task.origin,
        autonomyLevel: "review_required",
        retryCount: 0,
        maxRetries: 3,
        createdAt: now,
      });
    };

    // --- Always-created tasks ---

    await createTask({
      title: "Implement Reflet Feedback Widget",
      description: `Add the Reflet feedback widget to the product at ${args.repoUrl}. Users can submit feedback directly from the app.`,
      assignedAgent: "dev",
      priority: "high",
      origin: "onboarding",
    });

    await createTask({
      title: "Implement Reflet Changelog",
      description: `Add the Reflet changelog component to the product at ${args.repoUrl}. Users see what shipped without leaving the product.`,
      assignedAgent: "dev",
      priority: "high",
      origin: "onboarding",
    });

    await createTask({
      title: "Market Analysis",
      description:
        "Analyze the competitive landscape. Who are the competitors? What's the market size? What's the positioning?",
      assignedAgent: "growth",
      priority: "medium",
      origin: "onboarding",
    });

    await createTask({
      title: "SEO Analysis",
      description:
        "Audit the current SEO state. Meta tags, sitemap, robots.txt, page speed, content gaps.",
      assignedAgent: "growth",
      priority: "medium",
      origin: "onboarding",
    });

    await createTask({
      title: "Security Baseline Scan",
      description:
        "Full OWASP scan of the codebase. Dependency audit. Secret detection. Auth coverage check.",
      assignedAgent: "security",
      priority: "high",
      origin: "security_scan",
    });

    await createTask({
      title: "Architecture Review",
      description:
        "Code health assessment. File sizes, complexity, test coverage, patterns, tech debt.",
      assignedAgent: "architect",
      priority: "medium",
      origin: "architect_review",
    });

    await createTask({
      title: "Documentation Audit",
      description:
        "What docs exist? What's missing? What's stale? Create a docs roadmap.",
      assignedAgent: "docs",
      priority: "medium",
      origin: "docs_update",
    });

    // Create a CEO welcome inbox item
    await ctx.db.insert("autopilotInboxItems", {
      organizationId: args.organizationId,
      type: "ceo_report",
      title: "Welcome to Reflet Autopilot",
      summary: `I've started analyzing ${args.repoUrl}. 7 primary onboarding tasks have been created. I'll report back with findings from the security scan, architecture review, and market analysis shortly.`,
      status: "auto_approved",
      priority: "medium",
      sourceAgent: "system",
      createdAt: now,
    });

    return null;
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
    // Check whether any active tasks exist
    const activeTasks = await ctx.runQuery(
      internal.autopilot.onboarding.getActiveTaskCount,
      { organizationId: args.organizationId }
    );

    // Find connected GitHub repo for onboarding tasks
    const repoUrl = await ctx.runQuery(
      internal.autopilot.onboarding.getConnectedRepoUrl,
      { organizationId: args.organizationId }
    );

    // If no active tasks → create onboarding bootstrap tasks
    if (activeTasks === 0) {
      const bootstrapRepoUrl = repoUrl ?? "https://github.com/unknown/unknown";
      await ctx.runMutation(
        internal.autopilot.onboarding.createPrimaryOnboardingTasks,
        {
          organizationId: args.organizationId,
          repoUrl: bootstrapRepoUrl,
        }
      );
    }

    // Immediately schedule PM analysis
    await ctx.scheduler.runAfter(
      0,
      internal.autopilot.agents.pm.runPMAnalysis,
      { organizationId: args.organizationId }
    );

    // Immediately schedule CEO daily report
    await ctx.scheduler.runAfter(
      0,
      internal.autopilot.agents.ceo.generateCEOReport,
      {
        organizationId: args.organizationId,
        reportType: "daily",
      }
    );

    await ctx.runMutation(internal.autopilot.tasks.logActivity, {
      organizationId: args.organizationId,
      agent: "orchestrator",
      level: "success",
      message:
        activeTasks === 0
          ? "Autopilot activated — bootstrap tasks created, PM analysis and CEO report scheduled"
          : "Autopilot activated — PM analysis and CEO report scheduled",
    });
  },
});

/**
 * Count active (pending/in_progress/blocked/paused) tasks for the org.
 */
export const getActiveTaskCount = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("autopilotTasks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    return tasks.filter(
      (t) =>
        t.status === "pending" ||
        t.status === "in_progress" ||
        t.status === "blocked" ||
        t.status === "paused"
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
