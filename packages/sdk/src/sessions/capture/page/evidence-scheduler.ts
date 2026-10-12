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

const NAVIGATION_SETTLE_MS = 1500;
const CAPTURE_FAILED = "The page could not be captured.";
const CAPTURE_TOO_LARGE = "The screenshot was larger than the upload limit.";

export interface CapturedEvidence {
  atMs: number;
  clientKey: string;
  element: ElementRef | null;
  frame: Frame;
  image: { blob: Blob; height: number; width: number } | null;
  missingReason: string | null;
  note: string | null;
  trigger: EvidenceTrigger;
}

export interface EvidenceRequest {
  element?: Element | null;
  note?: string | null;
  trigger: "mark" | "select" | "start";
}

export interface EvidenceScheduler {
  cancelPending: () => void;
  capture: (request: EvidenceRequest) => string | null;
  navigated: () => void;
}

export interface EvidenceSchedulerOptions {
  atMs: () => number;
  includeSource: boolean;
  limits: Pick<
    SessionLimits,
    "maxEvidence" | "maxImageBytes" | "minAutoCaptureIntervalMs"
  >;
  onEvidence: (evidence: CapturedEvidence) => void;
}

async function shoot(
  base: Omit<CapturedEvidence, "image" | "missingReason">,
  maxImageBytes: number
): Promise<CapturedEvidence> {
  const image = await captureViewport({
    excludeSelectors: SESSION_MASK_SELECTORS,
    prepareClone: blankFieldValues,
  });
  releaseCapture(image);
  if (!image) {
    return { ...base, image: null, missingReason: CAPTURE_FAILED };
  }
  if (image.blob.size > maxImageBytes) {
    return { ...base, image: null, missingReason: CAPTURE_TOO_LARGE };
  }
  const { blob, height, width } = image;
  return { ...base, image: { blob, height, width }, missingReason: null };
}

export function createEvidenceScheduler(
  options: EvidenceSchedulerOptions
): EvidenceScheduler {
  const { limits } = options;
  let captured = 0;
  let lastCaptureAtMs = Number.NEGATIVE_INFINITY;
  let navigationTimer: number | undefined;
  let previousCapture = Promise.resolve();

  const take = (
    trigger: EvidenceTrigger,
    request: Omit<EvidenceRequest, "trigger">
  ) => {
    if (captured >= limits.maxEvidence) {
      return null;
    }
    captured += 1;
    const atMs = options.atMs();
    lastCaptureAtMs = atMs;
    const clientKey = crypto.randomUUID();
    const base = {
      atMs,
      clientKey,
      element: request.element
        ? describeElementRef(request.element, options)
        : null,
      frame: captureFrame(),
      note: request.note ?? null,
      trigger,
    };
    previousCapture = previousCapture
      .then(() => shoot(base, limits.maxImageBytes))
      .then(options.onEvidence);
    return clientKey;
  };

  return {
    cancelPending: () => window.clearTimeout(navigationTimer),
    capture: (request) => take(request.trigger, request),
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
