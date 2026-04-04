/**
 * Onboarding task creation — initial tasks generated when a new org is bootstrapped.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * Create primary onboarding tasks — the first things a virtual CTO would do.
 *
 * Always creates: widget, changelog, market analysis, SEO.
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
      assignedAgent: "dev" | "growth" | "pm";
      priority: "critical" | "high" | "medium" | "low";
      origin: "onboarding";
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

    await ctx.db.insert("autopilotInboxItems", {
      organizationId: args.organizationId,
      type: "ceo_report",
      title: "Welcome to Reflet Autopilot",
      summary: `I've started analyzing ${args.repoUrl}. 4 primary onboarding tasks have been created. I'll report back with findings from the market analysis shortly.`,
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
      sourceAgent: "system",
      relatedTaskId: taskId,
      createdAt: args.createdAt,
    });

    return taskId;
  },
});
