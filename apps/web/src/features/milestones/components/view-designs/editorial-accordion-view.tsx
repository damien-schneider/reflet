"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";

import type { TimeHorizon } from "@/lib/milestone-constants";
import {
  isTimeHorizon,
  TIME_HORIZON_CONFIG,
  TIME_HORIZONS,
} from "@/lib/milestone-constants";
import { getTagColorValues } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

import { MilestoneExpandedPanel } from "../milestone-expanded-panel";
import { MilestoneFormPopover } from "../milestone-form-popover";
import type { MilestonesViewProps } from "../milestones-view";

function ProgressBar({
  color,
  percentage,
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

export function EditorialAccordionView({
  organizationId,
  isAdmin,
  onFeedbackClick,
}: MilestonesViewProps) {
  const milestones = useQuery(api.milestones.list, { organizationId });
  const [expandedId, setExpandedId] = useState<Id<"milestones"> | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleToggle = useCallback((milestoneId: Id<"milestones">) => {
    setExpandedId((prev) => (prev === milestoneId ? null : milestoneId));
  }, []);

  const handlePopoverOpenChange = useCallback((open: boolean) => {
    setPopoverOpen(open);
  }, []);

  const groupedMilestones = useMemo(() => {
    const groups = new Map<TimeHorizon, NonNullable<typeof milestones>>();
    for (const horizon of TIME_HORIZONS) {
      groups.set(horizon, []);
    }
    if (milestones) {
      for (const milestone of milestones) {
        if (!isTimeHorizon(milestone.timeHorizon)) {
          continue;
        }
        const group = groups.get(milestone.timeHorizon);
        if (group) {
          group.push(milestone);
        }
      }
    }
    return groups;
  }, [milestones]);

  const allMilestonesSorted = useMemo(() => {
    const result: NonNullable<typeof milestones> = [];
    for (const horizon of TIME_HORIZONS) {
      const group = groupedMilestones.get(horizon);
      if (group) {
        for (const milestone of group) {
          result.push(milestone);
        }
      }
    }
    return result;
  }, [groupedMilestones]);

  if (milestones === undefined) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (allMilestonesSorted.length === 0 && !isAdmin) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-muted-foreground text-sm">
          No milestones have been created yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="divide-y divide-border/40">
        {allMilestonesSorted.map((milestone) => {
          const colorValues = getTagColorValues(milestone.color);
          const colorHex = colorValues.text;
          const isExpanded = expandedId === milestone._id;
          const horizonLabel = isTimeHorizon(milestone.timeHorizon)
            ? TIME_HORIZON_CONFIG[milestone.timeHorizon].label
            : milestone.timeHorizon;
          const formattedDate = milestone.targetDate
            ? new Date(milestone.targetDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : null;

          return (
            <motion.div
              animate={{
                backgroundColor: isExpanded ? `${colorHex}06` : "transparent",
              }}
              key={milestone._id}
              transition={{ duration: 0.2 }}
            >
              <button
                className={cn(
                  "flex w-full items-center gap-4 px-3 py-4 text-left transition-colors hover:bg-accent/30"
                )}
                onClick={() => handleToggle(milestone._id)}
                type="button"
              >
                {/* Percentage */}
                <span
                  className="w-16 shrink-0 text-right font-mono text-sm"
                  style={{ color: colorHex }}
                >
                  {milestone.progress.percentage}%
                </span>

                {/* Vertical separator */}
                <div className="h-8 w-px shrink-0 bg-border" />

                {/* Title + meta */}
                <div className="min-w-0 flex-1">
                  <div className="font-serif text-base">
                    {milestone.emoji && (
                      <span className="mr-1.5">{milestone.emoji}</span>
                    )}
                    <span>{milestone.name}</span>
                  </div>
                  <div className="font-serif text-[11px] text-muted-foreground italic">
                    {horizonLabel}
                    {formattedDate && ` \u00B7 ${formattedDate}`}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="shrink-0">
                  <ProgressBar
                    color={colorHex}
                    percentage={milestone.progress.percentage}
                  />
                </div>
              </button>

              {/* Expanded panel */}
              <AnimatePresence>
                {isExpanded && (
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
                    <div className="px-3 pb-4">
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
            </motion.div>
          );
        })}
      </div>

      {/* Admin: add milestone */}
      {isAdmin && (
        <div className="mt-4 flex justify-center">
          <MilestoneFormPopover
            defaultTimeHorizon="now"
            onCreated={() => setPopoverOpen(false)}
            onOpenChange={handlePopoverOpenChange}
            open={popoverOpen}
            organizationId={organizationId}
            showHorizonPicker
            triggerClassName="flex h-10 items-center justify-center rounded-md border border-dashed border-muted-foreground/20 px-6 text-sm text-muted-foreground/40 transition-colors hover:border-muted-foreground/40 hover:text-muted-foreground/60"
          />
        </div>
      )}
    </div>
  );
}
