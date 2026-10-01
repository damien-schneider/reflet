import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server";
import { publicationState } from "../feedback/property_values";
import { WITHHOLD_JUNK_THRESHOLD } from "../feedback/triage_questions";

const PUBLICATION_TRIAGE_DEPLOYED_AT = Date.parse("2026-10-01T10:35:51Z");
const PAGE_SIZE = 100;

const pageArgs = {
  createdBefore: v.number(),
  cursor: v.union(v.string(), v.null()),
};

async function heldPage(
  ctx: QueryCtx,
  args: { createdBefore: number; cursor: string | null }
) {
  const page = await ctx.db
    .query("feedback")
    .withIndex("by_creation_time", (q) =>
      q.gte("_creationTime", PUBLICATION_TRIAGE_DEPLOYED_AT)
    )
    .paginate({ cursor: args.cursor, numItems: PAGE_SIZE });
  const requireApprovalByOrganization = new Map<string, boolean>();
  const held: Doc<"feedback">[] = [];
  for (const feedback of page.page) {
    const flaggedAsJunk =
      feedback.aiJunk !== undefined &&
      feedback.aiJunk >= WITHHOLD_JUNK_THRESHOLD;
    const waitsForTriage =
      feedback.createdAt < args.createdBefore &&
      !feedback.deletedAt &&
      !feedback.isMerged &&
      publicationState(feedback) === "pending" &&
      feedback.publicationReviewedAt === undefined &&
      !flaggedAsJunk;
    if (!waitsForTriage) {
      continue;
    }
    if (!requireApprovalByOrganization.has(feedback.organizationId)) {
      const organization = await ctx.db.get(feedback.organizationId);
      requireApprovalByOrganization.set(
        feedback.organizationId,
        organization?.feedbackSettings?.requireApproval ?? false
      );
    }
    if (!requireApprovalByOrganization.get(feedback.organizationId)) {
      held.push(feedback);
    }
  }
  return { continueCursor: page.continueCursor, held, isDone: page.isDone };
}

export const preview = internalQuery({
  args: pageArgs,
  handler: async (ctx, args) => {
    const { continueCursor, held, isDone } = await heldPage(ctx, args);
    return {
      continueCursor,
      held: held.map((feedback) => ({
        createdAt: feedback.createdAt,
        id: feedback._id,
        organizationId: feedback.organizationId,
        source: feedback.source,
      })),
      isDone,
    };
  },
});

export const retriage = internalMutation({
  args: pageArgs,
  handler: async (ctx, args) => {
    const { continueCursor, held, isDone } = await heldPage(ctx, args);
    const now = Date.now();
    for (const feedback of held) {
      const latestRun = await ctx.db
        .query("feedbackTriageRuns")
        .withIndex("by_feedback", (q) => q.eq("feedbackId", feedback._id))
        .order("desc")
        .first();
      if (latestRun?.status === "running") {
        await ctx.db.patch(latestRun._id, {
          completedAt: now,
          error: "Interrupted; superseded by a new triage run",
          status: "failed",
        });
      }
      await ctx.scheduler.runAfter(
        0,
        internal.feedback.auto_tagging_actions.processAutoTagging,
        { feedbackId: feedback._id }
      );
    }
    return { continueCursor, isDone, scheduled: held.length };
  },
});
