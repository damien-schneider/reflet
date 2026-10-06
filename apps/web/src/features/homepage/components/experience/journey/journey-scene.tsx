"use client";

import { type MotionValue, m, useTransform } from "motion/react";
import {
  JOURNEY_BOARD_GRID,
  JOURNEY_CHAPTER_OFFSETS,
  JOURNEY_CHAPTERS,
  JOURNEY_PROGRESS,
  type JourneyStep,
} from "@/features/homepage/components/experience/journey/journey-data";
import { JourneyRequest } from "@/features/homepage/components/experience/journey/journey-request";
import {
  AppSurface,
  BoardSurface,
  ReleaseSurface,
  TriageSurface,
} from "@/features/homepage/components/experience/journey/journey-surfaces";

const boardGridStyle = {
  "--journey-board-column": `${JOURNEY_BOARD_GRID.columnWidth}%`,
  "--journey-board-gap": `${JOURNEY_BOARD_GRID.gap}%`,
  "--journey-board-inset": `${JOURNEY_BOARD_GRID.inset}%`,
  "--journey-board-row": `${JOURNEY_BOARD_GRID.rowTop}%`,
};

export function JourneyScene({
  caption,
  progress,
  step,
}: {
  caption: string;
  progress: MotionValue<number>;
  step: JourneyStep;
}) {
  return (
    <figure className="journey-scene">
      <m.div className="journey-scene-body" style={boardGridStyle}>
        <JourneyChapterRail progress={progress} step={step} />
        <JourneyRequest progress={progress} step={step} />
      </m.div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function JourneyChapterRail({
  progress,
  step,
}: {
  progress: MotionValue<number>;
  step: JourneyStep;
}) {
  const x = useTransform(progress, JOURNEY_PROGRESS, JOURNEY_CHAPTER_OFFSETS);
  const railStyle = { x };
  return (
    <m.div
      aria-hidden="true"
      className="journey-chapter-rail"
      style={railStyle}
    >
      {JOURNEY_CHAPTERS.map((chapter) => (
        <div className="journey-surface" data-chapter={chapter} key={chapter}>
          <JourneyChapter chapter={chapter} step={step} />
        </div>
      ))}
    </m.div>
  );
}

function JourneyChapter({
  chapter,
  step,
}: {
  chapter: JourneyStep["chapter"];
  step: JourneyStep;
}) {
  if (chapter === "capture" || chapter === "notify") {
    return <AppSurface shipped={chapter === "notify"} />;
  }
  if (chapter === "ai") {
    return <TriageSurface />;
  }
  if (chapter === "release") {
    return <ReleaseSurface />;
  }
  if (chapter === "board") {
    return <BoardSurface step="board" />;
  }
  const built =
    step.id === "done" || step.id === "release" || step.id === "notify";
  return <BoardSurface step={built ? "done" : "planned"} />;
}
