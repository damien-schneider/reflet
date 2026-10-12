import { type Infer, v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "../../_generated/server";

const TRANSCRIPT_CHANGED =
  "The transcript changed during the analysis. Analyze again.";
const MIN_MERGE_GROUP_SIZE = 2;

export const resolvedProposalValidator = v.object({
  certainty: v.union(v.literal("clear"), v.literal("uncertain")),
  evidenceIds: v.array(v.id("sessionEvidence")),
  need: v.string(),
  observed: v.string(),
  question: v.union(v.string(), v.null()),
  response: v.union(v.string(), v.null()),
  segmentIds: v.array(v.id("sessionSegments")),
  setAside: v.array(v.string()),
  unknowns: v.array(v.string()),
});

type ResolvedProposalValue = Infer<typeof resolvedProposalValidator>;

export const isCurrentRun = (
  session: Doc<"sessions"> | null,
  runId: string
): session is Doc<"sessions"> =>
  session !== null &&
  session.deletedAt === undefined &&
  session.analysis.runId === runId &&
  session.analysis.state === "running";

export const loadHandedOffProposalIds = async (
  ctx: QueryCtx,
  sessionId: Id<"sessions">
): Promise<Set<Id<"sessionProposals">>> => {
  const handoffs = await ctx.db
    .query("sessionHandoffs")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();
  return new Set(
    handoffs.flatMap(({ proposals }) =>
      proposals.map(({ proposalId }) => proposalId)
    )
  );
};

export const isReplaceableByAnalysis = (
  proposal: Doc<"sessionProposals">,
  handedOffIds: Set<Id<"sessionProposals">>
): boolean =>
  proposal.origin === "ai" &&
  proposal.humanTouchedAt === undefined &&
  proposal.decision === "pending" &&
  proposal.revision === 1 &&
  proposal.clarifications.length === 0 &&
  proposal.feedbackId === undefined &&
  proposal.mergedIntoId === undefined &&
  !handedOffIds.has(proposal._id);

export const loadRefiningProposal = async (
  ctx: QueryCtx,
  target: { proposalId: Id<"sessionProposals">; runId: string }
) => {
  const proposal = await ctx.db.get(target.proposalId);
  const refinement = proposal?.refinement;
  if (refinement?.runId !== target.runId || refinement.state !== "running") {
    return null;
  }
  const session = proposal ? await ctx.db.get(proposal.sessionId) : null;
  if (!(proposal && session) || session.deletedAt !== undefined) {
    return null;
  }
  return { proposal, refinement, session };
};

const proposalContent = (proposal: ResolvedProposalValue) => ({
  ...proposal,
  question: proposal.question ?? undefined,
  response: proposal.response ?? undefined,
});

const removeReplaceableProposals = async (
  ctx: MutationCtx,
  sessionId: Id<"sessions">
): Promise<void> => {
  const proposals = await ctx.db
    .query("sessionProposals")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();
  const handedOffIds = await loadHandedOffProposalIds(ctx, sessionId);
  const removed = new Set<Id<"sessionProposals">>();
  for (const proposal of proposals) {
    if (isReplaceableByAnalysis(proposal, handedOffIds)) {
      await ctx.db.delete(proposal._id);
      removed.add(proposal._id);
    }
  }
  for (const { _id, mergeSuggestion } of proposals) {
    const citesRemoved = mergeSuggestion?.withIds.some((id) => removed.has(id));
    if (removed.has(_id) || !(mergeSuggestion && citesRemoved)) {
      continue;
    }
    const withIds = mergeSuggestion.withIds.filter((id) => !removed.has(id));
    await ctx.db.patch(_id, {
      mergeSuggestion:
        withIds.length > 0
          ? { reason: mergeSuggestion.reason, withIds }
          : undefined,
    });
  }
};

const insertProposals = async (
  ctx: MutationCtx,
  options: {
    proposals: ResolvedProposalValue[];
    runId: string;
    session: Doc<"sessions">;
  }
): Promise<Id<"sessionProposals">[]> => {
  const { session } = options;
  const now = Date.now();
  const insertedIds: Id<"sessionProposals">[] = [];
  for (const proposal of options.proposals) {
    const id = await ctx.db.insert("sessionProposals", {
      ...proposalContent(proposal),
      analysisRunId: options.runId,
      basedOnTranscriptRevision: session.transcriptRevision,
      clarifications: [],
      createdAt: now,
      decision: "pending",
      needsReview: false,
      organizationId: session.organizationId,
      origin: "ai",
      revision: 1,
      sessionId: session._id,
      updatedAt: now,
    });
    insertedIds.push(id);
  }
  return insertedIds;
};

const suggestMerges = async (
  ctx: MutationCtx,
  insertedIds: Id<"sessionProposals">[],
  groups: { indexes: number[]; reason: string }[]
): Promise<void> => {
  const suggested = new Set<Id<"sessionProposals">>();
  for (const { indexes, reason } of groups) {
    const members = indexes.flatMap((index) => {
      const id = insertedIds[index];
      return id === undefined || suggested.has(id) ? [] : [id];
    });
    if (members.length < MIN_MERGE_GROUP_SIZE) {
      continue;
    }
    for (const id of members) {
      suggested.add(id);
      const withIds = members.filter((other) => other !== id);
      await ctx.db.patch(id, { mergeSuggestion: { reason, withIds } });
    }
  }
};

const settleFailedAnalysis = async (
  ctx: MutationCtx,
  session: Doc<"sessions">,
  error: string
): Promise<void> => {
  await ctx.db.patch(session._id, {
    analysis: {
      ...session.analysis,
      error,
      state: "failed",
      updatedAt: Date.now(),
    },
  });
};

export const applyAnalysis = internalMutation({
  args: {
    mergeGroups: v.array(
      v.object({ indexes: v.array(v.number()), reason: v.string() })
    ),
    proposals: v.array(resolvedProposalValidator),
    runId: v.string(),
    sessionId: v.id("sessions"),
    transcriptRevision: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!isCurrentRun(session, args.runId)) {
      return null;
    }
    if (session.transcriptRevision !== args.transcriptRevision) {
      await settleFailedAnalysis(ctx, session, TRANSCRIPT_CHANGED);
      return null;
    }
    await removeReplaceableProposals(ctx, session._id);
    const insertedIds = await insertProposals(ctx, {
      proposals: args.proposals,
      runId: args.runId,
      session,
    });
    await suggestMerges(ctx, insertedIds, args.mergeGroups);
    await ctx.db.patch(session._id, {
      analysis: {
        analyzedRevision: args.transcriptRevision,
        proposalCount: insertedIds.length,
        runId: args.runId,
        state: "succeeded",
        updatedAt: Date.now(),
      },
    });
    return null;
  },
  returns: v.null(),
});

