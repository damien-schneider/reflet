import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { canReadSession, type SessionActor } from "../access";
import { contextDescriptions } from "../formatters";
import {
  contributionsToIntention,
  findContinuation,
} from "../intentions/contributions";
import { resolveStoredSegment, toLinkableEvidence } from "../linking";
import {
  loadSessionEvents,
  loadSessionEvidence,
  type SessionCapture,
  shapeEvidence,
  shapeProposal,
} from "./detail";
import {
  loadIntentionUpdate,
  loadProposalLinks,
  shapeAppliedChanges,
} from "./intentions";

export async function shapeProposalList(
  ctx: QueryCtx,
  options: {
    actor: SessionActor;
    capture: SessionCapture;
    handoffs: Doc<"sessionHandoffs">[];
    proposals: Doc<"sessionProposals">[];
    session: Doc<"sessions">;
  }
) {
  const sorted = [...options.proposals].sort(
    (a, b) => a.createdAt - b.createdAt
  );
  return await Promise.all(
    sorted.map(async (proposal) =>
      shapeProposal(proposal, {
        capture: options.capture,
        handoffs: options.handoffs,
        links: await loadProposalLinks(ctx, {
          handoffs: options.handoffs,
          proposal,
          session: options.session,
          viewer: options.actor,
        }),
      })
    )
  );
}

const MAX_HISTORY_QUOTES = 6;
const PRIVATE_SESSION_TITLE = "Private session";

export async function loadContinuation(
  ctx: QueryCtx,
  options: { actor: SessionActor; session: Doc<"sessions"> }
) {
  const contribution = await findContinuation(ctx, options.session);
  return contribution
    ? await loadIntentionUpdate(ctx, {
        actor: options.actor,
        contributionId: contribution._id,
      })
    : null;
}

async function loadContributions(
  ctx: QueryCtx,
  proposals: Doc<"sessionProposals">[]
): Promise<Doc<"sessionContributions">[]> {
  const all: Doc<"sessionContributions">[] = [];
  for (const proposal of proposals) {
    all.push(...(await contributionsToIntention(ctx, proposal._id)));
  }
  return all.filter(({ applied }) => applied.length > 0);
}

async function loadQuotes(
  ctx: QueryCtx,
  contribution: Doc<"sessionContributions">
) {
  const [events, evidence, segments] = await Promise.all([
    loadSessionEvents(ctx, contribution.sessionId),
    loadSessionEvidence(ctx, contribution.sessionId),
    ctx.db
      .query("sessionSegments")
      .withIndex("by_session_start", (q) =>
        q.eq("sessionId", contribution.sessionId)
      )
      .collect(),
  ]);
  const linkable = evidence.map((item) => toLinkableEvidence(item, null));
  return segments
    .filter(({ _id }) => contribution.segmentIds.includes(_id))
    .slice(0, MAX_HISTORY_QUOTES)
    .map((segment) => {
      const { items, notes } = contextDescriptions(
        resolveStoredSegment(segment, { events, evidence: linkable }),
        { withLocators: false }
      );
      return {
        context: [...items, ...notes],
        segmentId: segment._id,
        startMs: segment.startMs,
        text: segment.text,
      };
    });
}

async function shapeHistoryEntry(
  ctx: QueryCtx,
  options: { actor: SessionActor; contribution: Doc<"sessionContributions"> }
) {
  const { contribution } = options;
  const session = await ctx.db.get(contribution.sessionId);
  const canOpen = session !== null && canReadSession(session, options.actor);
  const extractsVisible = canOpen || contribution.sharedAt !== undefined;
  return {
    applied: await shapeAppliedChanges(ctx, contribution.applied),
    detachedAt: contribution.detachedAt ?? null,
    evidenceIds: extractsVisible ? contribution.evidenceIds : [],
    extractsHidden: !extractsVisible,
    id: contribution._id,
    intentionId: contribution.intentionId,
    origin: contribution.origin,
    quotes: extractsVisible ? await loadQuotes(ctx, contribution) : [],
    session: {
      canOpen,
      id: contribution.sessionId,
      startedAt: session?.startedAt ?? contribution.createdAt,
      title: session && extractsVisible ? session.title : PRIVATE_SESSION_TITLE,
    },
  };
}

export async function loadHistory(
  ctx: QueryCtx,
  options: { actor: SessionActor; proposals: Doc<"sessionProposals">[] }
) {
  const contributions = await loadContributions(ctx, options.proposals);
  return await Promise.all(
    contributions
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((contribution) =>
        shapeHistoryEntry(ctx, { actor: options.actor, contribution })
      )
  );
}

export async function loadContributedEvidence(
  ctx: QueryCtx,
  options: { actor: SessionActor; proposals: Doc<"sessionProposals">[] }
) {
  const evidenceIds = new Set<Id<"sessionEvidence">>();
  for (const contribution of await loadContributions(ctx, options.proposals)) {
    const session = await ctx.db.get(contribution.sessionId);
    const visible =
      contribution.detachedAt === undefined &&
      ((session !== null && canReadSession(session, options.actor)) ||
        contribution.sharedAt !== undefined);
    if (visible) {
      for (const id of contribution.evidenceIds) {
        evidenceIds.add(id);
      }
    }
  }
  const evidence: Doc<"sessionEvidence">[] = [];
  for (const id of evidenceIds) {
    const item = await ctx.db.get(id);
    if (item) {
      evidence.push(item);
    }
  }
  return await Promise.all(evidence.map((item) => shapeEvidence(ctx, item)));
}
