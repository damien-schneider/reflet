"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export interface Milestone {
  id: string;
  name: string;
  emoji: string;
  colorHex: string;
  horizonLabel: string;
  horizonShort: string;
  targetDate: string | null;
  progress: {
    total: number;
    completed: number;
    inProgress: number;
    percentage: number;
  };
}

export interface MilestoneEditorialAccordionProps {
  milestones: Milestone[];
  className?: string;
}

function ProgressBar({
  percentage,
  color,
}: {
  percentage: number;
  color: string;
}) {
  return (
    <div className="h-[3px] w-24 overflow-hidden rounded-full bg-muted/40">
      <motion.div
        animate={{ width: `${percentage}%` }}
        className="h-full rounded-full"
        initial={{ width: 0 }}
        style={{ backgroundColor: color }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
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
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
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
        <motion.circle
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
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
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
    <div
      className={cn("w-full space-y-0 divide-y divide-border/40", className)}
    >
      {milestones.map((m) => {
        const isOpen = openId === m.id;
        return (
          <motion.div
            animate={{
              backgroundColor: isOpen ? `${m.colorHex}06` : "transparent",
            }}
            className="transition-colors"
            key={m.id}
          >
            <button
              className="flex w-full items-center gap-4 px-4 py-3 text-left"
              onClick={() => setOpenId(isOpen ? null : m.id)}
              type="button"
            >
              <div className="w-12 shrink-0 text-right">
                <span
                  className="font-mono text-base tabular-nums"
                  style={{ color: m.colorHex }}
                >
                  {m.progress.percentage}%
                </span>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="min-w-0 flex-1">
                <h4 className="font-serif text-sm">
                  {m.emoji} {m.name}
                </h4>
                <p className="font-serif text-[10px] text-muted-foreground italic">
                  {m.horizonLabel}
                  {m.targetDate ? ` \u00B7 Due ${m.targetDate}` : ""}
                </p>
              </div>
              <ProgressBar
                color={m.colorHex}
                percentage={m.progress.percentage}
              />
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                  <div className="flex gap-4 px-4 pb-3 pl-20">
                    <ProgressRing
                      color={m.colorHex}
                      percentage={m.progress.percentage}
                      size={40}
                    />
                    <div className="flex-1 text-muted-foreground text-xs">
                      <p className="font-serif italic">
                        {m.progress.completed} of {m.progress.total} complete,{" "}
                        {m.progress.inProgress} underway
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
