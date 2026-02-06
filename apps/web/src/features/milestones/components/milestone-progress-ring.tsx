"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useMemo } from "react";

import { cn } from "@/lib/utils";

interface MilestoneProgress {
  total: number;
  completed: number;
  inProgress: number;
  percentage: number;
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

  const segments = useMemo(() => {
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
  }, [total, completed, inProgress, planned, circumference]);

  const completedMotion = useMotionValue(0);
  const inProgressMotion = useMotionValue(0);
  const plannedMotion = useMotionValue(0);
  const percentageMotion = useMotionValue(0);

  const completedSpring = useSpring(completedMotion, {
    stiffness: 120,
    damping: 20,
  });
  const inProgressSpring = useSpring(inProgressMotion, {
    stiffness: 120,
    damping: 20,
  });
  const plannedSpring = useSpring(plannedMotion, {
    stiffness: 120,
    damping: 20,
  });
  const percentageSpring = useSpring(percentageMotion, {
    stiffness: 100,
    damping: 25,
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
    completedMotion.set(segments.completed);
    inProgressMotion.set(segments.inProgress);
    plannedMotion.set(segments.planned);
    percentageMotion.set(percentage);
  }, [
    segments,
    percentage,
    completedMotion,
    inProgressMotion,
    plannedMotion,
    percentageMotion,
  ]);

  const activeSegments = [
    completed > 0 && { key: "completed" as const },
    inProgress > 0 && { key: "inProgress" as const },
    planned > 0 && { key: "planned" as const },
  ].filter(Boolean) as { key: "completed" | "inProgress" | "planned" }[];

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
      key: "completed",
      visible: completed > 0,
      dashoffset: completedDashoffset,
      length: segments.completed,
      className: "stroke-emerald-500",
      rotation: computeRotation("completed"),
    },
    {
      key: "inProgress",
      visible: inProgress > 0,
      dashoffset: inProgressDashoffset,
      length: segments.inProgress,
      className: "stroke-primary",
      rotation: computeRotation("inProgress"),
    },
    {
      key: "planned",
      visible: planned > 0,
      dashoffset: plannedDashoffset,
      length: segments.planned,
      className: "stroke-muted-foreground/30",
      rotation: computeRotation("planned"),
    },
  ] as const;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        aria-label={`Milestone progress: ${percentage}%`}
        className={cn(
          "overflow-visible",
          isComplete && "drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]"
        )}
        height={size}
        role="img"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
      >
        {/* Background track */}
        <circle
          className="stroke-muted/40"
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          strokeWidth={STROKE_WIDTH}
        />

        {/* Animated segments */}
        {segmentConfigs.map(
          (segment) =>
            segment.visible && (
              <motion.circle
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
                  strokeDashoffset: segment.dashoffset,
                  rotate: `${segment.rotation}deg`,
                  transformOrigin: "center",
                }}
              />
            )
        )}
      </svg>

      {/* Center percentage text */}
      <motion.span
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center",
          "font-semibold tabular-nums leading-none",
          isComplete ? "text-emerald-500" : "text-foreground",
          size <= 36 ? "text-[9px]" : "text-[11px]"
        )}
      >
        <motion.span>{displayPercentage}</motion.span>
        <span className="text-[0.6em] opacity-60">%</span>
      </motion.span>

      {/* Completion pulse */}
      {isComplete && (
        <motion.div
          animate={{
            scale: [1, 1.8, 1],
            opacity: [0.6, 0, 0.6],
          }}
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-emerald-500"
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      )}
    </div>
  );
}
