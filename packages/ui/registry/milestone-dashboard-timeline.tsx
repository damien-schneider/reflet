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

export interface MilestoneDashboardTimelineProps {
  milestones: Milestone[];
  className?: string;
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
  const completedPct = (completed / Math.max(total, 1)) * 100;
  const inProgressPct = (inProgress / Math.max(total, 1)) * 100;
  return (
    <div className="flex h-[3px] w-20 overflow-hidden rounded-full bg-muted/30">
      <motion.div
        animate={{ width: `${completedPct}%` }}
        className="h-full bg-emerald-500"
        initial={{ width: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
      />
      <motion.div
        animate={{ width: `${inProgressPct}%` }}
        className="h-full bg-primary"
        initial={{ width: 0 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 30,
          delay: 0.05,
        }}
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

export function MilestoneDashboardTimeline({
  milestones,
  className,
}: MilestoneDashboardTimelineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sweepId, setSweepId] = useState<string | null>(null);

  const totalItems = milestones.reduce((s, m) => s + m.progress.total, 0);
  const totalCompleted = milestones.reduce(
    (s, m) => s + m.progress.completed,
    0
  );
  const totalInProgress = milestones.reduce(
    (s, m) => s + m.progress.inProgress,
    0
  );
  const overallPct = Math.round(
    (totalCompleted / Math.max(totalItems, 1)) * 100
  );

  const handleClick = (id: string) => {
    setSweepId(id);
    setActiveId((prev) => (prev === id ? null : id));
    setTimeout(() => setSweepId(null), 500);
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* KPI bar */}
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
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">{totalCompleted} done</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">{totalInProgress} WIP</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-5">
        <div className="absolute top-0 bottom-0 left-[11.5px] w-px bg-border" />
        {milestones.map((m) => {
          const isActive = activeId === m.id;
          const isSweeping = sweepId === m.id;
          return (
            <div className="relative mb-1 last:mb-0" key={m.id}>
              <div
                className="absolute top-2.5 -left-3 h-2 w-2 rounded-full border-2 border-background"
                style={{ backgroundColor: m.colorHex }}
              />
              <button
                className={cn(
                  "relative w-full overflow-hidden rounded-lg p-2 text-left transition-all",
                  isActive ? "bg-accent/50" : "hover:bg-accent/20"
                )}
                onClick={() => handleClick(m.id)}
                type="button"
              >
                <AnimatePresence>
                  {isSweeping && (
                    <motion.div
                      animate={{ x: "100%", opacity: 0 }}
                      className="absolute inset-0"
                      exit={{ opacity: 0 }}
                      initial={{ x: "-100%", opacity: 0.12 }}
                      style={{ backgroundColor: m.colorHex }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  )}
                </AnimatePresence>
                <div className="relative z-10 flex items-center gap-2">
                  <span className="text-xs">{m.emoji}</span>
                  <span className="flex-1 truncate font-medium text-xs">
                    {m.name}
                  </span>
                  <span className="rounded bg-muted px-1 py-0.5 text-[9px]">
                    {m.horizonShort}
                  </span>
                  <MultiSegmentBar
                    completed={m.progress.completed}
                    inProgress={m.progress.inProgress}
                    total={m.progress.total}
                  />
                  <span
                    className="w-6 text-right font-mono text-[10px] tabular-nums"
                    style={{ color: m.colorHex }}
                  >
                    {m.progress.percentage}%
                  </span>
                </div>
              </button>
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    transition={{
                      type: "spring",
                      damping: 25,
                      stiffness: 300,
                    }}
                  >
                    <div className="mt-1 ml-5 rounded-lg border bg-card p-2 text-muted-foreground text-xs">
                      {m.progress.completed}/{m.progress.total} done &middot;{" "}
                      {m.progress.inProgress} in progress
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
