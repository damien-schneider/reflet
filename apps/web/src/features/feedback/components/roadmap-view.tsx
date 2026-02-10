"use client";

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
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Map<string, OptimisticUpdate>
  >(new Map());

  const updateFeedbackStatus = useMutation(
    api.feedback_actions.updateOrganizationStatus
  );

  // Apply optimistic updates to feedback
  const optimisticFeedback = useMemo(() => {
    if (optimisticUpdates.size === 0) {
      return feedback;
    }

    return feedback.map((item) => {
      const update = optimisticUpdates.get(item._id);
      if (update) {
        return {
          ...item,
          organizationStatusId: update.newStatusId,
        };
      }
      return item;
    });
  }, [feedback, optimisticUpdates]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const announcements = useMemo(
    () => createAnnouncements(feedback, statuses),
    [feedback, statuses]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const item = feedback.find((f) => f._id === active.id);
      if (item) {
        setActiveItem(item);
      }
    },
    [feedback]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveItem(null);

      if (!(over && isAdmin)) {
        return;
      }

      const feedbackId = active.id as string;
      const targetItem = feedback.find((f) => f._id === over.id);
      const targetStatusId = targetItem?.organizationStatusId;

      // Check if dropped on a column (status._id)
      const droppedOnColumn = statuses.find((s) => s._id === over.id);
      const finalStatusId = droppedOnColumn?._id ?? targetStatusId;

      if (!finalStatusId) {
        return;
      }

      // Get current item
      const currentItem = feedback.find((f) => f._id === feedbackId);
      if (currentItem?.organizationStatusId === finalStatusId) {
        return;
      }

      // Apply optimistic update immediately
      setOptimisticUpdates((prev) => {
        const next = new Map(prev);
        next.set(feedbackId, { feedbackId, newStatusId: finalStatusId });
        return next;
      });

      try {
        await updateFeedbackStatus({
          feedbackId: feedbackId as Id<"feedback">,
          organizationStatusId: finalStatusId as Id<"organizationStatuses">,
        });
      } finally {
        // Clear optimistic update after server responds
        // The real data from Convex will take over
        setOptimisticUpdates((prev) => {
          const next = new Map(prev);
          next.delete(feedbackId);
          return next;
        });
      }
    },
    [isAdmin, feedback, statuses, updateFeedbackStatus]
  );

  if (statuses.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            No statuses configured. Statuses are used as roadmap columns.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <LayoutGroup>
        <DndContext
          accessibility={{ announcements }}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          sensors={sensors}
        >
          <ScrollArea
            className=""
            classNameViewport="flex gap-4 pb-4 min-h-[70vh]"
            styleViewport={{
              paddingLeft: "max(1rem, calc(50vw - 35rem))",
              paddingRight: "1rem",
            }}
          >
            {statuses.map((status) => {
              const statusFeedback = optimisticFeedback.filter(
                (f) => f.organizationStatusId === status._id
              );

              return (
                <DroppableColumn
                  isAdmin={isAdmin}
                  isDragging={activeItem !== null}
                  items={statusFeedback}
                  key={status._id}
                  onDeleteClick={() =>
                    setDeleteDialogStatus({
                      id: status._id as Id<"organizationStatuses">,
                      name: status.name,
                      color: status.color,
                    })
                  }
                  onFeedbackClick={onFeedbackClick}
                  status={status}
                />
              );
            })}

            {isAdmin && <AddColumnInline organizationId={organizationId} />}
          </ScrollArea>

          <DragOverlay dropAnimation={null}>
            <AnimatePresence mode="popLayout">
              {activeItem && (
                <motion.div
                  animate={{
                    scale: 1.05,
                    rotate: 3,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  }}
                  className="w-64"
                  exit={{ scale: 1, rotate: 0, opacity: 0 }}
                  initial={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                  <FeedbackCardContent isOverlay item={activeItem} />
                </motion.div>
              )}
            </AnimatePresence>
          </DragOverlay>
        </DndContext>
      </LayoutGroup>

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
