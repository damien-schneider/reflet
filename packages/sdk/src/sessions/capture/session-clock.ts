import type { SessionGap, SessionGapReason } from "../protocol";

export interface SessionClock {
  activeMs: () => number;
  atMs: () => number;
  gaps: () => SessionGap[];
  isPaused: () => boolean;
  pause: (reason: SessionGapReason) => number;
  resume: () => number;
}

function readMonotonicTime(): number {
  return performance.timeOrigin + performance.now();
}

export function createSessionClock(options: {
  gaps?: SessionGap[];
  readTime?: () => number;
  startedAt: number;
}): SessionClock {
  const readTime = options.readTime ?? readMonotonicTime;
  let gaps = [...(options.gaps ?? [])];
  let latestMs = 0;

  const atMs = () => {
    latestMs = Math.max(latestMs, Math.round(readTime() - options.startedAt));
    return latestMs;
  };
  const openGap = () => gaps.find((gap) => gap.endMs === null);

  return {
    activeMs: () => {
      const nowMs = atMs();
      const pausedMs = gaps.reduce(
        (sum, gap) => sum + (gap.endMs ?? nowMs) - gap.startMs,
        0
      );
      return Math.max(0, nowMs - pausedMs);
    },
    atMs,
    gaps: () => gaps.map((gap) => ({ ...gap })),
    isPaused: () => openGap() !== undefined,
    pause: (reason) => {
      const startMs = atMs();
      if (!openGap()) {
        gaps = [...gaps, { endMs: null, reason, startMs }];
      }
      return startMs;
    },
    resume: () => {
      const endMs = atMs();
      gaps = gaps.map((gap) => (gap.endMs === null ? { ...gap, endMs } : gap));
      return endMs;
    },
  };
}
