"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { ScrollArea } from "@ctrl-ui/react/ui/scroll-area";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import {
  domMax,
  LayoutGroup,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";
import { useState } from "react";
import { toId } from "@/lib/convex-helpers";
import type { FeedbackItem } from "./feed-feedback-view";
import { AddColumnInline } from "./roadmap/add-column-inline";
import { ColumnDeleteDialog } from "./roadmap/column-delete-dialog";
import { DroppableColumn } from "./roadmap/droppable-column";
import { FeedbackCardContent } from "./roadmap/feedback-card-content";
import { createAnnouncements } from "./roadmap/roadmap-announcements";
import type {
  OptimisticUpdate,
  RoadmapViewProps,
} from "./roadmap/roadmap-types";

export type { RoadmapViewProps } from "./roadmap/roadmap-types";

const POINTER_ACTIVATION_DISTANCE_PX = 8;
const TOUCH_ACTIVATION_DELAY_MS = 300;
const TOUCH_ACTIVATION_TOLERANCE_PX = 5;

function DragPreview({ item }: { item: FeedbackItem }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <m.div
      animate={shouldReduceMotion ? undefined : { rotate: 2, scale: 1.02 }}
      className="w-64 cursor-grabbing"
      initial={shouldReduceMotion ? false : { rotate: 0, scale: 1 }}
      transition={{ bounce: 0, duration: 0.2, type: "spring" }}
    >
      <FeedbackCardContent isOverlay item={item} />
    </m.div>
  );
}

function useRoadmapMove({
  feedback,
  statuses,
  isAdmin,
}: Pick<RoadmapViewProps, "feedback" | "statuses" | "isAdmin">) {
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Map<Id<"feedback">, OptimisticUpdate>
  >(new Map());
  const updateFeedbackStatus = useMutation(
    api.feedback.triage_actions.updateOrganizationStatus
  );

  const optimisticFeedback =
    optimisticUpdates.size === 0
      ? feedback
      : feedback.map((item) => {
          const update = optimisticUpdates.get(item._id);
          const target = update
            ? statuses.find((column) => column._id === update.newStatusId)
            : undefined;
          if (!target) {
            return item;
          }
          return {
            ...item,
            organizationStatus: target,
            organizationStatusId: target._id,
            status: target.semanticStatus ?? item.status,
          };
        });

  const moveOnDrop = async ({ active, over }: DragEndEvent) => {
    if (!(over && isAdmin)) {
      return;
    }

    const feedbackId = toId("feedback", active.id);
    const targetItem = feedback.find((f) => f._id === over.id);
    const droppedOnColumn = statuses.find((s) => s._id === over.id);
    const finalStatusId =
      droppedOnColumn?._id ?? targetItem?.organizationStatusId;

    if (!finalStatusId) {
      return;
    }

    const currentItem = feedback.find((f) => f._id === feedbackId);
    if (currentItem?.organizationStatusId === finalStatusId) {
      return;
    }

    if (droppedOnColumn && !droppedOnColumn.semanticStatus) {
      toast.error(
        `Set a lifecycle meaning on “${droppedOnColumn.name}” before moving feedback into it.`
      );
      return;
    }

    setOptimisticUpdates((prev) =>
      new Map(prev).set(feedbackId, { feedbackId, newStatusId: finalStatusId })
    );

    try {
      await updateFeedbackStatus({
        feedbackId,
        organizationStatusId: finalStatusId,
      });
    } catch (error) {
      const serverReason =
        error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : undefined;
      toast.error(
        `Couldn’t move “${currentItem?.title ?? "this feedback"}”. It’s back where it was.`,
        { description: serverReason }
      );
    }
    setOptimisticUpdates((prev) => {
      const next = new Map(prev);
      next.delete(feedbackId);
      return next;
    });
  };

  return { moveOnDrop, optimisticFeedback };
}

export function RoadmapView({
  feedback,
  statuses,
  onFeedbackClick,
  organizationId,
  isAdmin,
}: RoadmapViewProps) {
  const [deleteDialogStatus, setDeleteDialogStatus] = useState<{
    id: Id<"organizationStatuses">;
    name: string;
    color: string;
  } | null>(null);
  const [activeItem, setActiveItem] = useState<FeedbackItem | null>(null);
  const { moveOnDrop, optimisticFeedback } = useRoadmapMove({
    feedback,
    isAdmin,
    statuses,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: POINTER_ACTIVATION_DISTANCE_PX },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: TOUCH_ACTIVATION_DELAY_MS,
        tolerance: TOUCH_ACTIVATION_TOLERANCE_PX,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveItem(feedback.find((f) => f._id === active.id) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveItem(null);
    await moveOnDrop(event);
  };

  if (statuses.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No statuses configured</EmptyTitle>
          <EmptyDescription>
            Each status becomes a roadmap column.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <LazyMotion features={domMax}>
        <LayoutGroup>
          <DndContext
            accessibility={{
              announcements: createAnnouncements(feedback, statuses),
            }}
            collisionDetection={closestCorners}
            onDragCancel={() => setActiveItem(null)}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            sensors={sensors}
          >
            <ScrollArea
              lockAxis="y"
              viewportClassName="pb-4"
              viewportProps={{
                "aria-label": "Roadmap columns",
                role: "region",
              }}
            >
              <div className="flex min-h-[70vh] w-max gap-4">
                {statuses.map((status) => (
                  <DroppableColumn
                    isAdmin={isAdmin}
                    isDragging={activeItem !== null}
                    items={optimisticFeedback.filter(
                      (f) => f.organizationStatusId === status._id
                    )}
                    key={status._id}
                    onDeleteClick={() =>
                      setDeleteDialogStatus({
                        color: status.color,
                        id: status._id,
                        name: status.name,
                      })
                    }
                    onFeedbackClick={onFeedbackClick}
                    status={status}
                  />
                ))}

                {isAdmin && <AddColumnInline organizationId={organizationId} />}
              </div>
            </ScrollArea>

            <DragOverlay dropAnimation={null}>
              {activeItem && <DragPreview item={activeItem} />}
            </DragOverlay>
          </DndContext>
        </LayoutGroup>
      </LazyMotion>

      <ColumnDeleteDialog
        feedbackCount={
          deleteDialogStatus
            ? optimisticFeedback.filter(
                (f) => f.organizationStatusId === deleteDialogStatus.id
              ).length
            : 0
        }
        onOpenChange={(open) => !open && setDeleteDialogStatus(null)}
        open={!!deleteDialogStatus}
        otherStatuses={statuses.filter((s) => s._id !== deleteDialogStatus?.id)}
        statusToDelete={deleteDialogStatus}
      />
    </>
  );
}
