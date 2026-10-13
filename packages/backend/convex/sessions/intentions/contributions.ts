import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import {
  loadSession,
  loadSessionChild,
  type SessionActor,
  sessionConflict,
  sessionFailure,
} from "../access";
import {
  CONTRIBUTION_REMOVED,
  INTENTION_DELETED,
  SHARE_CONSENT_REQUIRED,
} from "../constants";

const NOT_FOUND_STATUS = 404;
const BAD_REQUEST_STATUS = 400;

export const intentionDeleted = () =>
  sessionFailure(NOT_FOUND_STATUS, INTENTION_DELETED);

export async function loadWritableIntention(
  ctx: QueryCtx,
  options: { actor: SessionActor; intentionId: string }
): Promise<{
  intention: Doc<"sessionProposals">;
  intentionSession: Doc<"sessions">;
}> {
  const intentionId = ctx.db.normalizeId(
    "sessionProposals",
    options.intentionId
  );
  const intention = intentionId ? await ctx.db.get(intentionId) : null;
  if (!intention || intention.organizationId !== options.actor.organizationId) {
    throw intentionDeleted();
  }
  const intentionSession = await loadSession(ctx, {
    access: "write",
    actor: options.actor,
    sessionId: intention.sessionId,
  });
  return { intention, intentionSession };
}

export async function loadOwnContribution(
  ctx: QueryCtx,
  options: { actor: SessionActor; contributionId: string }
) {
  const { child: contribution, session } = await loadSessionChild(ctx, {
    access: "write",
    actor: options.actor,
    id: options.contributionId,
    table: "sessionContributions",
  });
  return { contribution, session };
}

export async function loadAttachedContribution(
  ctx: QueryCtx,
  options: { actor: SessionActor; contributionId: string }
) {
  const loaded = await loadOwnContribution(ctx, options);
  if (loaded.contribution.detachedAt !== undefined) {
    const intention = await ctx.db.get(loaded.contribution.intentionId);
    throw intention
      ? sessionConflict(CONTRIBUTION_REMOVED)
      : intentionDeleted();
  }
  const target = await loadWritableIntention(ctx, {
    actor: options.actor,
    intentionId: loaded.contribution.intentionId,
  });
  return { ...loaded, ...target };
}

export const needsShareConsent = (options: {
  intentionSession: Doc<"sessions">;
  session: Doc<"sessions">;
  sharedAt: number | undefined;
}): boolean =>
  options.intentionSession.visibility === "team" &&
  options.session.visibility === "private" &&
  options.sharedAt === undefined;

export function requireShareConsent(options: {
  intentionSession: Doc<"sessions">;
  session: Doc<"sessions">;
  sharedAt: number | undefined;
  shareWithTeam: boolean | undefined;
}): boolean {
  const required = needsShareConsent(options);
  if (required && options.shareWithTeam !== true) {
    throw sessionFailure(BAD_REQUEST_STATUS, SHARE_CONSENT_REQUIRED);
  }
  return required;
}

export async function findContinuation(
  ctx: QueryCtx,
  session: Doc<"sessions">
): Promise<Doc<"sessionContributions"> | null> {
  const intentionId = session.continues?.intentionId;
  if (!intentionId) {
    return null;
  }
  const contributions = await ctx.db
    .query("sessionContributions")
    .withIndex("by_session", (q) => q.eq("sessionId", session._id))
    .collect();
  return (
    contributions.find(
      (contribution) =>
        contribution.origin === "continuation" &&
        contribution.intentionId === intentionId
    ) ?? null
  );
}

export const contributionsToIntention = (
  ctx: QueryCtx,
  intentionId: Id<"sessionProposals">
): Promise<Doc<"sessionContributions">[]> =>
  ctx.db
    .query("sessionContributions")
    .withIndex("by_intention", (q) => q.eq("intentionId", intentionId))
    .collect();
