"use client";

import { ScrollArea } from "@ctrl-ui/react/ui/scroll-area";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
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
import { TrackZoomControls } from "./track-zoom-controls";

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

const ADD_TRIGGER_INLINE =
  "flex w-8 shrink-0 items-center justify-center self-stretch rounded-sm text-sm text-muted-foreground/60 transition-colors hover:bg-muted-foreground/10 hover:text-foreground";
const ADD_TRIGGER_BLOCK =
  "flex h-10 w-full items-center justify-center rounded-sm border border-muted-foreground/30 border-dashed text-lg text-muted-foreground/60 transition-colors hover:border-muted-foreground/60 hover:text-foreground";

function getZoneFlexGrow(index: number): number {
  return Math.round(100 * ZONE_GROWTH_FACTOR ** index) / 100;
}

function zoneStyle(index: number, minWidth: number): React.CSSProperties {
  return {
    "--zone-grow": getZoneFlexGrow(index),
    "--zone-min": `${minWidth}px`,
  };
}

function groupByHorizon<T extends { timeHorizon: string }>(items: T[]) {
  const groups = new Map<TimeHorizon, T[]>();
  for (const horizon of TIME_HORIZONS) {
    groups.set(horizon, []);
  }
  for (const item of items) {
    if (!isTimeHorizon(item.timeHorizon)) {
      continue;
    }
    groups.get(item.timeHorizon)?.push(item);
  }
  return groups;
}

export function TrackView({
  organizationId,
  isAdmin,
  onFeedbackClick,
}: MilestonesViewProps) {
  const milestones = useQuery(api.organizations.milestones.list, {
    organizationId,
  });
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

    const clamp = (width: number) =>
      Math.min(MAX_ZONE_WIDTH, Math.max(MIN_ZONE_WIDTH, width));

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) {
        return;
      }
      e.preventDefault();
      setZoneMinWidth((prev) => clamp(prev - e.deltaY * ZOOM_SENSITIVITY));
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
      setZoneMinWidth((prev) => clamp(prev * scaleDelta));
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

  const toggleMilestone = (milestoneId: Id<"milestones">) => {
    setActiveMilestoneId((prev) => (prev === milestoneId ? null : milestoneId));
  };

  const groupedMilestones = groupByHorizon(milestones ?? []);

  const activeHorizons = isAdmin
    ? [...TIME_HORIZONS]
    : TIME_HORIZONS.filter(
        (horizon) => (groupedMilestones.get(horizon)?.length ?? 0) > 0
      );

  const addPopoverProps = (horizon: TimeHorizon) => ({
    defaultTimeHorizon: horizon,
    onCreated: () => setPopoverOpenHorizon(null),
    onOpenChange: (open: boolean) =>
      setPopoverOpenHorizon(open ? horizon : null),
    open: popoverOpenHorizon === horizon,
    organizationId,
  });

  if (milestones === undefined) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4">
      <TrackZoomControls
        base={DEFAULT_ZONE_WIDTH}
        max={MAX_ZONE_WIDTH}
        min={MIN_ZONE_WIDTH}
        onChange={setZoneMinWidth}
        value={zoneMinWidth}
      />

      <div className="hidden md:block">
        <ScrollArea
          className="rounded-xl bg-secondary"
          lockAxis="y"
          ref={trackRef}
          viewportClassName="px-4"
        >
          <div className="py-2">
            <div className="flex w-full items-stretch gap-0.5 p-0.5">
              {activeHorizons.map((horizon, zoneIndex) => {
                const zoneMilestones = groupedMilestones.get(horizon) ?? [];
                const isEmpty = zoneMilestones.length === 0;

                return (
                  <div
                    className="relative flex min-w-(--zone-min) grow-(--zone-grow) items-stretch gap-0.5"
                    key={horizon}
                    style={zoneStyle(zoneIndex, zoneMinWidth)}
                  >
                    {zoneMilestones.length > 0 && (
                      <div className="flex flex-1 flex-col gap-0.5">
                        {zoneMilestones.map((milestone) => (
                          <MilestoneSegment
                            isActive={activeMilestoneId === milestone._id}
                            isAdmin={isAdmin}
                            key={milestone._id}
                            milestone={milestone}
                            onClick={() => toggleMilestone(milestone._id)}
                          />
                        ))}
                      </div>
                    )}

                    {isAdmin && !isEmpty && (
                      <MilestoneFormPopover
                        {...addPopoverProps(horizon)}
                        triggerClassName={ADD_TRIGGER_INLINE}
                      />
                    )}

                    {isEmpty && (
                      <div className="flex flex-1">
                        {isAdmin ? (
                          <MilestoneFormPopover
                            {...addPopoverProps(horizon)}
                            triggerClassName={ADD_TRIGGER_BLOCK}
                          />
                        ) : (
                          <div className="h-10 w-full rounded-sm bg-muted/20" />
                        )}
                      </div>
                    )}

                    {zoneIndex < activeHorizons.length - 1 && (
                      <div className="w-px shrink-0 self-stretch bg-border/30" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex w-full">
              {activeHorizons.map((horizon, zoneIndex) => (
                <div
                  className="min-w-(--zone-min) grow-(--zone-grow) text-center"
                  key={horizon}
                  style={zoneStyle(zoneIndex, zoneMinWidth)}
                >
                  <span className="text-caption text-muted-foreground">
                    {TIME_HORIZON_CONFIG[horizon].label}
                  </span>
                </div>
              ))}
            </div>

            <div className="relative mt-1">
              <div className="flex items-center gap-1">
                <div className="h-2 w-px rounded-full bg-primary" />
                <span className="text-caption text-primary">Today</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

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
                      onClick={() => toggleMilestone(milestone._id)}
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
                            damping: 25,
                            stiffness: 300,
                            type: "spring",
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

                {isAdmin && (
                  <MilestoneFormPopover
                    {...addPopoverProps(horizon)}
                    triggerClassName={ADD_TRIGGER_BLOCK}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-auto max-w-3xl">
        <AnimatePresence>
          {activeMilestoneId && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              key={activeMilestoneId}
              transition={{ damping: 25, stiffness: 300, type: "spring" }}
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
