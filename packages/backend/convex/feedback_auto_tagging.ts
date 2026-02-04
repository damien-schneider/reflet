import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  autoTaggingAgent,
  autoTaggingAgentFallback1,
  autoTaggingAgentFallback2,
} from "./agent";
import { getAuthUser } from "./utils";

// Regex to extract JSON from AI response (may include markdown code blocks)
const JSON_EXTRACT_REGEX = /\{[\s\S]*\}/;

// Helper to parse AI response and extract valid tag IDs
function parseAiTagResponse(
  responseText: string,
  validTagIds: Set<string>
): { tagIds: string[]; error: string | null } {
  try {
    const jsonMatch = responseText.match(JSON_EXTRACT_REGEX);
    if (!jsonMatch) {
      return { tagIds: [], error: "No JSON found in response" };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      selectedTagIds?: string[];
      reasoning?: string;
    };

    console.log("Parsed response:", parsed);

    if (!Array.isArray(parsed.selectedTagIds)) {
      return { tagIds: [], error: "selectedTagIds is not an array" };
    }

    const matchedIds = parsed.selectedTagIds.filter((id) =>
      validTagIds.has(id)
    );

    console.log("Valid tag IDs:", Array.from(validTagIds));
    console.log("AI returned IDs:", parsed.selectedTagIds);
    console.log("Matched tag IDs:", matchedIds);

    return { tagIds: matchedIds, error: null };
  } catch (err) {
    return {
      tagIds: [],
      error: `JSON parse error: ${err instanceof Error ? err.message : "Unknown"}`,
    };
  }
}

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
 * Process auto-tagging for a single feedback item
 */
export const processAutoTagging = internalAction({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
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

    const prompt = `You are a feedback categorization assistant. Analyze the feedback below and select the most appropriate tag(s) from the available list.

FEEDBACK TO CATEGORIZE:
Title: ${feedback.title}
Description: ${feedback.description || "(no description)"}

AVAILABLE TAGS (select from these only):
${tagsDescription}

INSTRUCTIONS:
1. Read the feedback carefully
2. Select 1-3 tags that best match the feedback content
3. Return ONLY valid JSON in this exact format: {"selectedTagIds": ["id1", "id2"], "reasoning": "brief explanation"}
4. The IDs must be exactly as shown above (they start with letters and numbers)
5. If no tags match well, return: {"selectedTagIds": [], "reasoning": "no matching tags"}

Your response (JSON only):`;

    // Try agents in order with fallback chain
    const agents = [
      { agent: autoTaggingAgent, name: "primary" },
      { agent: autoTaggingAgentFallback1, name: "fallback1" },
      { agent: autoTaggingAgentFallback2, name: "fallback2" },
    ];

    let result: { text: string } | undefined;
    let lastError: Error | null = null;

    for (const { agent, name } of agents) {
      try {
        console.log(`Trying auto-tagging with ${name} agent...`);
        result = await agent.generateText(
          ctx,
          { userId: "system" },
          { prompt }
        );
        console.log(`${name} agent succeeded`);
        break; // Success, exit the loop
      } catch (err) {
        console.error(`${name} agent failed:`, err);
        lastError = err instanceof Error ? err : new Error(String(err));
        // Continue to next agent in fallback chain
      }
    }

    if (!result) {
      return {
        success: false,
        reason: `All AI agents failed: ${lastError?.message ?? "Unknown error"}`,
        tagCount: 0,
      };
    }

    const responseText = result.text || "";
    console.log("AI response for feedback", args.feedbackId, ":", responseText);

    const validTagIds = new Set(
      tags.map(
        (t: { _id: Id<"tags">; name: string; description?: string }) => t._id
      )
    );

    const { tagIds: selectedTagIds, error: parseError } = parseAiTagResponse(
      responseText,
      validTagIds
    );

    if (parseError) {
      console.error("Parse error:", parseError, "Response was:", responseText);
      return { success: false, reason: parseError, tagCount: 0 };
    }

    if (selectedTagIds.length > 0) {
      await ctx.runMutation(internal.feedback_auto_tagging.applyAutoTags, {
        feedbackId: args.feedbackId,
        tagIds: selectedTagIds as Id<"tags">[],
      });
      return { success: true, tagCount: selectedTagIds.length };
    }

    // No tags selected - this is still "processed" but not "tagged"
    return {
      success: false,
      reason: "AI selected no matching tags",
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

    let processedItems = 0;
    let successfulItems = 0;
    let failedItems = 0;

    // Process all items
    for (const feedbackId of untaggedIds) {
      try {
        const result = await ctx.runAction(
          internal.feedback_auto_tagging.processAutoTagging,
          { feedbackId }
        );

        processedItems++;
        if (result.success) {
          successfulItems++;
        } else {
          failedItems++;
          await ctx.runMutation(
            internal.feedback_auto_tagging.updateJobProgress,
            {
              jobId,
              processedItems,
              successfulItems,
              failedItems,
              error: {
                feedbackId,
                error: result.reason || "Unknown error",
              },
            }
          );
        }
      } catch (err) {
        processedItems++;
        failedItems++;
        await ctx.runMutation(
          internal.feedback_auto_tagging.updateJobProgress,
          {
            jobId,
            processedItems,
            successfulItems,
            failedItems,
            error: {
              feedbackId,
              error: err instanceof Error ? err.message : "Unknown error",
            },
          }
        );
      }

      // Update progress after each item
      await ctx.runMutation(internal.feedback_auto_tagging.updateJobProgress, {
        jobId,
        processedItems,
        successfulItems,
        failedItems,
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
