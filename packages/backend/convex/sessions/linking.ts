import type { Infer } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { pagePath } from "./formatters";
import type {
  elementRefValidator,
  evidenceTriggerValidator,
  frameValidator,
  linkableEventKindValidator,
  sessionEventValidator,
} from "./validators";

export type SessionEventValue = Infer<typeof sessionEventValidator>;
export type FrameValue = Infer<typeof frameValidator>;
export type ElementRefValue = Infer<typeof elementRefValidator>;
export type LinkableEventKind = Infer<typeof linkableEventKindValidator>;

type ContextKind = LinkableEventKind | "screenshot";
export type EvidenceMatch = "exact" | "approximate";
export type ContextOrigin = "auto" | "human" | "unknown";

export type ContextPin =
  | { kind: "unknown" }
  | { atMs: number; eventKind: LinkableEventKind; kind: "event" }
  | { evidenceId: string; kind: "evidence" };

export interface SegmentContextValue<
  EvidenceId extends string = Id<"sessionEvidence">,
> {
  atMs: number;
  durationMs: number | null;
  element: ElementRefValue | null;
  evidenceId: EvidenceId | null;
  evidenceMatch: EvidenceMatch | null;
  evidenceOffsetMs: number | null;
  frame: FrameValue | null;
  kind: ContextKind;
  label: string;
  pointer: { x: number; y: number } | null;
  url: string | null;
}

export interface LinkableEvidence<EvidenceId extends string> {
  atMs: number;
  capturedAtMs?: number;
  clientKey: string;
  element?: ElementRefValue;
  frame?: FrameValue;
  id: EvidenceId | null;
  storedId: string;
  trigger: Infer<typeof evidenceTriggerValidator>;
}

export interface LinkableEvent {
  atMs: number;
  durationMs: number | null;
  element: ElementRefValue | null;
  evidenceClientKey: string | null;
  frame: FrameValue;
  kind: LinkableEventKind;
  pointer: { x: number; y: number } | null;
}

interface Candidate extends LinkableEvent {
  score: number;
}

export interface ResolvedContext<EvidenceId extends string> {
  ambiguous: boolean;
  context: SegmentContextValue<EvidenceId>[];
  origin: ContextOrigin;
}

export const CONTEXT_WINDOW_BEFORE_MS = 6000;
export const CONTEXT_WINDOW_AFTER_MS = 2000;
const EDGE_PROXIMITY = 0.2;
const MAX_LINKED_ITEMS = 3;
const AMBIGUITY_RATIO = 0.75;
const EVIDENCE_MATCH_WINDOW_MS = 10_000;
const EXACT_CAPTURE_TOLERANCE_MS = 1500;
const KIND_WEIGHTS = {
  click: 0.7,
  dwell: 0.4,
  mark: 1,
  navigation: 0.3,
  select: 1,
} as const satisfies Record<LinkableEventKind, number>;

const temporalProximity = (
  event: { startMs: number; endMs: number },
  segment: { startMs: number; endMs: number }
): number => {
  if (event.endMs < segment.startMs - CONTEXT_WINDOW_BEFORE_MS) {
    return 0;
  }
  if (event.startMs > segment.endMs + CONTEXT_WINDOW_AFTER_MS) {
    return 0;
  }
  const decay = 1 - EDGE_PROXIMITY;
  if (event.endMs < segment.startMs) {
    const gapMs = segment.startMs - event.endMs;
    return 1 - (decay * gapMs) / CONTEXT_WINDOW_BEFORE_MS;
  }
  if (event.startMs > segment.endMs) {
    const gapMs = event.startMs - segment.endMs;
    return 1 - (decay * gapMs) / CONTEXT_WINDOW_AFTER_MS;
  }
  return 1;
};

export const toLinkableEvent = (
  event: SessionEventValue
): LinkableEvent | null => {
  const base = { durationMs: null, evidenceClientKey: null, pointer: null };
  switch (event.kind) {
    case "scroll":
    case "viewport":
      return null;
    case "navigation":
      return { ...base, ...event, element: null };
    default:
      return { ...base, ...event };
  }
};

const toCandidate = (
  event: LinkableEvent,
  segment: { startMs: number; endMs: number }
): Candidate | null => {
  const proximity = temporalProximity(
    { endMs: event.atMs + (event.durationMs ?? 0), startMs: event.atMs },
    segment
  );
  return proximity === 0
    ? null
    : { ...event, score: KIND_WEIGHTS[event.kind] * proximity };
};

export const showsSameScreen = (
  first: FrameValue,
  second: FrameValue
): boolean =>
  first.url === second.url &&
  first.scrollX === second.scrollX &&
  first.scrollY === second.scrollY &&
  first.viewportWidth === second.viewportWidth &&
  first.viewportHeight === second.viewportHeight;

const capturedAt = (evidence: LinkableEvidence<string>): number =>
  evidence.capturedAtMs ?? evidence.atMs;

const nearestSameScreen = <EvidenceId extends string>(
  event: LinkableEvent,
  evidence: LinkableEvidence<EvidenceId>[]
): LinkableEvidence<EvidenceId> | null => {
  let best: LinkableEvidence<EvidenceId> | null = null;
  for (const item of evidence) {
    const distanceMs = Math.abs(capturedAt(item) - event.atMs);
    const sameScreen =
      item.frame !== undefined && showsSameScreen(item.frame, event.frame);
    const isCloser =
      best === null || distanceMs < Math.abs(capturedAt(best) - event.atMs);
    if (sameScreen && distanceMs <= EVIDENCE_MATCH_WINDOW_MS && isCloser) {
      best = item;
    }
  }
  return best;
};

