"use client";

import { CaretUp, Chat, DotsSixVertical } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  feedbackMagnifyingGlassAtom,
  feedbackSortAtom,
  selectedStatusIdsAtom,
  selectedTagIdsAtom,
} from "@/store/feedback";

interface RoadmapKanbanProps {
  boardId: Id<"boards">;
  isMember: boolean;
  onFeedbackClick?: (feedbackId: Id<"feedback">) => void;
}

export function RoadmapKanban({
  boardId,
  isMember,
  onFeedbackClick,
}: RoadmapKanbanProps) {
  const statuses = useQuery(api.board_statuses.list, { boardId });
  const feedback = useQuery(api.feedback_list.listForRoadmap, { boardId });
  const counts = useQuery(api.board_statuses.getCounts, { boardId });

  // Get filter state from Jotai atoms for optimistic updates
  const search = useAtomValue(feedbackMagnifyingGlassAtom);
  const sortBy = useAtomValue(feedbackSortAtom);
  const selectedStatusIds = useAtomValue(selectedStatusIdsAtom);
  const selectedTagIds = useAtomValue(selectedTagIdsAtom);

  // Map sort option to Convex sort type
  const convexSortBy = (() => {
    switch (sortBy) {
      case "most_votes":
        return "votes" as const;
      case "most_comments":
        return "comments" as const;
      default:
        return sortBy as "newest" | "oldest";
    }
  })();

  const updateFeedbackStatus = useMutation(
    api.feedback_actions.updateStatus
  ).withOptimisticUpdate((localStore, args) => {
    const { feedbackId, statusId } = args;

    // 1. Update Roadmap List
    const currentRoadmapList = localStore.getQuery(
      api.feedback_list.listForRoadmap,
      {
        boardId,
      }
    );

    if (currentRoadmapList) {
      const updatedRoadmapList = currentRoadmapList.map((item) =>
        item._id === feedbackId ? { ...item, statusId } : item
      );
      localStore.setQuery(
        api.feedback_list.listForRoadmap,
        { boardId },
        updatedRoadmapList
      );
    }

    // 2. Update Main Feedback List
    const listArgs = {
      boardId,
      search: search || undefined,
      sortBy: convexSortBy,
      statusId:
        selectedStatusIds.length > 0
          ? (selectedStatusIds[0] as Id<"boardStatuses">)
          : undefined,
      tagIds:
        selectedTagIds.length > 0
          ? (selectedTagIds as Id<"tags">[])
          : undefined,
    };

    const currentMainList = localStore.getQuery(
      api.feedback_list.list,
      listArgs
    );

    // Get board status info for optimistic update
    const newBoardStatus = statuses?.find((s) => s._id === statusId);
    const newBoardStatusInfo = newBoardStatus
      ? { name: newBoardStatus.name, color: newBoardStatus.color }
      : null;

    // Map custom status name to enum value for optimistic update
    // This ensures the status field matches the enum type
    const newStatusName = newBoardStatus?.name ?? "open";
    const newStatusEnum = mapStatusNameToEnum(newStatusName);

    if (currentMainList) {
      const updatedMainList = currentMainList.map((item) =>
        item._id === feedbackId
          ? {
              ...item,
              statusId,
              status: newStatusEnum,
              boardStatus: newBoardStatusInfo,
            }
          : item
      );
      localStore.setQuery(api.feedback_list.list, listArgs, updatedMainList);
    }
  });

  // Helper function to map status name to enum value
  // Matches the backend logic in feedback_actions.ts
  function mapStatusNameToEnum(
    statusName: string
  ):
    | "open"
    | "under_review"
    | "planned"
    | "in_progress"
    | "completed"
    | "closed" {
    const normalizedName = statusName.toLowerCase().replace(/[\s_-]/g, "");

    const statusMap: Record<
      string,
      | "open"
      | "under_review"
      | "planned"
      | "in_progress"
      | "completed"
      | "closed"
    > = {
      open: "open",
      underreview: "under_review",
      "under review": "under_review",
      "under-review": "under_review",
      planned: "planned",
      inprogress: "in_progress",
      "in progress": "in_progress",
      "in-progress": "in_progress",
      completed: "completed",
      done: "completed",
      closed: "closed",
      resolved: "closed",
      archived: "closed",
    };

    return statusMap[normalizedName] ?? "open";
  }

  const [draggedItem, setDraggedItem] = useState<Id<"feedback"> | null>(null);

  const handleDrop = useCallback(
    async (feedbackId: Id<"feedback">, statusId: Id<"boardStatuses">) => {
      if (!isMember) {
        return;
      }
      await updateFeedbackStatus({ feedbackId, statusId });
      setDraggedItem(null);
    },
    [isMember, updateFeedbackStatus]
  );

  const handleWheel = useCallback((event: React.WheelEvent) => {
    const viewport = event.currentTarget.querySelector<HTMLDivElement>(
      "[data-slot='scroll-area-viewport']"
    );

    if (!viewport) {
      return;
    }

    const canScrollHorizontally = viewport.scrollWidth > viewport.clientWidth;
    if (!canScrollHorizontally) {
      return;
    }

    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;

    if (delta === 0) {
      return;
    }

    event.preventDefault();
    viewport.scrollLeft += delta;
  }, []);

  if (!(statuses && feedback)) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            className="flex w-72 shrink-0 flex-col gap-3 rounded-lg bg-muted/50 p-3"
            key={`skeleton-${i}-${boardId}`}
          >
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Group feedback by statusId
  const feedbackByStatus = statuses.reduce(
    (acc, status) => {
      acc[status._id] = feedback.filter((f) => f.statusId === status._id);
      return acc;
    },
    {} as Record<string, typeof feedback>
  );

  // Feedback without status
  const unassignedFeedback = feedback.filter((f) => !f.statusId);

  return (
    <ScrollArea
      className="pb-4"
      data-testid="roadmap-kanban-scrollarea"
      onWheel={handleWheel}
    >
      <div className="flex gap-4">
        {statuses.map((status) => (
          <KanbanColumn
            count={counts?.[status._id] ?? 0}
            draggedItem={draggedItem}
            feedback={feedbackByStatus[status._id] || []}
            isMember={isMember}
            key={status._id}
            onDragStart={setDraggedItem}
            onDrop={(feedbackId) => handleDrop(feedbackId, status._id)}
            onFeedbackClick={onFeedbackClick}
            status={status}
          />
        ))}
        {unassignedFeedback.length > 0 && (
          <div className="flex w-72 shrink-0 flex-col gap-3 rounded-lg bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground text-sm">
                  Unassigned
                </span>
                <Badge variant="secondary">{unassignedFeedback.length}</Badge>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {unassignedFeedback.map((item) => (
                <KanbanCard
                  feedback={item}
                  isMember={isMember}
                  key={item._id}
                  onClick={onFeedbackClick}
                  onDragStart={setDraggedItem}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

interface KanbanColumnProps {
  status: Doc<"boardStatuses">;
  feedback: Array<
    Doc<"feedback"> & { hasVoted?: boolean; tags?: Array<Doc<"tags"> | null> }
  >;
  count: number;
  isMember: boolean;
  draggedItem: Id<"feedback"> | null;
  onDrop: (feedbackId: Id<"feedback">) => void;
  onDragStart: (feedbackId: Id<"feedback"> | null) => void;
  onFeedbackClick?: (feedbackId: Id<"feedback">) => void;
}

function KanbanColumn({
  status,
  feedback,
  count,
  isMember,
  draggedItem: _draggedItem,
  onDrop,
  onDragStart,
  onFeedbackClick,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isMember) {
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    },
    [isMember]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!isMember) {
        return;
      }
      e.preventDefault();
      setIsDragOver(false);
      const feedbackId = e.dataTransfer.getData("text/plain");
      if (feedbackId) {
        onDrop(feedbackId as Id<"feedback">);
      }
    },
    [isMember, onDrop]
  );

  return (
    <div
      aria-label={`${status.name} column with ${count} items`}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-3 rounded-lg p-3 transition-colors",
        isDragOver && isMember
          ? "bg-primary/10 ring-2 ring-primary/50"
          : "bg-muted/50"
      )}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="listbox"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <span className="font-medium text-sm">{status.name}</span>
          <Badge variant="secondary">{count}</Badge>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {feedback.map((item) => (
          <KanbanCard
            feedback={item}
            isMember={isMember}
            key={item._id}
            onClick={onFeedbackClick}
            onDragStart={onDragStart}
          />
        ))}
        {feedback.length === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground text-sm">
            {isMember ? "Drag items here" : "No items"}
          </div>
        )}
      </div>
    </div>
  );
}

interface KanbanCardProps {
  feedback: Doc<"feedback"> & {
    hasVoted?: boolean;
    tags?: Array<Doc<"tags"> | null>;
  };
  isMember: boolean;
  onClick?: (feedbackId: Id<"feedback">) => void;
  onDragStart: (feedbackId: Id<"feedback"> | null) => void;
}

function KanbanCard({
  feedback,
  isMember,
  onClick,
  onDragStart,
}: KanbanCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!isMember) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData("text/plain", feedback._id);
      e.dataTransfer.effectAllowed = "move";
      setIsDragging(true);
      onDragStart(feedback._id);
    },
    [isMember, feedback._id, onDragStart]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    onDragStart(null);
  }, [onDragStart]);

  const handleClick = useCallback(() => {
    onClick?.(feedback._id);
  }, [onClick, feedback._id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.(feedback._id);
      }
    },
    [onClick, feedback._id]
  );

  // Mobile long press handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isMember) {
        return;
      }
      const touch = e.touches[0];
      if (!touch) {
        return;
      }
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };

      longPressTimerRef.current = setTimeout(() => {
        // Trigger drag mode on long press
        setIsDragging(true);
        onDragStart(feedback._id);
        // Add visual feedback
        if (cardRef.current) {
          cardRef.current.style.opacity = "0.7";
          cardRef.current.style.transform = "scale(1.02)";
        }
      }, 500); // 500ms for long press
    },
    [isMember, feedback._id, onDragStart]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!(touch && touchStartRef.current)) {
      return;
    }

    // Cancel long press if user moves finger too much
    const moveThreshold = 10;
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    if (
      (deltaX > moveThreshold || deltaY > moveThreshold) &&
      longPressTimerRef.current
    ) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartRef.current = null;

    if (isDragging) {
      // End drag mode
      setIsDragging(false);
      onDragStart(null);
      if (cardRef.current) {
        cardRef.current.style.opacity = "";
        cardRef.current.style.transform = "";
      }
    }
  }, [isDragging, onDragStart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return (
    <Card
      className={cn(
        "cursor-pointer p-3 transition-all hover:shadow-md",
        isDragging && "opacity-70 ring-2 ring-primary"
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
      ref={cardRef}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle - hidden on mobile (touch devices), only visible on desktop */}
        {isMember && (
          // biome-ignore lint/a11y/useSemanticElements: drag handle needs div for draggable behavior
          <div
            aria-label="Drag to reorder"
            className="mt-0.5 hidden shrink-0 cursor-grab touch-none active:cursor-grabbing md:block"
            draggable
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            role="button"
            tabIndex={-1}
          >
            <DotsSixVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 font-medium text-sm">{feedback.title}</h4>
          {feedback.tags && feedback.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {feedback.tags
                .filter((tag): tag is Doc<"tags"> => tag !== null)
                .map((tag) => (
                  <Badge
                    className="text-white"
                    key={tag._id}
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                ))}
            </div>
          )}
          <div className="mt-2 flex items-center gap-3 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <CaretUp className="h-3 w-3" />
              {feedback.voteCount}
            </span>
            <span className="flex items-center gap-1">
              <Chat className="h-3 w-3" />
              {feedback.commentCount}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
