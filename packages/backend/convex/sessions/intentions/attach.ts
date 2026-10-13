import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import { sessionActorValidator, sessionConflict } from "../access";
import { SESSION_TEXT_LIMITS } from "../constants";
import { truncateText } from "../formatters";
import { loadOwnProposal } from "../review/proposals";
import { loadProposalView } from "../views/detail";
import { loadIntentionUpdate } from "../views/intentions";
import {
  applyChanges,
  type ChangeInput,
  intentionPatchOf,
  valuesOf,
} from "./changes";
import { loadOwnContribution, requireShareConsent } from "./contributions";
import { detachContribution, requireContinuable } from "./lifecycle";

const SAME_SESSION =
  "These intentions come from the same session. Merge them instead.";
const ALREADY_ATTACHED = "This intention was already added to another one.";

const additions = (
  field: "setAside" | "unknowns",
  options: { current: string[]; incoming: string[] }
): ChangeInput[] => {
  const fresh = options.incoming.filter(
    (item) => !options.current.includes(item)
  );
  const room = SESSION_TEXT_LIMITS.listItems - options.current.length;
  return fresh
    .slice(0, Math.max(room, 0))
    .map((value) => ({ field, operation: "add", value }));
};

const attachChanges = (
  intention: Doc<"sessionProposals">,
  proposal: Doc<"sessionProposals">
): ChangeInput[] => {
  const observed = proposal.observed.trim();
  const appendsObserved =
    observed !== "" && !intention.observed.includes(observed);
  return [
    ...(appendsObserved
      ? [
          {
            field: "observed" as const,
            operation: "replace" as const,
            value: truncateText(
              [intention.observed.trim(), observed]
                .filter((text) => text !== "")
                .join("\n\n"),
              SESSION_TEXT_LIMITS.observed
            ),
          },
        ]
      : []),
    ...additions("unknowns", {
      current: intention.unknowns,
      incoming: proposal.unknowns,
    }),
    ...additions("setAside", {
      current: intention.setAside,
      incoming: proposal.setAside,
    }),
  ];
};

async function insertAttachment(
  ctx: MutationCtx,
  options: {
    by: string;
    intention: Doc<"sessionProposals">;
    proposal: Doc<"sessionProposals">;
    shared: boolean;
  }
): Promise<void> {
  const { intention, proposal } = options;
  const now = Date.now();
  const revision = intention.revision + 1;
  const result = applyChanges(
    valuesOf(intention),
    attachChanges(intention, proposal)
  );
  await ctx.db.patch(intention._id, {
    ...intentionPatchOf(result.values),
    humanTouchedAt: now,
    revision,
    updatedAt: now,
  });
  await ctx.db.insert("sessionContributions", {
    answers: [],
    applied: [
      {
        at: now,
        by: options.by,
        changeIds: [],
        fields: result.fields,
        revision,
      },
    ],
    attachedProposalId: proposal._id,
    baseRevision: revision,
    changes: [],
    createdAt: now,
    evidenceIds: proposal.evidenceIds,
    intentionId: intention._id,
    organizationId: proposal.organizationId,
    origin: "attach",
    segmentIds: proposal.segmentIds,
    sessionId: proposal.sessionId,
    sharedAt: options.shared ? now : undefined,
    updatedAt: now,
  });
  await ctx.db.patch(proposal._id, {
    attachedToId: intention._id,
    humanTouchedAt: now,
    intentionSuggestion: undefined,
    updatedAt: now,
  });
}

export const attach = internalMutation({
  args: {
    actor: sessionActorValidator,
    intentionId: v.string(),
    proposalId: v.string(),
    shareWithTeam: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { child: proposal, session } = await loadOwnProposal(ctx, args);
    const view = () =>
      loadProposalView(ctx, { proposalId: proposal._id, viewer: args.actor });
    const { intention, intentionSession } = await requireContinuable(ctx, args);
    if (proposal.attachedToId === intention._id) {
      return await view();
    }
    if (intention.sessionId === proposal.sessionId) {
      throw sessionConflict(SAME_SESSION);
    }
    if (proposal.attachedToId || proposal.mergedIntoId) {
      throw sessionConflict(ALREADY_ATTACHED);
    }
    const shared = requireShareConsent({
      intentionSession,
      session,
      sharedAt: undefined,
      shareWithTeam: args.shareWithTeam,
    });
    await insertAttachment(ctx, {
      by: args.actor.userId,
      intention,
      proposal,
      shared,
    });
    return await view();
  },
});

export const keepSeparate = internalMutation({
  args: { actor: sessionActorValidator, proposalId: v.string() },
  handler: async (ctx, args) => {
    const { child: proposal } = await loadOwnProposal(ctx, args);
    if (proposal.intentionSuggestion) {
      await ctx.db.patch(proposal._id, {
        humanTouchedAt: Date.now(),
        intentionSuggestion: undefined,
      });
    }
    return await loadProposalView(ctx, {
      proposalId: proposal._id,
      viewer: args.actor,
    });
  },
});

export const detach = internalMutation({
  args: { actor: sessionActorValidator, contributionId: v.string() },
  handler: async (ctx, args) => {
    const { contribution } = await loadOwnContribution(ctx, args);
    await detachContribution(ctx, contribution);
    return await loadIntentionUpdate(ctx, {
      actor: args.actor,
      contributionId: contribution._id,
    });
  },
});
