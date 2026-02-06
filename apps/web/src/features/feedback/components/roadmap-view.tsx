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
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CaretUp, ChatCircle, DotsSixVertical } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { FeedbackItem } from "./feed-feedback-view";
import { AddColumnInline } from "./roadmap/add-column-inline";
import { ColumnDeleteDialog } from "./roadmap/column-delete-dialog";
import { RoadmapColumnHeader } from "./roadmap/roadmap-column-header";

export interface RoadmapViewProps {
  feedback: FeedbackItem[];
  statuses: Array<{ _id: string; name: string; color: string }>;
  onFeedbackClick: (feedbackId: string) => void;
  organizationId: Id<"organizations">;
  isAdmin: boolean;
}

interface DraggableFeedbackCardProps {
  item: FeedbackItem;
  isAdmin: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
  onFeedbackClick: (feedbackId: string) => void;
}

type DragHandleListeners = Record<
  string,
  (event: React.SyntheticEvent) => void
>;

function FeedbackCardContent({
  item,
  isDragging,
  isOverlay,
  isAdmin,
  dragHandleListeners,
  dragHandleAttributes,
}: {
  item: FeedbackItem;
  isDragging?: boolean;
  isOverlay?: boolean;
  isAdmin?: boolean;
  dragHandleListeners?: DragHandleListeners;
  dragHandleAttributes?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  return (
    <Card
      className={cn(
        "relative p-3 transition-all duration-200",
        "hover:scale-[1.02] hover:bg-accent/50 hover:shadow-md",
        isDragging && "opacity-50 ring-2 ring-primary",
        isOverlay && "shadow-xl ring-2 ring-primary"
      )}
    >
      {isAdmin && dragHandleListeners && (
        <button
          {...dragHandleAttributes}
          {...dragHandleListeners}
          aria-label="Drag to reorder"
          className={cn(
            "absolute top-1/2 right-1 -translate-y-1/2",
            "hidden items-center justify-center md:flex",
            "h-6 w-6 rounded text-muted-foreground/50",
            "hover:bg-muted hover:text-muted-foreground",
            "cursor-grab active:cursor-grabbing",
            "pointer-events-auto touch-none"
          )}
          type="button"
        >
          <DotsSixVertical className="h-4 w-4" weight="bold" />
        </button>
      )}
      <h4 className="pr-6 font-medium text-sm">{item.title}</h4>
      {item.tags && item.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {item.tags.slice(0, 2).map(
            (tag) =>
              tag && (
                <Badge
                  className="font-normal text-[11px]"
                  color={tag.color}
                  key={tag._id}
                >
                  {tag.icon && <span>{tag.icon}</span>}
                  {tag.name}
                </Badge>
              )
          )}
        </div>
      )}
      {item.milestones && item.milestones.length > 0 && (
        <div className="mt-1 flex gap-1">
          {item.milestones.slice(0, 2).map((m) => (
            <span className="text-xs" key={m._id} title={m.name}>
              {m.emoji ?? "🏁"}
            </span>
          ))}
          {item.milestones.length > 2 && (
            <span className="text-[10px] text-muted-foreground">
              +{item.milestones.length - 2}
            </span>
          )}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
        <CaretUp className="h-3 w-3" />
        <span>{item.voteCount}</span>
        <ChatCircle className="ml-2 h-3 w-3" />
        <span>{item.commentCount}</span>
      </div>
    </Card>
  );
}

function DraggableFeedbackCard({
  item,
  isAdmin,
  onFeedbackClick,
}: DraggableFeedbackCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item._id,
    disabled: !isAdmin,
  });

  const handleClick = () => {
    if (!isDragging) {
      onFeedbackClick(item._id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onFeedbackClick(item._id);
    }
  };

  return (
    <motion.div
      animate={{ opacity: isDragging ? 0.4 : 1, scale: isDragging ? 0.98 : 1 }}
      className="cursor-pointer"
      initial={false}
      layoutId={`feedback-card-${item._id}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      {/* On mobile, apply touch listeners to the whole card for long press */}
      <div
        {...(isAdmin ? listeners : {})}
        className="md:pointer-events-none md:contents"
      >
        <FeedbackCardContent
          dragHandleAttributes={attributes}
          dragHandleListeners={listeners as DragHandleListeners}
          isAdmin={isAdmin}
          isDragging={isDragging}
          item={item}
        />
      </div>
    </motion.div>
  );
}

interface DroppableColumnProps {
  status: { _id: string; name: string; color: string };
  items: FeedbackItem[];
  isAdmin: boolean;
  isDragging: boolean;
  onFeedbackClick: (feedbackId: string) => void;
  onDeleteClick: () => void;
}

function DroppableColumn({
  status,
  items,
  isAdmin,
  isDragging,
  onFeedbackClick,
  onDeleteClick,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status._id,
    data: {
      type: "column",
      statusId: status._id,
    },
  });

  // Background opacity: 8% normally, 28% when dragging over
  const bgOpacity = isOver ? "28" : "08";

  return (
    <div
      className={cn(
        "group w-72 shrink-0 rounded-lg p-4 transition-colors duration-200"
      )}
      ref={setNodeRef}
      style={{
        backgroundColor: `${status.color}${bgOpacity}`,
      }}
    >
      <RoadmapColumnHeader
        color={status.color}
        count={items.length}
        isAdmin={isAdmin}
        name={status.name}
        onDelete={onDeleteClick}
        statusId={status._id as Id<"organizationStatuses">}
      />
      <div
        className="min-h-[100px] space-y-2"
        data-dragging={isDragging ? "true" : "false"}
      >
        {items.map((item) => (
          <DraggableFeedbackCard
            isAdmin={isAdmin}
            item={item}
            key={item._id}
            onFeedbackClick={onFeedbackClick}
          />
        ))}
        {items.length === 0 && (
          <p
            className={cn(
              "py-4 text-center text-muted-foreground text-sm transition-colors",
              isOver && "text-primary"
            )}
          >
            {isOver ? "Drop here" : "No items"}
          </p>
        )}
      </div>
    </div>
  );
}

// Type for optimistic status updates
interface OptimisticUpdate {
  feedbackId: string;
  newStatusId: string;
}

// Accessibility announcements for screen readers
const createAnnouncements = (
  feedback: FeedbackItem[],
  statuses: Array<{ _id: string; name: string; color: string }>
) => ({
  onDragStart({ active }: { active: { id: string | number } }) {
    const item = feedback.find((f) => f._id === active.id);
    return `Picked up ${item?.title}. Dragging.`;
  },
  onDragOver({
    over,
  }: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) {
    const status = statuses.find((s) => s._id === over?.id);
    return status ? `Over ${status.name} column` : undefined;
  },
  onDragEnd({
    active,
    over,
  }: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) {
    const item = feedback.find((f) => f._id === active.id);
    const status = statuses.find((s) => s._id === over?.id);
    return status
      ? `Dropped ${item?.title} in ${status.name}`
      : "Drag cancelled";
  },
  onDragCancel: () => "Drag cancelled",
});

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
