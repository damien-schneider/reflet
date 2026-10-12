import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { authComponent } from "../../auth/auth";
import type { SessionActor } from "../access";
import { sessionDurationMs } from "../lifecycle/timeline";

export interface AnalysisStatusView {
  analyzedRevision: number | null;
  error: string | null;
  proposalCount: number | null;
  state: Doc<"sessions">["analysis"]["state"];
  transcriptRevision: number;
  updatedAt: number | null;
}

export interface SessionSummaryView {
  analysis: AnalysisStatusView;
  authorName: string | null;
  collection: Doc<"sessions">["collection"];
  counts: {
    evidence: number;
    failedSegments: number;
    handoffs: number;
    kept: number;
    pendingSegments: number;
    proposals: number;
    segments: number;
  };
  durationMs: number;
  endedAt: number | null;
  id: string;
  isMine: boolean;
  startedAt: number;
  surface: Doc<"sessions">["surface"];
  title: string;
  visibility: Doc<"sessions">["visibility"];
}

export function shapeAnalysisStatus(
  session: Doc<"sessions">
): AnalysisStatusView {
  return {
    analyzedRevision: session.analysis.analyzedRevision ?? null,
    error: session.analysis.error ?? null,
    proposalCount: session.analysis.proposalCount ?? null,
    state: session.analysis.state,
    transcriptRevision: session.transcriptRevision,
    updatedAt: session.analysis.updatedAt ?? null,
  };
}

export async function authorNameOf(
  ctx: QueryCtx,
  userId: string
): Promise<string | null> {
  const user = await authComponent.getAnyUserById(ctx, userId);
  return user?.name || null;
}

async function countSessionChildren(
  ctx: QueryCtx,
  session: Doc<"sessions">
): Promise<SessionSummaryView["counts"]> {
  const [segments, proposals, handoffs] = await Promise.all([
    ctx.db
      .query("sessionSegments")
      .withIndex("by_session_start", (q) => q.eq("sessionId", session._id))
      .collect(),
    ctx.db
      .query("sessionProposals")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect(),
    ctx.db
      .query("sessionHandoffs")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect(),
  ]);
  const liveProposals = proposals.filter(
    (proposal) => proposal.mergedIntoId === undefined
  );
  return {
    evidence: session.usage.evidenceCount,
    failedSegments: segments.filter(
      (segment) => segment.transcription.state === "failed"
    ).length,
    handoffs: handoffs.length,
    kept: liveProposals.filter((proposal) => proposal.decision === "kept")
      .length,
    pendingSegments: segments.filter(
      (segment) =>
        segment.transcription.state === "pending" ||
        segment.transcription.state === "running"
    ).length,
    proposals: liveProposals.length,
    segments: segments.length,
  };
}

export async function shapeSessionSummary(
  ctx: QueryCtx,
  options: { actor: SessionActor; session: Doc<"sessions"> }
): Promise<SessionSummaryView> {
  const { actor, session } = options;
  return {
    analysis: shapeAnalysisStatus(session),
    authorName: await authorNameOf(ctx, session.authorId),
    collection: session.collection,
    counts: await countSessionChildren(ctx, session),
    durationMs: sessionDurationMs(session),
    endedAt: session.endedAt ?? null,
    id: session._id,
    isMine: session.authorId === actor.userId,
    startedAt: session.startedAt,
    surface: session.surface,
    title: session.title,
    visibility: session.visibility,
  };
}

export async function reloadSessionSummary(
  ctx: QueryCtx,
  options: { actor: SessionActor; session: Doc<"sessions"> }
): Promise<{ session: SessionSummaryView }> {
  const session = await ctx.db.get(options.session._id);
  if (!session) {
    throw new Error("Session vanished during the write");
  }
  return {
    session: await shapeSessionSummary(ctx, { actor: options.actor, session }),
  };
}
