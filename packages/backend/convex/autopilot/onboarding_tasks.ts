/**
 * Onboarding task creation — initial work items generated when a new org is bootstrapped.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

/**
 * Create primary onboarding work items — the first things a virtual CTO would do.
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

    const createWorkItem = async (item: {
      title: string;
      description: string;
      assignedAgent: "dev" | "growth" | "pm";
      priority: "critical" | "high" | "medium" | "low";
    }) => {
      await ctx.db.insert("autopilotWorkItems", {
        organizationId: args.organizationId,
        type: "task",
        title: item.title,
        description: item.description,
        status: "todo",
        priority: item.priority,
        assignedAgent: item.assignedAgent,
        needsReview: false,
        reviewType: "task_approval",
        createdBy: "onboarding",
        createdAt: now,
        updatedAt: now,
      });
    };

    await createWorkItem({
      title: "Implement Reflet Feedback Widget",
      description: `Add the Reflet feedback widget to the product at ${args.repoUrl}. Users can submit feedback directly from the app.`,
      assignedAgent: "dev",
      priority: "high",
    });

    await createWorkItem({
      title: "Implement Reflet Changelog",
      description: `Add the Reflet changelog component to the product at ${args.repoUrl}. Users see what shipped without leaving the product.`,
      assignedAgent: "dev",
      priority: "high",
    });

    await createWorkItem({
      title: "Market Analysis",
      description:
        "Analyze the competitive landscape. Who are the competitors? What's the market size? What's the positioning?",
      assignedAgent: "growth",
      priority: "medium",
    });

    await createWorkItem({
      title: "SEO Analysis",
      description:
        "Audit the current SEO state. Meta tags, sitemap, robots.txt, page speed, content gaps.",
      assignedAgent: "growth",
      priority: "medium",
    });

    await ctx.db.insert("autopilotDocuments", {
      organizationId: args.organizationId,
      type: "note",
      title: "Welcome to Reflet Autopilot",
      content: `I've started analyzing ${args.repoUrl}. 4 primary onboarding tasks have been created. I'll report back with findings from the market analysis shortly.`,
      tags: ["onboarding"],
      sourceAgent: "system",
      status: "published",
      needsReview: false,
      createdAt: now,
      updatedAt: now,
    });

    return null;
  },
});

/**
 * Create the initial PM analysis work item for a new repo.
 */
export const createAnalysisTask = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    repoUrl: v.string(),
    createdAt: v.number(),
  },
  returns: v.id("autopilotWorkItems"),
  handler: async (ctx, args) => {
    const workItemId = await ctx.db.insert("autopilotWorkItems", {
      organizationId: args.organizationId,
      type: "task",
      title: "Initial repository analysis",
      description: `Analyze the repository at ${args.repoUrl} to identify improvement opportunities, security issues, and growth potential.`,
      status: "todo",
      priority: "high",
      assignedAgent: "pm",
      needsReview: false,
      reviewType: "task_approval",
      createdBy: "system",
      createdAt: args.createdAt,
      updatedAt: args.createdAt,
    });

    await ctx.db.insert("autopilotDocuments", {
      organizationId: args.organizationId,
      type: "note",
      title: "Repository analysis started",
      content: `Autopilot is analyzing ${args.repoUrl} to generate initial improvement tasks.`,
      tags: ["onboarding", "analysis"],
      sourceAgent: "system",
      status: "published",
      needsReview: false,
      linkedWorkItemId: workItemId,
      createdAt: args.createdAt,
      updatedAt: args.createdAt,
    });

    return workItemId;
  },
});
