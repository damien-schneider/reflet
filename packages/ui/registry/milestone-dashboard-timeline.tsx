"use client";

import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  MotionConfig,
  m,
  useReducedMotion,
} from "motion/react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export interface Milestone {
  colorHex: string;
  emoji: string;
  horizonLabel: string;
  horizonShort: string;
  id: string;
  name: string;
  progress: {
    total: number;
    completed: number;
    inProgress: number;
    percentage: number;
  };
  targetDate: string | null;
}

export interface MilestoneDashboardTimelineProps {
  className?: string;
  milestones: Milestone[];
}

function MultiSegmentBar({
  completed,
  inProgress,
  total,
}: {
  completed: number;
  inProgress: number;
  total: number;
}) {
  const safeTotal = Math.max(total, 1);
  const completedRatio = completed / safeTotal;
  const startedRatio = (completed + inProgress) / safeTotal;
  return (
    <div
      aria-hidden
      className="relative h-[3px] w-20 overflow-hidden rounded-full bg-muted/30"
    >
      <m.div
        animate={{ scaleX: startedRatio }}
        className="absolute inset-0 origin-left bg-primary"
        initial={false}
        transition={{ damping: 30, stiffness: 200, type: "spring" }}
      />
      <m.div
        animate={{ scaleX: completedRatio }}
        className="absolute inset-0 origin-left bg-chart-1"
        initial={false}
        transition={{ damping: 30, stiffness: 200, type: "spring" }}
      />
    </div>
  );
}

function ProgressRing({
  percentage,
  size = 36,
  strokeWidth = 3,
  color,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const reduceMotion = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ height: size, width: size }}
    >
      <svg
        aria-hidden="true"
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        width={size}
      >
        <circle
          className="stroke-muted/30"
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          strokeWidth={strokeWidth}
        />
        <m.circle
          animate={{ strokeDashoffset: offset }}
          cx={center}
          cy={center}
          fill="none"
          initial={{ strokeDashoffset: circumference }}
          r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          style={{ rotate: "-90deg", transformOrigin: "center" }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { damping: 20, stiffness: 120, type: "spring" }
          }
        />
      </svg>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-semibold text-[10px] tabular-nums">
        {percentage}%
      </span>
    </div>
  );
}

export function MilestoneDashboardTimeline({
  milestones,
  className,
}: MilestoneDashboardTimelineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sweepId, setSweepId] = useState<string | null>(null);

  const totalItems = milestones.reduce(
    (sum, milestone) => sum + milestone.progress.total,
    0
  );
  const totalCompleted = milestones.reduce(
    (sum, milestone) => sum + milestone.progress.completed,
    0
  );
  const totalInProgress = milestones.reduce(
    (sum, milestone) => sum + milestone.progress.inProgress,
    0
  );
  const overallPct = Math.round(
    (totalCompleted / Math.max(totalItems, 1)) * 100
  );

  const handleClick = (id: string) => {
    setSweepId(id);
    setActiveId((prev) => (prev === id ? null : id));
  };

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div className={cn("w-full space-y-3", className)}>
          <div className="flex items-center gap-3 rounded-xl bg-secondary p-2.5">
            <ProgressRing
              color="var(--color-primary)"
              percentage={overallPct}
              size={32}
              strokeWidth={2.5}
            />
            <div className="flex flex-1 items-center gap-4 text-[11px]">
              <div>
                <span className="font-bold text-sm tabular-nums">
                  {totalCompleted}
                </span>
                <span className="text-muted-foreground">/{totalItems}</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-chart-1"
                />
                <span className="text-muted-foreground">
                  {totalCompleted} done
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                />
                <span className="text-muted-foreground">
                  {totalInProgress} in progress
                </span>
              </div>
            </div>
          </div>

          <div className="relative pl-5">
            <div
              aria-hidden
              className="absolute top-0 bottom-0 left-[11.5px] w-px bg-border"
            />
            {milestones.map((milestone) => {
              const isActive = activeId === milestone.id;
              const isSweeping = sweepId === milestone.id;
              return (
                <div className="relative mb-1 last:mb-0" key={milestone.id}>
                  <div
                    aria-hidden
                    className="absolute top-2.5 -left-3 h-2 w-2 rounded-full border-2 border-background"
                    style={{ backgroundColor: milestone.colorHex }}
                  />
                  <button
                    aria-expanded={isActive}
                    className={cn(
                      "relative w-full overflow-hidden rounded-lg p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1",
                      isActive ? "bg-accent/50" : "hover:bg-accent/20"
                    )}
                    onClick={() => handleClick(milestone.id)}
                    type="button"
                  >
                    <AnimatePresence>
                      {isSweeping && (
                        <m.div
                          animate={{ opacity: 0, x: "100%" }}
                          aria-hidden
                          className="absolute inset-0"
                          exit={{ opacity: 0 }}
                          initial={{ opacity: 0.12, x: "-100%" }}
                          onAnimationComplete={() =>
                            setSweepId((current) =>
                              current === milestone.id ? null : current
                            )
                          }
                          style={{ backgroundColor: milestone.colorHex }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                      )}
                    </AnimatePresence>
                    <div className="relative z-10 flex items-center gap-2">
                      <span aria-hidden className="text-xs">
                        {milestone.emoji}
                      </span>
                      <span
                        className="flex-1 truncate font-medium text-xs"
                        title={milestone.name}
                      >
                        {milestone.name}
                      </span>
                      <span className="rounded bg-muted px-1 py-0.5 text-[10px]">
                        {milestone.horizonShort}
                      </span>
                      <MultiSegmentBar
                        completed={milestone.progress.completed}
                        inProgress={milestone.progress.inProgress}
                        total={milestone.progress.total}
                      />
                      <span
                        className="w-6 text-right font-mono text-[10px] tabular-nums"
                        style={{ color: milestone.colorHex }}
                      >
                        {milestone.progress.percentage}%
                      </span>
                    </div>
                  </button>
                  <div
                    aria-hidden={!isActive}
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
                      isActive
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    )}
                    inert={!isActive}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="mt-1 ml-5 rounded-lg border bg-card p-2 text-muted-foreground text-xs">
                        {milestone.progress.completed}/
                        {milestone.progress.total} done &middot;{" "}
                        {milestone.progress.inProgress} in progress
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
