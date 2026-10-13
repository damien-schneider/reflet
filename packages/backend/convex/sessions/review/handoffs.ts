import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "../../_generated/server";
import {
  loadSession,
  loadSessionChild,
  requireIdsInSession,
  sessionActorValidator,
  sessionConflict,
} from "../access";
import { buildSessionBrief } from "../brief";
import { MAX_HANDOFF_DELIVERIES } from "../constants";
import { loadSessionEvents, shapeHandoff } from "../views/detail";
import { authorNameOf } from "../views/summary";

const ONLY_KEPT = "Only kept proposals can be handed off.";

async function resolveFiles(ctx: QueryCtx, handoff: Doc<"sessionHandoffs">) {
  const files: {
    evidenceId: Id<"sessionEvidence">;
    name: string;
    url: string;
  }[] = [];
  for (const file of handoff.files) {
    const evidence = await ctx.db.get(file.evidenceId);
    const url = evidence?.image
      ? await ctx.storage.getUrl(evidence.image.storageId)
      : null;
    if (url) {
      files.push({ evidenceId: file.evidenceId, name: file.name, url });
    }
  }
  return files;
}

async function handoffResponse(ctx: QueryCtx, handoff: Doc<"sessionHandoffs">) {
  return {
    files: await resolveFiles(ctx, handoff),
    handoff: shapeHandoff(handoff),
  };
}

async function findReplayedHandoff(
  ctx: QueryCtx,
  options: { clientKey: string; sessionId: Id<"sessions"> }
) {
  return await ctx.db
    .query("sessionHandoffs")
    .withIndex("by_session_client_key", (q) =>
      q.eq("sessionId", options.sessionId).eq("clientKey", options.clientKey)
    )
    .unique();
}

export async function loadKeptProposals(
  ctx: QueryCtx,
  options: { proposalIds: string[]; sessionId: Id<"sessions"> }
): Promise<Doc<"sessionProposals">[]> {
  const ids = await requireIdsInSession(ctx, {
    ids: options.proposalIds,
    sessionId: options.sessionId,
    table: "sessionProposals",
  });
  if (ids.length === 0) {
    throw sessionConflict(ONLY_KEPT);
  }
  const proposals: Doc<"sessionProposals">[] = [];
  for (const id of ids) {
    const proposal = await ctx.db.get(id);
    if (proposal?.decision !== "kept" || proposal.mergedIntoId) {
      throw sessionConflict(ONLY_KEPT);
    }
    proposals.push(proposal);
  }
  return proposals;
}

export async function briefInputFor(
  ctx: QueryCtx,
  options: {
    evidenceIds: Id<"sessionEvidence">[];
    proposals: Doc<"sessionProposals">[];
    session: Doc<"sessions">;
  }
) {
  const citedSegmentIds = new Set(
    options.proposals.flatMap((proposal) => proposal.segmentIds)
  );
  const segments = await ctx.db
    .query("sessionSegments")
    .withIndex("by_session_start", (q) =>
      q.eq("sessionId", options.session._id)
    )
    .collect();
  const evidence: Doc<"sessionEvidence">[] = [];
  for (const evidenceId of options.evidenceIds) {
    const item = await ctx.db.get(evidenceId);
    if (item) {
      evidence.push(item);
    }
  }
  const organization = await ctx.db.get(options.session.organizationId);
  return {
    authorName: await authorNameOf(ctx, options.session.authorId),
    events: await loadSessionEvents(ctx, options.session._id),
    evidence,
    organizationName: organization?.name ?? "",
    proposals: options.proposals,
    segments: segments.filter((segment) => citedSegmentIds.has(segment._id)),
    session: options.session,
  };
}

async function markProposalsTouched(
  ctx: MutationCtx,
  options: { now: number; proposals: Doc<"sessionProposals">[] }
): Promise<void> {
  for (const proposal of options.proposals) {
    await ctx.db.patch(proposal._id, { humanTouchedAt: options.now });
  }
}

export const create = internalMutation({
  args: {
    actor: sessionActorValidator,
    clientKey: v.string(),
    evidenceIds: v.array(v.string()),
    proposalIds: v.array(v.string()),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await loadSession(ctx, {
      access: "write",
      actor: args.actor,
      sessionId: args.sessionId,
    });
    const replayed = await findReplayedHandoff(ctx, {
      clientKey: args.clientKey,
      sessionId: session._id,
    });
    if (replayed) {
      return await handoffResponse(ctx, replayed);
    }
    const proposals = await loadKeptProposals(ctx, {
      proposalIds: args.proposalIds,
      sessionId: session._id,
    });
    const evidenceIds = await requireIdsInSession(ctx, {
      ids: args.evidenceIds,
      sessionId: session._id,
      table: "sessionEvidence",
    });
    const brief = buildSessionBrief(
      await briefInputFor(ctx, { evidenceIds, proposals, session })
    );
    const now = Date.now();
    const handoffId = await ctx.db.insert("sessionHandoffs", {
      authorId: args.actor.userId,
      brief: brief.markdown,
      clientKey: args.clientKey,
      createdAt: now,
      deliveries: [],
      evidenceIds,
      files: brief.files,
      organizationId: session.organizationId,
      proposals: proposals.map((proposal) => ({
        need: proposal.need,
        proposalId: proposal._id,
        revision: proposal.revision,
      })),
      sessionId: session._id,
    });
    await markProposalsTouched(ctx, { now, proposals });
    const handoff = await ctx.db.get(handoffId);
    if (!handoff) {
      throw new Error("Handoff insert failed");
    }
    return await handoffResponse(ctx, handoff);
  },
});

export const delivered = internalMutation({
  args: {
    actor: sessionActorValidator,
    handoffId: v.string(),
    kind: v.union(v.literal("copied"), v.literal("exported")),
  },
  handler: async (ctx, args) => {
    const { child: handoff } = await loadSessionChild(ctx, {
      access: "write",
      actor: args.actor,
      id: args.handoffId,
      table: "sessionHandoffs",
    });
    const deliveries = [
      ...handoff.deliveries,
      { at: Date.now(), kind: args.kind },
    ].slice(-MAX_HANDOFF_DELIVERIES);
    await ctx.db.patch(handoff._id, { deliveries });
    return { handoff: shapeHandoff({ ...handoff, deliveries }) };
  },
});
