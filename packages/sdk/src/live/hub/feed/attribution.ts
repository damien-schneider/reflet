import type { LiveApp, LiveFrame, LivePlace } from "../../protocol";

export interface FocusTransition {
  app: LiveApp | null;
  atMs: number;
  frame: LiveFrame | null;
}

export interface Passage {
  atMs: number;
  endMs: number;
}

function latestAtOrBefore(
  transitions: readonly FocusTransition[],
  atMs: number,
  matches: (transition: FocusTransition) => boolean
): FocusTransition | null {
  for (let index = transitions.length - 1; index >= 0; index -= 1) {
    const transition = transitions[index];
    if (transition.atMs <= atMs && matches(transition)) {
      return transition;
    }
  }
  return null;
}

function focusOverlaps(
  passage: Passage,
  transitions: readonly FocusTransition[]
): Map<string, { app: LiveApp; ms: number }> {
  const start = passage.atMs;
  const end = Math.max(passage.endMs, passage.atMs + 1);
  const overlaps = new Map<string, { app: LiveApp; ms: number }>();
  for (const [index, transition] of transitions.entries()) {
    const until = transitions[index + 1]?.atMs ?? Number.POSITIVE_INFINITY;
    const shared = Math.min(end, until) - Math.max(start, transition.atMs);
    if (transition.app && shared > 0) {
      const previous = overlaps.get(transition.app.id)?.ms ?? 0;
      overlaps.set(transition.app.id, {
        app: transition.app,
        ms: previous + shared,
      });
    }
  }
  return overlaps;
}

export function placeOf(
  passage: Passage,
  transitions: readonly FocusTransition[]
): LivePlace {
  const overlaps = [...focusOverlaps(passage, transitions).values()];
  if (overlaps.length === 0) {
    const lastApp = latestAtOrBefore(
      transitions,
      passage.endMs,
      (transition) => transition.app !== null
    );
    return { kind: "outside", lastApp: lastApp?.app ?? null };
  }
  const focusedAtEnd = latestAtOrBefore(
    transitions,
    passage.endMs,
    () => true
  )?.app;
  const winner = overlaps.reduce((best, overlap) => {
    const breaksTie =
      overlap.ms === best.ms && overlap.app.id === focusedAtEnd?.id;
    return overlap.ms > best.ms || breaksTie ? overlap : best;
  });
  const page = latestAtOrBefore(
    transitions,
    passage.endMs,
    (transition) => transition.app?.id === winner.app.id
  );
  return { app: winner.app, kind: "app", page: page?.frame ?? null };
}
