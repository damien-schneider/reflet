"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import type { TimeHorizon } from "@/lib/milestone-constants";
import { TIME_HORIZON_CONFIG, TIME_HORIZONS } from "@/lib/milestone-constants";

import { MilestoneExpandedPanel } from "./milestone-expanded-panel";
import { MilestoneFormPopover } from "./milestone-form-popover";
import { MilestoneSegment } from "./milestone-segment";

export interface MilestonesViewProps {
  organizationId: Id<"organizations">;
  isAdmin: boolean;
  onFeedbackClick: (feedbackId: string) => void;
}

// Zoom: continuous value controlled by trackpad pinch
const MIN_ZONE_WIDTH = 80;
const MAX_ZONE_WIDTH = 500;
const DEFAULT_ZONE_WIDTH = 160;
const ZOOM_SENSITIVITY = 0.5;
const ZONE_GROWTH_FACTOR = 1.12;

function getZoneFlexGrow(index: number): number {
  return Math.round(100 * ZONE_GROWTH_FACTOR ** index) / 100;
}

export function MilestonesView({
  organizationId,
  isAdmin,
  onFeedbackClick,
}: MilestonesViewProps) {
  const milestones = useQuery(api.milestones.list, { organizationId });
  const isMobile = useIsMobile();
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(
    null
  );
  const [popoverOpenHorizon, setPopoverOpenHorizon] =
    useState<TimeHorizon | null>(null);
  const [zoneMinWidth, setZoneMinWidth] = useState(DEFAULT_ZONE_WIDTH);
  const trackRef = useRef<HTMLDivElement>(null);
  const lastGestureScaleRef = useRef(1);

  // Re-run effect when the track mounts (milestones load after initial render)
  const hasMilestones = (milestones?.length ?? 0) > 0;

  // Pinch-to-zoom via trackpad:
  // - Chrome/Firefox: ctrlKey + wheel events
  // - Safari: native gesturestart/gesturechange events
  // Listen on the scroll viewport directly so preventDefault() fires before
  // the browser processes the scroll event on the scrollable element.
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

    // Safari fires native gesture events for trackpad pinch
    const handleGestureStart = (e: Event) => {
      e.preventDefault();
      lastGestureScaleRef.current = 1;
    };

    const handleGestureChange = (e: Event) => {
      e.preventDefault();
      const gestureScale = (e as unknown as { scale: number }).scale;
      const scaleDelta = gestureScale / lastGestureScaleRef.current;
      lastGestureScaleRef.current = gestureScale;
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

  const handleMilestoneClick = useCallback((milestoneId: string) => {
    setActiveMilestoneId((prev) => (prev === milestoneId ? null : milestoneId));
  }, []);

  const handlePopoverOpenChange = useCallback(
    (horizon: TimeHorizon, open: boolean) => {
      setPopoverOpenHorizon(open ? horizon : null);
    },
    []
  );

  // Group milestones by time horizon
  const groupedMilestones = useMemo(() => {
    const groups = new Map<TimeHorizon, NonNullable<typeof milestones>>();
    for (const horizon of TIME_HORIZONS) {
      groups.set(horizon, []);
    }
    if (milestones) {
      for (const milestone of milestones) {
        const group = groups.get(milestone.timeHorizon as TimeHorizon);
        if (group) {
          group.push(milestone);
        }
      }
    }
    return groups;
  }, [milestones]);

  // Determine which horizons to show
  const activeHorizons = useMemo(() => {
    if (isAdmin) {
      return [...TIME_HORIZONS];
    }
    return TIME_HORIZONS.filter((h) => {
      const group = groupedMilestones.get(h);
      return group && group.length > 0;
    });
  }, [groupedMilestones, isAdmin]);

  // Loading state
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
            {/* The Track */}
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
                    {/* Milestone segments — stack vertically when multiple */}
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

                    {/* Admin: add button with popover for zones with milestones */}
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

                    {/* Empty zone: admin add popover or muted placeholder */}
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

                    {/* Zone divider line */}
                    {zoneIndex < activeHorizons.length - 1 && (
                      <div className="w-[1px] shrink-0 self-stretch bg-border/30" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Zone labels below the track */}
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

            {/* Today marker */}
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
              {/* Section header */}
              <div className="mb-2 flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  {TIME_HORIZON_CONFIG[horizon].label}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Vertical segments */}
              <div className="space-y-1">
                {zoneMilestones.map((milestone) => (
                  <div key={milestone._id}>
                    <MilestoneSegment
                      isActive={activeMilestoneId === milestone._id}
                      isAdmin={isAdmin}
                      milestone={milestone}
                      onClick={() => handleMilestoneClick(milestone._id)}
                    />
                    {/* Inline expanded panel for mobile */}
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
                              milestoneId={milestone._id as Id<"milestones">}
                              onFeedbackClick={onFeedbackClick}
                              organizationId={organizationId}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                {/* Mobile add button with popover */}
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

      {/* Desktop: expanded panel below track (accordion) */}
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
                  milestoneId={activeMilestoneId as Id<"milestones">}
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
