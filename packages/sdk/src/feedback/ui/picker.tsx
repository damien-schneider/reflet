import { useEffect, useRef, useState } from "react";
import {
  describeElement,
  describeRegion,
  MAX_SELECTION_COMMENT_LENGTH,
} from "../core/element-selector";
import { getFiberFromNode, resolveComponentStack } from "../core/react-source";
import type { FeedbackWidgetLabels } from "../types";
import { AIM_KEYS, isWidgetOwned, stepAim } from "./floating/element-walk";
import { ArrowIcon } from "./icons";
import {
  onViewportChange,
  type VisibleViewport,
  visibleViewport,
} from "./visible-viewport";
import { listenToKeydown, startsInWidget } from "./widget-keys";

const LABEL_HEIGHT = 24;
const LABEL_GAP = 6;
const NOTE_WIDTH = 300;
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

/**
 * Pins the note card to the element: below it, flipped above when the visible
 * viewport — what is left of the screen once a mobile keyboard is up — has no
 * room there. Measures against the part of the element actually on screen, so
 * picking a full-height section still leaves the card in view.
 */
function noteStyle(rect: DOMRect, view: VisibleViewport) {
  const left = Math.min(
    Math.max(view.left + EDGE_GAP, rect.left),
    Math.max(
      view.left + EDGE_GAP,
      view.left + view.width - NOTE_WIDTH - EDGE_GAP
    )
  );
  const visibleTop = Math.max(rect.top, view.top + EDGE_GAP);
  const visibleBottom = Math.min(
    rect.bottom,
    view.top + view.height - EDGE_GAP
  );
  const roomBelow = view.top + view.height - visibleBottom;
  if (roomBelow > visibleTop - view.top) {
    return { left, top: visibleBottom + NOTE_GAP };
  }
  return { bottom: window.innerHeight - visibleTop + NOTE_GAP, left };
}

/**
 * Points at any element in the page the way a coding agent needs it: the React
 * component that owns it plus the page region it lives in. Picking never
 * commits on its own — it pins a note card to the element, so the reporter
 * writes about that element right there and confirms. Aiming stays live until
 * then, which is what makes the flow usable without hover, on touch.
 */
export function ElementPicker({
  labels,
  onCancel,
  onPick,
}: {
  labels: FeedbackWidgetLabels;
  onCancel: () => void;
  onPick: (element: Element, note: string) => void;
}) {
  const [target, setTarget] = useState<HoverTarget | null>(null);
  const [pinned, setPinned] = useState<HoverTarget | null>(null);
  const [note, setNote] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const pinnedRef = useRef(false);
  const [view, setView] = useState(visibleViewport);
  const aimRef = useRef<Element | null>(null);

  useEffect(() => onViewportChange(() => setView(visibleViewport())), []);

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
      if (pinnedRef.current) {
        return;
      }
      const element = elementUnder(event.clientX, event.clientY);
      if (element) {
        setPinned(describeTarget(element));
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        swallow(event);
        onEscape();
        return;
      }
      if (pinnedRef.current || startsInWidget(event)) {
        return;
      }
      if (event.key === "Enter") {
        swallow(event);
        if (aimRef.current) {
          setPinned(describeTarget(aimRef.current));
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

    // Capture phase everywhere: the host app must not react to the pick.
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("mousedown", swallow, true);
    document.addEventListener("mouseup", swallow, true);
    document.addEventListener("click", swallow, true);
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
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("mousedown", swallow, true);
      document.removeEventListener("mouseup", swallow, true);
      document.removeEventListener("click", swallow, true);
      stopListeningToKeys();
      window.removeEventListener("scroll", onScroll, true);
      document.body.style.cursor = previousCursor;
    };
  }, [onCancel]);

  const shown = pinned ?? target;
  const rect = shown?.rect;
  const labelAbove = rect ? rect.top > LABEL_HEIGHT + LABEL_GAP : true;

  return (
    <div ref={pickerRef}>
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
            translate: `${Math.max(4, rect.left)}px ${
              labelAbove
                ? rect.top - LABEL_HEIGHT - LABEL_GAP
                : rect.bottom + LABEL_GAP
            }px`,
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
          style={noteStyle(pinned.rect, view)}
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
              if (event.key === "Enter" && !event.shiftKey) {
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
