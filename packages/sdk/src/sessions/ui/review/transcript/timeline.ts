import type {
  SessionDetail,
  SessionGap,
  SessionMark,
  SessionSegment,
} from "../../../protocol";
import { shortDuration } from "../../session-format";
import { nearestSegmentId } from "../moment/moment-labels";

const GAP_LABELS: Record<SessionGap["reason"], string> = {
  hidden: "Tab hidden",
  interrupted: "Interrupted",
  limit: "Time limit reached",
  paused: "Paused",
};

export function gapLabel(gap: SessionGap): string {
  const label = GAP_LABELS[gap.reason];
  return gap.endMs === null
    ? label
    : `${label} · ${shortDuration(gap.endMs - gap.startMs)}`;
}

function markLabel(mark: SessionMark): string {
  const note = mark.note ? ` — ${mark.note}` : "";
  if (mark.kind === "navigation") {
    return `Went to ${mark.url ?? mark.label}`;
  }
  const verb = mark.kind === "select" ? "Pointed at" : "Marked a moment on";
  return `${verb} ${mark.label}${note}`;
}

export type TimelineItem =
  | { atMs: number; key: string; segment: SessionSegment }
  | { atMs: number; key: string; label: string; segmentId: string | null };

export function buildTimeline(detail: SessionDetail): TimelineItem[] {
  return [
    ...detail.segments.map((segment) => ({
      atMs: segment.startMs,
      key: `s:${segment.id}`,
      segment,
    })),
    ...detail.session.gaps.map((gap) => ({
      atMs: gap.startMs,
      key: `g:${gap.startMs}`,
      label: gapLabel(gap),
      segmentId: null,
    })),
    ...detail.marks.map((mark) => ({
      atMs: mark.atMs,
      key: `m:${mark.kind}:${mark.atMs}`,
      label: markLabel(mark),
      segmentId: nearestSegmentId(detail.segments, mark.atMs),
    })),
  ].sort((earlier, later) => earlier.atMs - later.atMs);
}
