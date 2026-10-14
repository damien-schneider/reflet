import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { type SessionActor, sessionConflict } from "../access";
import { INTENTION_UNAVAILABLE } from "../constants";
import { intentionPatchOf, revertApplied, valuesOf } from "./changes";
import {
  contributionsToIntention,
  loadWritableIntention,
} from "./contributions";

const isContinuable = (intention: Doc<"sessionProposals">): boolean =>
  intention.decision !== "dismissed" &&
  intention.mergedIntoId === undefined &&
  intention.attachedToId === undefined;

export async function requireContinuable(
  ctx: QueryCtx,
  options: { actor: SessionActor; intentionId: string }
) {
  const target = await loadWritableIntention(ctx, options);
  if (!isContinuable(target.intention)) {
    throw sessionConflict(INTENTION_UNAVAILABLE);
  }
  return target;
}

async function findContinuable(
  ctx: QueryCtx,
  options: { actor: SessionActor; intentionId: string }
): Promise<Doc<"sessionProposals"> | null> {
  const intentionId = ctx.db.normalizeId(
    "sessionProposals",
    options.intentionId
  );
  const intention = intentionId ? await ctx.db.get(intentionId) : null;
  const session = intention ? await ctx.db.get(intention.sessionId) : null;
  const writable =
    session !== null &&
    session.deletedAt === undefined &&
    session.organizationId === options.actor.organizationId &&
    session.authorId === options.actor.userId;
  return intention && writable && isContinuable(intention) ? intention : null;
}

export async function linkContinuation(
  ctx: MutationCtx,
  options: {
    actor: SessionActor;
    continues: { intentionId: string; revision: number };
    session: Doc<"sessions">;
  }
): Promise<void> {
  const { continues, session } = options;
  const intention = await findContinuable(ctx, {
    actor: options.actor,
    intentionId: continues.intentionId,
  });
  if (!intention) {
    return;
  }
  const now = Date.now();
  await ctx.db.patch(session._id, {
    continues: { intentionId: intention._id, revision: continues.revision },
  });
  await ctx.db.insert("sessionContributions", {
    answers: [],
    applied: [],
    baseRevision: continues.revision,
    changes: [],
    createdAt: now,
    evidenceIds: [],
    intentionId: intention._id,
    organizationId: session.organizationId,
    origin: "continuation",
    segmentIds: [],
    sessionId: session._id,
    updatedAt: now,
  });
  await ctx.db.patch(intention._id, { humanTouchedAt: now });
}

export async function detachContribution(
  ctx: MutationCtx,
  contribution: Doc<"sessionContributions">
): Promise<void> {
  if (contribution.detachedAt !== undefined) {
    return;
  }
  const now = Date.now();
  const intention = await ctx.db.get(contribution.intentionId);
  if (intention) {
    const reverted = revertApplied(valuesOf(intention), contribution.applied);
    if (reverted.changed || reverted.conflicted) {
      await ctx.db.patch(intention._id, {
        ...intentionPatchOf(reverted.values),
        callout:
          reverted.values.need === intention.need
            ? intention.callout
            : undefined,
        humanTouchedAt: now,
        needsReview: intention.needsReview || reverted.conflicted,
        revision: intention.revision + (reverted.changed ? 1 : 0),
        updatedAt: now,
      });
    }
  }
  if (contribution.attachedProposalId) {
    const attached = await ctx.db.get(contribution.attachedProposalId);
    if (attached?.attachedToId === contribution.intentionId) {
      await ctx.db.patch(attached._id, {
        attachedToId: undefined,
        updatedAt: now,
      });
    }
  }
  await ctx.db.patch(contribution._id, { detachedAt: now, updatedAt: now });
}

async function forgetContribution(
  ctx: MutationCtx,
  contribution: Doc<"sessionContributions">
): Promise<void> {
  const now = Date.now();
  if (contribution.attachedProposalId) {
    const attached = await ctx.db.get(contribution.attachedProposalId);
    if (attached?.attachedToId === contribution.intentionId) {
      await ctx.db.patch(attached._id, { attachedToId: undefined });
    }
  }
  await ctx.db.patch(contribution._id, {
    applied: [],
    changes: [],
    detachedAt: contribution.detachedAt ?? now,
    question: undefined,
    updatedAt: now,
    verdict: undefined,
  });
}

export async function forgetIntention(
  ctx: MutationCtx,
  intentionId: Id<"sessionProposals">
): Promise<void> {
  for (const contribution of await contributionsToIntention(ctx, intentionId)) {
    await forgetContribution(ctx, contribution);
  }
  const suggesting = await ctx.db
    .query("sessionProposals")
    .withIndex("by_intention_suggestion", (q) =>
      q.eq("intentionSuggestion.intentionId", intentionId)
    )
    .collect();
  for (const proposal of suggesting) {
    await ctx.db.patch(proposal._id, { intentionSuggestion: undefined });
  }
}

export async function forgetSessionIntentions(
  ctx: MutationCtx,
  sessionId: Id<"sessions">
): Promise<void> {
  const proposals = await ctx.db
    .query("sessionProposals")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();
  for (const proposal of proposals) {
    await forgetIntention(ctx, proposal._id);
  }
}

export async function removeSessionContributions(
  ctx: MutationCtx,
  sessionId: Id<"sessions">
): Promise<void> {
  const contributions = await ctx.db
    .query("sessionContributions")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();
  for (const contribution of contributions) {
    await detachContribution(ctx, contribution);
    await ctx.db.delete(contribution._id);
  }
}
