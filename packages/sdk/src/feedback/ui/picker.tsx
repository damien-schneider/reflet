import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  describeElement,
  describeRegion,
  MAX_SELECTION_COMMENT_LENGTH,
} from "../core/element-selector";
import { getFiberFromNode, resolveComponentStack } from "../core/react-source";
import type { FeedbackWidgetLabels } from "../types";
import { AIM_KEYS, isWidgetOwned, stepAim } from "./floating/element-walk";
import { ArrowIcon } from "./icons";
import { isApplePlatform, isSubmitEnter, matchesHotkey } from "./keyboard";
import {
  onViewportChange,
  type VisibleViewport,
  visibleViewport,
} from "./visible-viewport";
import { listenToKeydown, startsInWidget } from "./widget-events";

const LABEL_HEIGHT = 24;
const LABEL_GAP = 6;
const NOTE_GAP = 10;
const EDGE_GAP = 12;

interface HoverTarget {
  componentName?: string;
  element: Element;
  label: string;
  rect: DOMRect;
  region?: string;
}

function elementUnder(x: number, y: number): Element | null {
  const element = document.elementFromPoint(x, y);
  if (!element || isWidgetOwned(element)) {
    return null;
  }
  return element;
}

function describeTarget(element: Element): HoverTarget {
  return {
    componentName: resolveComponentStack(getFiberFromNode(element))[0],
    element,
    label: describeElement(element),
    rect: element.getBoundingClientRect(),
    region: describeRegion(element),
  };
}

interface CardSize {
  height: number;
  width: number;
}

function noteCardPosition(
  rect: DOMRect,
  view: VisibleViewport,
  card: CardSize
) {
  const viewLeft = view.left + EDGE_GAP;
  const viewRight = view.left + view.width - EDGE_GAP;
  const viewTop = view.top + EDGE_GAP;
  const viewBottom = view.top + view.height - EDGE_GAP;
  const fitLeft = (left: number) =>
    Math.max(viewLeft, Math.min(left, viewRight - card.width));
  const fitTop = (top: number) =>
    Math.max(viewTop, Math.min(top, viewBottom - card.height));

  const below = rect.bottom + NOTE_GAP;
  if (below >= viewTop && below + card.height <= viewBottom) {
    return { left: fitLeft(rect.left), top: below };
  }
  const above = rect.top - NOTE_GAP - card.height;
  if (above >= viewTop && rect.top <= viewBottom) {
    return { left: fitLeft(rect.left), top: above };
  }
  const besideTop = fitTop(rect.top);
  const right = rect.right + NOTE_GAP;
  if (right + card.width <= viewRight) {
    return { left: right, top: besideTop };
  }
  const left = rect.left - NOTE_GAP - card.width;
  if (left >= viewLeft) {
    return { left, top: besideTop };
  }
  return {
    left: fitLeft(rect.left),
    top: fitTop(Math.min(rect.bottom, viewBottom) - card.height),
  };
}

function labelTop(rect: DOMRect, view: VisibleViewport): number {
  const above = rect.top - LABEL_HEIGHT - LABEL_GAP;
  if (above >= view.top) {
    return above;
  }
  const below = rect.bottom + LABEL_GAP;
  if (below + LABEL_HEIGHT <= view.top + view.height) {
    return below;
  }
  return Math.max(rect.top, view.top) + LABEL_GAP;
}

export interface PickerInspect {
  /** Shown on the note card; Shift+click or Shift+Enter skips the card. */
  label: string;
  onInspect: (element: Element) => void;
}

/** ⌘C on the aimed element, or the note card's button with its note. */
export interface PickerCopy {
  label: string;
  onCopy: (element: Element, note: string) => void;
}

