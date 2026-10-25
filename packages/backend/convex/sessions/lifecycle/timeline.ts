import type { Infer } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import {
  SESSION_START_FUTURE_TOLERANCE_MS,
  SESSION_START_PAST_TOLERANCE_MS,
  sessionLimitsFor,
} from "../constants";
import type { sessionGapValidator } from "../validators";

type SessionGap = Infer<typeof sessionGapValidator>;
type SessionTimeline = Pick<
  Doc<"sessions">,
  "endedAt" | "gaps" | "startedAt" | "surface" | "updatedAt"
>;

export function clampStartedAt(startedAt: number, now: number): number {
  return Math.min(
    Math.max(startedAt, now - SESSION_START_PAST_TOLERANCE_MS),
    now + SESSION_START_FUTURE_TOLERANCE_MS
  );
}

function endOffsetMs(session: SessionTimeline): number | null {
  return session.endedAt === undefined
    ? null
    : session.endedAt - session.startedAt;
}

export function isCollectedAt(session: SessionTimeline, atMs: number): boolean {
  const endMs = endOffsetMs(session);
  if (atMs < 0 || (endMs !== null && atMs > endMs)) {
    return false;
  }
  return !session.gaps.some(
    (gap) =>
      gap.startMs <= atMs && atMs < (gap.endMs ?? Number.POSITIVE_INFINITY)
  );
}

function pausedMsBefore(gaps: SessionGap[], atMs: number): number {
  let paused = 0;
  for (const gap of gaps) {
    const gapEnd = Math.min(gap.endMs ?? atMs, atMs);
    paused += Math.max(0, gapEnd - gap.startMs);
  }
  return paused;
}

export function exceedsDuration(
  session: SessionTimeline,
  atMs: number
): boolean {
  return (
    atMs - pausedMsBefore(session.gaps, atMs) >
    sessionLimitsFor(session.surface).maxDurationMs
  );
}

export function sessionDurationMs(session: SessionTimeline): number {
  const endMs =
    endOffsetMs(session) ?? Math.max(0, session.updatedAt - session.startedAt);
  return Math.max(0, endMs - pausedMsBefore(session.gaps, endMs));
}

export function openGap(
  gaps: SessionGap[],
  gap: { reason: SessionGap["reason"]; startMs: number }
): SessionGap[] {
  return [...gaps, { endMs: null, reason: gap.reason, startMs: gap.startMs }];
}

export function closeOpenGap(gaps: SessionGap[], atMs: number): SessionGap[] {
  return gaps.map((gap) =>
    gap.endMs === null ? { ...gap, endMs: Math.max(gap.startMs, atMs) } : gap
  );
}
