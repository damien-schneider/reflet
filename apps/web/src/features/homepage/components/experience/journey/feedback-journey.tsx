"use client";

import { ArrowDown } from "lucide-react";
import { domAnimation, LazyMotion } from "motion/react";
import {
  JOURNEY_STEPS,
  journeyAnchorId,
} from "@/features/homepage/components/experience/journey/journey-data";
import { JourneyScene } from "@/features/homepage/components/experience/journey/journey-scene";
import { JourneyTimeline } from "@/features/homepage/components/experience/journey/journey-timeline";
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
            <div className="journey-step-copy" key={step.id}>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
            <JourneyScene
              caption={
                reducedMotion
                  ? "Illustrative demo · Choose a step to explore"
                  : "Illustrative demo"
              }
              progress={progress}
              step={step}
            />
            <JourneyTimeline activeIndex={activeIndex} progress={progress} />
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
        kicker="How it works"
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
