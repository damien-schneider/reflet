import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";
import {
  changelogConfigValidator,
  setupStatusValidator,
  stepStatusValidator,
  suggestedKeywordsValidator,
  suggestedMonitorsValidator,
  suggestedPromptsValidator,
  suggestedTagsValidator,
} from "./project_setup_validators";

export const getConnectionForSetup = internalQuery({
  args: { organizationId: v.id("organizations") },
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

    return {
      connectionId: connection._id,
      defaultBranch: connection.repositoryDefaultBranch ?? "main",
      installationId: connection.installationId,
      repositoryFullName: connection.repositoryFullName,
    };
  },
  returns: v.union(
    v.object({
      connectionId: v.id("githubConnections"),
      defaultBranch: v.string(),
      installationId: v.string(),
      repositoryFullName: v.string(),
    }),
    v.null()
  ),
});

export const updateStepStatus = internalMutation({
  args: {
    error: v.optional(v.string()),
    setupId: v.id("projectSetupResults"),
    status: stepStatusValidator,
    stepKey: v.string(),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const setup = await ctx.db.get(args.setupId);
    if (!setup) {
      return null;
    }

    const updatedSteps = setup.steps.map((step) => {
      if (step.key !== args.stepKey) {
        return step;
      }
      return {
        ...step,
        error: args.error ?? step.error,
        status: args.status,
        summary: args.summary ?? step.summary,
      };
    });

    await ctx.db.patch(args.setupId, {
      steps: updatedSteps,
      updatedAt: Date.now(),
    });

    return null;
  },
  returns: v.null(),
});

export const updateSetupResults = internalMutation({
  args: {
    changelogConfig: v.optional(changelogConfigValidator),
    error: v.optional(v.string()),
    projectOverview: v.optional(v.string()),
    setupId: v.id("projectSetupResults"),
    status: v.optional(setupStatusValidator),
    suggestedKeywords: v.optional(suggestedKeywordsValidator),
    suggestedMonitors: v.optional(suggestedMonitorsValidator),
    suggestedPrompts: v.optional(suggestedPromptsValidator),
    suggestedTags: v.optional(suggestedTagsValidator),
  },
  handler: async (ctx, args) => {
    const { setupId, ...updates } = args;

    const patchData: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patchData[key] = value;
      }
    }

    await ctx.db.patch(setupId, patchData);
    return null;
  },
  returns: v.null(),
});

export const createRepoAnalysisRecord = internalMutation({
  args: {
    connectionId: v.id("githubConnections"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    if (
      existing &&
      (existing.status === "pending" || existing.status === "in_progress")
    ) {
      return null;
    }

    const now = Date.now();
    return await ctx.db.insert("repoAnalysis", {
      createdAt: now,
      githubConnectionId: args.connectionId,
      organizationId: args.organizationId,
      status: "pending",
      updatedAt: now,
    });
  },
  returns: v.union(v.id("repoAnalysis"), v.null()),
});
