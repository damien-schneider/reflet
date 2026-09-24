import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Point, RefletFeedbackProps } from "../../types";
import { onViewportChange, visibleViewport } from "../visible-viewport";

const EDGE_GAP = 12;
const KEYBOARD_STEP = 24;
const KEY_DIRECTIONS: Record<string, Point> = {
  ArrowDown: { x: 0, y: KEYBOARD_STEP },
  ArrowLeft: { x: -KEYBOARD_STEP, y: 0 },
  ArrowRight: { x: KEYBOARD_STEP, y: 0 },
  ArrowUp: { x: 0, y: -KEYBOARD_STEP },
};

function clampPosition(
  point: Point,
  bounds: DOMRect,
  viewport = visibleViewport()
): Point {
  return {
    x: Math.max(
      viewport.left + EDGE_GAP,
      Math.min(
        point.x,
        viewport.left + viewport.width - bounds.width - EDGE_GAP
      )
    ),
    y: Math.max(
      viewport.top + EDGE_GAP,
      Math.min(
        point.y,
        viewport.top + viewport.height - bounds.height - EDGE_GAP
      )
    ),
  };
}

function readStoredPosition(persistKey: string | undefined): Point | null {
  if (!persistKey || typeof localStorage === "undefined") {
    return null;
  }
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(persistKey) ?? "null"
    );
    if (
      typeof stored === "object" &&
      stored !== null &&
      "x" in stored &&
      "y" in stored &&
      typeof stored.x === "number" &&
      typeof stored.y === "number"
    ) {
      return { x: stored.x, y: stored.y };
    }
    return null;
  } catch {
    return null;
  }
}

export function useFloatingPosition<Root extends HTMLElement = HTMLDivElement>(
  corner: RefletFeedbackProps["position"] = "bottom-right",
  isPanelOpen = false,
  {
    anchorSelector = ".root",
    persistKey,
  }: { anchorSelector?: string; persistKey?: string } = {}
) {
  const rootRef = useRef<Root>(null);
  const gesture = useRef<Point | null>(null);
  // Where the user put it (persisted) vs. where today's window lets it sit (never persisted).
  const [placement, setPlacement] = useState<Point | null>(() =>
    readStoredPosition(persistKey)
  );
  const [fittedAnchor, setFittedAnchor] = useState<Point | null>(null);
  const [positionedPanelOpen, setPositionedPanelOpen] = useState(isPanelOpen);
  const [viewport, setViewport] = useState(visibleViewport);
  const horizontalEdge = corner.endsWith("right") ? "right" : "left";
  const verticalEdge = corner.startsWith("bottom") ? "bottom" : "top";
  const position = fittedAnchor ?? placement;

  if (positionedPanelOpen !== isPanelOpen) {
    setPositionedPanelOpen(isPanelOpen);
    setPlacement(null);
    setFittedAnchor(null);
  }

  const anchorFor = useCallback(
    (point: Point, bounds: DOMRect): Point => {
      const fitted = clampPosition(point, bounds);
      const visible = visibleViewport();
      return {
        x:
          horizontalEdge === "right"
            ? visible.left + visible.width - fitted.x - bounds.width
            : fitted.x - visible.left,
        y:
          verticalEdge === "bottom"
            ? visible.top + visible.height - fitted.y - bounds.height
            : fitted.y - visible.top,
      };
    },
    [horizontalEdge, verticalEdge]
  );

  const moveTo = (point: Point, bounds: DOMRect) => {
    const anchor = anchorFor(point, bounds);
    setFittedAnchor(null);
    setPlacement((current) =>
      current?.x === anchor.x && current.y === anchor.y ? current : anchor
    );
  };

  // Every render, on the layout box: an entrance transform would read as overflow.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || root.offsetWidth === 0) {
      return;
    }
    const bounds = new DOMRect(
      root.offsetLeft,
      root.offsetTop,
      root.offsetWidth,
      root.offsetHeight
    );
    const fitted = clampPosition(bounds, bounds, viewport);
    if (
      Math.abs(fitted.x - bounds.x) > 0.5 ||
      Math.abs(fitted.y - bounds.y) > 0.5
    ) {
      const anchor = anchorFor(fitted, bounds);
      setFittedAnchor((current) =>
        current?.x === anchor.x && current.y === anchor.y ? current : anchor
      );
    }
  });

  /** Back to the user's placement first; the layout effect then refits it to the new room. */
  useEffect(() => {
    const refit = () => setFittedAnchor(null);
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(refit);
    if (rootRef.current) {
      observer?.observe(rootRef.current);
    }
    const stopListening = onViewportChange(() => {
      setViewport(visibleViewport());
      refit();
    });
    return () => {
      observer?.disconnect();
      stopListening();
    };
  }, []);

  useEffect(() => {
    if (!persistKey) {
      return;
    }
    try {
      if (placement) {
        localStorage.setItem(persistKey, JSON.stringify(placement));
      } else {
        localStorage.removeItem(persistKey);
      }
    } catch {
      // Storage can be full or blocked; the position just won't survive a reload.
    }
  }, [persistKey, placement]);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = rootRef.current?.getBoundingClientRect();
    if (!bounds || event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      x: event.clientX - bounds.x,
      y: event.clientY - bounds.y,
    };
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = rootRef.current?.getBoundingClientRect();
    const grab = gesture.current;
    if (
      !(
        bounds &&
        grab &&
        event.currentTarget.hasPointerCapture(event.pointerId)
      )
    ) {
      return;
    }
    moveTo({ x: event.clientX - grab.x, y: event.clientY - grab.y }, bounds);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const direction = KEY_DIRECTIONS[event.key];
    const bounds = rootRef.current?.getBoundingClientRect();
    if (!(bounds && direction)) {
      return;
    }
    event.preventDefault();
    moveTo({ x: bounds.x + direction.x, y: bounds.y + direction.y }, bounds);
  };

  const viewportStyles = `${anchorSelector} { --rf-viewport-width: ${viewport.width}px; --rf-viewport-top: ${viewport.top}px; --rf-viewport-bottom: ${viewport.bottom}px; --rf-viewport-left: ${viewport.left}px; --rf-viewport-right: ${viewport.right}px; }`;
  const anchorStyles = position
    ? `${anchorSelector}[data-moved="true"] { left: auto; right: auto; top: auto; bottom: auto; ${horizontalEdge}: ${position.x + viewport[horizontalEdge]}px; ${verticalEdge}: ${position.y + viewport[verticalEdge]}px; }`
    : "";
  return {
    handleProps: {
      onKeyDown,
      onLostPointerCapture: () => {
        gesture.current = null;
      },
      onPointerCancel: () => {
        gesture.current = null;
      },
      onPointerDown,
      onPointerMove,
      onPointerUp: () => {
        gesture.current = null;
      },
    },
    /** The user's own placement, independent of any temporary fit. */
    placement,
    /** Null while docked by CSS; non-null once moved by the user or fitted into the window. */
    position,
    resetPosition: () => {
      setPlacement(null);
      setFittedAnchor(null);
    },
    rootRef,
    styles: viewportStyles + anchorStyles,
  };
}
