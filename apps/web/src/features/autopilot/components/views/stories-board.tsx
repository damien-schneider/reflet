"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconColumns, IconLayoutList } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IssueRow } from "@/features/autopilot/components/issue-row";
import {
  KanbanBoard,
  type KanbanColumn,
} from "@/features/autopilot/components/kanban-board";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "kanban";

const STATUS_ORDER = [
  "draft",
  "ready",
  "in_spec",
  "in_dev",
  "in_review",
  "shipped",
  "cancelled",
] as const;

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  in_spec: "In Spec",
  in_dev: "In Dev",
  in_review: "In Review",
  shipped: "Shipped",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted-foreground",
  ready: "bg-blue-500",
  in_spec: "bg-purple-500",
  in_dev: "bg-amber-500",
  in_review: "bg-cyan-500",
  shipped: "bg-green-500",
  cancelled: "bg-red-500",
};

export function StoriesBoard({
  initiativeId,
}: {
  initiativeId: Id<"autopilotWorkItems">;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const stories = useQuery(api.autopilot.queries.work.getChildren, {
    parentId: initiativeId,
  });

  if (stories === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton
            className="h-10 w-full rounded-md"
            key={`skel-${String(i)}`}
          />
        ))}
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center text-muted-foreground text-sm">
        No user stories yet
      </div>
    );
  }

  const kanbanColumns: KanbanColumn<
    Doc<"autopilotWorkItems"> & { id: string }
  >[] = STATUS_ORDER.filter((s) => s !== "cancelled").map((status) => ({
    id: status,
    label: STATUS_LABELS[status] ?? status,
    color: STATUS_COLORS[status] ?? "bg-muted-foreground",
    items: stories
      .filter((s) => s.status === status)
      .map((s) => ({ ...s, id: s._id })),
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex rounded-md border">
          <Button
            className={cn(
              "rounded-none rounded-l-md",
              viewMode === "list" && "bg-muted"
            )}
            onClick={() => setViewMode("list")}
            size="sm"
            variant="ghost"
          >
            <IconLayoutList className="size-4" />
          </Button>
          <Button
            className={cn(
              "rounded-none rounded-r-md",
              viewMode === "kanban" && "bg-muted"
            )}
            onClick={() => setViewMode("kanban")}
            size="sm"
            variant="ghost"
          >
            <IconColumns className="size-4" />
          </Button>
        </div>
        <span className="text-muted-foreground text-xs">
          {stories.length} {stories.length === 1 ? "story" : "stories"}
        </span>
      </div>

      {viewMode === "kanban" ? (
        <KanbanBoard
          columns={kanbanColumns}
          renderItem={(item) => (
            <IssueRow
              priority={item.priority}
              status={item.status}
              title={item.title}
              updatedAt={item.updatedAt}
            />
          )}
        />
      ) : (
        <div className="space-y-1">
          {stories.map((story) => (
            <IssueRow
              key={story._id}
              priority={story.priority}
              status={story.status}
              title={story.title}
              updatedAt={story.updatedAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
