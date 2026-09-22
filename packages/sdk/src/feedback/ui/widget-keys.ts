import { WIDGET_MARKER } from "../core/capture";

const KEY_EVENTS = ["keydown", "keyup", "keypress"] as const;

function isWidgetNode(node: EventTarget): boolean {
  if (node instanceof ShadowRoot) {
    return node.host.hasAttribute(WIDGET_MARKER);
  }
  return node instanceof Element && node.hasAttribute(WIDGET_MARKER);
}

export function startsInWidget(event: Event): boolean {
  return event.composedPath().some(isWidgetNode);
}

function relayInsideWidget(event: Event): void {
  const target = event.composedPath()[0];
  if (!(event instanceof KeyboardEvent && target && startsInWidget(event))) {
    return;
  }

  event.stopImmediatePropagation();
  const relay = new KeyboardEvent(event.type, {
    altKey: event.altKey,
    bubbles: true,
    cancelable: true,
    charCode: event.charCode,
    code: event.code,
    ctrlKey: event.ctrlKey,
    isComposing: event.isComposing,
    key: event.key,
    keyCode: event.keyCode,
    location: event.location,
    metaKey: event.metaKey,
    repeat: event.repeat,
    shiftKey: event.shiftKey,
  });
  target.dispatchEvent(relay);
  if (relay.defaultPrevented) {
    event.preventDefault();
  }
}

// Host shortcuts see the shadow host as target, not our fields: stop widget keys at window capture, replay them inside the shadow root.
// Import time = registered before any host capture listener added later.
if (typeof window !== "undefined") {
  for (const type of KEY_EVENTS) {
    window.addEventListener(type, relayInsideWidget, true);
  }
}

export function listenToKeydown(
  anchor: Node | null,
  onKeyDown: (event: KeyboardEvent) => void,
  capture = false
): () => void {
  const widgetRoot = anchor?.getRootNode();
  const targets: EventTarget[] =
    widgetRoot instanceof ShadowRoot ? [document, widgetRoot] : [document];
  const listener = (event: Event) => {
    if (event instanceof KeyboardEvent) {
      onKeyDown(event);
    }
  };

  for (const target of targets) {
    target.addEventListener("keydown", listener, capture);
  }
  return () => {
    for (const target of targets) {
      target.removeEventListener("keydown", listener, capture);
    }
  };
}
