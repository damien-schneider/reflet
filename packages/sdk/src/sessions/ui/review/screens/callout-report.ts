import type {
  ElementRef,
  Frame,
  SessionDetail,
  SessionEvidence,
  SessionProposal,
} from "../../../protocol";

export interface ShotPoint {
  x: number;
  y: number;
}

export interface ShotRect extends ShotPoint {
  height: number;
  width: number;
}

export interface ShotImage {
  height: number;
  url: string;
  width: number;
}

export interface Callout {
  label: string;
  number: number;
  outline: ShotRect | null;
  proposal: SessionProposal;
}

export interface CalloutScreen {
  callouts: Callout[];
  evidence: SessionEvidence;
  image: ShotImage;
}

export interface CalloutReport {
  screens: CalloutScreen[];
  unplaced: Callout[];
}

interface Shot {
  evidence: SessionEvidence;
  image: ShotImage;
}

const clampFraction = (value: number) => Math.min(1, Math.max(0, value));

function visibleFraction(
  rect: ElementRef["rect"],
  frame: Frame
): ShotRect | null {
  if (frame.viewportWidth <= 0 || frame.viewportHeight <= 0) {
    return null;
  }
  const left = clampFraction(rect.x / frame.viewportWidth);
  const top = clampFraction(rect.y / frame.viewportHeight);
  const right = clampFraction((rect.x + rect.width) / frame.viewportWidth);
  const bottom = clampFraction((rect.y + rect.height) / frame.viewportHeight);
  if (right <= left || bottom <= top) {
    return null;
  }
  return { height: bottom - top, width: right - left, x: left, y: top };
}

function shownScreenshots(detail: SessionDetail): Map<string, Shot> {
  const shots = new Map<string, Shot>();
  for (const evidence of detail.evidence) {
    const url = evidence.status === "available" ? evidence.image?.url : null;
    if (evidence.image && url) {
      shots.set(evidence.id, { evidence, image: { ...evidence.image, url } });
    }
  }
  return shots;
}

type UnnumberedCallout = Omit<Callout, "number">;

const readingOrderY = (callout: UnnumberedCallout) => callout.outline?.y ?? 0;

export function calloutReport(detail: SessionDetail): CalloutReport {
  const shots = shownScreenshots(detail);
  const screensById = new Map<
    string,
    Shot & { callouts: UnnumberedCallout[] }
  >();
  const unplaced: UnnumberedCallout[] = [];
  const reported = detail.proposals.filter(
    (proposal) => proposal.mergedIntoId === null && proposal.attachment === null
  );
  for (const proposal of reported) {
    const label = proposal.callout ?? proposal.need;
    const target = proposal.calloutTarget;
    const shot = target ? shots.get(target.evidenceId) : undefined;
    if (!(target && shot)) {
      unplaced.push({ label, outline: null, proposal });
      continue;
    }
    const { frame } = shot.evidence;
    const outline =
      target.element && frame
        ? visibleFraction(target.element.rect, frame)
        : null;
    const screen = screensById.get(shot.evidence.id) ?? {
      ...shot,
      callouts: [],
    };
    screen.callouts.push({ label, outline, proposal });
    screensById.set(shot.evidence.id, screen);
  }

  let number = 0;
  const numbered = (callout: UnnumberedCallout): Callout => {
    number += 1;
    return { ...callout, number };
  };
  const screens = [...screensById.values()]
    .sort((a, b) => a.evidence.atMs - b.evidence.atMs)
    .map((screen) => ({
      ...screen,
      callouts: screen.callouts
        .sort((a, b) => readingOrderY(a) - readingOrderY(b))
        .map(numbered),
    }));
  return { screens, unplaced: unplaced.map(numbered) };
}
