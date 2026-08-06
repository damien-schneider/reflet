import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, mutation } from "../_generated/server";
import { getAuthUser } from "../shared/utils";

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

    for (const tagId of args.tagIds) {
      const tag = await ctx.db.get(tagId);
      if (!tag || tag.organizationId !== feedback.organizationId) {
        continue;
      }

      const existing = await ctx.db
        .query("feedbackTags")
        .withIndex("by_feedback_tag", (q) =>
          q.eq("feedbackId", args.feedbackId).eq("tagId", tagId)
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("feedbackTags", {
          appliedByAi: true,
          feedbackId: args.feedbackId,
          tagId,
        });
      }
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

export const updateJobProgress = internalMutation({
  args: {
    error: v.optional(
      v.object({
        error: v.string(),
        feedbackId: v.id("feedback"),
      })
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

    if (args.error) {
      updates.errors = [...job.errors, args.error];
    }

    await ctx.db.patch(args.jobId, updates);
  },
});

export const dismissJob = mutation({
  args: { jobId: v.id("autoTaggingJobs") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const job = await ctx.db.get(args.jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    // Verify admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", job.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can dismiss jobs");
    }

    await ctx.db.delete(args.jobId);
  },
});

export const startBulkAutoTagging = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Check admin permission
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "member") {
      throw new Error("Only admins can initiate bulk auto-tagging");
    }

    // Check if there's already an active job
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
      throw new Error("Auto-tagging is already in progress");
    }

    // Schedule the bulk tagging action
    await ctx.scheduler.runAfter(
      0,
      internal.feedback.auto_tagging_actions.processBulkAutoTagging,
      {
        organizationId: args.organizationId,
      }
    );

    return { started: true };
  },
});
