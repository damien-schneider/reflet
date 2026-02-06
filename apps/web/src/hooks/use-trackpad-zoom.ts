import { useCallback, useEffect, useRef, useState } from "react";

interface UseTrackpadZoomOptions {
  /** Minimum zoom value */
  min: number;
  /** Maximum zoom value */
  max: number;
  /** Initial zoom value */
  defaultValue: number;
  /** Sensitivity for wheel-based zoom (ctrlKey + wheel). Default: 0.5 */
  sensitivity?: number;
  /** Whether zoom is enabled */
  enabled?: boolean;
}

/**
 * Custom hook for trackpad pinch-to-zoom behaviour.
 *
 * Handles two gesture paths:
 * - Chrome / Firefox: `ctrlKey` + `wheel` events
 * - Safari: native `gesturestart` / `gesturechange` events
 *
 * Attach the returned `ref` to the element that should capture gestures
 * (typically a scroll-area viewport or wrapper). The hook listens on that
 * element directly so `preventDefault()` fires before the browser processes
 * the scroll event on the scrollable container.
 */
export function useTrackpadZoom({
  min,
  max,
  defaultValue,
  sensitivity = 0.5,
  enabled = true,
}: UseTrackpadZoomOptions) {
  const [zoom, setZoom] = useState(defaultValue);
  const ref = useRef<HTMLDivElement>(null);
  const lastGestureScaleRef = useRef(1);

  const clamp = useCallback(
    (value: number) => Math.min(max, Math.max(min, value)),
    [min, max]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const el = ref.current;
    if (!el) {
      return;
    }

    // Find scroll-area viewport if present (so we intercept events before scroll)
    const viewport = el.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    const target = viewport ?? el;

    // Chrome / Firefox: ctrl + wheel
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) {
        return;
      }
      e.preventDefault();
      setZoom((prev) => clamp(prev + -e.deltaY * sensitivity));
    };

    // Safari: native gesture events
    const handleGestureStart = (e: Event) => {
      e.preventDefault();
      lastGestureScaleRef.current = 1;
    };

    const handleGestureChange = (e: Event) => {
      e.preventDefault();
      const gestureScale = (e as unknown as { scale: number }).scale;
      const scaleDelta = gestureScale / lastGestureScaleRef.current;
      lastGestureScaleRef.current = gestureScale;
      setZoom((prev) => clamp(prev * scaleDelta));
    };

    target.addEventListener("wheel", handleWheel, { passive: false });
    target.addEventListener("gesturestart", handleGestureStart, {
      passive: false,
    });
    target.addEventListener("gesturechange", handleGestureChange, {
      passive: false,
    });

    return () => {
      target.removeEventListener("wheel", handleWheel);
      target.removeEventListener("gesturestart", handleGestureStart);
      target.removeEventListener("gesturechange", handleGestureChange);
    };
  }, [enabled, clamp, sensitivity]);

  return { zoom, ref } as const;
}
