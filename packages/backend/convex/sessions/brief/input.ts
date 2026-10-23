import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { sessionNotFound } from "../access";
import { contributionsToIntention } from "../intentions/contributions";
import { loadSpeakerTurns } from "../speakers/turns";
import { loadSessionEvents, loadSessionEvidence } from "../views/detail";
import { authorNameOf } from "../views/summary";
import type { BriefSessionMaterial, SessionBriefInput } from "./build";

async function loadAppliedContributions(
  ctx: QueryCtx,
  proposals: Doc<"sessionProposals">[]
): Promise<Doc<"sessionContributions">[]> {
  const contributions: Doc<"sessionContributions">[] = [];
  for (const proposal of proposals) {
    for (const contribution of await contributionsToIntention(
      ctx,
      proposal._id
    )) {
      if (
        contribution.detachedAt === undefined &&
        contribution.applied.length > 0
      ) {
        contributions.push(contribution);
      }
    }
  }
  return contributions;
}

async function loadMaterial(
  ctx: QueryCtx,
  options: {
    citedSegmentIds: Set<Id<"sessionSegments">>;
    session: Doc<"sessions">;
  }
): Promise<BriefSessionMaterial> {
  const { session } = options;
  const [events, evidence, segments, turns] = await Promise.all([
    loadSessionEvents(ctx, session._id),
    loadSessionEvidence(ctx, session._id),
    ctx.db
      .query("sessionSegments")
      .withIndex("by_session_start", (q) => q.eq("sessionId", session._id))
      .collect(),
    loadSpeakerTurns(ctx, session._id),
  ]);
  return {
    events,
    evidence,
    segments: segments.filter(({ _id }) => options.citedSegmentIds.has(_id)),
    session,
    turns,
  };
}

async function loadContinuedIn(
  ctx: QueryCtx,
  contributions: Doc<"sessionContributions">[]
): Promise<BriefSessionMaterial[]> {
  const materials: BriefSessionMaterial[] = [];
  for (const sessionId of new Set(contributions.map((c) => c.sessionId))) {
    const session = await ctx.db.get(sessionId);
    if (session && session.deletedAt === undefined) {
      const citedSegmentIds = new Set(
        contributions
          .filter((contribution) => contribution.sessionId === sessionId)
          .flatMap(({ segmentIds }) => segmentIds)
      );
      materials.push(await loadMaterial(ctx, { citedSegmentIds, session }));
    }
  }
  return materials;
}

export async function loadBriefInput(
  ctx: QueryCtx,
  options: {
    chosenEvidenceIds: Id<"sessionEvidence">[];
    proposals: Doc<"sessionProposals">[];
    session: Doc<"sessions">;
  }
): Promise<SessionBriefInput> {
  const { proposals, session } = options;
  const contributions = await loadAppliedContributions(ctx, proposals);
  const [home, continuedIn, previousHandoffs, organization, authorName] =
    await Promise.all([
      loadMaterial(ctx, {
        citedSegmentIds: new Set(proposals.flatMap((p) => p.segmentIds)),
        session,
      }),
      loadContinuedIn(ctx, contributions),
      ctx.db
        .query("sessionHandoffs")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect(),
      ctx.db.get(session.organizationId),
      authorNameOf(ctx, session.authorId),
    ]);
  return {
    authorName,
    chosenEvidenceIds: options.chosenEvidenceIds,
    continuedIn,
    contributions,
    home,
    organizationName: organization?.name ?? "",
    previousHandoffs,
    proposals,
  };
}

export async function requireBriefEvidence(
  ctx: QueryCtx,
  options: {
    ids: string[];
    proposals: Doc<"sessionProposals">[];
    session: Doc<"sessions">;
  }
): Promise<Id<"sessionEvidence">[]> {
  const contributed = new Set(
    (await loadAppliedContributions(ctx, options.proposals)).flatMap(
      ({ evidenceIds }) => evidenceIds
    )
  );
  const resolved: Id<"sessionEvidence">[] = [];
  for (const id of new Set(options.ids)) {
    const evidenceId = ctx.db.normalizeId("sessionEvidence", id);
    const evidence = evidenceId ? await ctx.db.get(evidenceId) : null;
    const allowed =
      evidence !== null &&
      (evidence.sessionId === options.session._id ||
        contributed.has(evidence._id));
    if (!(evidence && allowed)) {
      throw sessionNotFound();
    }
    resolved.push(evidence._id);
  }
  return resolved;
}
