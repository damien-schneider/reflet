import { type Infer, v } from "convex/values";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import { findContinuation } from "../../intentions/contributions";
import {
  intentionChangeKindValidator,
  intentionChangeOperationValidator,
  intentionFieldValidator,
  verdictStatusValidator,
} from "../../validators";

export const continuationResultValidator = v.object({
  intentionRevision: v.number(),
  suggestions: v.array(v.object({ index: v.number(), reason: v.string() })),
  update: v.object({
    changes: v.array(
      v.object({
        evidenceIds: v.array(v.id("sessionEvidence")),
        field: intentionFieldValidator,
        hypothesis: v.boolean(),
        kind: intentionChangeKindValidator,
        operation: intentionChangeOperationValidator,
        reason: v.string(),
        segmentIds: v.array(v.id("sessionSegments")),
        value: v.string(),
      })
    ),
    question: v.union(v.string(), v.null()),
    verdict: v.union(
      v.object({
        reason: v.string(),
        segmentIds: v.array(v.id("sessionSegments")),
        status: verdictStatusValidator,
      }),
      v.null()
    ),
  }),
});

type ContinuationResult = Infer<typeof continuationResultValidator>;

async function suggestIntention(
  ctx: MutationCtx,
  options: {
    insertedIds: Id<"sessionProposals">[];
    intentionId: Id<"sessionProposals">;
    suggestions: ContinuationResult["suggestions"];
  }
): Promise<void> {
  for (const { index, reason } of options.suggestions) {
    const proposalId = options.insertedIds[index];
    if (proposalId) {
      await ctx.db.patch(proposalId, {
        intentionSuggestion: { intentionId: options.intentionId, reason },
      });
    }
  }
}

const decidedChanges = (contribution: Doc<"sessionContributions">) =>
  contribution.changes.filter(({ decision }) => decision !== "pending");

export async function applyContinuationResult(
  ctx: MutationCtx,
  options: {
    insertedIds: Id<"sessionProposals">[];
    result: ContinuationResult;
    session: Doc<"sessions">;
  }
): Promise<void> {
  const contribution = await findContinuation(ctx, options.session);
  if (!contribution || contribution.detachedAt !== undefined) {
    return;
  }
  const { update } = options.result;
  await ctx.db.patch(contribution._id, {
    baseRevision: options.result.intentionRevision,
    changes: [
      ...decidedChanges(contribution),
      ...update.changes.map((change) => ({
        ...change,
        decision: "pending" as const,
        id: crypto.randomUUID(),
      })),
    ],
    question: update.question ?? undefined,
    updatedAt: Date.now(),
    verdict: update.verdict ?? undefined,
  });
  await suggestIntention(ctx, {
    insertedIds: options.insertedIds,
    intentionId: contribution.intentionId,
    suggestions: options.result.suggestions,
  });
}
