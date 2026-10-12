import { startsInWidget } from "../../../feedback/ui/widget-events";
import type { SessionEvent } from "../../protocol";
import {
  captureFrame,
  describeElementRef,
  interactiveTarget,
} from "../element-ref";

const DWELL_MS = 700;
const POINTER_SAMPLE_INTERVAL_MS = 100;
const SETTLE_DEBOUNCE_MS = 400;

export interface InteractionRecorderOptions {
  atMs: () => number;
  includeSource: boolean;
  onEvent: (event: SessionEvent) => void;
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

function pointerOf(event: Event): { x: number; y: number } {
  return event instanceof MouseEvent
    ? { x: Math.round(event.clientX), y: Math.round(event.clientY) }
    : { x: 0, y: 0 };
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
        pointer: pointerOf(event),
      });
    }
  };
}

function watchDwell(options: InteractionRecorderOptions, signal: AbortSignal) {
  let hovered: Element | null = null;
  let lastSampleAt = Number.NEGATIVE_INFINITY;
  let dwellTimer: number | undefined;
  signal.addEventListener("abort", () => window.clearTimeout(dwellTimer));
  return (event: Event) => {
    const now = Date.now();
    if (now - lastSampleAt < POINTER_SAMPLE_INTERVAL_MS) {
      return;
    }
    lastSampleAt = now;
    const element = eventElement(event);
    if (element === hovered) {
      return;
    }
    hovered = element;
    window.clearTimeout(dwellTimer);
    if (!element) {
      return;
    }
    const atMs = options.atMs();
    const pointer = pointerOf(event);
    dwellTimer = window.setTimeout(
      () =>
        options.onEvent({
          atMs,
          durationMs: DWELL_MS,
          element: describeElementRef(element, options),
          frame: captureFrame(),
          kind: "dwell",
          pointer,
        }),
      DWELL_MS
    );
  };
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

  document.addEventListener("click", recordClick(options), listen);
  document.addEventListener("pointermove", watchDwell(options, signal), listen);
  window.addEventListener("scroll", recordScroll, listen);
  window.addEventListener("resize", recordViewport, listen);
  return { stop: () => controller.abort() };
}
