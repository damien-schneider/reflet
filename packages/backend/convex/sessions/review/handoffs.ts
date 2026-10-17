import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
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
import { buildSessionBrief } from "../brief/build";
import { loadBriefInput, requireBriefEvidence } from "../brief/input";
import { MAX_HANDOFF_DELIVERIES } from "../constants";
import { shapeHandoff } from "../views/detail";

const ONLY_KEPT = "Only confirmed intentions can be handed off.";

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

async function markProposalsTouched(
  ctx: MutationCtx,
  options: { now: number; proposals: Doc<"sessionProposals">[] }
): Promise<void> {
  for (const proposal of options.proposals) {
    await ctx.db.patch(proposal._id, { humanTouchedAt: options.now });
  }
}

const briefSelectionArgs = {
  actor: sessionActorValidator,
  evidenceIds: v.array(v.string()),
  proposalIds: v.array(v.string()),
  sessionId: v.string(),
};

async function buildChosenBrief(
  ctx: QueryCtx,
  options: {
    evidenceIds: string[];
    proposalIds: string[];
    session: Doc<"sessions">;
  }
) {
  const { session } = options;
  const proposals = await loadKeptProposals(ctx, {
    proposalIds: options.proposalIds,
    sessionId: session._id,
  });
  const evidenceIds = await requireBriefEvidence(ctx, {
    ids: options.evidenceIds,
    proposals,
    session,
  });
  const brief = buildSessionBrief(
    await loadBriefInput(ctx, {
      chosenEvidenceIds: evidenceIds,
      proposals,
      session,
    })
  );
  return { brief, evidenceIds, proposals };
}

export const preview = internalQuery({
  args: briefSelectionArgs,
  handler: async (ctx, args) => {
    const session = await loadSession(ctx, {
      access: "write",
      actor: args.actor,
      sessionId: args.sessionId,
    });
    const { brief } = await buildChosenBrief(ctx, { ...args, session });
    return { brief: brief.markdown };
  },
});

export const create = internalMutation({
  args: { ...briefSelectionArgs, clientKey: v.string() },
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
    const { brief, evidenceIds, proposals } = await buildChosenBrief(ctx, {
      ...args,
      session,
    });
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
        response: proposal.response ?? null,
        revision: proposal.revision,
        unknowns: proposal.unknowns,
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
