import {
  captureViewport,
  releaseCapture,
} from "../../../feedback/core/capture";
import type {
  ElementRef,
  EvidenceTrigger,
  Frame,
  SessionLimits,
} from "../../protocol";
import { blankFieldValues } from "../blank-fields";
import {
  captureFrame,
  describeElementRef,
  SESSION_MASK_SELECTORS,
} from "../element-ref";
import { visibleElements } from "./visible-elements";

const NAVIGATION_SETTLE_MS = 1500;
const CAPTURES_KEPT_FOR_MARKS = 20;
const CAPTURE_FAILED = "The page could not be captured.";
const CAPTURE_TOO_LARGE = "The screenshot was larger than the upload limit.";
const STOPPED_BEFORE_CAPTURE =
  "Recording stopped before the screenshot was taken.";

export interface CapturedEvidence {
  atMs: number;
  capturedAtMs: number | null;
  clientKey: string;
  element: ElementRef | null;
  frame: Frame;
  image: { blob: Blob; height: number; width: number } | null;
  missingReason: string | null;
  note: string | null;
  trigger: EvidenceTrigger;
  visibleElements: ElementRef[];
}

export interface EvidenceRequest {
  element?: Element | null;
  note?: string | null;
  trigger: "mark" | "select" | "start";
}

export interface EvidenceScheduler {
  cancelPending: () => void;
  capture: (request: EvidenceRequest) => string | null;
  clicked: () => void;
  hovered: (element: Element) => string | null;
  navigated: () => void;
}

export interface EvidenceSchedulerOptions {
  atMs: () => number;
  includeSource: boolean;
  limits: Pick<
    SessionLimits,
    | "maxEvidence"
    | "maxImageBytes"
    | "maxVisibleElements"
    | "minAutoCaptureIntervalMs"
  >;
  onEvidence: (evidence: CapturedEvidence) => void;
}

type EvidenceBase = Omit<
  CapturedEvidence,
  "capturedAtMs" | "image" | "missingReason" | "visibleElements"
>;

const withoutImage = (
  base: EvidenceBase,
  missingReason: string
): CapturedEvidence => ({
  ...base,
  capturedAtMs: null,
  image: null,
  missingReason,
  visibleElements: [],
});

async function shoot(
  base: EvidenceBase,
  options: EvidenceSchedulerOptions
): Promise<CapturedEvidence> {
  let recorded: ElementRef[] = [];
  const max = options.limits.maxVisibleElements;
  const image = await captureViewport({
    excludeSelectors: SESSION_MASK_SELECTORS,
    prepareClone: (clone) => {
      blankFieldValues(clone);
      if (max !== undefined) {
        recorded = visibleElements({
          includeSource: options.includeSource,
          max,
        });
      }
    },
  });
  releaseCapture(image);
  if (!image) {
    return withoutImage(base, CAPTURE_FAILED);
  }
  if (image.blob.size > options.limits.maxImageBytes) {
    return withoutImage(base, CAPTURE_TOO_LARGE);
  }
  const { blob, height, width } = image;
  return {
    ...base,
    capturedAtMs: options.atMs(),
    frame: captureFrame(),
    image: { blob, height, width },
    missingReason: null,
    visibleElements: recorded,
  };
}

function evidenceBase(
  trigger: EvidenceTrigger,
  request: Omit<EvidenceRequest, "trigger">,
  options: EvidenceSchedulerOptions
): EvidenceBase {
  return {
    atMs: options.atMs(),
    clientKey: crypto.randomUUID(),
    element: request.element
      ? describeElementRef(request.element, options)
      : null,
    frame: captureFrame(),
    note: request.note ?? null,
    trigger,
  };
}

const showsSameScreen = (first: Frame, second: Frame): boolean =>
  first.url === second.url &&
  first.scrollX === second.scrollX &&
  first.scrollY === second.scrollY &&
  first.viewportWidth === second.viewportWidth &&
  first.viewportHeight === second.viewportHeight;

interface CollectionRun {
  hasStopped: () => boolean;
  stop: () => void;
  stopped: Promise<void>;
}

function startCollectionRun(): CollectionRun {
  let hasStopped = false;
  let markStopped: () => void = () => undefined;
  const stopped = new Promise<void>((resolve) => {
    markStopped = resolve;
  });
  return {
    hasStopped: () => hasStopped,
    stop: () => {
      hasStopped = true;
      markStopped();
    },
    stopped,
  };
}

export function createEvidenceScheduler(
  options: EvidenceSchedulerOptions
): EvidenceScheduler {
  const { limits } = options;
  let captured = 0;
  let lastCaptureAtMs = Number.NEGATIVE_INFINITY;
  let lastCapturedFrame: Frame | null = null;
  let hasClickedSinceCapture = false;
  let navigationTimer: number | undefined;
  let previousCapture: Promise<unknown> = Promise.resolve();
  let collectionRun = startCollectionRun();

  const take = (
    trigger: EvidenceTrigger,
    request: Omit<EvidenceRequest, "trigger">
  ) => {
    if (captured >= limits.maxEvidence) {
      return null;
    }
    captured += 1;
    const base = evidenceBase(trigger, request, options);
    lastCaptureAtMs = base.atMs;
    lastCapturedFrame = base.frame;
    hasClickedSinceCapture = false;
    const run = collectionRun;
    const stopped = withoutImage(base, STOPPED_BEFORE_CAPTURE);
    const rendered = previousCapture.then(() =>
      run.hasStopped() ? stopped : shoot(base, options)
    );
    const reported = Promise.race([
      rendered,
      run.stopped.then(() => stopped),
    ]).then((evidence) =>
      options.onEvidence(run.hasStopped() ? stopped : evidence)
    );
    previousCapture = Promise.all([rendered, reported]);
    return base.clientKey;
  };

  const isLastCaptureStale = (): boolean =>
    lastCapturedFrame === null ||
    hasClickedSinceCapture ||
    !showsSameScreen(lastCapturedFrame, captureFrame());

  const canAutoCapture = (): boolean =>
    captured < limits.maxEvidence - CAPTURES_KEPT_FOR_MARKS &&
    options.atMs() - lastCaptureAtMs >= limits.minAutoCaptureIntervalMs;

  return {
    cancelPending: () => {
      window.clearTimeout(navigationTimer);
      collectionRun.stop();
      collectionRun = startCollectionRun();
    },
    capture: (request) => take(request.trigger, request),
    clicked: () => {
      hasClickedSinceCapture = true;
    },
    hovered: (element) =>
      canAutoCapture() && isLastCaptureStale()
        ? take("hover", { element })
        : null,
    navigated: () => {
      window.clearTimeout(navigationTimer);
      navigationTimer = window.setTimeout(() => {
        const sinceLastMs = options.atMs() - lastCaptureAtMs;
        if (sinceLastMs >= limits.minAutoCaptureIntervalMs) {
          take("navigation", {});
        }
      }, NAVIGATION_SETTLE_MS);
    },
  };
}
