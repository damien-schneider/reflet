import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import {
  loadSession,
  loadSessionChild,
  requireIdsInSession,
  type SessionActor,
  sessionActorValidator,
  sessionConflict,
} from "../access";
import { requestRefinement } from "../ai/analysis_request";
import { REVISION_CONFLICT } from "../constants";
import { proposalDecisionValidator } from "../tableFields";
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
      return await loadProposalView(ctx, replayed._id);
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
    return await loadProposalView(ctx, proposalId);
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
    return await loadProposalView(ctx, proposal._id);
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
    await ctx.db.patch(proposal._id, {
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
    return await loadProposalView(ctx, proposal._id);
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
    return await loadProposalView(ctx, proposal._id);
  },
});

export const verify = internalMutation({
  args: {
    actor: sessionActorValidator,
    note: v.optional(v.string()),
    proposalId: v.string(),
    status: v.union(v.literal("works"), v.literal("needs_work")),
  },
  handler: async (ctx, args) => {
    const { child: proposal } = await loadOwnProposal(ctx, args);
    const now = Date.now();
    await ctx.db.patch(proposal._id, {
      humanTouchedAt: now,
      updatedAt: now,
      verification: { at: now, note: args.note, status: args.status },
    });
    return await loadProposalView(ctx, proposal._id);
  },
});
