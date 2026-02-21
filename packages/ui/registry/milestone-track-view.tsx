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

export interface MilestoneTrackViewProps {
  milestones: Milestone[];
  className?: string;
}

export function MilestoneTrackView({
  milestones,
  className,
}: MilestoneTrackViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Group milestones by horizonShort for the track view
  const zones = [
    {
      label: "Now",
      milestones: milestones.filter((m) => m.horizonShort === "Now"),
    },
    {
      label: "Next Quarter",
      milestones: milestones.filter((m) => m.horizonShort === "3mo"),
    },
    {
      label: "6 Months",
      milestones: milestones.filter((m) => m.horizonShort === "6mo"),
    },
  ];

  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-xl bg-secondary p-3">
        <div className="flex items-stretch gap-0.5">
          {zones.map((zone, i) => (
            <div
              className="flex flex-1 flex-col gap-0.5"
              key={zone.label}
              style={{ flexGrow: 1 + i * 0.12 }}
            >
              {zone.milestones.map((m) => (
                <button
                  className={cn(
                    "flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-left text-xs transition-all",
                    activeId === m.id
                      ? "ring-1 ring-ring"
                      : "hover:brightness-95"
                  )}
                  key={m.id}
                  onClick={() => setActiveId(activeId === m.id ? null : m.id)}
                  style={{ backgroundColor: `${m.colorHex}18` }}
                  type="button"
                >
                  <span>{m.emoji}</span>
                  <span className="truncate font-medium">{m.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-2 flex">
          {zones.map((zone) => (
            <div className="flex-1 text-center" key={zone.label}>
              <span className="text-[10px] text-muted-foreground">
                {zone.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-1">
          <div className="h-2 w-[2px] rounded-full bg-primary" />
          <span className="text-[9px] text-primary">Today</span>
        </div>
      </div>
      <AnimatePresence>
        {activeId && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="mt-2 rounded-lg border bg-card p-3 text-muted-foreground text-xs">
              {milestones.find((m) => m.id === activeId)?.name} —{" "}
              {milestones.find((m) => m.id === activeId)?.progress.completed ??
                0}{" "}
              / {milestones.find((m) => m.id === activeId)?.progress.total ?? 0}{" "}
              complete
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
