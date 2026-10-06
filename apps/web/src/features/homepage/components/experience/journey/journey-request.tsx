"use client";

import NumberFlow from "@number-flow/react";
import { ArrowUp, Check, Link2, MessageCircle, Sparkles } from "lucide-react";
import { type MotionValue, m, useTransform } from "motion/react";
import {
  JOURNEY_BOARD_GRID,
  JOURNEY_PROGRESS,
  type JourneyStep,
  journeyBoardColumnLeft,
} from "@/features/homepage/components/experience/journey/journey-data";
import { useIsMobile } from "@/hooks/use-mobile";

const BOARD_ROW_TOP = `${JOURNEY_BOARD_GRID.rowTop}%`;
const BOARD_COLUMN_WIDTH = `${JOURNEY_BOARD_GRID.columnWidth}%`;
const [TO_DO_LEFT, PLANNED_LEFT, DONE_LEFT] = [0, 1, 2].map(
  (column) => `${journeyBoardColumnLeft(column)}%`
);

function useRequestMotion(progress: MotionValue<number>) {
  const mobile = useIsMobile();
  const left = useTransform(
    progress,
    JOURNEY_PROGRESS,
    mobile
      ? ["10%", "6%", "10%", "10%", "14%", "7%", "10%"]
      : ["57%", TO_DO_LEFT, "34%", PLANNED_LEFT, DONE_LEFT, "22%", "55%"]
  );
  const top = useTransform(
    progress,
    JOURNEY_PROGRESS,
    mobile
      ? [
          "20%",
          BOARD_ROW_TOP,
          "20%",
          BOARD_ROW_TOP,
          BOARD_ROW_TOP,
          "18%",
          "20%",
        ]
      : [
          "27%",
          BOARD_ROW_TOP,
          "26%",
          BOARD_ROW_TOP,
          BOARD_ROW_TOP,
          "34%",
          "28%",
        ]
  );
  const width = useTransform(
    progress,
    JOURNEY_PROGRESS,
    mobile
      ? ["80%", "80%", "80%", "80%", "80%", "86%", "80%"]
      : [
          "35%",
          BOARD_COLUMN_WIDTH,
          "32%",
          BOARD_COLUMN_WIDTH,
          BOARD_COLUMN_WIDTH,
          "56%",
          "37%",
        ]
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
      <div
        className="journey-request-byline"
        key={released ? "update-byline" : "idea-byline"}
      >
        <span className="marketing-avatar">
          {released ? <Check aria-hidden="true" size={13} /> : "M"}
        </span>
        <span>{released ? "Orbit · Product update" : "Maya’s idea"}</span>
        <small>{released ? "Just shipped" : "Just now"}</small>
      </div>
      <div
        className="journey-request-story"
        key={released ? "update-story" : "idea-story"}
      >
        <h4>{released ? "Saved views are here." : "Save my favorite views"}</h4>
        <p>
          {released
            ? "Save your filters once, then open them again in one click."
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
            <ArrowUp aria-hidden="true" size={12} />
            <NumberFlow value={step.id === "capture" ? 1 : 12} />
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
