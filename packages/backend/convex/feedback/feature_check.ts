import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { requireOrgMember } from "../shared/access";
import { getAuthUser } from "../shared/utils";

// ============================================
// QUERIES
// ============================================

/**
 * Get feature check status for a feedback item
 */
export const getFeatureCheckStatus = query({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return null;
    }

    await requireOrgMember(ctx, feedback.organizationId);

    return {
      error: feedback.aiFeatureCheckError,
      evidence: feedback.aiFeatureCheckEvidence,
      generatedAt: feedback.aiFeatureCheckGeneratedAt,
      result: feedback.aiFeatureCheckResult,
      status: feedback.aiFeatureCheckStatus,
      summary: feedback.aiFeatureCheckSummary,
    };
  },
  returns: v.union(
    v.null(),
    v.object({
      error: v.optional(v.string()),
      evidence: v.optional(
        v.array(
          v.object({
            filePath: v.string(),
            relevance: v.string(),
            snippet: v.optional(v.string()),
          })
        )
      ),
      generatedAt: v.optional(v.number()),
      result: v.optional(
        v.union(
          v.literal("implemented"),
          v.literal("partially_implemented"),
          v.literal("not_implemented"),
          v.literal("inconclusive")
        )
      ),
      status: v.optional(
        v.union(
          v.literal("pending"),
          v.literal("checking"),
          v.literal("completed"),
          v.literal("error")
        )
      ),
      summary: v.optional(v.string()),
    })
  ),
});

export const startFeatureCheck = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can run feature checks");
    }

    // Check if already checking
    if (
      feedback.aiFeatureCheckStatus === "pending" ||
      feedback.aiFeatureCheckStatus === "checking"
    ) {
      throw new Error("Feature check is already in progress");
    }

    // Set to pending
    await ctx.db.patch(args.feedbackId, {
      aiFeatureCheckError: undefined,
      aiFeatureCheckStatus: "pending",
      updatedAt: Date.now(),
    });

    // Schedule the action
    await ctx.scheduler.runAfter(
      0,
      internal.feedback.feature_check_action.runFeatureCheck,
      { feedbackId: args.feedbackId }
    );

    return { started: true };
  },
  returns: v.object({ started: v.boolean() }),
});

export const updateFeatureCheckStatus = internalMutation({
  args: {
    error: v.optional(v.string()),
    feedbackId: v.id("feedback"),
    status: v.union(
      v.literal("pending"),
      v.literal("checking"),
      v.literal("completed"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.feedbackId, {
      aiFeatureCheckError: args.error,
      aiFeatureCheckStatus: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
  returns: v.null(),
});

export const saveFeatureCheckResult = internalMutation({
  args: {
    evidence: v.array(
      v.object({
        filePath: v.string(),
        relevance: v.string(),
        snippet: v.optional(v.string()),
      })
    ),
    feedbackId: v.id("feedback"),
    result: v.union(
      v.literal("implemented"),
      v.literal("partially_implemented"),
      v.literal("not_implemented"),
      v.literal("inconclusive")
    ),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.feedbackId, {
      aiFeatureCheckError: undefined,
      aiFeatureCheckEvidence: args.evidence,
      aiFeatureCheckGeneratedAt: Date.now(),
      aiFeatureCheckResult: args.result,
      aiFeatureCheckStatus: "completed",
      aiFeatureCheckSummary: args.summary,
      updatedAt: Date.now(),
    });
    return null;
  },
  returns: v.null(),
});

export const getFeedbackForFeatureCheck = internalQuery({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return null;
    }

    // Get GitHub connection
    const githubConnection = await ctx.db
      .query("githubConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", feedback.organizationId)
      )
      .first();

    // Get tags for this feedback
    const feedbackTags = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    const tags = await Promise.all(
      feedbackTags.map(async (ft) => {
        const tag = await ctx.db.get(ft.tagId);
        return tag?.name ?? null;
      })
    );

    // Get repo analysis
    const repoAnalysis = await ctx.db
      .query("repoAnalysis")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", feedback.organizationId)
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .first();

    return {
      feedback: {
        _id: feedback._id,
        aiClarification: feedback.aiClarification,
        description: feedback.description,
        organizationId: feedback.organizationId,
        title: feedback.title,
      },
      githubConnection: githubConnection
        ? {
            installationId: githubConnection.installationId,
            repositoryFullName: githubConnection.repositoryFullName,
          }
        : null,
      repoAnalysis: repoAnalysis
        ? {
            architecture: repoAnalysis.architecture,
            features: repoAnalysis.features,
            summary: repoAnalysis.summary,
            techStack: repoAnalysis.techStack,
          }
        : null,
      tags: tags.filter(Boolean),
    };
  },
});
