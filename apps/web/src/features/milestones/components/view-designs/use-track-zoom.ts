import { useEffect, useRef, useState } from "react";

interface SafariGestureEvent extends Event {
  scale: number;
}

function isSafariGestureEvent(event: Event): event is SafariGestureEvent {
  return "scale" in event;
}

export const MIN_ZONE_WIDTH = 80;
export const MAX_ZONE_WIDTH = 500;
export const DEFAULT_ZONE_WIDTH = 160;
const ZOOM_SENSITIVITY = 0.5;

const clampZoneWidth = (width: number) =>
  Math.min(MAX_ZONE_WIDTH, Math.max(MIN_ZONE_WIDTH, width));

export function useTrackZoom(enabled: boolean) {
  const [zoneMinWidth, setZoneMinWidth] = useState(DEFAULT_ZONE_WIDTH);
  const trackRef = useRef<HTMLDivElement>(null);
  const lastGestureScaleRef = useRef(1);

  useEffect(() => {
    const wrapper = trackRef.current;
    if (!(enabled && wrapper)) {
      return;
    }

    const el =
      wrapper.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]'
      ) ?? wrapper;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) {
        return;
      }
      e.preventDefault();
      setZoneMinWidth((prev) =>
        clampZoneWidth(prev - e.deltaY * ZOOM_SENSITIVITY)
      );
    };

    const handleGestureStart = (e: Event) => {
      e.preventDefault();
      lastGestureScaleRef.current = 1;
    };

    const handleGestureChange = (e: Event) => {
      e.preventDefault();
      if (!isSafariGestureEvent(e)) {
        return;
      }
      const scaleDelta = e.scale / lastGestureScaleRef.current;
      lastGestureScaleRef.current = e.scale;
      setZoneMinWidth((prev) => clampZoneWidth(prev * scaleDelta));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("gesturestart", handleGestureStart, { passive: false });
    el.addEventListener("gesturechange", handleGestureChange, {
      passive: false,
    });

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("gesturestart", handleGestureStart);
      el.removeEventListener("gesturechange", handleGestureChange);
    };
  }, [enabled]);

  return { setZoneMinWidth, trackRef, zoneMinWidth };
}
