import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import {
  loadSession,
  loadSessionChild,
  requireIdsInSession,
  type SessionActor,
  sessionActorValidator,
  sessionConflict,
  sessionNotFound,
} from "../access";
import { dropMergeSuggestionsTo } from "../ai/analysis_apply";
import { requestRefinement } from "../ai/analysis_request";
import { REVISION_CONFLICT } from "../constants";
import { contributionsToIntention } from "../intentions/contributions";
import { detachContribution, forgetIntention } from "../intentions/lifecycle";
import { proposalDecisionValidator } from "../validators";
import { loadProposalView } from "../views/detail";

export function loadOwnProposal(
  ctx: MutationCtx,
  options: { actor: SessionActor; proposalId: string }
): Promise<{ child: Doc<"sessionProposals">; session: Doc<"sessions"> }> {
  return loadSessionChild(ctx, {
    access: "write",
    actor: options.actor,
    id: options.proposalId,
    table: "sessionProposals",
  });
}

function requireRevision(
  proposal: Doc<"sessionProposals">,
  expectedRevision: number
): void {
  if (proposal.revision !== expectedRevision) {
    throw sessionConflict(REVISION_CONFLICT);
  }
}

function findReplayedProposal(
  ctx: MutationCtx,
  options: { clientKey: string; session: Doc<"sessions"> }
): Promise<Doc<"sessionProposals"> | null> {
  return ctx.db
    .query("sessionProposals")
    .withIndex("by_session_client_key", (q) =>
      q.eq("sessionId", options.session._id).eq("clientKey", options.clientKey)
    )
    .unique();
}

export const create = internalMutation({
  args: {
    actor: sessionActorValidator,
    clientKey: v.string(),
    evidenceIds: v.optional(v.array(v.string())),
    need: v.string(),
    observed: v.optional(v.string()),
    segmentIds: v.optional(v.array(v.string())),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await loadSession(ctx, {
      access: "write",
      actor: args.actor,
      sessionId: args.sessionId,
    });
    const replayed = await findReplayedProposal(ctx, {
      clientKey: args.clientKey,
      session,
    });
    if (replayed) {
      return await loadProposalView(ctx, {
        proposalId: replayed._id,
        viewer: args.actor,
      });
    }
    const [segmentIds, evidenceIds] = await Promise.all([
      requireIdsInSession(ctx, {
        ids: args.segmentIds ?? [],
        sessionId: session._id,
        table: "sessionSegments",
      }),
      requireIdsInSession(ctx, {
        ids: args.evidenceIds ?? [],
        sessionId: session._id,
        table: "sessionEvidence",
      }),
    ]);
    const now = Date.now();
    const proposalId = await ctx.db.insert("sessionProposals", {
      basedOnTranscriptRevision: session.transcriptRevision,
      certainty: "clear",
      clarifications: [],
      clientKey: args.clientKey,
      createdAt: now,
      decision: "pending",
      evidenceIds,
      humanTouchedAt: now,
      need: args.need,
      needsReview: false,
      observed: args.observed ?? "",
      organizationId: session.organizationId,
      origin: "human",
      revision: 0,
      segmentIds,
      sessionId: session._id,
      setAside: [],
      unknowns: [],
      updatedAt: now,
    });
    return await loadProposalView(ctx, { proposalId, viewer: args.actor });
  },
});

export const decide = internalMutation({
  args: {
    actor: sessionActorValidator,
    decision: proposalDecisionValidator,
    proposalId: v.string(),
  },
  handler: async (ctx, args) => {
    const { child: proposal } = await loadOwnProposal(ctx, args);
    if (proposal.decision !== args.decision) {
      const now = Date.now();
      await ctx.db.patch(proposal._id, {
        decision: args.decision,
        humanTouchedAt: now,
        updatedAt: now,
      });
    }
    return await loadProposalView(ctx, {
      proposalId: proposal._id,
      viewer: args.actor,
    });
  },
});