export const failAnalysis = internalMutation({
  args: { error: v.string(), runId: v.string(), sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (isCurrentRun(session, args.runId)) {
      await settleFailedAnalysis(ctx, session, args.error);
    }
    return null;
  },
  returns: v.null(),
});

export const applyRefinement = internalMutation({
  args: {
    proposal: resolvedProposalValidator,
    proposalId: v.id("sessionProposals"),
    runId: v.string(),
  },
  handler: async (ctx, args) => {
    const target = await loadRefiningProposal(ctx, args);
    if (!target) {
      return null;
    }
    const { proposal, refinement, session } = target;
    if (proposal.revision !== refinement.baseRevision) {
      await ctx.db.patch(proposal._id, {
        refinement: { ...refinement, state: "outdated" },
      });
      return null;
    }
    const content = proposalContent(args.proposal);
    await ctx.db.patch(proposal._id, {
      ...content,
      basedOnTranscriptRevision: session.transcriptRevision,
      evidenceIds:
        content.evidenceIds.length > 0
          ? content.evidenceIds
          : proposal.evidenceIds,
      needsReview: false,
      refinement: undefined,
      revision: proposal.revision + 1,
      segmentIds:
        content.segmentIds.length > 0
          ? content.segmentIds
          : proposal.segmentIds,
      updatedAt: Date.now(),
    });
    return null;
  },
  returns: v.null(),
});

export const failRefinement = internalMutation({
  args: {
    error: v.string(),
    proposalId: v.id("sessionProposals"),
    runId: v.string(),
  },
  handler: async (ctx, args) => {
    const target = await loadRefiningProposal(ctx, args);
    if (target) {
      await ctx.db.patch(target.proposal._id, {
        refinement: {
          ...target.refinement,
          error: args.error,
          state: "failed",
        },
      });
    }
    return null;
  },
  returns: v.null(),
});
