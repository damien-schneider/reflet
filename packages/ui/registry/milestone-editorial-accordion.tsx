"use client";

import {
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

export interface MilestoneEditorialAccordionProps {
  className?: string;
  milestones: Milestone[];
}

function ProgressBar({
  percentage,
  color,
}: {
  percentage: number;
  color: string;
}) {
  return (
    <div
      aria-hidden
      className="h-[3px] w-24 overflow-hidden rounded-full bg-muted/40"
    >
      <m.div
        animate={{ scaleX: percentage / 100 }}
        className="h-full w-full origin-left rounded-full"
        initial={false}
        style={{ backgroundColor: color }}
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
  isRevealed,
}: {
  percentage: number;
  isRevealed: boolean;
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
          animate={{ strokeDashoffset: isRevealed ? offset : circumference }}
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

export function MilestoneEditorialAccordion({
  milestones,
  className,
}: MilestoneEditorialAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div
          className={cn(
            "w-full space-y-0 divide-y divide-border/40",
            className
          )}
        >
          {milestones.map((milestone) => {
            const isOpen = openId === milestone.id;
            return (
              <m.div
                animate={{
                  backgroundColor: isOpen
                    ? `${milestone.colorHex}06`
                    : `${milestone.colorHex}00`,
                }}
                key={milestone.id}
              >
                <button
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2"
                  onClick={() => setOpenId(isOpen ? null : milestone.id)}
                  type="button"
                >
                  <div className="w-12 shrink-0 text-right">
                    <span
                      className="font-mono text-base tabular-nums"
                      style={{ color: milestone.colorHex }}
                    >
                      {milestone.progress.percentage}%
                    </span>
                  </div>
                  <div aria-hidden className="h-6 w-px bg-border" />
                  <div className="min-w-0 flex-1">
                    <span className="block font-serif text-sm">
                      <span aria-hidden>{milestone.emoji}</span>{" "}
                      {milestone.name}
                    </span>
                    <span className="block font-serif text-[10px] text-muted-foreground italic">
                      {milestone.horizonLabel}
                      {milestone.targetDate
                        ? ` \u00B7 Due ${milestone.targetDate}`
                        : ""}
                    </span>
                  </div>
                  <ProgressBar
                    color={milestone.colorHex}
                    percentage={milestone.progress.percentage}
                  />
                </button>
                <div
                  aria-hidden={!isOpen}
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  )}
                  inert={!isOpen}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="flex gap-4 px-4 pb-3 pl-20">
                      <ProgressRing
                        color={milestone.colorHex}
                        isRevealed={isOpen}
                        percentage={milestone.progress.percentage}
                        size={40}
                      />
                      <div className="flex-1 text-muted-foreground text-xs">
                        <p className="font-serif italic">
                          {milestone.progress.completed} of{" "}
                          {milestone.progress.total} complete,{" "}
                          {milestone.progress.inProgress} underway
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </m.div>
            );
          })}
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
