import { v } from "convex/values";
import { internal } from "../../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../../_generated/server";
import { getAuthUser } from "../../shared/utils";

// ============================================
// QUERIES
// ============================================

/**
 * Get the latest repo analysis for an organization
 */
export const getLatestAnalysis = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Verify membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      return null;
    }

    const analysis = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    return analysis;
  },
});

/**
 * Internal query to get GitHub connection for analysis
 */
export const getConnectionForAnalysis = internalQuery({
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
      installationId: connection.installationId,
      repositoryFullName: connection.repositoryFullName,
    };
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Update a section of the repository analysis (admin only)
 */
export const updateAnalysisSection = mutation({
  args: {
    organizationId: v.id("organizations"),
    field: v.union(
      v.literal("summary"),
      v.literal("techStack"),
      v.literal("architecture"),
      v.literal("features"),
      v.literal("repoStructure")
    ),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can edit repository analysis");
    }

    // Get the latest analysis
    const analysis = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    if (!analysis) {
      throw new Error("No analysis found");
    }

    // Update the specific field
    await ctx.db.patch(analysis._id, {
      [args.field]: args.value,
      updatedAt: Date.now(),
    });

    return analysis._id;
  },
});

/**
 * Start a new repository analysis (admin only)
 */
export const startAnalysis = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can run repository analysis");
    }

    // Check for GitHub connection
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection?.repositoryId) {
      throw new Error("No GitHub repository connected");
    }

    // Check if there's already an analysis in progress
    const existingAnalysis = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    if (
      existingAnalysis &&
      (existingAnalysis.status === "pending" ||
        existingAnalysis.status === "in_progress")
    ) {
      throw new Error("An analysis is already in progress");
    }

    const now = Date.now();

    // Create new analysis record
    const analysisId = await ctx.db.insert("repoAnalysis", {
      organizationId: args.organizationId,
      githubConnectionId: connection._id,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Schedule the analysis action
    await ctx.scheduler.runAfter(
      0,
      internal.integrations.github.repo_analysis.runAnalysis,
      {
        analysisId,
        organizationId: args.organizationId,
      }
    );

    return analysisId;
  },
});

/**
 * Start analysis internally (no auth check) — used by regeneration flow.
 */
export const startAnalysisInternal = internalMutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .first();

    if (!connection?.repositoryId) {
      throw new Error("No GitHub repository connected");
    }

    const existingAnalysis = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .first();

    if (
      existingAnalysis &&
      (existingAnalysis.status === "pending" ||
        existingAnalysis.status === "in_progress")
    ) {
      throw new Error("An analysis is already in progress");
    }

    const now = Date.now();

    const analysisId = await ctx.db.insert("repoAnalysis", {
      organizationId: args.organizationId,
      githubConnectionId: connection._id,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.integrations.github.repo_analysis.runAnalysis,
      {
        analysisId,
        organizationId: args.organizationId,
      }
    );

    return analysisId;
  },
});

/**
 * Internal mutation to update analysis status
 */
export const updateAnalysisStatus = internalMutation({
  args: {
    analysisId: v.id("repoAnalysis"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("error")
    ),
    error: v.optional(v.string()),
    summary: v.optional(v.string()),
    techStack: v.optional(v.string()),
    architecture: v.optional(v.string()),
    features: v.optional(v.string()),
    repoStructure: v.optional(v.string()),
    productAnalysis: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { analysisId, status, ...updates } = args;
    const now = Date.now();

    await ctx.db.patch(analysisId, {
      status,
      ...updates,
      updatedAt: now,
      ...(status === "completed" || status === "error"
        ? { completedAt: now }
        : {}),
    });
  },
});

/**
 * Save the product analysis result without touching the main analysis status.
 */
export const saveProductAnalysis = internalMutation({
  args: {
    analysisId: v.id("repoAnalysis"),
    productAnalysis: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.analysisId, {
      productAnalysis: args.productAnalysis,
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// ACTIONS
// ============================================

/**
 * Run the repository analysis using the agent
 */
export const runAnalysis = internalAction({
  args: {
    analysisId: v.id("repoAnalysis"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Update status to in_progress
    await ctx.runMutation(
      internal.integrations.github.repo_analysis.updateAnalysisStatus,
      {
        analysisId: args.analysisId,
        status: "in_progress",
      }
    );

    // Launch the product exploration — it handles its own status updates
    // and triggers company brief generation when done.
    await ctx.scheduler.runAfter(
      0,
      internal.integrations.github.product_exploration.runProductExploration,
      {
        organizationId: args.organizationId,
        analysisId: args.analysisId,
      }
    );
  },
});
