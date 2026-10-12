import { useEffect, useRef } from "react";
import type { SessionRecorder } from "../../recorder/session-recorder";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** The level changes many times a second: it goes straight to a CSS variable, never through React state. */
export function LevelMeter({ recorder }: { recorder: SessionRecorder }) {
  const meterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const prefersStill =
      typeof window.matchMedia === "function" &&
      window.matchMedia(REDUCED_MOTION_QUERY).matches;
    if (prefersStill) {
      return;
    }
    return recorder.subscribeLevel((level) => {
      meterRef.current?.style.setProperty("--dt-level", level.toFixed(2));
    });
  }, [recorder]);

  return (
    <span aria-hidden="true" className="dt-rec-meter" ref={meterRef}>
      <span />
      <span />
      <span />
    </span>
  );
}
