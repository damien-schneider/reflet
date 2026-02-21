"use client";

import { CaretRight } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";

import type { TimeHorizon } from "@/lib/milestone-constants";
import { isTimeHorizon, TIME_HORIZON_CONFIG } from "@/lib/milestone-constants";
import { getTagColorValues } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

import { MilestoneExpandedPanel } from "../milestone-expanded-panel";
import { MilestoneFormPopover } from "../milestone-form-popover";
import type { MilestonesViewProps } from "../milestones-view";

function OverallProgressRing({ percentage }: { percentage: number }) {
  const size = 36;
  const strokeWidth = 3;
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
          stroke="var(--color-primary)"
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

export function DashboardTimelineView({
  organizationId,
  isAdmin,
  onFeedbackClick,
}: MilestonesViewProps) {
  const milestones = useQuery(api.milestones.list, { organizationId });
  const [activeMilestoneId, setActiveMilestoneId] =
    useState<Id<"milestones"> | null>(null);
  const [sweepId, setSweepId] = useState<Id<"milestones"> | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const totals = useMemo(() => {
    if (!milestones) {
      return { total: 0, completed: 0, inProgress: 0, percentage: 0 };
    }

    let total = 0;
    let completed = 0;
    let inProgress = 0;

    for (const milestone of milestones) {
      total += milestone.progress.total;
      completed += milestone.progress.completed;
      inProgress += milestone.progress.inProgress;
    }

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, percentage };
  }, [milestones]);

  const handleMilestoneClick = useCallback((milestoneId: Id<"milestones">) => {
    setSweepId(milestoneId);
    setTimeout(() => {
      setSweepId(null);
    }, 500);
    setActiveMilestoneId((prev) => (prev === milestoneId ? null : milestoneId));
  }, []);

  const handlePopoverOpenChange = useCallback((open: boolean) => {
    setPopoverOpen(open);
  }, []);

  if (milestones === undefined) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (milestones.length === 0 && !isAdmin) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-muted-foreground text-sm">
          No milestones have been created yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4">
      {/* KPI Header Bar */}
      <div className="flex items-center gap-4 rounded-xl bg-secondary p-3">
        <OverallProgressRing percentage={totals.percentage} />
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {totals.completed}/{totals.total} items
          </span>
          <div className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full bg-emerald-500"
              title={`${totals.completed} done`}
            />
            <span className="text-muted-foreground text-xs">
              {totals.completed} done
            </span>
          </div>
          {totals.inProgress > 0 && (
            <div className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full bg-primary"
                title={`${totals.inProgress} in progress`}
              />
              <span className="text-muted-foreground text-xs">
                {totals.inProgress} in progress
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="relative pl-6">
        {/* Left spine — centered under the 8px dots at -left-4 inside pl-6 */}
        <div className="absolute top-0 bottom-0 left-[11.5px] w-px bg-border" />

        {milestones.map((milestone) => {
          const colorValues = getTagColorValues(milestone.color);
          const colorHex = colorValues.text;
          const horizonLabel = isTimeHorizon(milestone.timeHorizon)
            ? TIME_HORIZON_CONFIG[milestone.timeHorizon as TimeHorizon]
                .shortLabel
            : milestone.timeHorizon;
          const isActive = activeMilestoneId === milestone._id;
          const isSweeping = sweepId === milestone._id;

          return (
            <div className="relative" key={milestone._id}>
              {/* Colored dot */}
              <div
                className="absolute top-3 -left-4 h-2 w-2 rounded-full border-2 border-background"
                style={{ backgroundColor: colorHex }}
              />

              {/* Milestone row button */}
              <button
                className={cn(
                  "relative w-full overflow-hidden rounded-lg px-3 py-2 text-left transition-colors",
                  isActive ? "bg-accent/50" : "hover:bg-accent/20"
                )}
                onClick={() => handleMilestoneClick(milestone._id)}
                type="button"
              >
                {/* Sweep animation overlay */}
                {isSweeping && (
                  <motion.div
                    animate={{ x: "100%" }}
                    className="pointer-events-none absolute inset-0"
                    initial={{ x: "-100%" }}
                    style={{ backgroundColor: colorHex, opacity: 0.12 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                )}

                <div className="flex items-center gap-2">
                  <CaretRight
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                      isActive && "rotate-90"
                    )}
                    weight="bold"
                  />

                  {milestone.emoji && (
                    <span className="shrink-0 text-sm">{milestone.emoji}</span>
                  )}

                  <span className="min-w-0 flex-1 truncate font-medium text-sm">
                    {milestone.name}
                  </span>

                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 font-medium text-[10px]"
                    style={{
                      backgroundColor: `${colorHex}18`,
                      color: colorHex,
                    }}
                  >
                    {horizonLabel}
                  </span>

                  <MultiSegmentBar
                    completed={milestone.progress.completed}
                    inProgress={milestone.progress.inProgress}
                    total={milestone.progress.total}
                  />

                  <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                    {milestone.progress.percentage}%
                  </span>

                  {milestone.targetDate && (
                    <span className="shrink-0 text-muted-foreground text-xs">
                      {new Date(milestone.targetDate).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </span>
                  )}
                </div>
              </button>

              {/* Accordion Expansion */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    animate={{ height: "auto", opacity: 1 }}
                    className="overflow-hidden"
                    exit={{ height: 0, opacity: 0 }}
                    initial={{ height: 0, opacity: 0 }}
                    key={`panel-${milestone._id}`}
                    transition={{
                      type: "spring",
                      damping: 25,
                      stiffness: 300,
                    }}
                  >
                    <div className="ml-6 rounded-lg border bg-card p-3">
                      <MilestoneExpandedPanel
                        isAdmin={isAdmin}
                        milestoneId={milestone._id}
                        onFeedbackClick={onFeedbackClick}
                        organizationId={organizationId}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Admin: add milestone */}
      {isAdmin && (
        <div className="pl-6">
          <MilestoneFormPopover
            defaultTimeHorizon="now"
            onCreated={() => setPopoverOpen(false)}
            onOpenChange={handlePopoverOpenChange}
            open={popoverOpen}
            organizationId={organizationId}
            showHorizonPicker
            triggerClassName="flex h-8 w-full items-center justify-center rounded-lg border border-dashed border-muted-foreground/20 text-sm text-muted-foreground/40 transition-colors hover:border-muted-foreground/40 hover:text-muted-foreground/60"
          />
        </div>
      )}
    </div>
  );
}
