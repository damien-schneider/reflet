import { AudioVisualizer } from "@ctrl-ui/react/audio-visualizer-bar";
import { useEffect, useState } from "react";
import type { SessionRecorder } from "../../../sessions/recorder/session-recorder";

const POINTS = 12;
const SAMPLE_EVERY_MS = 80;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const SILENCE: number[] = new Array(POINTS).fill(0);

function useLevelHistory(recorder: SessionRecorder, isLive: boolean): number[] {
  const [levels, setLevels] = useState(SILENCE);

  useEffect(() => {
    if (!isLive || window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      return;
    }
    let peak = 0;
    let sampledAt = 0;
    const unsubscribe = recorder.subscribeLevel((level) => {
      peak = Math.max(peak, level);
      const now = performance.now();
      if (now - sampledAt < SAMPLE_EVERY_MS) {
        return;
      }
      const sample = peak;
      sampledAt = now;
      peak = 0;
      setLevels((current) => [...current.slice(1), sample]);
    });
    return () => {
      unsubscribe();
      setLevels(SILENCE);
    };
  }, [isLive, recorder]);

  return levels;
}

export function RecordingLevels({
  className,
  isLive,
  recorder,
}: {
  className?: string;
  isLive: boolean;
  recorder: SessionRecorder;
}) {
  const levels = useLevelHistory(recorder, isLive);
  return (
    <AudioVisualizer
      active={isLive}
      className={className}
      levels={levels}
      points={POINTS}
    />
  );
}
