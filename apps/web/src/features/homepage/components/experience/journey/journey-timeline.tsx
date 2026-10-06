"use client";

import { type MotionValue, m } from "motion/react";
import {
  JOURNEY_STEPS,
  journeyAnchorId,
} from "@/features/homepage/components/experience/journey/journey-data";

export function JourneyTimeline({
  activeIndex,
  progress,
}: {
  activeIndex: number;
  progress: MotionValue<number>;
}) {
  const timelineStyle = {
    "--journey-progress": progress,
    "--journey-step-count": JOURNEY_STEPS.length,
  };
  return (
    <m.nav
      aria-label="Feedback journey steps"
      className="journey-timeline"
      data-current-label={JOURNEY_STEPS[activeIndex].label}
      style={timelineStyle}
    >
      <span aria-hidden="true" className="journey-timeline-track">
        <span className="journey-timeline-passed" />
        <span className="journey-timeline-playhead" />
      </span>
      {JOURNEY_STEPS.map((step, index) => (
        <a
          aria-current={index === activeIndex ? "step" : undefined}
          aria-label={step.label}
          href={`#${journeyAnchorId(step.id)}`}
          key={step.id}
        >
          <span className="journey-timeline-label">{step.label}</span>
        </a>
      ))}
    </m.nav>
  );
}
