import type {
  ContextKind,
  SegmentContext,
  SessionGap,
  SessionSegment,
} from "../../../protocol";
import { preciseSeconds } from "../../session-format";

const URL_PATH = /^[a-z][a-z\d+.-]*:\/\/[^/?#]*([^?#]*)/i;

const KIND_LABELS: Record<Exclude<ContextKind, "dwell">, string> = {
  click: "Clicked",
  mark: "Marked",
  navigation: "Opened page",
  screenshot: "Screenshot",
  select: "Pointed at explicitly",
};

export const ORIGIN_LABELS: Record<SessionSegment["contextOrigin"], string> = {
  auto: "Linked automatically",
  human: "Corrected by you",
  unknown: "Context unknown",
};

export function contextKindLabel(item: SegmentContext): string {
  if (item.kind === "dwell") {
    return `Hovered ${preciseSeconds(item.durationMs ?? 0)}`;
  }
  return KIND_LABELS[item.kind];
}

export function pagePath(url: string | null): string | null {
  if (!url) {
    return null;
  }
  return URL_PATH.exec(url)?.[1] || "/";
}

export function contextLine(item: SegmentContext): string {
  const page = pagePath(item.url ?? item.frame?.url ?? null);
  const element = item.element?.label ?? item.label;
  return page ? `${element} · ${page}` : element;
}

export function offsetFromPassage(
  atMs: number,
  segment: Pick<SessionSegment, "endMs" | "startMs">
): string {
  if (atMs < segment.startMs) {
    return `${preciseSeconds(segment.startMs - atMs)} before`;
  }
  if (atMs > segment.endMs) {
    return `${preciseSeconds(atMs - segment.endMs)} after`;
  }
  return "during the passage";
}

const distanceFrom = (atMs: number, segment: SessionSegment): number =>
  Math.max(segment.startMs - atMs, 0, atMs - segment.endMs);

export function nearestSegmentId(
  segments: SessionSegment[],
  atMs: number
): string | null {
  let nearest: SessionSegment | null = null;
  for (const segment of segments) {
    if (!nearest || distanceFrom(atMs, segment) < distanceFrom(atMs, nearest)) {
      nearest = segment;
    }
  }
  return nearest?.id ?? null;
}

export function gapsDuring(
  gaps: SessionGap[],
  segment: SessionSegment
): SessionGap[] {
  return gaps.filter(
    (gap) =>
      gap.startMs <= segment.endMs &&
      (gap.endMs ?? Number.POSITIVE_INFINITY) >= segment.startMs
  );
}
