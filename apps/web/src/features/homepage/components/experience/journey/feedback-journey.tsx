"use client";

import { ArrowDown } from "lucide-react";
import { domAnimation, LazyMotion } from "motion/react";
import {
  JOURNEY_STEPS,
  type JourneyStep,
  journeyAnchorId,
} from "@/features/homepage/components/experience/journey/journey-data";
import { JourneyNavigation } from "@/features/homepage/components/experience/journey/journey-navigation";
import { JourneyScene } from "@/features/homepage/components/experience/journey/journey-scene";
import { useJourneyProgress } from "@/features/homepage/components/experience/journey/use-journey-progress";
import { MarketingSectionIntro } from "@/features/homepage/components/experience/marketing-section-intro";
import "@/features/homepage/components/experience/journey/journey.css";

export function FeedbackJourney() {
  const { activeIndex, progress, reducedMotion, step, trackRef } =
    useJourneyProgress();
  return (
    <LazyMotion features={domAnimation} strict>
      <section className="feedback-story" id="story">
        <JourneyIntroduction />
        <div
          className="journey-track"
          data-reduced-motion={Boolean(reducedMotion)}
          data-step={step.id}
          data-testid="feedback-journey"
          ref={trackRef}
        >
          {JOURNEY_STEPS.map((journeyStep) => (
            <span
              aria-hidden="true"
              className="journey-anchor"
              id={journeyAnchorId(journeyStep.id)}
              key={journeyStep.id}
            />
          ))}
          <div className="journey-sticky">
            <JourneyHeading activeIndex={activeIndex} step={step} />
            <JourneyScene progress={progress} step={step} />
            <JourneyNavigation activeIndex={activeIndex} progress={progress} />
            <div className="journey-caption">
              <span>Illustrative demo · Made with Reflet</span>
              <span>
                {reducedMotion
                  ? "Choose a step to explore"
                  : "Scroll, or choose a step"}{" "}
                <ArrowDown aria-hidden="true" size={11} />
              </span>
            </div>
          </div>
        </div>
      </section>
    </LazyMotion>
  );
}

function JourneyIntroduction() {
  return (
    <div className="marketing-section journey-introduction">
      <MarketingSectionIntro
        kicker="The feedback loop, in motion"
        title={
          <>
            One small idea.
            <br />
            <span>All the way around.</span>
          </>
        }
      >
        Follow Maya’s request from a passing thought to the update that makes
        her day.
      </MarketingSectionIntro>
      <a className="journey-skip marketing-text-link" href="#features">
        Skip to the features <ArrowDown aria-hidden="true" size={13} />
      </a>
    </div>
  );
}

function JourneyHeading({
  activeIndex,
  step,
}: {
  activeIndex: number;
  step: JourneyStep;
}) {
  return (
    <div className="journey-heading">
      <span className="journey-step-count">
        {String(activeIndex + 1).padStart(2, "0")}{" "}
        <span>/ {String(JOURNEY_STEPS.length).padStart(2, "0")}</span>
      </span>
      <div className="journey-step-copy">
        <h3>{step.title}</h3>
        <p>{step.description}</p>
      </div>
    </div>
  );
}
