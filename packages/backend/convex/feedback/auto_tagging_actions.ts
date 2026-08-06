import { generateObject } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import {
  AUTO_TAGGING_MODELS,
  type AutoTaggingResponse,
  autoTaggingResponseSchema,
  openrouter,
} from "./auto_tagging_model";

export const processAutoTagging = internalAction({
  args: { feedbackId: v.id("feedback") },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; reason?: string; tagCount: number }> => {
    const data = await ctx.runQuery(
      internal.feedback.auto_tagging.getFeedbackForAutoTagging,
      { feedbackId: args.feedbackId }
    );

    if (!data?.feedback || data.tags.length === 0) {
      return {
        reason: "No feedback or tags found",
        success: false,
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
- Time estimate should be a human-readable range like "2-4 hours" or "1-2 days"
- If the feedback is unclear, nonsensical, a test entry, spam, or too vague to categorize meaningfully, set priority to "none", complexity to "trivial", timeEstimate to "N/A", return an empty selectedTagIds array, and explain in reasoning that the feedback could not be categorized`;

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
          prompt: userPrompt,
          schema: autoTaggingResponseSchema,
          system: systemPrompt,
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
        reason: `All AI models failed: ${lastError?.message ?? "Unknown error"}`,
        success: false,
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
      await ctx.runMutation(internal.feedback.auto_tagging_jobs.applyAutoTags, {
        feedbackId: args.feedbackId,
        tagIds: selectedTagIds,
      });
    }

    // Save AI analysis (priority, complexity, time estimate) regardless of tag matching
    await ctx.runMutation(internal.feedback.auto_tagging_jobs.saveAiAnalysis, {
      complexity: result.complexity,
      complexityReasoning: result.complexityReasoning,
      feedbackId: args.feedbackId,
      priority: result.priority,
      priorityReasoning: result.priorityReasoning,
      timeEstimate: result.timeEstimate,
    });

    if (selectedTagIds.length > 0) {
      return { success: true, tagCount: selectedTagIds.length };
    }

    return {
      reason:
        result.reasoning ||
        "AI selected no matching tags but analysis was saved",
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
