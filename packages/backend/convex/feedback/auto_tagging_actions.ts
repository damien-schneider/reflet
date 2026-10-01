import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import {
  evaluateFeedbackTriage,
  type FeedbackTriage,
  isTriageConfigured,
} from "./triage_evaluation";
import { triageScopeValidator } from "./triage_scope";

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

    const { feedback, tags } = data;
    const runId = await ctx.runMutation(internal.feedback.triage_runs.start, {
      applyModeration: args.applyModeration,
      feedbackId: args.feedbackId,
      input: { description: feedback.description, title: feedback.title },
      tags: tags.map((tag) => ({
        _id: tag._id,
        description: tag.description,
        name: tag.name,
      })),
    });

    if (!isTriageConfigured()) {
      await ctx.runMutation(internal.feedback.triage_runs.fail, {
        error: "OPENROUTER_API_KEY is not set",
        runId,
      });
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
      await ctx.runMutation(internal.feedback.triage_runs.fail, {
        error: err instanceof Error ? err.message : String(err),
        runId,
      });
      return {
        reason: `Triage evaluation failed: ${err instanceof Error ? err.message : String(err)}`,
        success: false,
        tagCount: 0,
      };
    }

    const applied = await ctx.runMutation(
      internal.feedback.triage_runs.complete,
      {
        answers: triage.answers,
        junk: triage.junk,
        needsReview: triage.needsReview,
        runId,
        tagIds: triage.tagIds,
        usefulness: triage.usefulness,
      }
    );
    return applied
      ? { success: true, tagCount: triage.tagIds.length }
      : {
          reason: "Input changed or a newer analysis superseded this run",
          success: false,
          tagCount: 0,
        };
  },
  returns: v.object({
    reason: v.optional(v.string()),
    success: v.boolean(),
    tagCount: v.number(),
  }),
});

const chunk = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size)
  );

const TRIAGE_BATCH_SIZE = 8;

export const processBulkAutoTagging = internalAction({
  args: {
    organizationId: v.id("organizations"),
    scope: triageScopeValidator,
  },
  handler: async (
    ctx,
    args
  ): Promise<{ processed: number; failed: number }> => {
    const targetIds: Id<"feedback">[] = await ctx.runQuery(
      internal.feedback.auto_tagging.getFeedbackIdsForTriage,
      { organizationId: args.organizationId, scope: args.scope }
    );

    if (targetIds.length === 0) {
      return { failed: 0, processed: 0 };
    }

    const jobId = await ctx.runMutation(
      internal.feedback.auto_tagging_jobs.createJob,
      {
        organizationId: args.organizationId,
        totalItems: targetIds.length,
      }
    );

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

    let successfulItems = 0;
    let failedItems = 0;

    try {
      for (const batch of chunk(targetIds, TRIAGE_BATCH_SIZE)) {
        const outcomes = await Promise.all(
          batch.map(async (feedbackId) => {
            try {
              const result = await ctx.runAction(
                internal.feedback.auto_tagging_actions.processAutoTagging,
                { applyModeration: false, feedbackId }
              );
              return result.success
                ? { feedbackId, ok: true as const }
                : {
                    error: result.reason ?? "Unknown error",
                    feedbackId,
                    ok: false as const,
                  };
            } catch (err) {
              return {
                error: err instanceof Error ? err.message : String(err),
                feedbackId,
                ok: false as const,
              };
            }
          })
        );

        const errors: { error: string; feedbackId: Id<"feedback"> }[] = [];

        for (const outcome of outcomes) {
          if (outcome.ok) {
            successfulItems++;
            continue;
          }

          failedItems++;
          errors.push({ error: outcome.error, feedbackId: outcome.feedbackId });
        }

        await ctx.runMutation(
          internal.feedback.auto_tagging_jobs.updateJobProgress,
          {
            errors,
            failedItems,
            jobId,
            processedItems: successfulItems + failedItems,
            successfulItems,
          }
        );
      }
    } finally {
      await ctx.runMutation(
        internal.feedback.auto_tagging_jobs.updateJobProgress,
        {
          failedItems,
          jobId,
          processedItems: successfulItems + failedItems,
          status: failedItems === targetIds.length ? "failed" : "completed",
          successfulItems,
        }
      );
    }

    return {
      failed: failedItems,
      processed: successfulItems + failedItems,
    };
  },
  returns: v.object({ failed: v.number(), processed: v.number() }),
});
