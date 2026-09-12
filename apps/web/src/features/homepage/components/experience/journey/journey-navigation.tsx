"use client";

import {
  Check,
  Layers,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { type MotionValue, m } from "motion/react";
import {
  JOURNEY_STEPS,
  journeyAnchorId,
} from "@/features/homepage/components/experience/journey/journey-data";
import { useMotionPreference } from "@/features/homepage/components/experience/motion/use-motion-preference";

const STEP_ICONS = [
  MessageCircle,
  Layers,
  Sparkles,
  Waypoints,
  Check,
  Send,
  RotateCcw,
];

export function JourneyNavigation({
  activeIndex,
  progress,
}: {
  activeIndex: number;
  progress: MotionValue<number>;
}) {
  const progressStyle = { scaleX: progress };
  return (
    <nav
      aria-label="Feedback journey steps"
      className="journey-navigation"
      data-current-label={JOURNEY_STEPS[activeIndex].label}
    >
      <span aria-hidden="true" className="journey-timeline-track">
        <m.span className="journey-timeline-progress" style={progressStyle} />
      </span>
      {JOURNEY_STEPS.map((step, index) => (
        <JourneyNavigationLink
          activeIndex={activeIndex}
          index={index}
          key={step.id}
        />
      ))}
    </nav>
  );
}

function JourneyNavigationLink({
  activeIndex,
  index,
}: {
  activeIndex: number;
  index: number;
}) {
  const reducedMotion = useMotionPreference();
  const step = JOURNEY_STEPS[index];
  const Icon = STEP_ICONS[index];
  return (
    <a
      aria-current={index === activeIndex ? "step" : undefined}
      aria-label={step.label}
      data-complete={index < activeIndex}
      href={`#${journeyAnchorId(step.id)}`}
    >
      {index === activeIndex && (
        <m.span
          aria-hidden="true"
          className="journey-nav-indicator"
          layoutId="journey-selected"
          transition={
            reducedMotion
              ? { duration: 0 }
              : { damping: 32, stiffness: 350, type: "spring" }
          }
        />
      )}
      <span className="journey-nav-content">
        <Icon aria-hidden="true" size={15} />
        <span>{step.label}</span>
      </span>
    </a>
  );
}
