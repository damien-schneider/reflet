import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { canReadSession, type SessionActor } from "../access";
import { lastHandoffOf } from "../brief/intention_section";
import { needsShareConsent } from "../intentions/contributions";
import { authorNameOf } from "./summary";

type ContributionState =
  | "recording"
  | "analyzing"
  | "ready"
  | "no_change"
  | "failed";

const hasNews = (contribution: Doc<"sessionContributions">): boolean =>
  contribution.changes.length > 0 ||
  contribution.applied.length > 0 ||
  contribution.question !== undefined ||
  contribution.verdict !== undefined;

const contributionState = (
  contribution: Doc<"sessionContributions">,
  session: Doc<"sessions">
): ContributionState => {
  if (contribution.origin === "attach" || hasNews(contribution)) {
    return session.analysis.state === "running" ||
      session.analysis.state === "waiting"
      ? "analyzing"
      : "ready";
  }
  if (session.collection !== "ended") {
    return "recording";
  }
  const { state } = session.analysis;
  if (state === "succeeded") {
    return "no_change";
  }
  return state === "failed" ? "failed" : "analyzing";
};

export async function shapeAppliedChanges(
  ctx: QueryCtx,
  applied: Doc<"sessionContributions">["applied"]
) {
  return await Promise.all(
    applied.map(async (entry) => ({
      at: entry.at,
      byName: await authorNameOf(ctx, entry.by),
      fields: entry.fields,
      revision: entry.revision,
    }))
  );
}

export const shapeContinuedIntention = (
  intention: Doc<"sessionProposals">,
  intentionSession: Doc<"sessions">
) => ({
  id: intention._id,
  need: intention.need,
  observed: intention.observed,
  question: intention.question ?? null,
  response: intention.response ?? null,
  revision: intention.revision,
  sessionId: intentionSession._id,
  sessionTitle: intentionSession.title,
  setAside: intention.setAside,
  unknowns: intention.unknowns,
  verification: intention.verification
    ? {
        at: intention.verification.at,
        sessionId: intention.verification.sessionId ?? null,
        status: intention.verification.status,
      }
    : null,
});

export async function loadIntentionUpdate(
  ctx: QueryCtx,
  options: {
    actor: SessionActor;
    contributionId: Id<"sessionContributions">;
  }
) {
  const contribution = await ctx.db.get(options.contributionId);
  const session = contribution
    ? await ctx.db.get(contribution.sessionId)
    : null;
  if (!(contribution && session)) {
    throw new Error("Contribution vanished during the write");
  }
  const intention = await ctx.db.get(contribution.intentionId);
  const intentionSession = intention
    ? await ctx.db.get(intention.sessionId)
    : null;
  const readable =
    intention &&
    intentionSession &&
    canReadSession(intentionSession, options.actor);
  return {
    contribution: {
      answers: contribution.answers,
      applied: await shapeAppliedChanges(ctx, contribution.applied),
      baseRevision: contribution.baseRevision,
      changes: contribution.changes,
      detachedAt: contribution.detachedAt ?? null,
      id: contribution._id,
      intentionId: contribution.intentionId,
      needsShareConsent:
        intentionSession !== null &&
        needsShareConsent({
          intentionSession,
          session,
          sharedAt: contribution.sharedAt,
        }),
      origin: contribution.origin,
      question: contribution.question ?? null,
      sharedAt: contribution.sharedAt ?? null,
      stale:
        intention !== null && intention.revision !== contribution.baseRevision,
      state: contributionState(contribution, session),
      verdict: contribution.verdict ?? null,
    },
    intention: readable
      ? shapeContinuedIntention(intention, intentionSession)
      : null,
  };
}

const shapeLastHandoff = (
  proposal: Doc<"sessionProposals">,
  handoffs: Doc<"sessionHandoffs">[]
) => {
  const latest = lastHandoffOf(proposal._id, handoffs);
  return latest
    ? {
        at: latest.at,
        need: latest.entry.need,
        response: latest.entry.response ?? null,
        revision: latest.entry.revision,
        unknowns: latest.entry.unknowns ?? null,
      }
    : null;
};

async function loadAttachment(
  ctx: QueryCtx,
  proposal: Doc<"sessionProposals">
) {
  if (!proposal.attachedToId) {
    return null;
  }
  const [contribution, intention] = await Promise.all([
    ctx.db
      .query("sessionContributions")
      .withIndex("by_attached_proposal", (q) =>
        q.eq("attachedProposalId", proposal._id)
      )
      .filter((q) => q.eq(q.field("detachedAt"), undefined))
      .first(),
    ctx.db.get(proposal.attachedToId),
  ]);
  return contribution && intention
    ? {
        contributionId: contribution._id,
        intentionId: intention._id,
        need: intention.need,
      }
    : null;
}

async function loadSuggestion(
  ctx: QueryCtx,
  options: {
    proposal: Doc<"sessionProposals">;
    session: Doc<"sessions">;
    viewer: SessionActor | null;
  }
) {
  const { proposal, session, viewer } = options;
  const suggestion = proposal.intentionSuggestion;
  if (!(suggestion && viewer) || session.authorId !== viewer.userId) {
    return null;
  }
  const intention = await ctx.db.get(suggestion.intentionId);
  const intentionSession = intention
    ? await ctx.db.get(intention.sessionId)
    : null;
  if (
    !(intention && intentionSession && canReadSession(intentionSession, viewer))
  ) {
    return null;
  }
  return {
    intentionId: intention._id,
    need: intention.need,
    needsShareConsent: needsShareConsent({
      intentionSession,
      session,
      sharedAt: undefined,
    }),
    reason: suggestion.reason,
    sessionId: intentionSession._id,
    sessionTitle: intentionSession.title,
  };
}

export interface ProposalLinks {
  attachment: {
    contributionId: Id<"sessionContributions">;
    intentionId: Id<"sessionProposals">;
    need: string;
  } | null;
  intentionSuggestion: {
    intentionId: Id<"sessionProposals">;
    need: string;
    needsShareConsent: boolean;
    reason: string;
    sessionId: Id<"sessions">;
    sessionTitle: string;
  } | null;
  lastHandoff: {
    at: number;
    need: string;
    response: string | null;
    revision: number;
    unknowns: string[] | null;
  } | null;
}

export async function loadProposalLinks(
  ctx: QueryCtx,
  options: {
    handoffs: Doc<"sessionHandoffs">[];
    proposal: Doc<"sessionProposals">;
    session: Doc<"sessions">;
    viewer: SessionActor | null;
  }
): Promise<ProposalLinks> {
  const [attachment, intentionSuggestion] = await Promise.all([
    loadAttachment(ctx, options.proposal),
    loadSuggestion(ctx, options),
  ]);
  return {
    attachment,
    intentionSuggestion,
    lastHandoff: shapeLastHandoff(options.proposal, options.handoffs),
  };
}
