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

export function useFloatingPosition(
  corner: RefletFeedbackProps["position"] = "bottom-right"
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Point | null>(null);
  const [position, setPosition] = useState<Point | null>(null);
  const [viewport, setViewport] = useState(visibleViewport);
  const horizontalEdge = corner.endsWith("right") ? "right" : "left";
  const verticalEdge = corner.startsWith("bottom") ? "bottom" : "top";

  const moveTo = useCallback(
    (point: Point, bounds: DOMRect) => {
      const fitted = clampPosition(point, bounds);
      const visible = visibleViewport();
      const anchor = {
        x:
          horizontalEdge === "right"
            ? visible.left + visible.width - fitted.x - bounds.width
            : fitted.x - visible.left,
        y:
          verticalEdge === "bottom"
            ? visible.top + visible.height - fitted.y - bounds.height
            : fitted.y - visible.top,
      };
      setPosition((current) =>
        current?.x === anchor.x && current.y === anchor.y ? current : anchor
      );
    },
    [horizontalEdge, verticalEdge]
  );

  const keepInViewport = useCallback(() => {
    const bounds = rootRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }
    const fitted = clampPosition(bounds, bounds, viewport);
    if (
      Math.abs(fitted.x - bounds.x) > 0.5 ||
      Math.abs(fitted.y - bounds.y) > 0.5
    ) {
      moveTo(fitted, bounds);
    }
  }, [moveTo, viewport]);

  useLayoutEffect(() => {
    keepInViewport();
  }, [keepInViewport]);
  useEffect(() => {
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(keepInViewport);
    if (rootRef.current) {
      observer?.observe(rootRef.current);
    }
    const stopListening = onViewportChange(() =>
      setViewport(visibleViewport())
    );
    return () => {
      observer?.disconnect();
      stopListening();
    };
  }, [keepInViewport]);

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
    if (bounds && gesture.current) {
      moveTo(
        {
          x: event.clientX - gesture.current.x,
          y: event.clientY - gesture.current.y,
        },
        bounds
      );
    }
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

  const viewportStyles = `.root { --rf-viewport-width: ${viewport.width}px; --rf-viewport-top: ${viewport.top}px; --rf-viewport-bottom: ${viewport.bottom}px; --rf-viewport-left: ${viewport.left}px; --rf-viewport-right: ${viewport.right}px; }`;
  const anchorStyles = position
    ? `.root[data-moved="true"] { left: auto; right: auto; top: auto; bottom: auto; ${horizontalEdge}: ${position.x + viewport[horizontalEdge]}px; ${verticalEdge}: ${position.y + viewport[verticalEdge]}px; }`
    : "";
  return {
    handleProps: {
      onKeyDown,
      onPointerCancel: () => {
        gesture.current = null;
      },
      onPointerDown,
      onPointerMove,
      onPointerUp: () => {
        gesture.current = null;
      },
    },
    position,
    rootRef,
    styles: viewportStyles + anchorStyles,
  };
}
