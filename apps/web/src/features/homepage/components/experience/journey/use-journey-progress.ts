"use client";

import {
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef, useState, useSyncExternalStore } from "react";
import {
  JOURNEY_PROGRESS,
  JOURNEY_STEPS,
  journeyAnchorId,
  paceJourneyProgress,
} from "@/features/homepage/components/experience/journey/journey-data";
import { useMotionPreference } from "@/features/homepage/components/experience/motion/use-motion-preference";

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readHash() {
  return window.location.hash;
}

function serverHash() {
  return "";
}

export function useJourneyProgress() {
  const trackRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useMotionPreference();
  const hash = useSyncExternalStore(subscribeToHash, readHash, serverHash);
  const hashIndex = Math.max(
    0,
    JOURNEY_STEPS.findIndex((step) => hash === `#${journeyAnchorId(step.id)}`)
  );
  const { scrollYProgress } = useScroll({
    offset: ["start start", "end end"],
    target: trackRef,
  });
  const smoothProgress = useSpring(scrollYProgress, {
    damping: 32,
    mass: 0.5,
    restDelta: 0.0001,
    restSpeed: 0.0001,
    stiffness: 320,
  });
  const progress = useTransform(smoothProgress, (value) =>
    reducedMotion ? JOURNEY_PROGRESS[hashIndex] : paceJourneyProgress(value)
  );
  const [scrollIndex, setScrollIndex] = useState(0);
  useMotionValueEvent(progress, "change", (value) =>
    setScrollIndex(Math.round(value * (JOURNEY_STEPS.length - 1)))
  );
  const activeIndex = reducedMotion ? hashIndex : scrollIndex;
  return {
    activeIndex,
    progress,
    reducedMotion,
    step: JOURNEY_STEPS[activeIndex],
    trackRef,
  };
}
