"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AnimatePresence, domAnimation, LazyMotion } from "motion/react";
import { useState } from "react";
import type { TimeHorizon } from "@/lib/milestone-constants";
import { isTimeHorizon, TIME_HORIZONS } from "@/lib/milestone-constants";

import type { MilestonesViewProps } from "../milestones-view";
import {
  DesktopTrack,
  MilestonePanelReveal,
  MobileTrack,
  type TrackLayoutProps,
} from "./track-view-sections";
import { TrackZoomControls } from "./track-zoom-controls";
import {
  DEFAULT_ZONE_WIDTH,
  MAX_ZONE_WIDTH,
  MIN_ZONE_WIDTH,
  useTrackZoom,
} from "./use-track-zoom";

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

function useTrackLayout({
  organizationId,
  isAdmin,
}: Pick<MilestonesViewProps, "isAdmin" | "organizationId">) {
  const milestones = useQuery(api.organizations.milestones.list, {
    organizationId,
  });
  const [activeMilestoneId, setActiveMilestoneId] =
    useState<Id<"milestones"> | null>(null);
  const [popoverOpenHorizon, setPopoverOpenHorizon] =
    useState<TimeHorizon | null>(null);

  const groupedMilestones = groupByHorizon(milestones ?? []);
  const layout: TrackLayoutProps = {
    activeHorizons: isAdmin
      ? [...TIME_HORIZONS]
      : TIME_HORIZONS.filter(
          (horizon) => (groupedMilestones.get(horizon)?.length ?? 0) > 0
        ),
    activeMilestoneId,
    addPopoverProps: (horizon) => ({
      defaultTimeHorizon: horizon,
      onCreated: () => setPopoverOpenHorizon(null),
      onOpenChange: (open) => setPopoverOpenHorizon(open ? horizon : null),
      open: popoverOpenHorizon === horizon,
      organizationId,
    }),
    groupedMilestones,
    isAdmin,
    onToggle: (milestoneId) =>
      setActiveMilestoneId((prev) =>
        prev === milestoneId ? null : milestoneId
      ),
  };

  return { layout, milestones };
}

export function TrackView(view: MilestonesViewProps) {
  const { layout, milestones } = useTrackLayout(view);
  const { setZoneMinWidth, trackRef, zoneMinWidth } = useTrackZoom(
    (milestones?.length ?? 0) > 0
  );
  const { activeMilestoneId } = layout;

  if (milestones === undefined) {
    return (
      <div aria-busy className="space-y-3">
        <span className="sr-only" role="status">
          Loading milestones…
        </span>
        <Skeleton className="ml-auto h-control-xs w-28" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    );
  }

  if (layout.activeHorizons.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No milestones yet</EmptyTitle>
          <EmptyDescription>
            Planned milestones will appear here on a timeline.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="space-y-3">
        <TrackZoomControls
          base={DEFAULT_ZONE_WIDTH}
          max={MAX_ZONE_WIDTH}
          min={MIN_ZONE_WIDTH}
          onChange={setZoneMinWidth}
          value={zoneMinWidth}
        />

        <div className="hidden md:block">
          <DesktopTrack
            layout={layout}
            trackRef={trackRef}
            zoneMinWidth={zoneMinWidth}
          />
        </div>

        <MobileTrack layout={layout} view={view} />

        <div className="mx-auto hidden max-w-3xl md:block">
          <AnimatePresence initial={false}>
            {activeMilestoneId && (
              <MilestonePanelReveal
                {...view}
                key={activeMilestoneId}
                milestoneId={activeMilestoneId}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </LazyMotion>
  );
}
