import { startsInWidget } from "../../../feedback/ui/widget-events";
import type { SessionEvent } from "../../protocol";
import {
  captureFrame,
  describeElementRef,
  interactiveTarget,
} from "../element-ref";

const MIN_DWELL_MS = 700;
const HOVER_CAPTURE_DELAY_MS = 1200;
const POINTER_SAMPLE_INTERVAL_MS = 100;
const SETTLE_DEBOUNCE_MS = 400;

export interface InteractionRecorderOptions {
  atMs: () => number;
  includeSource: boolean;
  onEvent: (event: SessionEvent) => void;
  onLongHover: (element: Element) => string | null;
}

export interface InteractionRecorder {
  stop: () => void;
}

function eventElement(event: Event): Element | null {
  if (startsInWidget(event)) {
    return null;
  }
  const [origin] = event.composedPath();
  if (!(origin instanceof Element)) {
    return null;
  }
  const element = interactiveTarget(origin);
  const isPageRoot =
    element === document.body || element === document.documentElement;
  return isPageRoot ? null : element;
}

type DwellEvent = Extract<SessionEvent, { kind: "dwell" }>;

function pointerOf(event: MouseEvent): { x: number; y: number } {
  return { x: Math.round(event.clientX), y: Math.round(event.clientY) };
}

function isPhysicalPointerClick(event: Event): event is MouseEvent {
  return event instanceof MouseEvent && event.detail > 0;
}

function debounced(signal: AbortSignal, run: () => void): () => void {
  let settleTimer: number | undefined;
  signal.addEventListener("abort", () => window.clearTimeout(settleTimer));
  return () => {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(run, SETTLE_DEBOUNCE_MS);
  };
}

function recordClick(options: InteractionRecorderOptions) {
  return (event: Event) => {
    const element = eventElement(event);
    if (element) {
      options.onEvent({
        atMs: options.atMs(),
        element: describeElementRef(element, options),
        frame: captureFrame(),
        kind: "click",
        pointer: isPhysicalPointerClick(event) ? pointerOf(event) : null,
      });
    }
  };
}

function watchDwell(options: InteractionRecorderOptions, signal: AbortSignal) {
  let hovered: Element | null = null;
  let lastSampleAt = Number.NEGATIVE_INFINITY;
  let entered: Omit<DwellEvent, "durationMs"> | null = null;
  let hoverCaptureTimer: number | undefined;

  const captureLongHover = (element: Element) => {
    const evidenceClientKey = options.onLongHover(element);
    if (entered && evidenceClientKey) {
      entered = { ...entered, evidenceClientKey };
    }
  };

  const settle = () => {
    window.clearTimeout(hoverCaptureTimer);
    if (!entered) {
      return;
    }
    const durationMs = options.atMs() - entered.atMs;
    if (durationMs >= MIN_DWELL_MS) {
      options.onEvent({ ...entered, durationMs });
    }
    entered = null;
  };
  signal.addEventListener("abort", settle);

  const onPointerMove = (event: Event) => {
    if (!(event instanceof MouseEvent)) {
      return;
    }
    const now = Date.now();
    if (now - lastSampleAt < POINTER_SAMPLE_INTERVAL_MS) {
      return;
    }
    lastSampleAt = now;
    const element = eventElement(event);
    if (element === hovered) {
      return;
    }
    settle();
    hovered = element;
    if (element) {
      entered = {
        atMs: options.atMs(),
        element: describeElementRef(element, options),
        frame: captureFrame(),
        kind: "dwell",
        pointer: pointerOf(event),
      };
      hoverCaptureTimer = window.setTimeout(
        () => captureLongHover(element),
        HOVER_CAPTURE_DELAY_MS
      );
    }
  };

  const onPointerLeaveWindow = (event: Event) => {
    if (event instanceof MouseEvent && event.relatedTarget === null) {
      settle();
      hovered = null;
    }
  };

  return { onPointerLeaveWindow, onPointerMove };
}

export function startInteractionRecorder(
  options: InteractionRecorderOptions
): InteractionRecorder {
  const controller = new AbortController();
  const { signal } = controller;
  const listen = { capture: true, passive: true, signal };
  const recordScroll = debounced(signal, () =>
    options.onEvent({
      atMs: options.atMs(),
      kind: "scroll",
      scrollX: Math.round(window.scrollX),
      scrollY: Math.round(window.scrollY),
    })
  );
  const recordViewport = debounced(signal, () =>
    options.onEvent({
      atMs: options.atMs(),
      devicePixelRatio: window.devicePixelRatio,
      kind: "viewport",
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    })
  );

  const dwell = watchDwell(options, signal);
  document.addEventListener("click", recordClick(options), listen);
  document.addEventListener("pointermove", dwell.onPointerMove, listen);
  document.addEventListener("pointerout", dwell.onPointerLeaveWindow, listen);
  window.addEventListener("scroll", recordScroll, listen);
  window.addEventListener("resize", recordViewport, listen);
  return { stop: () => controller.abort() };
}
