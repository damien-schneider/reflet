import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import {
  type SessionActor,
  sessionActorValidator,
  sessionConflict,
  sessionFailure,
  sessionNotFound,
} from "../access";
import { requestAnalysis } from "../ai/analysis_request";
import { REVISION_CONFLICT, SESSION_TEXT_LIMITS } from "../constants";
import { truncateText } from "../formatters";
import { loadIntentionUpdate } from "../views/intentions";
import {
  applyChanges,
  type IntentionFieldName,
  intentionPatchOf,
  valuesOf,
} from "./changes";
import {
  loadAttachedContribution,
  loadOwnContribution,
  requireShareConsent,
} from "./contributions";

const BAD_REQUEST_STATUS = 400;
const REJECTED_FIRST =
  "This change was rejected. Bring it back before accepting it.";
const ACCEPTED_STAYS =
  "An accepted change stays in the intention. Edit the intention or remove these changes instead.";
const EMPTY_VALUE = "A change can't be empty.";

type Change = Doc<"sessionContributions">["changes"][number];

const FIELD_LIMITS: Record<IntentionFieldName, number> = {
  need: SESSION_TEXT_LIMITS.need,
  observed: SESSION_TEXT_LIMITS.observed,
  response: SESSION_TEXT_LIMITS.response,
  setAside: SESSION_TEXT_LIMITS.listItem,
  unknowns: SESSION_TEXT_LIMITS.listItem,
};

const unionIds = <Id extends string>(current: Id[], added: Id[]): Id[] => [
  ...new Set([...current, ...added]),
];

function pickChanges(
  contribution: Doc<"sessionContributions">,
  requested: { changeId: string; value?: string }[]
): Change[] {
  return requested.flatMap(({ changeId, value }) => {
    const change = contribution.changes.find(({ id }) => id === changeId);
    if (!change) {
      throw sessionNotFound();
    }
    if (change.decision === "rejected") {
      throw sessionConflict(REJECTED_FIRST);
    }
    const edited = (value ?? change.value).trim();
    if (edited === "" && change.operation !== "remove") {
      throw sessionFailure(BAD_REQUEST_STATUS, EMPTY_VALUE);
    }
    return change.decision === "accepted"
      ? []
      : [
          {
            ...change,
            value: truncateText(edited, FIELD_LIMITS[change.field]),
          },
        ];
  });
}

const formulationAfter = (
  options: { accepted: Change[]; contribution: Doc<"sessionContributions"> },
  current: Doc<"sessionProposals">["formulation"]
): Doc<"sessionProposals">["formulation"] => {
  const needChange = options.accepted.find(({ field }) => field === "need");
  if (!needChange) {
    return current;
  }
  const suggested = options.contribution.changes.find(
    ({ id }) => id === needChange.id
  );
  return suggested?.value === needChange.value ? "ai" : "human";
};

async function applyAccepted(
  ctx: MutationCtx,
  options: {
    actor: SessionActor;
    accepted: Change[];
    contribution: Doc<"sessionContributions">;
    intention: Doc<"sessionProposals">;
    shared: boolean;
  }
): Promise<void> {
  const { accepted, contribution, intention } = options;
  const now = Date.now();
  const revision = intention.revision + 1;
  const result = applyChanges(valuesOf(intention), accepted);
  await ctx.db.patch(intention._id, {
    ...intentionPatchOf(result.values),
    formulation: formulationAfter(options, intention.formulation),
    humanTouchedAt: now,
    revision,
    updatedAt: now,
  });
  const acceptedById = new Map(accepted.map((change) => [change.id, change]));
  await ctx.db.patch(contribution._id, {
    applied: [
      ...contribution.applied,
      {
        at: now,
        by: options.actor.userId,
        changeIds: accepted.map(({ id }) => id),
        fields: result.fields,
        revision,
      },
    ],
    baseRevision: revision,
    changes: contribution.changes.map((change) => {
      const decided = acceptedById.get(change.id);
      return decided ? { ...decided, decision: "accepted" as const } : change;
    }),
    evidenceIds: unionIds(
      contribution.evidenceIds,
      accepted.flatMap(({ evidenceIds }) => evidenceIds)
    ),
    segmentIds: unionIds(
      contribution.segmentIds,
      accepted.flatMap(({ segmentIds }) => segmentIds)
    ),
    sharedAt: options.shared ? now : contribution.sharedAt,
    updatedAt: now,
  });
}

export const accept = internalMutation({
  args: {
    actor: sessionActorValidator,
    changes: v.array(
      v.object({ changeId: v.string(), value: v.optional(v.string()) })
    ),
    contributionId: v.string(),
    expectedRevision: v.number(),
    shareWithTeam: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { contribution, intention, intentionSession, session } =
      await loadAttachedContribution(ctx, args);
    const accepted = pickChanges(contribution, args.changes);
    if (accepted.length > 0) {
      if (intention.revision !== args.expectedRevision) {
        throw sessionConflict(REVISION_CONFLICT);
      }
      const shared = requireShareConsent({
        intentionSession,
        session,
        sharedAt: contribution.sharedAt,
        shareWithTeam: args.shareWithTeam,
      });
      await applyAccepted(ctx, {
        accepted,
        actor: args.actor,
        contribution,
        intention,
        shared,
      });
    }
    return await loadIntentionUpdate(ctx, {
      actor: args.actor,
      contributionId: contribution._id,
    });
  },
});

export const decideChange = internalMutation({
  args: {
    actor: sessionActorValidator,
    changeId: v.string(),
    contributionId: v.string(),
    decision: v.union(v.literal("pending"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const { contribution } = await loadOwnContribution(ctx, args);
    const change = contribution.changes.find(({ id }) => id === args.changeId);
    if (!change) {
      throw sessionNotFound();
    }
    if (change.decision === "accepted") {
      throw sessionConflict(ACCEPTED_STAYS);
    }
    if (change.decision !== args.decision) {
      await ctx.db.patch(contribution._id, {
        changes: contribution.changes.map((item) =>
          item.id === change.id ? { ...item, decision: args.decision } : item
        ),
        updatedAt: Date.now(),
      });
    }
    return await loadIntentionUpdate(ctx, {
      actor: args.actor,
      contributionId: contribution._id,
    });
  },
});

export const answer = internalMutation({
  args: {
    actor: sessionActorValidator,
    contributionId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const { contribution, session } = await loadAttachedContribution(ctx, args);
    const text = truncateText(
      args.text.trim(),
      SESSION_TEXT_LIMITS.clarification
    );
    if (text === "") {
      throw sessionFailure(BAD_REQUEST_STATUS, EMPTY_VALUE);
    }
    const [last] = contribution.answers.slice(-1);
    if (last?.text !== text) {
      await ctx.db.patch(contribution._id, {
        answers: [...contribution.answers, { at: Date.now(), text }],
        updatedAt: Date.now(),
      });
    }
    await requestAnalysis(ctx, session);
    return await loadIntentionUpdate(ctx, {
      actor: args.actor,
      contributionId: contribution._id,
    });
  },
});
