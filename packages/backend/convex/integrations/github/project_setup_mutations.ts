import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalMutation, mutation } from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";
import { SETUP_STEPS, SLUG_SANITIZE_REGEX } from "./project_setup_shared";

export const startProjectSetup = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.id("projectSetupResults"),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can run project setup");
    }

    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection?.repositoryId) {
      throw new Error("No GitHub repository connected");
    }

    const now = Date.now();

    const setupId = await ctx.db.insert("projectSetupResults", {
      organizationId: args.organizationId,
      githubConnectionId: connection._id,
      status: "analyzing",
      steps: SETUP_STEPS.map((step) => ({
        key: step.key,
        label: step.label,
        status: "pending" as const,
      })),
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.integrations.github.project_setup_actions.runProjectSetup,
      { setupId, organizationId: args.organizationId }
    );

    return setupId;
  },
});

export const updateStepStatus = internalMutation({
  args: {
    setupId: v.id("projectSetupResults"),
    stepKey: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("done"),
      v.literal("error")
    ),
    summary: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
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
        status: args.status,
        summary: args.summary ?? step.summary,
        error: args.error ?? step.error,
      };
    });

    await ctx.db.patch(args.setupId, {
      steps: updatedSteps,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const updateSetupResults = internalMutation({
  args: {
    setupId: v.id("projectSetupResults"),
    status: v.optional(
      v.union(
        v.literal("idle"),
        v.literal("analyzing"),
        v.literal("review"),
        v.literal("completed"),
        v.literal("error")
      )
    ),
    suggestedMonitors: v.optional(
      v.array(
        v.object({
          url: v.string(),
          name: v.string(),
          method: v.optional(v.string()),
          accepted: v.boolean(),
        })
      )
    ),
    suggestedKeywords: v.optional(
      v.array(
        v.object({
          keyword: v.string(),
          category: v.string(),
          accepted: v.boolean(),
        })
      )
    ),
    suggestedTags: v.optional(
      v.array(
        v.object({
          name: v.string(),
          color: v.string(),
          accepted: v.boolean(),
        })
      )
    ),
    changelogConfig: v.optional(
      v.object({
        workflow: v.union(
          v.literal("ai_powered"),
          v.literal("automated"),
          v.literal("manual")
        ),
        importExisting: v.boolean(),
        syncDirection: v.string(),
        versionPrefix: v.string(),
        targetBranch: v.string(),
        releaseCount: v.optional(v.number()),
        hasConventionalCommits: v.optional(v.boolean()),
      })
    ),
    suggestedPrompts: v.optional(
      v.array(
        v.object({
          title: v.string(),
          prompt: v.string(),
        })
      )
    ),
    projectOverview: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { setupId, ...updates } = args;
    const now = Date.now();

    const patchData: Record<string, unknown> = { updatedAt: now };

    if (updates.status !== undefined) {
      patchData.status = updates.status;
    }
    if (updates.suggestedMonitors !== undefined) {
      patchData.suggestedMonitors = updates.suggestedMonitors;
    }
    if (updates.suggestedKeywords !== undefined) {
      patchData.suggestedKeywords = updates.suggestedKeywords;
    }
    if (updates.suggestedTags !== undefined) {
      patchData.suggestedTags = updates.suggestedTags;
    }
    if (updates.changelogConfig !== undefined) {
      patchData.changelogConfig = updates.changelogConfig;
    }
    if (updates.suggestedPrompts !== undefined) {
      patchData.suggestedPrompts = updates.suggestedPrompts;
    }
    if (updates.projectOverview !== undefined) {
      patchData.projectOverview = updates.projectOverview;
    }
    if (updates.error !== undefined) {
      patchData.error = updates.error;
    }

    await ctx.db.patch(setupId, patchData);
    return null;
  },
});

export const applySetupResults = mutation({
  args: {
    organizationId: v.id("organizations"),
    setupId: v.id("projectSetupResults"),
    acceptedMonitors: v.array(
      v.object({
        url: v.string(),
        name: v.string(),
      })
    ),
    acceptedKeywords: v.array(
      v.object({
        keyword: v.string(),
        source: v.union(
          v.literal("reddit"),
          v.literal("web"),
          v.literal("both")
        ),
      })
    ),
    acceptedTags: v.array(
      v.object({
        name: v.string(),
        color: v.string(),
      })
    ),
    changelogSettings: v.optional(
      v.object({
        autoPublishImported: v.optional(v.boolean()),
        autoVersioning: v.optional(v.boolean()),
        pushToGithubOnPublish: v.optional(v.boolean()),
        syncDirection: v.optional(v.string()),
        targetBranch: v.optional(v.string()),
        versionIncrement: v.optional(v.string()),
        versionPrefix: v.optional(v.string()),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can apply project setup");
    }

    const now = Date.now();

    for (const monitor of args.acceptedMonitors) {
      await ctx.db.insert("statusMonitors", {
        organizationId: args.organizationId,
        name: monitor.name,
        url: monitor.url,
        checkIntervalMinutes: 5,
        alertThreshold: 3,
        status: "operational",
        consecutiveFailures: 0,
        isPublic: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    const existingTags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const existingSlugs = new Set(existingTags.map((t) => t.slug));

    for (const tag of args.acceptedTags) {
      const slug = tag.name.toLowerCase().replace(SLUG_SANITIZE_REGEX, "-");
      if (existingSlugs.has(slug)) {
        continue;
      }
      await ctx.db.insert("tags", {
        organizationId: args.organizationId,
        name: tag.name,
        slug,
        color: tag.color,
        isDoneStatus: false,
        isRoadmapLane: false,
        createdAt: now,
        updatedAt: now,
      });
      existingSlugs.add(slug);
    }

    if (args.changelogSettings) {
      await ctx.db.patch(args.organizationId, {
        changelogSettings: args.changelogSettings,
      });
    }

    await ctx.db.patch(args.organizationId, {
      setupCompleted: true,
      setupMethod: "github",
    });

    await ctx.db.patch(args.setupId, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });

    return null;
  },
});

export const skipSetup = mutation({
  args: {
    organizationId: v.id("organizations"),
    method: v.union(v.literal("manual"), v.literal("skipped")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member of this organization");
    }

    await ctx.db.patch(args.organizationId, {
      setupCompleted: true,
      setupMethod: args.method,
    });

    return null;
  },
});

export const createRepoAnalysisRecord = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    connectionId: v.id("githubConnections"),
  },
  returns: v.union(v.id("repoAnalysis"), v.null()),
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
      organizationId: args.organizationId,
      githubConnectionId: args.connectionId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});
