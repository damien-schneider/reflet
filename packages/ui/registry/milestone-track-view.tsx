"use client";

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

export interface MilestoneTrackViewProps {
  className?: string;
  milestones: Milestone[];
}

export function MilestoneTrackView({
  milestones,
  className,
}: MilestoneTrackViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [shownId, setShownId] = useState<string | null>(null);
  const isPanelOpen = milestones.some((m) => m.id === activeId);
  const shownMilestone = milestones.find((m) => m.id === shownId);

  const toggleMilestone = (id: string) => {
    if (activeId === id) {
      setActiveId(null);
      return;
    }
    setActiveId(id);
    setShownId(id);
  };

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
                  aria-expanded={activeId === m.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-left text-xs focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
                    activeId === m.id
                      ? "ring-1 ring-ring"
                      : "hover:ring-1 hover:ring-border"
                  )}
                  key={m.id}
                  onClick={() => toggleMilestone(m.id)}
                  style={{ backgroundColor: `${m.colorHex}18` }}
                  type="button"
                >
                  <span aria-hidden>{m.emoji}</span>
                  <span className="truncate font-medium" title={m.name}>
                    {m.name}
                  </span>
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
          <div aria-hidden className="h-2 w-[2px] rounded-full bg-primary" />
          <span className="text-[10px] text-primary">Today</span>
        </div>
      </div>
      <div
        aria-hidden={!isPanelOpen}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          isPanelOpen
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        )}
        inert={!isPanelOpen}
      >
        <div className="min-h-0 overflow-hidden">
          {shownMilestone && (
            <div className="mt-2 rounded-lg border bg-card p-3 text-muted-foreground text-xs">
              {shownMilestone.name} — {shownMilestone.progress.completed} /{" "}
              {shownMilestone.progress.total} complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
