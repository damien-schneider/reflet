import { useEffect, useState } from "react";
import { WIDGET_MARKER } from "../core/capture";
import { describeElement, describeRegion } from "../core/element-selector";
import { getFiberFromNode, resolveComponentStack } from "../core/react-source";

const LABEL_HEIGHT = 24;
const LABEL_GAP = 6;

interface HoverTarget {
  componentName?: string;
  element: Element;
  label: string;
  rect: DOMRect;
  region?: string;
}

function isWidgetOwned(element: Element): boolean {
  return element.closest(`[${WIDGET_MARKER}]`) !== null;
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
 * Points at any element in the page the way a coding agent needs it: the React
 * component that owns it plus the page region it lives in.
 */
export function ElementPicker({
  hint,
  onCancel,
  onPick,
}: {
  hint: string;
  onCancel: () => void;
  onPick: (element: Element) => void;
}) {
  const [target, setTarget] = useState<HoverTarget | null>(null);

  useEffect(() => {
    const swallow = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const onMove = (event: PointerEvent) => {
      const element = elementUnder(event.clientX, event.clientY);
      if (!element) {
        setTarget(null);
        return;
      }

      setTarget((current) =>
        current?.element === element
          ? { ...current, rect: element.getBoundingClientRect() }
          : describeTarget(element)
      );
    };

    const onClick = (event: MouseEvent) => {
      swallow(event);
      const element = elementUnder(event.clientX, event.clientY);
      if (element) {
        onPick(element);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        swallow(event);
        onCancel();
      }
    };

    // Capture phase everywhere: the host app must not react to the pick.
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerdown", swallow, true);
    document.addEventListener("mousedown", swallow, true);
    document.addEventListener("mouseup", swallow, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);

    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "crosshair";

    return () => {
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerdown", swallow, true);
      document.removeEventListener("mousedown", swallow, true);
      document.removeEventListener("mouseup", swallow, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.cursor = previousCursor;
    };
  }, [onCancel, onPick]);

  const rect = target?.rect;
  const labelAbove = rect ? rect.top > LABEL_HEIGHT + LABEL_GAP : true;

  return (
    <div>
      {rect && (
        <div
          className="picker-box"
          style={{
            height: rect.height,
            left: rect.left,
            top: rect.top,
            width: rect.width,
          }}
        />
      )}
      {rect && target && (
        <div
          className="picker-label"
          style={{
            left: Math.max(4, rect.left),
            top: labelAbove
              ? rect.top - LABEL_HEIGHT - LABEL_GAP
              : rect.bottom + LABEL_GAP,
          }}
        >
          <strong>
            {target.componentName ? `<${target.componentName}>` : target.label}
          </strong>
          {target.region && <span>{target.region}</span>}
        </div>
      )}
      <div className="picker-hint">
        {hint} <kbd>Esc</kbd>
      </div>
    </div>
  );
}