export function ElementPicker({
  copy,
  inspect,
  labels,
  onCancel,
  onPick,
}: {
  copy?: PickerCopy;
  inspect?: PickerInspect;
  labels: FeedbackWidgetLabels;
  onCancel: () => void;
  onPick: (element: Element, note: string) => void;
}) {
  const [target, setTarget] = useState<HoverTarget | null>(null);
  const [pinned, setPinned] = useState<HoverTarget | null>(null);
  const [note, setNote] = useState("");
  const [noteSize, setNoteSize] = useState<CardSize>({ height: 0, width: 0 });
  const pickerRef = useRef<HTMLDivElement>(null);
  const noteCardRef = useRef<HTMLFormElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const pinnedRef = useRef(false);
  const [view, setView] = useState(visibleViewport);
  const aimRef = useRef<Element | null>(null);

  useEffect(() => onViewportChange(() => setView(visibleViewport())), []);

  useLayoutEffect(() => {
    const card = noteCardRef.current;
    if (pinned && card) {
      setNoteSize({ height: card.offsetHeight, width: card.offsetWidth });
    }
  }, [pinned]);

  useEffect(() => {
    pinnedRef.current = pinned !== null;
    if (pinned) {
      noteRef.current?.focus({ preventScroll: true });
    }
  }, [pinned]);

  useEffect(() => {
    aimRef.current = target?.element ?? null;
  }, [target]);

  useEffect(() => {
    const swallow = (event: Event) => {
      if (startsInWidget(event)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };

    const pin = (element: Element, wantsCode: boolean) => {
      if (wantsCode && inspect) {
        inspect.onInspect(element);
      } else {
        setPinned(describeTarget(element));
      }
    };

    const aimAt = (x: number, y: number) => {
      const element = elementUnder(x, y);
      if (!element) {
        return;
      }

      setTarget((current) =>
        current?.element === element
          ? { ...current, rect: element.getBoundingClientRect() }
          : describeTarget(element)
      );
    };

    const onMove = (event: PointerEvent) => {
      if (pinnedRef.current || startsInWidget(event)) {
        return;
      }
      aimAt(event.clientX, event.clientY);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (startsInWidget(event)) {
        return;
      }
      swallow(event);
      // Touch has no hover: the press itself is what aims.
      if (!pinnedRef.current) {
        aimAt(event.clientX, event.clientY);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (startsInWidget(event)) {
        return;
      }
      swallow(event);
      const isPrimaryPress = event.button === 0;
      if (pinnedRef.current || !isPrimaryPress) {
        return;
      }
      const element = elementUnder(event.clientX, event.clientY);
      if (element) {
        pin(element, event.shiftKey);
      }
    };

    const moveAim = (key: string, backwards: boolean) => {
      const next = stepAim(aimRef.current, key, backwards);
      if (!next) {
        return;
      }
      next.scrollIntoView({ block: "nearest", inline: "nearest" });
      aimRef.current = next;
      setTarget(describeTarget(next));
    };

    const onEscape = () => {
      if (pinnedRef.current) {
        setPinned(null);
        setNote("");
        return;
      }
      onCancel();
    };

    const copyAimed = (event: KeyboardEvent): boolean => {
      const aimed = aimRef.current;
      if (!(copy && aimed && matchesHotkey(event, "mod+c"))) {
        return false;
      }
      swallow(event);
      copy.onCopy(aimed, "");
      return true;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) {
        return;
      }
      if (event.key === "Escape") {
        swallow(event);
        onEscape();
        return;
      }
      if (pinnedRef.current || startsInWidget(event) || copyAimed(event)) {
        return;
      }
      if (event.key === "Enter") {
        swallow(event);
        if (aimRef.current) {
          pin(aimRef.current, event.shiftKey);
        }
        return;
      }
      if (!AIM_KEYS.includes(event.key)) {
        return;
      }
      swallow(event);
      moveAim(event.key, event.shiftKey);
    };

    const onScroll = () => {
      setTarget((current) =>
        current
          ? { ...current, rect: current.element.getBoundingClientRect() }
          : current
      );
      setPinned((current) =>
        current
          ? { ...current, rect: current.element.getBoundingClientRect() }
          : current
      );
    };

    // Window capture: runs before the host's own capture listeners on document.
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("mousedown", swallow, true);
    window.addEventListener("mouseup", swallow, true);
    window.addEventListener("click", swallow, true);
    window.addEventListener("contextmenu", swallow, true);
    const stopListeningToKeys = listenToKeydown(
      pickerRef.current,
      onKeyDown,
      true
    );
    window.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });

    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "crosshair";

    return () => {
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("mousedown", swallow, true);
      window.removeEventListener("mouseup", swallow, true);
      window.removeEventListener("click", swallow, true);
      window.removeEventListener("contextmenu", swallow, true);
      stopListeningToKeys();
      window.removeEventListener("scroll", onScroll, true);
      document.body.style.cursor = previousCursor;
    };
  }, [copy, inspect, onCancel]);

  const shown = pinned ?? target;
  const rect = shown?.rect;

  return (
    <div className="picker" ref={pickerRef}>
      {rect && (
        <div
          className="picker-box"
          data-pinned={pinned !== null}
          style={{
            height: rect.height,
            translate: `${rect.left}px ${rect.top}px`,
            width: rect.width,
          }}
        />
      )}
      {rect && target && !pinned && (
        <div
          className="picker-label"
          style={{
            translate: `${Math.max(4, rect.left)}px ${labelTop(rect, view)}px`,
          }}
        >
          <strong>
            {target.componentName ? `<${target.componentName}>` : target.label}
          </strong>
          {target.region && <span>{target.region}</span>}
        </div>
      )}

      {pinned ? (
        <form
          className="picker-note glass"
          onSubmit={(event) => {
            event.preventDefault();
            onPick(pinned.element, note.trim());
          }}
          ref={noteCardRef}
          style={noteCardPosition(pinned.rect, view, noteSize)}
        >
          <p className="picker-note-target">
            <strong>
              {pinned.componentName
                ? `<${pinned.componentName}>`
                : pinned.label}
            </strong>
            {pinned.region && <span>{pinned.region}</span>}
          </p>
          <textarea
            aria-label={labels.elementNote}
            maxLength={MAX_SELECTION_COMMENT_LENGTH}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => {
              if (isSubmitEnter(event.nativeEvent)) {
                event.preventDefault();
                onPick(pinned.element, note.trim());
              }
            }}
            placeholder={labels.elementNotePlaceholder}
            ref={noteRef}
            rows={2}
            value={note}
          />
          <div className="picker-note-actions">
            <button
              className="picker-cancel"
              onClick={() => {
                setPinned(null);
                setNote("");
              }}
              type="button"
            >
              {labels.pickAnother}
            </button>
            {inspect && (
              <button
                className="picker-cancel"
                onClick={() => inspect.onInspect(pinned.element)}
                type="button"
              >
                {inspect.label}
              </button>
            )}
            {copy && (
              <button
                className="picker-cancel"
                onClick={() => copy.onCopy(pinned.element, note.trim())}
                type="button"
              >
                {copy.label}
              </button>
            )}
            <button
              aria-label={labels.attachElement}
              className="submit"
              title={labels.attachElement}
              type="submit"
            >
              <ArrowIcon />
            </button>
          </div>
        </form>
      ) : (
        <div className="picker-hint">
          <span className="picker-instruction">
            {labels.pickElementHint} <kbd>Tab</kbd>
            <kbd>Enter</kbd>
            {inspect && <kbd>⇧ Click</kbd>}
            {copy && <kbd>{isApplePlatform() ? "⌘C" : "Ctrl C"}</kbd>}
            <kbd>Esc</kbd>
          </span>
          <button className="picker-cancel" onClick={onCancel} type="button">
            {labels.cancel}
          </button>
        </div>
      )}
    </div>
  );
}
