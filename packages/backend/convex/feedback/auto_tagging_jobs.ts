import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, mutation } from "../_generated/server";
import { requireOrgAdmin } from "../shared/access";
import { triageScopeValidator } from "./triage_scope";

export const applyAutoTags = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return;
    }

    const wanted = new Set<Id<"tags">>(args.tagIds);
    const existingLinks = await ctx.db
      .query("feedbackTags")
      .withIndex("by_feedback", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    for (const link of existingLinks) {
      if (link.appliedByAi && !wanted.has(link.tagId)) {
        await ctx.db.delete(link._id);
      }
    }

    const linked = new Set(existingLinks.map((link) => link.tagId));

    for (const tagId of wanted) {
      if (linked.has(tagId)) {
        continue;
      }

      const tag = await ctx.db.get(tagId);
      if (!tag || tag.organizationId !== feedback.organizationId) {
        continue;
      }

      await ctx.db.insert("feedbackTags", {
        appliedByAi: true,
        feedbackId: args.feedbackId,
        tagId,
      });
    }
  },
});

export const saveAiAnalysis = internalMutation({
  args: {
    complexity: v.optional(
      v.union(
        v.literal("trivial"),
        v.literal("simple"),
        v.literal("moderate"),
        v.literal("complex"),
        v.literal("very_complex")
      )
    ),
    complexityReasoning: v.optional(v.string()),
    feedbackId: v.id("feedback"),
    junk: v.optional(v.number()),
    needsReview: v.optional(v.number()),
    priority: v.optional(
      v.union(
        v.literal("critical"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low"),
        v.literal("none")
      )
    ),
    priorityReasoning: v.optional(v.string()),
    timeEstimate: v.optional(v.string()),
    usefulness: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return;
    }

    const now = Date.now();
    const updates: Record<string, unknown> = { updatedAt: now };

    if (args.priority) {
      updates.aiPriority = args.priority;
      updates.aiPriorityReasoning = args.priorityReasoning;
      updates.aiPriorityGeneratedAt = now;
    }

    if (args.complexity) {
      updates.aiComplexity = args.complexity;
      updates.aiComplexityReasoning = args.complexityReasoning;
      updates.aiComplexityGeneratedAt = now;
    }

    if (args.timeEstimate) {
      updates.aiTimeEstimate = args.timeEstimate;
      updates.aiTimeEstimateGeneratedAt = now;
    }

    if (args.usefulness !== undefined) {
      updates.aiUsefulness = args.usefulness;
      updates.aiUsefulnessGeneratedAt = now;
    }

    if (args.junk !== undefined) {
      updates.aiJunk = args.junk;
    }

    if (args.needsReview !== undefined) {
      updates.aiNeedsReview = args.needsReview;
    }

    await ctx.db.patch(args.feedbackId, updates);
  },
});

export const createJob = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    totalItems: v.number(),
  },
  handler: async (ctx, args) => {
    const jobId = await ctx.db.insert("autoTaggingJobs", {
      errors: [],
      failedItems: 0,
      organizationId: args.organizationId,
      processedItems: 0,
      startedAt: Date.now(),
      status: "pending",
      successfulItems: 0,
      totalItems: args.totalItems,
    });
    return jobId;
  },
});

const MAX_RETAINED_JOB_ERRORS = 20;

export const updateJobProgress = internalMutation({
  args: {
    errors: v.optional(
      v.array(
        v.object({
          error: v.string(),
          feedbackId: v.id("feedback"),
        })
      )
    ),
    failedItems: v.number(),
    jobId: v.id("autoTaggingJobs"),
    processedItems: v.number(),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    successfulItems: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      return;
    }

    const updates: {
      processedItems: number;
      successfulItems: number;
      failedItems: number;
      status?: "pending" | "processing" | "completed" | "failed";
      errors?: { feedbackId: Id<"feedback">; error: string }[];
      completedAt?: number;
    } = {
      failedItems: args.failedItems,
      processedItems: args.processedItems,
      successfulItems: args.successfulItems,
    };

    if (args.status) {
      updates.status = args.status;
      if (args.status === "completed" || args.status === "failed") {
        updates.completedAt = Date.now();
      }
    }

    if (args.errors?.length) {
      updates.errors = [...job.errors, ...args.errors].slice(
        -MAX_RETAINED_JOB_ERRORS
      );
    }

    await ctx.db.patch(args.jobId, updates);
  },
});

export const dismissJob = mutation({
  args: { jobId: v.id("autoTaggingJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job not found");
    }

    await requireOrgAdmin(ctx, job.organizationId, "dismiss jobs");

    await ctx.db.delete(args.jobId);
  },
});

export const startBulkAutoTagging = mutation({
  args: {
    organizationId: v.id("organizations"),
    scope: triageScopeValidator,
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "run triage");

    const existingJobs = await ctx.db
      .query("autoTaggingJobs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const activeJob = existingJobs.find(
      (job) => job.status === "pending" || job.status === "processing"
    );

    if (activeJob) {
      throw new Error("Triage is already in progress");
    }

    await ctx.scheduler.runAfter(
      0,
      internal.feedback.auto_tagging_actions.processBulkAutoTagging,
      { organizationId: args.organizationId, scope: args.scope }
    );

    return { started: true };
  },
});

export const recomputeFeedbackAnalysis = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    await requireOrgAdmin(ctx, feedback.organizationId, "recompute analysis");

    await ctx.scheduler.runAfter(
      0,
      internal.feedback.auto_tagging_actions.processAutoTagging,
      { applyModeration: false, feedbackId: args.feedbackId }
    );

    return { started: true };
  },
});
