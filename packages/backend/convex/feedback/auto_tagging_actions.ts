import { generateObject } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { type ActionCtx, internalAction } from "../_generated/server";
import {
  AUTO_TAGGING_MODELS,
  type AutoTaggingResponse,
  autoTaggingResponseSchema,
  openrouter,
} from "./auto_tagging_model";
import {
  evaluateFeedbackTriage,
  type FeedbackTriage,
  isTriageConfigured,
} from "./triage_evaluation";

const moderate = async (
  ctx: ActionCtx,
  feedbackId: Id<"feedback">,
  needsReview: boolean
) => {
  await ctx.runMutation(
    needsReview
      ? internal.feedback.review.holdForReview
      : internal.feedback.review.releaseAfterTriage,
    { feedbackId }
  );
};

export const processAutoTagging = internalAction({
  args: { applyModeration: v.boolean(), feedbackId: v.id("feedback") },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; reason?: string; tagCount: number }> => {
    const data = await ctx.runQuery(
      internal.feedback.auto_tagging.getFeedbackForAutoTagging,
      { feedbackId: args.feedbackId }
    );

    if (!data?.feedback) {
      return { reason: "Feedback not found", success: false, tagCount: 0 };
    }

    const releaseUntriaged = async () => {
      if (args.applyModeration) {
        await moderate(ctx, args.feedbackId, false);
      }
    };

    const { feedback, tags } = data;

    if (!isTriageConfigured()) {
      await releaseUntriaged();
      return {
        reason: "OPENROUTER_API_KEY is not set; triage is required for tagging",
        success: false,
        tagCount: 0,
      };
    }

    let triage: FeedbackTriage;
    try {
      triage = await evaluateFeedbackTriage({
        description: feedback.description,
        tags,
        title: feedback.title,
      });
    } catch (err) {
      await releaseUntriaged();
      return {
        reason: `Triage evaluation failed: ${err instanceof Error ? err.message : String(err)}`,
        success: false,
        tagCount: 0,
      };
    }

    if (args.applyModeration) {
      await moderate(ctx, args.feedbackId, triage.needsReview);
    }

    if (triage.tagIds.length > 0) {
      await ctx.runMutation(internal.feedback.auto_tagging_jobs.applyAutoTags, {
        feedbackId: args.feedbackId,
        tagIds: triage.tagIds,
      });
    }

    const systemPrompt = `You are a feedback analysis assistant. Your job is to analyze user feedback and:
1. Assess the priority level of the feedback
2. Estimate the implementation complexity
3. Provide a time estimate for implementation

IMPORTANT:
- Be realistic about priority, complexity, and time estimates
- Priority levels: critical (blocking/urgent issue), high (important/impactful), medium (standard priority), low (nice-to-have), none (informational only)
- Complexity levels: trivial (quick config change, <1 hour), simple (straightforward, 1-4 hours), moderate (some investigation needed, 1-2 days), complex (significant changes, 3-5 days), very_complex (major feature/architecture, 1+ weeks)
- Time estimate should be a human-readable range like "2-4 hours" or "1-2 days"`;

    const userPrompt = `Analyze this feedback and provide priority, complexity, and time estimate:

FEEDBACK:
Title: ${feedback.title}
Description: ${feedback.description || "(no description)"}`;

    let result: AutoTaggingResponse | null = null;
    let lastError: Error | null = null;

    for (const modelId of AUTO_TAGGING_MODELS) {
      try {
        const response = await generateObject({
          model: openrouter(modelId),
          prompt: userPrompt,
          schema: autoTaggingResponseSchema,
          system: systemPrompt,
        });

        result = response.object;
        break;
      } catch (err) {
        console.error(`Model ${modelId} failed:`, err);
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (!result) {
      await ctx.runMutation(
        internal.feedback.auto_tagging_jobs.saveAiAnalysis,
        {
          feedbackId: args.feedbackId,
          junk: triage.junk,
          usefulness: triage.usefulness,
        }
      );

      return {
        reason: `All AI models failed: ${lastError?.message ?? "Unknown error"}`,
        success: false,
        tagCount: triage.tagIds.length,
      };
    }

    await ctx.runMutation(internal.feedback.auto_tagging_jobs.saveAiAnalysis, {
      complexity: result.complexity,
      complexityReasoning: result.complexityReasoning,
      feedbackId: args.feedbackId,
      junk: triage.junk,
      priority: result.priority,
      priorityReasoning: result.priorityReasoning,
      timeEstimate: result.timeEstimate,
      usefulness: triage.usefulness,
    });

    if (triage.tagIds.length > 0) {
      return { success: true, tagCount: triage.tagIds.length };
    }

    return {
      reason: "No tag matched confidently but analysis was saved",
      success: true,
      tagCount: 0,
    };
  },
});

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
      internal.feedback.auto_tagging.getUntaggedFeedbackIds,
      { organizationId: args.organizationId }
    );

    if (untaggedIds.length === 0) {
      return { failed: 0, processed: 0 };
    }

    // Create the job
    const jobId = await ctx.runMutation(
      internal.feedback.auto_tagging_jobs.createJob,
      {
        organizationId: args.organizationId,
        totalItems: untaggedIds.length,
      }
    );

    // Update status to processing
    await ctx.runMutation(
      internal.feedback.auto_tagging_jobs.updateJobProgress,
      {
        failedItems: 0,
        jobId,
        processedItems: 0,
        status: "processing",
        successfulItems: 0,
      }
    );

    // Process all items in parallel
    const results = await Promise.allSettled(
      untaggedIds.map((feedbackId: Id<"feedback">) =>
        ctx
          .runAction(
            internal.feedback.auto_tagging_actions.processAutoTagging,
            {
              applyModeration: false,
              feedbackId,
            }
          )
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
            error: settled.value.result.reason || "Unknown error",
            feedbackId: settled.value.feedbackId,
          });
        }
      } else {
        failedItems++;
      }
    }

    const processedItems = successfulItems + failedItems;

    // Report errors
    for (const error of errors) {
      await ctx.runMutation(
        internal.feedback.auto_tagging_jobs.updateJobProgress,
        {
          error,
          failedItems,
          jobId,
          processedItems,
          successfulItems,
        }
      );
    }

    // Mark as completed
    await ctx.runMutation(
      internal.feedback.auto_tagging_jobs.updateJobProgress,
      {
        failedItems,
        jobId,
        processedItems,
        status: failedItems === untaggedIds.length ? "failed" : "completed",
        successfulItems,
      }
    );

    return { failed: failedItems, processed: processedItems };
  },
});
