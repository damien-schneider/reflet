import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getAuthUser } from "./utils";

// Priority levels for feedback
const PRIORITY_LEVELS = ["critical", "high", "medium", "low", "none"] as const;

// Complexity levels for feedback
const COMPLEXITY_LEVELS = [
  "trivial",
  "simple",
  "moderate",
  "complex",
  "very_complex",
] as const;

// Zod schema for auto-tagging response
const autoTaggingResponseSchema = z.object({
  selectedTagIds: z
    .array(z.string())
    .describe(
      "Array of tag IDs from the provided list that match the feedback"
    ),
  reasoning: z
    .string()
    .describe("Brief explanation of why these tags were selected"),
  priority: z
    .enum(PRIORITY_LEVELS)
    .describe(
      "Priority level: critical (blocking/urgent), high (important/impactful), medium (standard), low (nice-to-have), none (informational only)"
    ),
  priorityReasoning: z
    .string()
    .describe("Brief explanation of why this priority level was assigned"),
  complexity: z
    .enum(COMPLEXITY_LEVELS)
    .describe(
      "Implementation complexity: trivial (<1h), simple (1-4h), moderate (1-2 days), complex (3-5 days), very_complex (1+ weeks)"
    ),
  complexityReasoning: z
    .string()
    .describe("Brief explanation of the complexity assessment"),
  timeEstimate: z
    .string()
    .describe(
      "Estimated implementation time as a human-readable range, e.g. '2-4 hours', '1-2 days', '1-2 weeks'"
    ),
});

type AutoTaggingResponse = z.infer<typeof autoTaggingResponseSchema>;

// OpenRouter provider setup
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Model fallback chain
const AUTO_TAGGING_MODELS = [
  "arcee-ai/trinity-large-preview:free",
  "upstage/solar-pro-3:free",
  "z-ai/glm-4.7-flash",
] as const;

// ============================================
// QUERIES
// ============================================

/**
 * Get count of feedbacks without any tags for an organization
 */
export const getUntaggedFeedbackCount = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    let untaggedCount = 0;
    for (const feedback of feedbackItems) {
      const tags = await ctx.db
        .query("feedbackTags")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .first();

      if (!tags) {
        untaggedCount++;
      }
    }

    return untaggedCount;
  },
});

/**
 * Get the current auto-tagging job for an organization
 * Returns the most recent job that is either:
 * - Active (pending/processing)
 * - Recently completed (within last 10 seconds)
 */
export const getActiveJob = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("autoTaggingJobs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    if (jobs.length === 0) {
      return null;
    }

    // Sort by startedAt descending
    const sortedJobs = jobs.sort((a, b) => b.startedAt - a.startedAt);
    const mostRecentJob = sortedJobs[0];

    if (!mostRecentJob) {
      return null;
    }

    // Return active jobs immediately
    if (
      mostRecentJob.status === "pending" ||
      mostRecentJob.status === "processing"
    ) {
      return mostRecentJob;
    }

    // Return recently completed/failed jobs (within 10 seconds)
    const tenSecondsAgo = Date.now() - 10_000;
    if (
      mostRecentJob.completedAt &&
      mostRecentJob.completedAt > tenSecondsAgo
    ) {
      return mostRecentJob;
    }

    return null;
  },
});

/**
 * Internal query to get feedback and available tags for auto-tagging
 */
export const getFeedbackForAutoTagging = internalQuery({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      return null;
    }

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", feedback.organizationId)
      )
      .collect();

    return {
      feedback,
      tags,
    };
  },
});

/**
 * Internal query to get IDs of feedbacks without tags
 */
export const getUntaggedFeedbackIds = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"feedback">[]> => {
    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const untaggedIds: Id<"feedback">[] = [];

    for (const feedback of feedbackItems) {
      const tag = await ctx.db
        .query("feedbackTags")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .first();

      if (!tag) {
        untaggedIds.push(feedback._id);
        if (args.limit && untaggedIds.length >= args.limit) {
          break;
        }
      }
    }

    return untaggedIds;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Internal mutation to apply tags to feedback
 */
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
          feedbackId: args.feedbackId,
          tagId,
          appliedByAi: true,
        });
      }
    }
  },
});

