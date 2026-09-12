"use client";

import { ArrowUp, Check, Link2, MessageCircle, Sparkles } from "lucide-react";
import { type MotionValue, m, useTransform } from "motion/react";
import {
  JOURNEY_PROGRESS,
  type JourneyStep,
} from "@/features/homepage/components/experience/journey/journey-data";
import { useIsMobile } from "@/hooks/use-mobile";

function useRequestMotion(progress: MotionValue<number>) {
  const mobile = useIsMobile();
  const left = useTransform(
    progress,
    JOURNEY_PROGRESS,
    mobile
      ? ["10%", "6%", "10%", "10%", "14%", "7%", "10%"]
      : ["57%", "5%", "34%", "36%", "67%", "22%", "55%"]
  );
  const top = useTransform(
    progress,
    JOURNEY_PROGRESS,
    mobile
      ? ["20%", "22%", "20%", "22%", "22%", "18%", "20%"]
      : ["27%", "29%", "22%", "29%", "29%", "34%", "28%"]
  );
  const width = useTransform(
    progress,
    JOURNEY_PROGRESS,
    mobile
      ? ["80%", "80%", "80%", "80%", "80%", "86%", "80%"]
      : ["35%", "28%", "32%", "28%", "28%", "56%", "37%"]
  );
  const borderRadius = useTransform(
    progress,
    JOURNEY_PROGRESS,
    [28, 24, 28, 24, 24, 28, 28]
  );
  return { borderRadius, left, top, width };
}

export function JourneyRequest({
  progress,
  step,
}: {
  progress: MotionValue<number>;
  step: JourneyStep;
}) {
  const requestStyle = useRequestMotion(progress);
  const released = step.id === "release" || step.id === "notify";
  return (
    <m.article
      className="journey-request"
      data-request-state={step.id}
      data-testid="journey-request"
      style={requestStyle}
    >
      <div className="journey-request-byline">
        <span className="marketing-avatar">
          {released ? <Check aria-hidden="true" size={13} /> : "M"}
        </span>
        <span>{released ? "Orbit · Product update" : "Maya’s idea"}</span>
        <small>{released ? "Just shipped" : "Just now"}</small>
      </div>
      <div>
        <h4>{released ? "Saved views are here." : "Save my favorite views"}</h4>
        <p>
          {released
            ? "Your workspace, just the way you left it. Save your filters and get back to what matters."
            : "I set up the same filters every morning. Could I save a view and come back to it?"}
        </p>
      </div>
      <RequestFooter step={step} />
    </m.article>
  );
}

function RequestFooter({ step }: { step: JourneyStep }) {
  const released = step.id === "release" || step.id === "notify";
  return (
    <div className="journey-request-footer">
      {released ? (
        <span className="journey-request-release">
          <Link2 aria-hidden="true" size={12} />
          <span>
            {step.id === "notify"
              ? "You asked. We shipped."
              : "Linked to the original request"}
          </span>
        </span>
      ) : (
        <>
          <span className="marketing-status">
            {step.id === "ai" && <Sparkles aria-hidden="true" size={10} />}
            {step.id === "ai" ? "Suggested tag" : "Feature request"}
          </span>
          <span className="journey-request-votes">
            <ArrowUp aria-hidden="true" size={12} /> 12{" "}
            <MessageCircle
              aria-hidden="true"
              className="journey-request-comments"
              size={11}
            />
          </span>
        </>
      )}
    </div>
  );
}
