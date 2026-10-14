import type { Infer } from "convex/values";
import type { Doc, Id } from "../../../_generated/dataModel";
import { CONTEXT_VERBS } from "../../formatters";
import {
  type ElementRefValue,
  resolveStoredSegment,
  type SegmentContextValue,
  toLinkableEvidence,
} from "../../linking";
import type { evidenceTriggerValidator } from "../../validators";
import type { SessionCapture } from "../../views/detail";

export interface CalloutAnchor {
  calloutSegmentId: Id<"sessionSegments"> | null;
  evidenceIds: Id<"sessionEvidence">[];
  segmentIds: Id<"sessionSegments">[];
}

export interface LocateCandidate {
  element: ElementRefValue;
  interaction: string | null;
}

export interface LocateQuestion {
  candidates: LocateCandidate[];
  evidenceId: Id<"sessionEvidence">;
  passage: string | null;
  viewport: { height: number; width: number } | null;
}
type ContextItem = SegmentContextValue<Id<"sessionEvidence">>;

const TRIGGER_INTERACTIONS: Record<
  Infer<typeof evidenceTriggerValidator>,
  string | null
> = {
  hover: CONTEXT_VERBS.dwell,
  manual: null,
  mark: null,
  navigation: null,
  select: CONTEXT_VERBS.select,
  start: null,
};

const isShownScreenshot = (
  evidence: Doc<"sessionEvidence"> | undefined
): evidence is Doc<"sessionEvidence"> =>
  evidence !== undefined &&
  evidence.kind === "screenshot" &&
  evidence.status === "available";

const anchorSegmentIds = (anchor: CalloutAnchor): Id<"sessionSegments">[] => {
  const latestFirst = [...anchor.segmentIds].reverse();
  const ordered = anchor.calloutSegmentId
    ? [anchor.calloutSegmentId, ...latestFirst]
    : latestFirst;
  return [...new Set(ordered)];
};

const screenshotOfPassage = (
  context: ContextItem[],
  evidenceById: Map<string, Doc<"sessionEvidence">>
): Doc<"sessionEvidence"> | null => {
  const linked = context.filter((item) =>
    isShownScreenshot(
      item.evidenceId ? evidenceById.get(item.evidenceId) : undefined
    )
  );
  const chosen =
    linked.find((item) => item.evidenceMatch === "exact") ?? linked[0];
  return chosen?.evidenceId
    ? (evidenceById.get(chosen.evidenceId) ?? null)
    : null;
};

const interactedCandidates = (
  context: ContextItem[],
  screenshot: Doc<"sessionEvidence">
): LocateCandidate[] => {
  const fromContext = context.flatMap((item) =>
    item.element &&
    item.evidenceId === screenshot._id &&
    item.evidenceMatch === "exact"
      ? [{ element: item.element, interaction: CONTEXT_VERBS[item.kind] }]
      : []
  );
  const fromCapture = screenshot.element
    ? [
        {
          element: screenshot.element,
          interaction: TRIGGER_INTERACTIONS[screenshot.trigger],
        },
      ]
    : [];
  return [...fromContext, ...fromCapture];
};

const withoutRepeatedElements = (
  candidates: LocateCandidate[]
): LocateCandidate[] => {
  const seenSelectors = new Set<string>();
  return candidates.filter(({ element }) => {
    if (seenSelectors.has(element.selector)) {
      return false;
    }
    seenSelectors.add(element.selector);
    return true;
  });
};

interface ChosenPassage {
  context: ContextItem[];
  passage: string | null;
  screenshot: Doc<"sessionEvidence">;
}

const questionFor = ({
  context,
  passage,
  screenshot,
}: ChosenPassage): LocateQuestion => {
  const visibleElements = screenshot.visibleElements ?? [];
  const renderedBySelector = new Map(
    visibleElements.map((element) => [element.selector, element])
  );
  const interacted = interactedCandidates(context, screenshot).map(
    ({ element, interaction }) => ({
      element: renderedBySelector.get(element.selector) ?? element,
      interaction,
    })
  );
  const visible = visibleElements.map((element) => ({
    element,
    interaction: null,
  }));
  return {
    candidates: withoutRepeatedElements([...interacted, ...visible]),
    evidenceId: screenshot._id,
    passage,
    viewport: screenshot.frame
      ? {
          height: screenshot.frame.viewportHeight,
          width: screenshot.frame.viewportWidth,
        }
      : null,
  };
};

const choosePassage = (
  anchor: CalloutAnchor,
  capture: SessionCapture
): ChosenPassage | null => {
  const evidenceById = new Map(
    capture.evidence.map((item) => [item._id, item])
  );
  const linkable = capture.evidence
    .filter(isShownScreenshot)
    .map((item) => toLinkableEvidence(item, item._id));
  for (const segmentId of anchorSegmentIds(anchor)) {
    const segment = capture.segments.find(({ _id }) => _id === segmentId);
    if (!segment) {
      continue;
    }
    const { context } = resolveStoredSegment(segment, {
      events: capture.events,
      evidence: linkable,
    });
    const screenshot = screenshotOfPassage(context, evidenceById);
    if (screenshot) {
      return { context, passage: segment.text, screenshot };
    }
  }
  const cited = anchor.evidenceIds
    .map((id) => evidenceById.get(id))
    .find(isShownScreenshot);
  return cited ? { context: [], passage: null, screenshot: cited } : null;
};

export const locateQuestion = (
  anchor: CalloutAnchor,
  capture: SessionCapture
): LocateQuestion | null => {
  const chosen = choosePassage(anchor, capture);
  return chosen ? questionFor(chosen) : null;
};

export interface CalloutPlacement {
  element: ElementRefValue | null;
  evidenceId: Id<"sessionEvidence">;
}

export const calloutPlacement = (
  proposal: Doc<"sessionProposals">,
  capture: SessionCapture
): CalloutPlacement | null => {
  const chosen = choosePassage(
    {
      calloutSegmentId: proposal.calloutSegmentId ?? null,
      evidenceIds: proposal.evidenceIds,
      segmentIds: proposal.segmentIds,
    },
    capture
  );
  if (!chosen) {
    return null;
  }
  const evidenceId = chosen.screenshot._id;
  const located = proposal.calloutTarget;
  return {
    element: located?.evidenceId === evidenceId ? located.element : null,
    evidenceId,
  };
};
