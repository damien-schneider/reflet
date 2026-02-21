"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import type { TimeHorizon } from "@/lib/milestone-constants";
import {
  isTimeHorizon,
  TIME_HORIZON_CONFIG,
  TIME_HORIZONS,
} from "@/lib/milestone-constants";

import { MilestoneExpandedPanel } from "../milestone-expanded-panel";
import { MilestoneFormPopover } from "../milestone-form-popover";
import { MilestoneSegment } from "../milestone-segment";
import type { MilestonesViewProps } from "../milestones-view";

interface SafariGestureEvent extends Event {
  scale: number;
}

function isSafariGestureEvent(event: Event): event is SafariGestureEvent {
  return "scale" in event;
}

const MIN_ZONE_WIDTH = 80;
const MAX_ZONE_WIDTH = 500;
const DEFAULT_ZONE_WIDTH = 160;
const ZOOM_SENSITIVITY = 0.5;
const ZONE_GROWTH_FACTOR = 1.12;

function getZoneFlexGrow(index: number): number {
  return Math.round(100 * ZONE_GROWTH_FACTOR ** index) / 100;
}

export function TrackView({
  organizationId,
  isAdmin,
  onFeedbackClick,
}: MilestonesViewProps) {
  const milestones = useQuery(api.milestones.list, { organizationId });
  const isMobile = useIsMobile();
  const [activeMilestoneId, setActiveMilestoneId] =
    useState<Id<"milestones"> | null>(null);
  const [popoverOpenHorizon, setPopoverOpenHorizon] =
    useState<TimeHorizon | null>(null);
  const [zoneMinWidth, setZoneMinWidth] = useState(DEFAULT_ZONE_WIDTH);
  const trackRef = useRef<HTMLDivElement>(null);
  const lastGestureScaleRef = useRef(1);

  const hasMilestones = (milestones?.length ?? 0) > 0;

  useEffect(() => {
    if (!hasMilestones) {
      return;
    }

    const wrapper = trackRef.current;
    if (!wrapper) {
      return;
    }

    const viewport = wrapper.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    const el = viewport ?? wrapper;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) {
        return;
      }
      e.preventDefault();
      setZoneMinWidth((prev) => {
        const delta = -e.deltaY * ZOOM_SENSITIVITY;
        return Math.min(MAX_ZONE_WIDTH, Math.max(MIN_ZONE_WIDTH, prev + delta));
      });
    };

    const handleGestureStart = (e: Event) => {
      e.preventDefault();
      lastGestureScaleRef.current = 1;
    };

    const handleGestureChange = (e: Event) => {
      e.preventDefault();
      if (!isSafariGestureEvent(e)) {
        return;
      }
      const scaleDelta = e.scale / lastGestureScaleRef.current;
      lastGestureScaleRef.current = e.scale;
      setZoneMinWidth((prev) =>
        Math.min(MAX_ZONE_WIDTH, Math.max(MIN_ZONE_WIDTH, prev * scaleDelta))
      );
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("gesturestart", handleGestureStart, {
      passive: false,
    });
    el.addEventListener("gesturechange", handleGestureChange, {
      passive: false,
    });

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("gesturestart", handleGestureStart);
      el.removeEventListener("gesturechange", handleGestureChange);
    };
  }, [hasMilestones]);

  const handleMilestoneClick = useCallback((milestoneId: Id<"milestones">) => {
    setActiveMilestoneId((prev) => (prev === milestoneId ? null : milestoneId));
  }, []);

  const handlePopoverOpenChange = useCallback(
    (horizon: TimeHorizon, open: boolean) => {
      setPopoverOpenHorizon(open ? horizon : null);
    },
    []
  );

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

  const activeHorizons = useMemo(() => {
    if (isAdmin) {
      return [...TIME_HORIZONS];
    }
    return TIME_HORIZONS.filter((h) => {
      const group = groupedMilestones.get(h);
      return group && group.length > 0;
    });
  }, [groupedMilestones, isAdmin]);

  if (milestones === undefined) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4">
      {/* Desktop: horizontal track with pinch-to-zoom */}
      <div className="hidden md:block">
        <ScrollArea
          className="rounded-xl bg-secondary"
          classNameViewport="px-4"
          direction="horizontal"
          ref={trackRef}
        >
          <div className="py-2">
            <div className="flex w-full items-stretch gap-0.5 p-0.5">
              {activeHorizons.map((horizon, zoneIndex) => {
                const zoneMilestones = groupedMilestones.get(horizon) ?? [];
                const isEmpty = zoneMilestones.length === 0;

                return (
                  <div
                    className="relative flex items-stretch gap-0.5"
                    key={horizon}
                    style={{
                      flexGrow: getZoneFlexGrow(zoneIndex),
                      minWidth: zoneMinWidth,
                    }}
                  >
                    {zoneMilestones.length > 0 && (
                      <div className="flex flex-1 flex-col gap-0.5">
                        {zoneMilestones.map((milestone) => (
                          <MilestoneSegment
                            isActive={activeMilestoneId === milestone._id}
                            isAdmin={isAdmin}
                            key={milestone._id}
                            milestone={milestone}
                            onClick={() => handleMilestoneClick(milestone._id)}
                          />
                        ))}
                      </div>
                    )}

                    {isAdmin && !isEmpty && !isMobile && (
                      <MilestoneFormPopover
                        defaultTimeHorizon={horizon}
                        onCreated={() => setPopoverOpenHorizon(null)}
                        onOpenChange={(open) =>
                          handlePopoverOpenChange(horizon, open)
                        }
                        open={popoverOpenHorizon === horizon}
                        organizationId={organizationId}
                        triggerClassName="flex w-8 shrink-0 items-center justify-center self-stretch rounded-sm text-sm text-muted-foreground/30 transition-colors hover:bg-muted-foreground/10 hover:text-muted-foreground/60"
                      />
                    )}

                    {isEmpty && (
                      <div className="flex flex-1">
                        {isAdmin && !isMobile ? (
                          <MilestoneFormPopover
                            defaultTimeHorizon={horizon}
                            onCreated={() => setPopoverOpenHorizon(null)}
                            onOpenChange={(open) =>
                              handlePopoverOpenChange(horizon, open)
                            }
                            open={popoverOpenHorizon === horizon}
                            organizationId={organizationId}
                            triggerClassName="flex h-10 w-full items-center justify-center rounded-sm border border-muted-foreground/20 border-dashed text-lg text-muted-foreground/40 transition-colors hover:border-muted-foreground/40 hover:text-muted-foreground/60"
                          />
                        ) : (
                          <div className="h-10 w-full rounded-sm bg-muted/20" />
                        )}
                      </div>
                    )}

                    {zoneIndex < activeHorizons.length - 1 && (
                      <div className="w-[1px] shrink-0 self-stretch bg-border/30" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex w-full">
              {activeHorizons.map((horizon, zoneIndex) => (
                <div
                  className="text-center"
                  key={horizon}
                  style={{
                    flexGrow: getZoneFlexGrow(zoneIndex),
                    minWidth: zoneMinWidth,
                  }}
                >
                  <span className="text-[11px] text-muted-foreground">
                    {TIME_HORIZON_CONFIG[horizon].label}
                  </span>
                </div>
              ))}
            </div>

            <div className="relative mt-1">
              <div className="flex items-center gap-1">
                <div className="h-2 w-[2px] rounded-full bg-primary" />
                <span className="text-[10px] text-primary">Today</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Mobile: vertical stacked layout */}
      <div className="block px-4 md:hidden">
        {activeHorizons.map((horizon) => {
          const zoneMilestones = groupedMilestones.get(horizon) ?? [];

          return (
            <div className="mb-6" key={horizon}>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  {TIME_HORIZON_CONFIG[horizon].label}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-1">
                {zoneMilestones.map((milestone) => (
                  <div key={milestone._id}>
                    <MilestoneSegment
                      isActive={activeMilestoneId === milestone._id}
                      isAdmin={isAdmin}
                      milestone={milestone}
                      onClick={() => handleMilestoneClick(milestone._id)}
                    />
                    <AnimatePresence>
                      {activeMilestoneId === milestone._id && (
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
                          <div className="pt-2">
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
                ))}

                {zoneMilestones.length === 0 && isAdmin && isMobile && (
                  <MilestoneFormPopover
                    defaultTimeHorizon={horizon}
                    onCreated={() => setPopoverOpenHorizon(null)}
                    onOpenChange={(open) =>
                      handlePopoverOpenChange(horizon, open)
                    }
                    open={popoverOpenHorizon === horizon}
                    organizationId={organizationId}
                    triggerClassName="flex h-10 w-full items-center justify-center rounded-sm border border-muted-foreground/20 border-dashed text-lg text-muted-foreground/40 transition-colors hover:border-muted-foreground/40 hover:text-muted-foreground/60"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: expanded panel below track */}
      <div className="mx-auto max-w-3xl">
        <AnimatePresence>
          {activeMilestoneId && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              key={activeMilestoneId}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="pt-2">
                <MilestoneExpandedPanel
                  isAdmin={isAdmin}
                  milestoneId={activeMilestoneId}
                  onFeedbackClick={onFeedbackClick}
                  organizationId={organizationId}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