/**
 * Internal mutation to save AI analysis (priority, complexity, time estimate) to feedback
 */
export const saveAiAnalysis = internalMutation({
  args: {
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

/**
 * Internal mutation to create a new auto-tagging job
 */
export const createJob = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    totalItems: v.number(),
  },
  handler: async (ctx, args) => {
    const jobId = await ctx.db.insert("autoTaggingJobs", {
      organizationId: args.organizationId,
      status: "pending",
      totalItems: args.totalItems,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      errors: [],
      startedAt: Date.now(),
    });
    return jobId;
  },
});

/**
 * Internal mutation to update job progress
 */
export const updateJobProgress = internalMutation({
  args: {
    jobId: v.id("autoTaggingJobs"),
    processedItems: v.number(),
    successfulItems: v.number(),
    failedItems: v.number(),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    error: v.optional(
      v.object({
        feedbackId: v.id("feedback"),
        error: v.string(),
      })
    ),
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
      processedItems: args.processedItems,
      successfulItems: args.successfulItems,
      failedItems: args.failedItems,
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

/**
 * Clear/dismiss a completed job
 */
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

/**
 * Start bulk auto-tagging for an organization (admin only)
 */
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
      internal.feedback_auto_tagging.processBulkAutoTagging,
      {
        organizationId: args.organizationId,
      }
    );

    return { started: true };
  },
});

// ============================================
// ACTIONS
// ============================================

/**
 * Process auto-tagging for a single feedback item using AI SDK with structured output
 */
