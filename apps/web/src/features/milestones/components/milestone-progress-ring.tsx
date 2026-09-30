"use client";

import {
  domAnimation,
  LazyMotion,
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

interface MilestoneProgress {
  completed: number;
  inProgress: number;
  percentage: number;
  total: number;
}

interface MilestoneProgressRingProps {
  progress: MilestoneProgress;
  size?: number;
}

const STROKE_WIDTH = 3;
const GAP_DEGREES = 4;

export function MilestoneProgressRing({
  progress,
  size = 48,
}: MilestoneProgressRingProps) {
  const { total, completed, inProgress, percentage } = progress;

  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const isComplete = percentage === 100;
  const planned = total - completed - inProgress;

  const segments = (() => {
    if (total === 0) {
      return { completed: 0, inProgress: 0, planned: circumference };
    }

    const segmentCount = [completed, inProgress, planned].filter(
      (v) => v > 0
    ).length;
    const totalGapDegrees = segmentCount > 1 ? segmentCount * GAP_DEGREES : 0;
    const availableDegrees = 360 - totalGapDegrees;
    const degreesPerItem = availableDegrees / total;

    return {
      completed: (completed * degreesPerItem * circumference) / 360,
      inProgress: (inProgress * degreesPerItem * circumference) / 360,
      planned: (planned * degreesPerItem * circumference) / 360,
    };
  })();

  const completedMotion = useMotionValue(0);
  const inProgressMotion = useMotionValue(0);
  const plannedMotion = useMotionValue(0);
  const percentageMotion = useMotionValue(0);
  const shouldReduceMotion = useReducedMotion();

  const completedSpring = useSpring(completedMotion, {
    damping: 20,
    stiffness: 120,
  });
  const inProgressSpring = useSpring(inProgressMotion, {
    damping: 20,
    stiffness: 120,
  });
  const plannedSpring = useSpring(plannedMotion, {
    damping: 20,
    stiffness: 120,
  });
  const percentageSpring = useSpring(percentageMotion, {
    damping: 25,
    stiffness: 100,
  });

  const completedDashoffset = useTransform(
    completedSpring,
    (v: number) => circumference - v
  );
  const inProgressDashoffset = useTransform(
    inProgressSpring,
    (v: number) => circumference - v
  );
  const plannedDashoffset = useTransform(
    plannedSpring,
    (v: number) => circumference - v
  );
  const displayPercentage = useTransform(percentageSpring, (v: number) =>
    Math.round(v)
  );

  useEffect(() => {
    const targets = [
      [completedMotion, completedSpring, segments.completed],
      [inProgressMotion, inProgressSpring, segments.inProgress],
      [plannedMotion, plannedSpring, segments.planned],
      [percentageMotion, percentageSpring, percentage],
    ] as const;
    for (const [source, spring, value] of targets) {
      source.set(value);
      if (shouldReduceMotion) {
        spring.jump(value);
      }
    }
  }, [
    shouldReduceMotion,
    completedSpring,
    inProgressSpring,
    plannedSpring,
    percentageSpring,
    segments,
    percentage,
    completedMotion,
    inProgressMotion,
    plannedMotion,
    percentageMotion,
  ]);

  const activeSegments = (["completed", "inProgress", "planned"] as const)
    .filter((key) => ({ completed, inProgress, planned })[key] > 0)
    .map((key) => ({ key }));

  const computeRotation = (
    segmentKey: "completed" | "inProgress" | "planned"
  ): number => {
    let offsetDegrees = -90;
    for (const seg of activeSegments) {
      if (seg.key === segmentKey) {
        return offsetDegrees;
      }
      const segmentLengths: Record<string, number> = {
        completed: segments.completed,
        inProgress: segments.inProgress,
        planned: segments.planned,
      };
      const segValue = segmentLengths[seg.key] ?? 0;
      offsetDegrees += (segValue / circumference) * 360 + GAP_DEGREES;
    }
    return offsetDegrees;
  };

  const segmentConfigs = [
    {
      className: "stroke-success",
      dashoffset: completedDashoffset,
      key: "completed",
      length: segments.completed,
      rotation: computeRotation("completed"),
      visible: completed > 0,
    },
    {
      className: "stroke-primary",
      dashoffset: inProgressDashoffset,
      key: "inProgress",
      length: segments.inProgress,
      rotation: computeRotation("inProgress"),
      visible: inProgress > 0,
    },
    {
      className: "stroke-muted-foreground/30",
      dashoffset: plannedDashoffset,
      key: "planned",
      length: segments.planned,
      rotation: computeRotation("planned"),
      visible: planned > 0,
    },
  ] as const;

  return (
    <LazyMotion features={domAnimation}>
      <div
        className="relative inline-flex items-center justify-center"
        style={{ height: size, width: size }}
      >
        <svg
          aria-label={`Milestone progress: ${percentage}%`}
          className="overflow-visible"
          height={size}
          role="img"
          viewBox={`0 0 ${size} ${size}`}
          width={size}
        >
          <circle
            className="stroke-muted/40"
            cx={center}
            cy={center}
            fill="none"
            r={radius}
            strokeWidth={STROKE_WIDTH}
          />

          {segmentConfigs.map(
            (segment) =>
              segment.visible && (
                <m.circle
                  className={segment.className}
                  cx={center}
                  cy={center}
                  fill="none"
                  key={segment.key}
                  r={radius}
                  strokeDasharray={`${segment.length} ${circumference}`}
                  strokeLinecap="round"
                  strokeWidth={STROKE_WIDTH}
                  style={{
                    rotate: `${segment.rotation}deg`,
                    strokeDashoffset: segment.dashoffset,
                    transformOrigin: "center",
                  }}
                />
              )
          )}
        </svg>

        <m.span
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center",
            "font-semibold tabular-nums leading-none",
            isComplete ? "text-success-text" : "text-foreground",
            size <= 36 ? "text-micro" : "text-caption"
          )}
        >
          <m.span>{displayPercentage}</m.span>
          <span className="text-[0.6em] opacity-60">%</span>
        </m.span>
      </div>
    </LazyMotion>
  );
}
