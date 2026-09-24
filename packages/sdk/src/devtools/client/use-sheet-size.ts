import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  onViewportChange,
  type VisibleViewport,
  visibleViewport,
} from "../../feedback/ui/visible-viewport";

export type ResizeAxis = "both" | "height" | "width";

interface SheetSize {
  /** Null keeps the sheet full height. */
  height: number | null;
  width: number;
}

const SIZE_KEY = "reflet-devtools-sheet-size";
const DEFAULT_WIDTH = 440;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;
const EDGE_GAP = 12;
const KEYBOARD_STEP = 24;
const ARROW_DELTAS: Record<string, { dx: number; dy: number }> = {
  ArrowDown: { dx: 0, dy: KEYBOARD_STEP },
  ArrowLeft: { dx: -KEYBOARD_STEP, dy: 0 },
  ArrowRight: { dx: KEYBOARD_STEP, dy: 0 },
  ArrowUp: { dx: 0, dy: -KEYBOARD_STEP },
};

function readStoredSize(): SheetSize {
  const fallback = { height: null, width: DEFAULT_WIDTH };
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(SIZE_KEY) ?? "null"
    );
    if (
      typeof stored === "object" &&
      stored !== null &&
      "width" in stored &&
      typeof stored.width === "number" &&
      "height" in stored &&
      (stored.height === null || typeof stored.height === "number")
    ) {
      return { height: stored.height, width: stored.width };
    }
  } catch {
    return fallback;
  }
  return fallback;
}

/**
 * The stored size is the preference; what renders is that preference fitted
 * to today's window, so shrinking the window never loses the chosen size.
 */
function fitted(size: SheetSize, viewport: VisibleViewport): SheetSize {
  const maxWidth = viewport.width - EDGE_GAP * 2;
  const maxHeight = viewport.height - EDGE_GAP * 2;
  return {
    height:
      size.height === null || size.height >= maxHeight
        ? null
        : Math.max(Math.min(MIN_HEIGHT, maxHeight), size.height),
    width: Math.min(maxWidth, Math.max(MIN_WIDTH, size.width)),
  };
}

/**
 * Width grows away from the docked side, height grows downward from the top;
 * a height reaching the bottom of the window snaps back to full height.
 */
export function useSheetSize(side: "left" | "right") {
  const [preference, setPreference] = useState(readStoredSize);
  const [viewport, setViewport] = useState(visibleViewport);
  const drag = useRef<{
    axis: ResizeAxis;
    size: SheetSize;
    x: number;
    y: number;
  } | null>(null);
  const widthDirection = side === "right" ? -1 : 1;
  const size = fitted(preference, viewport);

  useEffect(() => onViewportChange(() => setViewport(visibleViewport())), []);

  useEffect(() => {
    try {
      localStorage.setItem(SIZE_KEY, JSON.stringify(preference));
    } catch {
      // Blocked storage only costs the size on the next reload.
    }
  }, [preference]);

  const resize = (
    axis: ResizeAxis,
    from: SheetSize,
    dx: number,
    dy: number
  ) => {
    const fullHeight = viewport.height - EDGE_GAP * 2;
    setPreference(
      fitted(
        {
          height:
            axis === "width" ? from.height : (from.height ?? fullHeight) + dy,
          width:
            axis === "height" ? from.width : from.width + dx * widthDirection,
        },
        viewport
      )
    );
  };

  const handleProps = (axis: ResizeAxis) => ({
    onDoubleClick: () =>
      setPreference((current) => ({
        height: axis === "width" ? current.height : null,
        width: axis === "height" ? current.width : DEFAULT_WIDTH,
      })),
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      const delta = ARROW_DELTAS[event.key];
      if (!delta) {
        return;
      }
      event.preventDefault();
      const sheetHeight =
        event.currentTarget.parentElement?.getBoundingClientRect().height ??
        null;
      resize(
        axis,
        { height: size.height ?? sheetHeight, width: size.width },
        delta.dx,
        delta.dy
      );
    },
    onLostPointerCapture: () => {
      drag.current = null;
    },
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }
      const sheet = event.currentTarget.parentElement?.getBoundingClientRect();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {
        axis,
        size: { height: sheet?.height ?? size.height, width: size.width },
        x: event.clientX,
        y: event.clientY,
      };
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const start = drag.current;
      if (start && event.currentTarget.hasPointerCapture(event.pointerId)) {
        resize(
          start.axis,
          start.size,
          event.clientX - start.x,
          event.clientY - start.y
        );
      }
    },
  });

  return { handleProps, size };
}