export const edit = internalMutation({
  args: {
    actor: sessionActorValidator,
    expectedRevision: v.number(),
    need: v.optional(v.string()),
    observed: v.optional(v.string()),
    proposalId: v.string(),
    response: v.optional(v.union(v.string(), v.null())),
    setAside: v.optional(v.array(v.string())),
    unknowns: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { child: proposal } = await loadOwnProposal(ctx, args);
    requireRevision(proposal, args.expectedRevision);
    const now = Date.now();
    const needChanged = args.need !== undefined && args.need !== proposal.need;
    await ctx.db.patch(proposal._id, {
      formulation: needChanged ? "human" : proposal.formulation,
      humanTouchedAt: now,
      need: args.need ?? proposal.need,
      needsReview: false,
      observed: args.observed ?? proposal.observed,
      response:
        args.response === undefined
          ? proposal.response
          : (args.response ?? undefined),
      revision: proposal.revision + 1,
      setAside: args.setAside ?? proposal.setAside,
      unknowns: args.unknowns ?? proposal.unknowns,
      updatedAt: now,
    });
    return await loadProposalView(ctx, {
      proposalId: proposal._id,
      viewer: args.actor,
    });
  },
});

export const clarify = internalMutation({
  args: {
    actor: sessionActorValidator,
    expectedRevision: v.number(),
    proposalId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const { child: proposal } = await loadOwnProposal(ctx, args);
    requireRevision(proposal, args.expectedRevision);
    await requestRefinement(ctx, { proposal, text: args.text });
    return await loadProposalView(ctx, {
      proposalId: proposal._id,
      viewer: args.actor,
    });
  },
});

async function requireVerifiedIn(
  ctx: MutationCtx,
  options: { proposal: Doc<"sessionProposals">; sessionId: string }
): Promise<Id<"sessions">> {
  const { proposal } = options;
  if (options.sessionId === proposal.sessionId) {
    return proposal.sessionId;
  }
  const contribution = (await contributionsToIntention(ctx, proposal._id)).find(
    (item) =>
      item.sessionId === options.sessionId && item.detachedAt === undefined
  );
  if (!contribution) {
    throw sessionNotFound();
  }
  return contribution.sessionId;
}

export const verify = internalMutation({
  args: {
    actor: sessionActorValidator,
    note: v.optional(v.string()),
    proposalId: v.string(),
    sessionId: v.optional(v.string()),
    status: v.union(v.literal("works"), v.literal("needs_work")),
  },
  handler: async (ctx, args) => {
    const { child: proposal } = await loadOwnProposal(ctx, args);
    const sessionId =
      args.sessionId === undefined
        ? undefined
        : await requireVerifiedIn(ctx, {
            proposal,
            sessionId: args.sessionId,
          });
    const now = Date.now();
    await ctx.db.patch(proposal._id, {
      humanTouchedAt: now,
      updatedAt: now,
      verification: {
        at: now,
        note: args.note,
        sessionId,
        status: args.status,
      },
    });
    return await loadProposalView(ctx, {
      proposalId: proposal._id,
      viewer: args.actor,
    });
  },
});

async function deleteHandoffsCiting(
  ctx: MutationCtx,
  proposal: Doc<"sessionProposals">
): Promise<void> {
  const handoffs = await ctx.db
    .query("sessionHandoffs")
    .withIndex("by_session", (q) => q.eq("sessionId", proposal.sessionId))
    .collect();
  for (const handoff of handoffs) {
    if (
      handoff.proposals.some(({ proposalId }) => proposalId === proposal._id)
    ) {
      await ctx.db.delete(handoff._id);
    }
  }
}

export const remove = internalMutation({
  args: { actor: sessionActorValidator, proposalId: v.string() },
  handler: async (ctx, args) => {
    const { child: proposal } = await loadOwnProposal(ctx, args);
    const siblings = await ctx.db
      .query("sessionProposals")
      .withIndex("by_session", (q) => q.eq("sessionId", proposal.sessionId))
      .collect();
    const removed = siblings.filter(
      ({ _id, mergedIntoId }) =>
        _id === proposal._id || mergedIntoId === proposal._id
    );
    const attachment = await ctx.db
      .query("sessionContributions")
      .withIndex("by_attached_proposal", (q) =>
        q.eq("attachedProposalId", proposal._id)
      )
      .collect();
    for (const contribution of attachment) {
      await detachContribution(ctx, contribution);
      await ctx.db.delete(contribution._id);
    }
    for (const item of removed) {
      await forgetIntention(ctx, item._id);
      await deleteHandoffsCiting(ctx, item);
      await ctx.db.delete(item._id);
    }
    await dropMergeSuggestionsTo(ctx, {
      proposals: siblings,
      removed: new Set(removed.map(({ _id }) => _id)),
    });
    return { deleted: true };
  },
});