const isCoherentCapture = (
  event: LinkableEvent,
  evidence: LinkableEvidence<string>
): boolean =>
  evidence.capturedAtMs !== undefined &&
  evidence.frame !== undefined &&
  showsSameScreen(evidence.frame, event.frame) &&
  Math.abs(evidence.capturedAtMs - event.atMs) <= EXACT_CAPTURE_TOLERANCE_MS;

const evidenceFor = <EvidenceId extends string>(
  event: LinkableEvent,
  evidence: LinkableEvidence<EvidenceId>[]
): Pick<
  SegmentContextValue<EvidenceId>,
  "evidenceId" | "evidenceMatch" | "evidenceOffsetMs"
> => {
  const explicit = event.evidenceClientKey
    ? evidence.find((item) => item.clientKey === event.evidenceClientKey)
    : undefined;
  const shown = explicit ?? nearestSameScreen(event, evidence);
  if (!shown || shown.id === null) {
    return { evidenceId: null, evidenceMatch: null, evidenceOffsetMs: null };
  }
  const exact = explicit !== undefined && isCoherentCapture(event, explicit);
  return {
    evidenceId: shown.id,
    evidenceMatch: exact ? "exact" : "approximate",
    evidenceOffsetMs: capturedAt(shown) - event.atMs,
  };
};

const frameLabel = (frame: FrameValue): string =>
  frame.title ?? pagePath(frame.url) ?? frame.url;

export const describeEvent = <EvidenceId extends string>(
  event: LinkableEvent,
  evidence: LinkableEvidence<EvidenceId>[]
): SegmentContextValue<EvidenceId> => ({
  atMs: event.atMs,
  durationMs: event.durationMs,
  element: event.element,
  ...evidenceFor(event, evidence),
  frame: event.frame,
  kind: event.kind,
  label: event.element
    ? event.element.label || event.element.selector
    : frameLabel(event.frame),
  pointer: event.pointer,
  url: event.frame.url,
});

export const describeEvidence = <EvidenceId extends string>(
  shown: LinkableEvidence<EvidenceId>,
  events: LinkableEvent[]
): SegmentContextValue<EvidenceId> => {
  const explicitEvent = events.find(
    (event) => event.evidenceClientKey === shown.clientKey
  );
  if (explicitEvent) {
    return describeEvent(explicitEvent, [shown]);
  }
  return {
    atMs: shown.atMs,
    durationMs: null,
    element: null,
    evidenceId: shown.id,
    evidenceMatch: null,
    evidenceOffsetMs: null,
    frame: shown.frame ?? null,
    kind: "screenshot",
    label: shown.frame ? frameLabel(shown.frame) : "Screenshot",
    pointer: null,
    url: shown.frame?.url ?? null,
  };
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

const linkAutomatically = <EvidenceId extends string>(input: {
  events: LinkableEvent[];
  evidence: LinkableEvidence<EvidenceId>[];
  segment: { startMs: number; endMs: number };
}): ResolvedContext<EvidenceId> => {
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
    context: ranked.map((candidate) =>
      describeEvent(candidate, input.evidence)
    ),
    origin: "auto",
  };
};

const pinnedContext = <EvidenceId extends string>(
  pin: Exclude<ContextPin, { kind: "unknown" }>,
  input: {
    events: LinkableEvent[];
    evidence: LinkableEvidence<EvidenceId>[];
  }
): SegmentContextValue<EvidenceId>[] => {
  if (pin.kind === "event") {
    const event = input.events.find(
      (candidate) =>
        candidate.atMs === pin.atMs && candidate.kind === pin.eventKind
    );
    return event ? [describeEvent(event, input.evidence)] : [];
  }
  const shown = input.evidence.find((item) => item.storedId === pin.evidenceId);
  return shown ? [describeEvidence(shown, input.events)] : [];
};

export function resolveSegmentContext<EvidenceId extends string>(input: {
  events: SessionEventValue[];
  evidence: LinkableEvidence<EvidenceId>[];
  segment: { contextCorrection?: ContextPin; endMs: number; startMs: number };
}): ResolvedContext<EvidenceId> {
  const events = input.events.flatMap((event) => {
    const linkable = toLinkableEvent(event);
    return linkable ? [linkable] : [];
  });
  const pin = input.segment.contextCorrection;
  if (pin === undefined) {
    return linkAutomatically({
      events,
      evidence: input.evidence,
      segment: input.segment,
    });
  }
  if (pin.kind === "unknown") {
    return { ambiguous: false, context: [], origin: "unknown" };
  }
  return {
    ambiguous: false,
    context: pinnedContext(pin, { events, evidence: input.evidence }),
    origin: "human",
  };
}

export const toLinkableEvidence = <EvidenceId extends string>(
  doc: Doc<"sessionEvidence">,
  id: EvidenceId | null
): LinkableEvidence<EvidenceId> => ({
  atMs: doc.atMs,
  capturedAtMs: doc.capturedAtMs,
  clientKey: doc.clientKey,
  element: doc.element,
  frame: doc.frame,
  id,
  storedId: doc._id,
  trigger: doc.trigger,
});

export const resolveStoredSegment = <EvidenceId extends string>(
  segment: Doc<"sessionSegments">,
  sources: {
    events: SessionEventValue[];
    evidence: LinkableEvidence<EvidenceId>[];
  }
): ResolvedContext<EvidenceId> =>
  resolveSegmentContext({
    ...sources,
    segment: {
      contextCorrection: segment.contextCorrection?.choice,
      endMs: segment.endMs,
      startMs: segment.startMs,
    },
  });
