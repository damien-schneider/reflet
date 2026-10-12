import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalMutation } from "../../_generated/server";
import {
  sessionActorValidator,
  sessionConflict,
  sessionNotFound,
} from "../access";
import { SESSION_TEXT_LIMITS } from "../constants";
import { loadProposalView } from "../views/detail";
import { loadOwnProposal } from "./proposals";

const ALREADY_MERGED = "This proposal was already merged.";

function unionOf<T>(lists: T[][], limit: number): T[] {
  return [...new Set(lists.flat())].slice(0, limit);
}

function mergedContent(
  target: Doc<"sessionProposals">,
  sources: Doc<"sessionProposals">[]
) {
  const all = [target, ...sources];
  const observed = all
    .map((proposal) => proposal.observed.trim())
    .filter((text) => text.length > 0)
    .join("\n\n")
    .slice(0, SESSION_TEXT_LIMITS.observed);
  return {
    evidenceIds: unionOf(
      all.map((proposal) => proposal.evidenceIds),
      Number.POSITIVE_INFINITY
    ),
    observed,
    segmentIds: unionOf(
      all.map((proposal) => proposal.segmentIds),
      Number.POSITIVE_INFINITY
    ),
    setAside: unionOf(
      all.map((proposal) => proposal.setAside),
      SESSION_TEXT_LIMITS.listItems
    ),
    unknowns: unionOf(
      all.map((proposal) => proposal.unknowns),
      SESSION_TEXT_LIMITS.listItems
    ),
  };
}

export const merge = internalMutation({
  args: {
    actor: sessionActorValidator,
    sourceIds: v.array(v.string()),
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    const { child: target } = await loadOwnProposal(ctx, {
      actor: args.actor,
      proposalId: args.targetId,
    });
    const sources: Doc<"sessionProposals">[] = [];
    for (const sourceId of new Set(args.sourceIds)) {
      const { child: source } = await loadOwnProposal(ctx, {
        actor: args.actor,
        proposalId: sourceId,
      });
      if (source._id === target._id || source.sessionId !== target.sessionId) {
        throw sessionNotFound();
      }
      sources.push(source);
    }
    if ([target, ...sources].some((proposal) => proposal.mergedIntoId)) {
      throw sessionConflict(ALREADY_MERGED);
    }
    const now = Date.now();
    for (const source of sources) {
      await ctx.db.patch(source._id, {
        humanTouchedAt: now,
        mergedIntoId: target._id,
        mergeSuggestion: undefined,
        updatedAt: now,
      });
    }
    await ctx.db.patch(target._id, {
      ...mergedContent(target, sources),
      humanTouchedAt: now,
      mergeSuggestion: undefined,
      needsReview: false,
      revision: target.revision + 1,
      updatedAt: now,
    });
    return await loadProposalView(ctx, target._id);
  },
});

export const separate = internalMutation({
  args: { actor: sessionActorValidator, proposalId: v.string() },
  handler: async (ctx, args) => {
    const { child: proposal } = await loadOwnProposal(ctx, args);
    const now = Date.now();
    const partnerIds: Id<"sessionProposals">[] =
      proposal.mergeSuggestion?.withIds ?? [];
    for (const partnerId of partnerIds) {
      const partner = await ctx.db.get(partnerId);
      const suggestion = partner?.mergeSuggestion;
      if (partner && suggestion) {
        const withIds = suggestion.withIds.filter((id) => id !== proposal._id);
        await ctx.db.patch(partner._id, {
          mergeSuggestion:
            withIds.length > 0 ? { ...suggestion, withIds } : undefined,
        });
      }
    }
    await ctx.db.patch(proposal._id, {
      humanTouchedAt: now,
      mergeSuggestion: undefined,
      updatedAt: now,
    });
    return await loadProposalView(ctx, proposal._id);
  },
});
