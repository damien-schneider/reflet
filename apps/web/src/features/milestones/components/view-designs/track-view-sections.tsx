"use client";

import { ScrollArea } from "@ctrl-ui/react/ui/scroll-area";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import type { ComponentProps, RefObject } from "react";
import type { TimeHorizon } from "@/lib/milestone-constants";
import { TIME_HORIZON_CONFIG } from "@/lib/milestone-constants";

import { MilestoneExpandedPanel } from "../milestone-expanded-panel";
import { MilestoneFormPopover } from "../milestone-form-popover";
import { MilestoneSegment } from "../milestone-segment";
import type { MilestonesViewProps } from "../milestones-view";

const ZONE_GROWTH_FACTOR = 1.12;
const PANEL_EASE = [0.2, 0, 0, 1] as const;

const ADD_TRIGGER_INLINE =
  "flex w-8 shrink-0 items-center justify-center self-stretch rounded-sm text-sm text-muted-foreground/60 transition-colors hover:bg-muted-foreground/10 hover:text-foreground";
const ADD_TRIGGER_BLOCK =
  "flex h-10 w-full items-center justify-center rounded-sm border border-muted-foreground/30 border-dashed text-lg text-muted-foreground/60 transition-colors hover:border-muted-foreground/60 hover:text-foreground";

export type TrackMilestone = ComponentProps<
  typeof MilestoneSegment
>["milestone"];

export interface TrackLayoutProps {
  activeHorizons: TimeHorizon[];
  activeMilestoneId: Id<"milestones"> | null;
  addPopoverProps: (
    horizon: TimeHorizon
  ) => ComponentProps<typeof MilestoneFormPopover>;
  groupedMilestones: Map<TimeHorizon, TrackMilestone[]>;
  isAdmin: boolean;
  onToggle: (milestoneId: Id<"milestones">) => void;
}

function zoneStyle(index: number, minWidth: number): React.CSSProperties {
  return {
    "--zone-grow": Math.round(100 * ZONE_GROWTH_FACTOR ** index) / 100,
    "--zone-min": `${minWidth}px`,
  };
}

export function MilestonePanelReveal({
  milestoneId,
  isAdmin,
  onFeedbackClick,
  organizationId,
}: MilestonesViewProps & { milestoneId: Id<"milestones"> }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <m.div
      animate={{ gridTemplateRows: "1fr", opacity: 1 }}
      className="grid"
      exit={{ gridTemplateRows: "0fr", opacity: 0 }}
      initial={{ gridTemplateRows: "0fr", opacity: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.22, ease: PANEL_EASE }
      }
    >
      <div className="min-h-0 overflow-hidden pt-2">
        <MilestoneExpandedPanel
          isAdmin={isAdmin}
          milestoneId={milestoneId}
          onFeedbackClick={onFeedbackClick}
          organizationId={organizationId}
        />
      </div>
    </m.div>
  );
}

function TrackZone({
  horizon,
  layout,
  isLast,
}: {
  horizon: TimeHorizon;
  isLast: boolean;
  layout: TrackLayoutProps;
}) {
  const { activeMilestoneId, addPopoverProps, groupedMilestones, isAdmin } =
    layout;
  const zoneMilestones = groupedMilestones.get(horizon) ?? [];
  const isEmpty = zoneMilestones.length === 0;

  return (
    <>
      {isEmpty ? null : (
        <div className="flex flex-1 flex-col gap-0.5">
          {zoneMilestones.map((milestone) => (
            <MilestoneSegment
              isActive={activeMilestoneId === milestone._id}
              isAdmin={isAdmin}
              key={milestone._id}
              milestone={milestone}
              onClick={() => layout.onToggle(milestone._id)}
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

      {isLast ? null : (
        <div className="w-px shrink-0 self-stretch bg-border/30" />
      )}
    </>
  );
}

export function DesktopTrack({
  layout,
  trackRef,
  zoneMinWidth,
}: {
  layout: TrackLayoutProps;
  trackRef: RefObject<HTMLDivElement | null>;
  zoneMinWidth: number;
}) {
  const { activeHorizons } = layout;
  return (
    <ScrollArea
      className="rounded-xl bg-secondary"
      lockAxis="y"
      ref={trackRef}
      viewportClassName="px-4"
    >
      <div className="py-2">
        <div className="flex w-full items-stretch gap-0.5 p-0.5">
          {activeHorizons.map((horizon, zoneIndex) => (
            <div
              className="relative flex min-w-(--zone-min) grow-(--zone-grow) items-stretch gap-0.5"
              key={horizon}
              style={zoneStyle(zoneIndex, zoneMinWidth)}
            >
              <TrackZone
                horizon={horizon}
                isLast={zoneIndex === activeHorizons.length - 1}
                layout={layout}
              />
            </div>
          ))}
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
  );
}

function MobileHorizonSection({
  horizon,
  layout,
  view,
}: {
  horizon: TimeHorizon;
  layout: TrackLayoutProps;
  view: MilestonesViewProps;
}) {
  const { activeMilestoneId, addPopoverProps, groupedMilestones, isAdmin } =
    layout;
  const label = TIME_HORIZON_CONFIG[horizon].label;

  return (
    <section aria-label={label} className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <h3 className="font-medium text-muted-foreground text-xs">{label}</h3>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-1">
        {(groupedMilestones.get(horizon) ?? []).map((milestone) => (
          <div key={milestone._id}>
            <MilestoneSegment
              isActive={activeMilestoneId === milestone._id}
              isAdmin={isAdmin}
              milestone={milestone}
              onClick={() => layout.onToggle(milestone._id)}
            />
            <AnimatePresence initial={false}>
              {activeMilestoneId === milestone._id && (
                <MilestonePanelReveal
                  {...view}
                  key={`panel-${milestone._id}`}
                  milestoneId={milestone._id}
                />
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
    </section>
  );
}

export function MobileTrack({
  layout,
  view,
}: {
  layout: TrackLayoutProps;
  view: MilestonesViewProps;
}) {
  return (
    <div className="block md:hidden">
      {layout.activeHorizons.map((horizon) => (
        <MobileHorizonSection
          horizon={horizon}
          key={horizon}
          layout={layout}
          view={view}
        />
      ))}
    </div>
  );
}
