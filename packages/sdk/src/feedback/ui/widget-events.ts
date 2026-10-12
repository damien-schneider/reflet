import { WIDGET_MARKER } from "../core/capture";

const REPLAYED_EVENTS = [
  "keydown",
  "keyup",
  "keypress",
  "pointerdown",
  "mousedown",
  "touchstart",
  "touchend",
  "focusin",
] as const;

function isWidgetNode(node: EventTarget): boolean {
  if (node instanceof ShadowRoot) {
    return node.host.hasAttribute(WIDGET_MARKER);
  }
  return node instanceof Element && node.hasAttribute(WIDGET_MARKER);
}

export function startsInWidget(event: Event): boolean {
  return event.composedPath().some(isWidgetNode);
}

function readEventInit(event: Event): Record<string, unknown> {
  const init: Record<string, unknown> = {};
  let prototype: object | null = Object.getPrototypeOf(event);
  while (prototype && prototype !== Event.prototype) {
    for (const key of Object.keys(prototype)) {
      init[key] = Reflect.get(event, key);
    }
    prototype = Object.getPrototypeOf(prototype);
  }
  return init;
}

function shadowedCopy(event: Event, init: Record<string, unknown>): Event {
  const copy = new Event(event.type, {
    bubbles: event.bubbles,
    cancelable: event.cancelable,
  });
  for (const [key, value] of Object.entries(init)) {
    Object.defineProperty(copy, key, {
      value: typeof value === "function" ? value.bind(event) : value,
    });
  }
  Object.setPrototypeOf(copy, Object.getPrototypeOf(event));
  return copy;
}

// Firefox forces composed on constructed KeyboardEvents, which would carry the replay back out to host listeners.
function containedReplay(event: Event): Event {
  const init = readEventInit(event);
  const replay: Event = Reflect.construct(event.constructor, [
    event.type,
    {
      ...init,
      bubbles: event.bubbles,
      cancelable: event.cancelable,
      composed: false,
    },
  ]);
  return replay.composed ? shadowedCopy(event, init) : replay;
}

function replayInsideWidget(event: Event): void {
  const target = event.composedPath()[0];
  if (!(target && startsInWidget(event))) {
    return;
  }

  const replay = containedReplay(event);
  event.stopImmediatePropagation();
  target.dispatchEvent(replay);
  if (replay.defaultPrevented) {
    event.preventDefault();
  }
}

function hideFocusLeavingForWidget(event: FocusEvent): void {
  const movesIntoWidget =
    event.relatedTarget !== null && isWidgetNode(event.relatedTarget);
  if (movesIntoWidget && !startsInWidget(event)) {
    event.stopImmediatePropagation();
  }
}

// Host shortcuts and outside-press dismissals see the shadow host as target, not our controls: stop widget events at window capture, replay them inside the shadow root.
// Focus traps and close-on-blur popups would pull focus back from our fields: the host never learns focus left for the widget.
// Import time = registered before any host capture listener added later.
if (typeof window !== "undefined") {
  for (const type of REPLAYED_EVENTS) {
    window.addEventListener(type, replayInsideWidget, true);
  }
  window.addEventListener("focusout", hideFocusLeavingForWidget, true);
}

// A replayed click would rerun its activation (submit, toggle), so the real one is stopped at the host once the widget has handled it.
export function stopClicksAtHost(host: Element): void {
  host.addEventListener("click", (event) => event.stopPropagation());
}

export function listenOnPageAndWidget(
  anchor: Node | null,
  type: string,
  listener: (event: Event) => void,
  capture = false
): () => void {
  const widgetRoot = anchor?.getRootNode();
  const targets: EventTarget[] =
    widgetRoot instanceof ShadowRoot ? [document, widgetRoot] : [document];

  for (const target of targets) {
    target.addEventListener(type, listener, capture);
  }
  return () => {
    for (const target of targets) {
      target.removeEventListener(type, listener, capture);
    }
  };
}

export function listenToKeydown(
  anchor: Node | null,
  onKeyDown: (event: KeyboardEvent) => void,
  capture = false
): () => void {
  return listenOnPageAndWidget(
    anchor,
    "keydown",
    (event) => {
      if (event instanceof KeyboardEvent) {
        onKeyDown(event);
      }
    },
    capture
  );
}
