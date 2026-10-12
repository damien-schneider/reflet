import type { Infer } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { pagePath } from "./formatters";
import type {
  elementRefValidator,
  frameValidator,
  sessionEventValidator,
} from "./tableFields";

export type SessionEventValue = Infer<typeof sessionEventValidator>;
export type FrameValue = Infer<typeof frameValidator>;
type ElementRefValue = Infer<typeof elementRefValidator>;

type ContextKind = "mark" | "select" | "click" | "dwell" | "navigation";

export interface SegmentContextValue<
  EvidenceId extends string = Id<"sessionEvidence">,
> {
  atMs: number;
  evidenceId: EvidenceId | null;
  kind: ContextKind;
  label: string;
  url: string | null;
}

interface LinkableEvidence<EvidenceId extends string> {
  atMs: number;
  frame: FrameValue | undefined;
  id: EvidenceId;
}

interface Candidate {
  atMs: number;
  element: ElementRefValue | null;
  frame: FrameValue;
  kind: ContextKind;
  score: number;
}

const WINDOW_BEFORE_MS = 6000;
const WINDOW_AFTER_MS = 2000;
const EDGE_PROXIMITY = 0.2;
const MAX_LINKED_ITEMS = 3;
const AMBIGUITY_RATIO = 0.75;
const EVIDENCE_MATCH_WINDOW_MS = 10_000;
const KIND_WEIGHTS = {
  click: 0.7,
  dwell: 0.4,
  mark: 1,
  navigation: 0.3,
  select: 1,
} as const satisfies Record<ContextKind, number>;

const temporalProximity = (
  atMs: number,
  segment: { startMs: number; endMs: number }
): number => {
  if (atMs < segment.startMs - WINDOW_BEFORE_MS) {
    return 0;
  }
  if (atMs > segment.endMs + WINDOW_AFTER_MS) {
    return 0;
  }
  const decay = 1 - EDGE_PROXIMITY;
  if (atMs < segment.startMs) {
    return 1 - (decay * (segment.startMs - atMs)) / WINDOW_BEFORE_MS;
  }
  if (atMs > segment.endMs) {
    return 1 - (decay * (atMs - segment.endMs)) / WINDOW_AFTER_MS;
  }
  return 1;
};

const linkableParts = (
  event: SessionEventValue
): Omit<Candidate, "score"> | null => {
  switch (event.kind) {
    case "scroll":
    case "viewport":
      return null;
    case "navigation":
      return { ...event, element: null };
    default:
      return event;
  }
};

const toCandidate = (
  event: SessionEventValue,
  segment: { startMs: number; endMs: number }
): Candidate | null => {
  const parts = linkableParts(event);
  const proximity = temporalProximity(event.atMs, segment);
  if (parts === null || proximity === 0) {
    return null;
  }
  const { atMs, element, frame, kind } = parts;
  return { atMs, element, frame, kind, score: KIND_WEIGHTS[kind] * proximity };
};

const showsSameScreen = (first: FrameValue, second: FrameValue): boolean =>
  first.url === second.url &&
  first.scrollX === second.scrollX &&
  first.scrollY === second.scrollY &&
  first.viewportWidth === second.viewportWidth &&
  first.viewportHeight === second.viewportHeight;

const matchingEvidenceId = <EvidenceId extends string>(
  candidate: Candidate,
  evidence: LinkableEvidence<EvidenceId>[]
): EvidenceId | null => {
  let best: LinkableEvidence<EvidenceId> | null = null;
  for (const item of evidence) {
    const distanceMs = Math.abs(item.atMs - candidate.atMs);
    const sameScreen =
      item.frame !== undefined && showsSameScreen(item.frame, candidate.frame);
    const isCloser =
      best === null || distanceMs < Math.abs(best.atMs - candidate.atMs);
    if (sameScreen && distanceMs <= EVIDENCE_MATCH_WINDOW_MS && isCloser) {
      best = item;
    }
  }
  return best?.id ?? null;
};

const candidateLabel = ({ element, frame }: Candidate): string => {
  if (element) {
    return element.label || element.selector;
  }
  return frame.title ?? pagePath(frame.url) ?? frame.url;
};

const strongestPerElement = (candidates: Candidate[]): Candidate[] => {
  const byElement = new Map<string, Candidate>();
  for (const candidate of candidates) {
    const key = `${candidate.frame.url}\n${candidate.element?.selector ?? ""}`;
    const kept = byElement.get(key);
    if (!kept || candidate.score > kept.score) {
      byElement.set(key, candidate);
    }
  }
  return [...byElement.values()].sort((a, b) => b.score - a.score);
};

export function linkSegmentContext<EvidenceId extends string>(input: {
  segment: { startMs: number; endMs: number };
  events: SessionEventValue[];
  evidence: LinkableEvidence<EvidenceId>[];
}): { context: SegmentContextValue<EvidenceId>[]; ambiguous: boolean } {
  const candidates = input.events.flatMap((event) => {
    const candidate = toCandidate(event, input.segment);
    return candidate ? [candidate] : [];
  });
  const ranked = strongestPerElement(candidates).slice(0, MAX_LINKED_ITEMS);
  const [first, second] = ranked;
  const ambiguous =
    first !== undefined &&
    second !== undefined &&
    second.score >= AMBIGUITY_RATIO * first.score;
  return {
    ambiguous,
    context: ranked.map((candidate) => ({
      atMs: candidate.atMs,
      evidenceId: matchingEvidenceId(candidate, input.evidence),
      kind: candidate.kind,
      label: candidateLabel(candidate),
      url: candidate.frame.url,
    })),
  };
}