export const processAutoTagging = internalAction({
  args: { feedbackId: v.id("feedback") },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; reason?: string; tagCount: number }> => {
    const data = await ctx.runQuery(
      internal.feedback_auto_tagging.getFeedbackForAutoTagging,
      { feedbackId: args.feedbackId }
    );

    if (!data?.feedback || data.tags.length === 0) {
      return {
        success: false,
        reason: "No feedback or tags found",
        tagCount: 0,
      };
    }

    const { feedback, tags } = data;

    const tagsDescription = tags
      .map(
        (tag: { _id: Id<"tags">; name: string; description?: string }) =>
          `- ID: "${tag._id}", Name: "${tag.name}"${tag.description ? `, Description: "${tag.description}"` : ""}`
      )
      .join("\n");

    const systemPrompt = `You are a feedback analysis assistant. Your job is to analyze user feedback and:
1. Select the most appropriate tags from the available list
2. Assess the priority level of the feedback
3. Estimate the implementation complexity
4. Provide a time estimate for implementation

IMPORTANT:
- Only select tag IDs from the provided list
- Select 1-3 tags that best match the feedback content
- If no tags match well, return an empty array for selectedTagIds
- Be realistic about priority, complexity, and time estimates
- Priority levels: critical (blocking/urgent issue), high (important/impactful), medium (standard priority), low (nice-to-have), none (informational only)
- Complexity levels: trivial (quick config change, <1 hour), simple (straightforward, 1-4 hours), moderate (some investigation needed, 1-2 days), complex (significant changes, 3-5 days), very_complex (major feature/architecture, 1+ weeks)
- Time estimate should be a human-readable range like "2-4 hours" or "1-2 days"`;

    const userPrompt = `Analyze this feedback and provide tags, priority, complexity, and time estimate:

FEEDBACK:
Title: ${feedback.title}
Description: ${feedback.description || "(no description)"}

AVAILABLE TAGS (use exact IDs):
${tagsDescription}`;

    const validTagMap = new Map<string, Id<"tags">>();
    for (const t of tags) {
      validTagMap.set(t._id, t._id);
    }

    // Try models in fallback chain
    let result: AutoTaggingResponse | null = null;
    let lastError: Error | null = null;

    for (const modelId of AUTO_TAGGING_MODELS) {
      try {
        console.log(`Trying auto-tagging with model: ${modelId}...`);

        const response = await generateObject({
          model: openrouter(modelId),
          schema: autoTaggingResponseSchema,
          system: systemPrompt,
          prompt: userPrompt,
        });

        result = response.object;
        console.log(`Model ${modelId} succeeded:`, result);
        break;
      } catch (err) {
        console.error(`Model ${modelId} failed:`, err);
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (!result) {
      return {
        success: false,
        reason: `All AI models failed: ${lastError?.message ?? "Unknown error"}`,
        tagCount: 0,
      };
    }

    // Filter to only valid tag IDs that exist in the org
    const selectedTagIds = result.selectedTagIds
      .map((id) => validTagMap.get(id))
      .filter((id): id is Id<"tags"> => id !== undefined);

    console.log("AI reasoning:", result.reasoning);
    console.log("Valid tag IDs:", Array.from(validTagMap.keys()));
    console.log("AI returned IDs:", result.selectedTagIds);
    console.log("Matched tag IDs:", selectedTagIds);

    if (selectedTagIds.length > 0) {
      await ctx.runMutation(internal.feedback_auto_tagging.applyAutoTags, {
        feedbackId: args.feedbackId,
        tagIds: selectedTagIds,
      });
    }

    // Save AI analysis (priority, complexity, time estimate) regardless of tag matching
    await ctx.runMutation(internal.feedback_auto_tagging.saveAiAnalysis, {
      feedbackId: args.feedbackId,
      priority: result.priority,
      priorityReasoning: result.priorityReasoning,
      complexity: result.complexity,
      complexityReasoning: result.complexityReasoning,
      timeEstimate: result.timeEstimate,
    });

    if (selectedTagIds.length > 0) {
      return { success: true, tagCount: selectedTagIds.length };
    }

    return {
      success: true,
      reason:
        result.reasoning ||
        "AI selected no matching tags but analysis was saved",
      tagCount: 0,
    };
  },
});

/**
 * Process bulk auto-tagging for all untagged feedbacks
 */
export const processBulkAutoTagging = internalAction({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ processed: number; failed: number }> => {
    // Get all untagged feedback IDs
    const untaggedIds = await ctx.runQuery(
      internal.feedback_auto_tagging.getUntaggedFeedbackIds,
      { organizationId: args.organizationId }
    );

    if (untaggedIds.length === 0) {
      return { processed: 0, failed: 0 };
    }

    // Create the job
    const jobId = await ctx.runMutation(
      internal.feedback_auto_tagging.createJob,
      {
        organizationId: args.organizationId,
        totalItems: untaggedIds.length,
      }
    );

    // Update status to processing
    await ctx.runMutation(internal.feedback_auto_tagging.updateJobProgress, {
      jobId,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      status: "processing",
    });

    // Process all items in parallel
    const results = await Promise.allSettled(
      untaggedIds.map((feedbackId) =>
        ctx
          .runAction(internal.feedback_auto_tagging.processAutoTagging, {
            feedbackId,
          })
          .then((result) => ({ feedbackId, result }))
      )
    );

    // Collect results
    const errors: { feedbackId: Id<"feedback">; error: string }[] = [];
    let successfulItems = 0;
    let failedItems = 0;

    for (const settled of results) {
      if (settled.status === "fulfilled") {
        if (settled.value.result.success) {
          successfulItems++;
        } else {
          failedItems++;
          errors.push({
            feedbackId: settled.value.feedbackId,
            error: settled.value.result.reason || "Unknown error",
          });
        }
      } else {
        failedItems++;
      }
    }

    const processedItems = successfulItems + failedItems;

    // Report errors
    for (const error of errors) {
      await ctx.runMutation(internal.feedback_auto_tagging.updateJobProgress, {
        jobId,
        processedItems,
        successfulItems,
        failedItems,
        error,
      });
    }

    // Mark as completed
    await ctx.runMutation(internal.feedback_auto_tagging.updateJobProgress, {
      jobId,
      processedItems,
      successfulItems,
      failedItems,
      status: failedItems === untaggedIds.length ? "failed" : "completed",
    });

    return { processed: processedItems, failed: failedItems };
  },
});
