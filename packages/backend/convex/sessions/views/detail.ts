import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { pagePath } from "../formatters";
import {
  linkSegmentContext,
  type SegmentContextValue,
  type SessionEventValue,
} from "../linking";

export function shapeSegment(
  segment: Doc<"sessionSegments">,
  linked: { ambiguous: boolean; context: SegmentContextValue[] }
) {
  return {
    audioExpiresAt: segment.audio?.expiresAt ?? null,
    context: linked.context,
    contextAmbiguous: linked.ambiguous,
    endMs: segment.endMs,
    hasAudio: segment.audio !== undefined,
    id: segment._id,
    language: segment.language ?? null,
    revision: segment.revision,
    source: segment.source,
    startMs: segment.startMs,
    text: segment.text,
    textOrigin: segment.textOrigin,
    transcription: {
      attempts: segment.transcription.attempts,
      error: segment.transcription.error ?? null,
      state: segment.transcription.state,
    },
  };
}

export async function loadSessionEvents(
  ctx: QueryCtx,
  sessionId: Id<"sessions">
): Promise<SessionEventValue[]> {
  const batches = await ctx.db
    .query("sessionEventBatches")
    .withIndex("by_session_start", (q) => q.eq("sessionId", sessionId))
    .collect();
  return batches
    .flatMap((batch) => batch.events)
    .sort((a, b) => a.atMs - b.atMs);
}

export async function loadSessionEvidence(
  ctx: QueryCtx,
  sessionId: Id<"sessions">
): Promise<Doc<"sessionEvidence">[]> {
  return await ctx.db
    .query("sessionEvidence")
    .withIndex("by_session_at", (q) => q.eq("sessionId", sessionId))
    .collect();
}

export function shapeSegments(input: {
  events: SessionEventValue[];
  evidence: Doc<"sessionEvidence">[];
  segments: Doc<"sessionSegments">[];
}) {
  const linkable = input.evidence.map((item) => ({
    atMs: item.atMs,
    frame: item.frame,
    id: item._id,
  }));
  return input.segments.map((segment) =>
    shapeSegment(
      segment,
      linkSegmentContext({
        events: input.events,
        evidence: linkable,
        segment: { endMs: segment.endMs, startMs: segment.startMs },
      })
    )
  );
}

export async function loadSegmentView(
  ctx: QueryCtx,
  segment: Doc<"sessionSegments">
) {
  const [events, evidence] = await Promise.all([
    loadSessionEvents(ctx, segment.sessionId),
    loadSessionEvidence(ctx, segment.sessionId),
  ]);
  const [view] = shapeSegments({ events, evidence, segments: [segment] });
  if (!view) {
    throw new Error("Segment view missing");
  }
  return view;
}

export async function shapeEvidence(
  ctx: QueryCtx,
  evidence: Doc<"sessionEvidence">
) {
  return {
    atMs: evidence.atMs,
    element: evidence.element ?? null,
    frame: evidence.frame ?? null,
    id: evidence._id,
    image: evidence.image
      ? {
          height: evidence.image.height,
          url: await ctx.storage.getUrl(evidence.image.storageId),
          width: evidence.image.width,
        }
      : null,
    kind: evidence.kind,
    link: evidence.link ?? null,
    missingReason: evidence.missingReason ?? null,
    note: evidence.note ?? null,
    status: evidence.status,
    trigger: evidence.trigger,
  };
}

export function handedOffRevisionOf(
  proposalId: Id<"sessionProposals">,
  handoffs: Doc<"sessionHandoffs">[]
): number | null {
  let revision: number | null = null;
  for (const handoff of handoffs) {
    for (const entry of handoff.proposals) {
      if (entry.proposalId === proposalId) {
        revision = Math.max(revision ?? 0, entry.revision);
      }
    }
  }
  return revision;
}

export function shapeProposal(
  proposal: Doc<"sessionProposals">,
  handoffs: Doc<"sessionHandoffs">[]
) {
  return {
    certainty: proposal.certainty,
    clarifications: proposal.clarifications,
    decision: proposal.decision,
    evidenceIds: proposal.evidenceIds,
    feedbackId: proposal.feedbackId ?? null,
    handedOffRevision: handedOffRevisionOf(proposal._id, handoffs),
    id: proposal._id,
    mergedIntoId: proposal.mergedIntoId ?? null,
    mergeSuggestion: proposal.mergeSuggestion ?? null,
    need: proposal.need,
    needsReview: proposal.needsReview,
    observed: proposal.observed,
    origin: proposal.origin,
    question: proposal.question ?? null,
    refinement: proposal.refinement
      ? {
          error: proposal.refinement.error ?? null,
          state: proposal.refinement.state,
        }
      : null,
    response: proposal.response ?? null,
    revision: proposal.revision,
    segmentIds: proposal.segmentIds,
    setAside: proposal.setAside,
    unknowns: proposal.unknowns,
    updatedAt: proposal.updatedAt,
    verification: proposal.verification
      ? {
          at: proposal.verification.at,
          note: proposal.verification.note ?? null,
          status: proposal.verification.status,
        }
      : null,
  };
}

export function shapeHandoff(handoff: Doc<"sessionHandoffs">) {
  return {
    brief: handoff.brief,
    createdAt: handoff.createdAt,
    deliveries: handoff.deliveries,
    evidenceIds: handoff.evidenceIds,
    id: handoff._id,
    proposals: handoff.proposals.map((entry) => ({
      id: entry.proposalId,
      need: entry.need,
      revision: entry.revision,
    })),
  };
}

interface SessionMarkView {
  atMs: number;
  kind: "mark" | "select" | "navigation";
  label: string;
  note: string | null;
  url: string | null;
}

export function shapeMarks(events: SessionEventValue[]): SessionMarkView[] {
  return events.flatMap((event): SessionMarkView[] => {
    switch (event.kind) {
      case "mark":
        return [
          {
            atMs: event.atMs,
            kind: event.kind,
            label:
              event.element?.label ||
              event.frame.title ||
              pagePath(event.frame.url) ||
              "this page",
            note: event.note,
            url: event.frame.url,
          },
        ];
      case "select":
        return [
          {
            atMs: event.atMs,
            kind: event.kind,
            label: event.element.label || event.element.selector,
            note: event.note,
            url: event.frame.url,
          },
        ];
      case "navigation":
        return [
          {
            atMs: event.atMs,
            kind: event.kind,
            label: event.frame.title || event.frame.url,
            note: null,
            url: event.frame.url,
          },
        ];
      default:
        return [];
    }
  });
}

export async function loadProposalView(
  ctx: QueryCtx,
  proposalId: Id<"sessionProposals">
) {
  const proposal = await ctx.db.get(proposalId);
  if (!proposal) {
    throw new Error("Proposal vanished during the write");
  }
  const handoffs = await ctx.db
    .query("sessionHandoffs")
    .withIndex("by_session", (q) => q.eq("sessionId", proposal.sessionId))
    .collect();
  return { proposal: shapeProposal(proposal, handoffs) };
}
