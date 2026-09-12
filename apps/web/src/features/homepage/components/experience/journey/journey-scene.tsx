"use client";

import { CircleDot, LockKeyhole } from "lucide-react";
import { type MotionValue, m, useTransform } from "motion/react";
import {
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

export function JourneyScene({
  progress,
  step,
}: {
  progress: MotionValue<number>;
  step: JourneyStep;
}) {
  const inApp = step.id === "capture" || step.id === "notify";

  return (
    <figure
      aria-label="Illustrative feedback journey"
      className="journey-scene"
      data-scene={step.id}
    >
      <JourneyWindowBar inApp={inApp} />
      <div className="journey-scene-body">
        <JourneyChapterRail progress={progress} step={step} />
        <JourneyRequest progress={progress} step={step} />
      </div>
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

function JourneyWindowBar({ inApp }: { inApp: boolean }) {
  return (
    <div className="journey-window-bar">
      <span className="journey-window-brand">
        <CircleDot aria-hidden="true" size={14} /> {inApp ? "Orbit" : "Reflet"}
      </span>
      <span className="journey-window-location">
        <LockKeyhole aria-hidden="true" size={10} />{" "}
        {inApp ? "orbit.app / workspace" : "reflet.app / orbit"}
      </span>
      <span>Product preview</span>
    </div>
  );
}
