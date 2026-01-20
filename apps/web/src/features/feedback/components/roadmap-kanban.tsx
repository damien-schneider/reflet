"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ChevronUp, GripVertical, MessageSquare } from "lucide-react";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  const updateFeedbackStatus = useMutation(
    api.feedback_actions.updateStatus
  ).withOptimisticUpdate((localStore, args) => {
    const { feedbackId, statusId } = args;
    const currentList = localStore.getQuery(api.feedback_list.listForRoadmap, {
      boardId,
    });

    if (currentList) {
      const updatedList = currentList.map((item) =>
        item._id === feedbackId ? { ...item, statusId } : item
      );
      localStore.setQuery(
        api.feedback_list.listForRoadmap,
        { boardId },
        updatedList
      );
    }
  });

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
    <ScrollArea className="pb-4">
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
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!isMember) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData("text/plain", feedback._id);
      e.dataTransfer.effectAllowed = "move";
      onDragStart(feedback._id);
    },
    [isMember, feedback._id, onDragStart]
  );

  const handleDragEnd = useCallback(() => {
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

  return (
    <Card
      className={cn(
        "cursor-pointer p-3 transition-all hover:shadow-md",
        isMember && "cursor-grab active:cursor-grabbing"
      )}
      draggable={isMember}
      onClick={handleClick}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-2">
        {isMember && (
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
              <ChevronUp className="h-3 w-3" />
              {feedback.voteCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {feedback.commentCount}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
