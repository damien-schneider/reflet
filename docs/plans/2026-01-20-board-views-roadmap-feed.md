# Board Views: Roadmap & Feed Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Kanban roadmap view and feed list view for boards with custom statuses per board, drag & drop, and view toggle.

**Architecture:** New `boardStatuses` table for custom statuses per board. Feedback links to status via `statusId`. Board stores `defaultView` preference. Roadmap uses framer-motion for smooth drag & drop. Both dashboard and public views share components.

**Tech Stack:** Convex (backend), React 19, framer-motion (drag & drop), Jotai (state), shadcn/ui, Tailwind CSS

---

## Task 1: Add boardStatuses table to schema

**Files:**
- Modify: `packages/backend/convex/schema.ts`

**Step 1: Add boardStatuses table definition**

Add after the `boards` table definition (around line 149):

```typescript
// ============================================
// BOARD STATUSES
// ============================================
boardStatuses: defineTable({
  boardId: v.id("boards"),
  name: v.string(),
  color: v.string(), // Hex color (e.g., "#3b82f6")
  icon: v.optional(v.string()), // Lucide icon name (e.g., "circle", "check-circle")
  order: v.number(), // Display order in roadmap (0, 1, 2...)
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_board", ["boardId"])
  .index("by_board_order", ["boardId", "order"]),
```

**Step 2: Update feedback table to use statusId**

Modify the `feedback` table (around line 167) to add `statusId`:

```typescript
feedback: defineTable({
  boardId: v.id("boards"),
  organizationId: v.id("organizations"),
  title: v.string(),
  description: v.string(),
  status: feedbackStatus, // Keep for backward compatibility
  statusId: v.optional(v.id("boardStatuses")), // New: custom status reference
  authorId: v.string(),
  voteCount: v.number(),
  commentCount: v.number(),
  isApproved: v.boolean(),
  isPinned: v.boolean(),
  roadmapLane: v.optional(v.string()),
  roadmapOrder: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

Add index for statusId after existing indexes:

```typescript
.index("by_status_id", ["statusId"])
```

**Step 3: Update boards table with defaultView**

Modify the `boards` table settings object to include defaultView:

```typescript
boards: defineTable({
  organizationId: v.id("organizations"),
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  isPublic: v.boolean(),
  defaultView: v.optional(v.union(v.literal("roadmap"), v.literal("feed"))), // New field
  settings: v.optional(
    v.object({
      allowAnonymousVoting: v.optional(v.boolean()),
      requireApproval: v.optional(v.boolean()),
      defaultStatus: v.optional(feedbackStatus),
    })
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

**Step 4: Run Convex to verify schema**

Run: `cd /Users/damienschneider/Documents/GitHub/reflet-v2 && bun run --filter backend dev`
Expected: Schema updates successfully, no errors

**Step 5: Commit**

```bash
git add packages/backend/convex/schema.ts
git commit -m "feat(schema): add boardStatuses table and statusId to feedback

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create board_statuses backend queries and mutations

**Files:**
- Create: `packages/backend/convex/board_statuses.ts`

**Step 1: Create the board_statuses.ts file**

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { getAuthUser } from "./utils";

// Default statuses to create for new boards
const DEFAULT_STATUSES = [
  { name: "Open", color: "#6b7280", icon: "circle", order: 0 },
  { name: "Under Review", color: "#f59e0b", icon: "eye", order: 1 },
  { name: "Planned", color: "#3b82f6", icon: "calendar", order: 2 },
  { name: "In Progress", color: "#8b5cf6", icon: "loader", order: 3 },
  { name: "Completed", color: "#22c55e", icon: "check-circle", order: 4 },
  { name: "Closed", color: "#ef4444", icon: "x-circle", order: 5 },
];

/**
 * List all statuses for a board (ordered)
 */
export const list = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return [];
    }

    const statuses = await ctx.db
      .query("boardStatuses")
      .withIndex("by_board_order", (q) => q.eq("boardId", args.boardId))
      .collect();

    return statuses.sort((a, b) => a.order - b.order);
  },
});

/**
 * Get a single status by ID
 */
export const get = query({
  args: { id: v.id("boardStatuses") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

/**
 * Create default statuses for a board
 */
export const createDefaults = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    // Check if statuses already exist
    const existingStatuses = await ctx.db
      .query("boardStatuses")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .first();

    if (existingStatuses) {
      return []; // Already initialized
    }

    const now = Date.now();
    const statusIds = [];

    for (const status of DEFAULT_STATUSES) {
      const id = await ctx.db.insert("boardStatuses", {
        boardId: args.boardId,
        name: status.name,
        color: status.color,
        icon: status.icon,
        order: status.order,
        createdAt: now,
        updatedAt: now,
      });
      statusIds.push(id);
    }

    return statusIds;
  },
});

/**
 * Create a new status for a board
 */
export const create = mutation({
  args: {
    boardId: v.id("boards"),
    name: v.string(),
    color: v.string(),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    // Get highest order
    const statuses = await ctx.db
      .query("boardStatuses")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const maxOrder = statuses.reduce((max, s) => Math.max(max, s.order), -1);

    const now = Date.now();
    const statusId = await ctx.db.insert("boardStatuses", {
      boardId: args.boardId,
      name: args.name,
      color: args.color,
      icon: args.icon,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });

    return statusId;
  },
});

/**
 * Update a status
 */
export const update = mutation({
  args: {
    id: v.id("boardStatuses"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const status = await ctx.db.get(args.id);
    if (!status) {
      throw new Error("Status not found");
    }

    const board = await ctx.db.get(status.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

/**
 * Reorder statuses
 */
export const reorder = mutation({
  args: {
    boardId: v.id("boards"),
    statusIds: v.array(v.id("boardStatuses")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    const now = Date.now();
    for (let i = 0; i < args.statusIds.length; i++) {
      await ctx.db.patch(args.statusIds[i], {
        order: i,
        updatedAt: now,
      });
    }

    return true;
  },
});

/**
 * Delete a status (move feedback to another status first)
 */
export const remove = mutation({
  args: {
    id: v.id("boardStatuses"),
    moveToStatusId: v.id("boardStatuses"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const status = await ctx.db.get(args.id);
    if (!status) {
      throw new Error("Status not found");
    }

    const targetStatus = await ctx.db.get(args.moveToStatusId);
    if (!targetStatus) {
      throw new Error("Target status not found");
    }

    if (status.boardId !== targetStatus.boardId) {
      throw new Error("Statuses must be from the same board");
    }

    const board = await ctx.db.get(status.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", board.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    // Move all feedback to target status
    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_status_id", (q) => q.eq("statusId", args.id))
      .collect();

    const now = Date.now();
    for (const feedback of feedbackItems) {
      await ctx.db.patch(feedback._id, {
        statusId: args.moveToStatusId,
        updatedAt: now,
      });
    }

    // Delete the status
    await ctx.db.delete(args.id);

    return true;
  },
});

/**
 * Get feedback count per status for a board
 */
export const getCounts = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const statuses = await ctx.db
      .query("boardStatuses")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const counts: Record<string, number> = {};

    for (const status of statuses) {
      const feedbackItems = await ctx.db
        .query("feedback")
        .withIndex("by_status_id", (q) => q.eq("statusId", status._id))
        .collect();
      counts[status._id] = feedbackItems.length;
    }

    // Also count feedback without statusId (unassigned)
    const allFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
    counts["unassigned"] = allFeedback.filter((f) => !f.statusId).length;

    return counts;
  },
});
```

**Step 2: Commit**

```bash
git add packages/backend/convex/board_statuses.ts
git commit -m "feat(backend): add board_statuses queries and mutations

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Update feedback mutations to support statusId

**Files:**
- Modify: `packages/backend/convex/feedback.ts` (if exists) or create new mutation file

**Step 1: Create feedback status update mutation**

Add to `packages/backend/convex/feedback_actions.ts`:

```typescript
/**
 * Update feedback status (for drag & drop in roadmap)
 */
export const updateStatus = mutation({
  args: {
    feedbackId: v.id("feedback"),
    statusId: v.optional(v.id("boardStatuses")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Check membership (members can update status)
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", feedback.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    // Validate statusId belongs to the same board
    if (args.statusId) {
      const status = await ctx.db.get(args.statusId);
      if (!status || status.boardId !== feedback.boardId) {
        throw new Error("Invalid status for this board");
      }
    }

    await ctx.db.patch(args.feedbackId, {
      statusId: args.statusId,
      updatedAt: Date.now(),
    });

    return args.feedbackId;
  },
});
```

**Step 2: Update feedback list query to include status details**

Add to `packages/backend/convex/feedback_list.ts`:

```typescript
/**
 * List feedback for roadmap view (grouped by status)
 */
export const listForRoadmap = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return [];
    }

    // Get all feedback for the board that has a statusId
    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    // Filter to only items with statusId and approved (for public boards)
    const filteredItems = feedbackItems.filter((f) => f.statusId && f.isApproved);

    // Add vote status and author details
    const feedbackWithDetails = await Promise.all(
      filteredItems.map(async (f) => {
        let hasVoted = false;
        if (user) {
          const vote = await ctx.db
            .query("feedbackVotes")
            .withIndex("by_feedback_user", (q) =>
              q.eq("feedbackId", f._id).eq("userId", user._id)
            )
            .unique();
          hasVoted = !!vote;
        }

        // Get tags
        const feedbackTags = await ctx.db
          .query("feedbackTags")
          .withIndex("by_feedback", (q) => q.eq("feedbackId", f._id))
          .collect();
        const tags = await Promise.all(
          feedbackTags.map(async (ft) => ctx.db.get(ft.tagId))
        );

        return {
          ...f,
          hasVoted,
          tags: tags.filter(Boolean),
        };
      })
    );

    return feedbackWithDetails;
  },
});
```

**Step 3: Commit**

```bash
git add packages/backend/convex/feedback_actions.ts packages/backend/convex/feedback_list.ts
git commit -m "feat(backend): add updateStatus mutation and listForRoadmap query

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Update boards mutation to handle defaultView

**Files:**
- Modify: `packages/backend/convex/boards.ts`

**Step 1: Update the boards.update mutation**

Add `defaultView` to the update mutation args and handler:

```typescript
export const update = mutation({
  args: {
    id: v.id("boards"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    defaultView: v.optional(v.union(v.literal("roadmap"), v.literal("feed"))),
    settings: v.optional(
      v.object({
        allowAnonymousVoting: v.optional(v.boolean()),
        requireApproval: v.optional(v.boolean()),
        defaultStatus: v.optional(feedbackStatus),
      })
    ),
  },
  // ... rest of handler
});
```

**Step 2: Commit**

```bash
git add packages/backend/convex/boards.ts
git commit -m "feat(backend): add defaultView to boards.update mutation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create RoadmapKanban component with drag & drop

**Files:**
- Create: `apps/web/src/features/feedback/components/roadmap-kanban.tsx`

**Step 1: Create the RoadmapKanban component**

```typescript
"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AnimatePresence,
  Reorder,
  motion,
  useDragControls,
} from "framer-motion";
import {
  ChevronUp,
  GripVertical,
  MessageSquare,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface RoadmapKanbanProps {
  boardId: Id<"boards">;
  organizationId: Id<"organizations">;
  isMember: boolean;
  onFeedbackClick?: (feedbackId: Id<"feedback">) => void;
}

export function RoadmapKanban({
  boardId,
  organizationId,
  isMember,
  onFeedbackClick,
}: RoadmapKanbanProps) {
  const statuses = useQuery(api.board_statuses.list, { boardId });
  const feedback = useQuery(api.feedback_list.listForRoadmap, { boardId });
  const counts = useQuery(api.board_statuses.getCounts, { boardId });
  const updateFeedbackStatus = useMutation(api.feedback_actions.updateStatus);

  const [draggedItem, setDraggedItem] = useState<Id<"feedback"> | null>(null);

  const handleDrop = useCallback(
    async (feedbackId: Id<"feedback">, statusId: Id<"boardStatuses">) => {
      if (!isMember) return;
      await updateFeedbackStatus({ feedbackId, statusId });
      setDraggedItem(null);
    },
    [isMember, updateFeedbackStatus]
  );

  if (!statuses || !feedback) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            className="h-96 w-72 flex-shrink-0 animate-pulse rounded-lg bg-muted"
            key={i}
          />
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

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statuses.map((status) => (
        <KanbanColumn
          count={counts?.[status._id] ?? 0}
          feedback={feedbackByStatus[status._id] ?? []}
          isMember={isMember}
          key={status._id}
          onDrop={(feedbackId) => handleDrop(feedbackId, status._id)}
          onFeedbackClick={onFeedbackClick}
          status={status}
        />
      ))}
    </div>
  );
}

interface KanbanColumnProps {
  status: Doc<"boardStatuses">;
  feedback: Array<Doc<"feedback"> & { hasVoted?: boolean; tags?: Array<Doc<"tags">> }>;
  count: number;
  isMember: boolean;
  onDrop: (feedbackId: Id<"feedback">) => void;
  onFeedbackClick?: (feedbackId: Id<"feedback">) => void;
}

function KanbanColumn({
  status,
  feedback,
  count,
  isMember,
  onDrop,
  onFeedbackClick,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isMember) return;
      e.preventDefault();
      setIsDragOver(true);
    },
    [isMember]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!isMember) return;
      e.preventDefault();
      setIsDragOver(false);
      const feedbackId = e.dataTransfer.getData("feedbackId") as Id<"feedback">;
      if (feedbackId) {
        onDrop(feedbackId);
      }
    },
    [isMember, onDrop]
  );

  return (
    <div
      className={cn(
        "flex w-72 flex-shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors",
        isDragOver && "border-primary bg-primary/5"
      )}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 border-b p-3">
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <span className="font-medium text-sm">{status.name}</span>
        <Badge className="ml-auto" variant="secondary">
          {count}
        </Badge>
      </div>

      {/* Column Content */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        <AnimatePresence>
          {feedback.map((item) => (
            <KanbanCard
              feedback={item}
              isMember={isMember}
              key={item._id}
              onClick={onFeedbackClick}
            />
          ))}
        </AnimatePresence>
        {feedback.length === 0 && (
          <p className="py-8 text-center text-muted-foreground text-xs">
            No items
          </p>
        )}
      </div>
    </div>
  );
}

interface KanbanCardProps {
  feedback: Doc<"feedback"> & { hasVoted?: boolean; tags?: Array<Doc<"tags">> };
  isMember: boolean;
  onClick?: (feedbackId: Id<"feedback">) => void;
}

function KanbanCard({ feedback, isMember, onClick }: KanbanCardProps) {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!isMember) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData("feedbackId", feedback._id);
      e.dataTransfer.effectAllowed = "move";
    },
    [isMember, feedback._id]
  );

  const handleClick = useCallback(() => {
    onClick?.(feedback._id);
  }, [onClick, feedback._id]);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      initial={{ opacity: 0, y: -10 }}
      layout
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-shadow hover:shadow-md",
          isMember && "cursor-grab active:cursor-grabbing"
        )}
        draggable={isMember}
        onClick={handleClick}
        onDragStart={handleDragStart}
      >
        <CardContent className="p-3">
          <h4 className="line-clamp-2 font-medium text-sm">{feedback.title}</h4>

          {/* Tags */}
          {feedback.tags && feedback.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {feedback.tags.slice(0, 2).map((tag) => (
                <Badge
                  className="text-xs"
                  key={tag._id}
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                  }}
                  variant="secondary"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-2 flex items-center justify-between text-muted-foreground text-xs">
            <div className="flex items-center gap-2">
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/feedback/components/roadmap-kanban.tsx
git commit -m "feat(web): add RoadmapKanban component with drag & drop

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create BoardViewToggle component

**Files:**
- Create: `apps/web/src/features/feedback/components/board-view-toggle.tsx`

**Step 1: Create the toggle component**

```typescript
"use client";

import { LayoutGrid, List } from "lucide-react";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type BoardView = "roadmap" | "feed";

interface BoardViewToggleProps {
  view: BoardView;
  onChange: (view: BoardView) => void;
  className?: string;
}

export function BoardViewToggle({
  view,
  onChange,
  className,
}: BoardViewToggleProps) {
  const handleRoadmapClick = useCallback(() => {
    onChange("roadmap");
  }, [onChange]);

  const handleFeedClick = useCallback(() => {
    onChange("feed");
  }, [onChange]);

  return (
    <div className={cn("flex items-center gap-1 rounded-lg border p-1", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={cn(
              "h-8 w-8",
              view === "roadmap" && "bg-accent"
            )}
            onClick={handleRoadmapClick}
            size="icon"
            variant="ghost"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="sr-only">Roadmap view</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Roadmap</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={cn(
              "h-8 w-8",
              view === "feed" && "bg-accent"
            )}
            onClick={handleFeedClick}
            size="icon"
            variant="ghost"
          >
            <List className="h-4 w-4" />
            <span className="sr-only">Feed view</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Feed</TooltipContent>
      </Tooltip>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/feedback/components/board-view-toggle.tsx
git commit -m "feat(web): add BoardViewToggle component

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Create StatusManager component for board settings

**Files:**
- Create: `apps/web/src/features/feedback/components/status-manager.tsx`

**Step 1: Create the StatusManager component**

```typescript
"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  { name: "Gray", value: "#6b7280" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
];

interface StatusManagerProps {
  boardId: Id<"boards">;
}

export function StatusManager({ boardId }: StatusManagerProps) {
  const statuses = useQuery(api.board_statuses.list, { boardId });
  const counts = useQuery(api.board_statuses.getCounts, { boardId });
  const createStatus = useMutation(api.board_statuses.create);
  const updateStatus = useMutation(api.board_statuses.update);
  const deleteStatus = useMutation(api.board_statuses.remove);
  const reorderStatuses = useMutation(api.board_statuses.reorder);

  const [editingStatus, setEditingStatus] = useState<Doc<"boardStatuses"> | null>(null);
  const [deletingStatus, setDeletingStatus] = useState<Doc<"boardStatuses"> | null>(null);
  const [moveToStatusId, setMoveToStatusId] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState(PRESET_COLORS[0].value);

  const handleCreate = useCallback(async () => {
    if (!newStatusName.trim()) return;
    await createStatus({
      boardId,
      name: newStatusName.trim(),
      color: newStatusColor,
    });
    setNewStatusName("");
    setNewStatusColor(PRESET_COLORS[0].value);
    setIsCreating(false);
  }, [boardId, createStatus, newStatusName, newStatusColor]);

  const handleUpdate = useCallback(async () => {
    if (!editingStatus) return;
    await updateStatus({
      id: editingStatus._id,
      name: editingStatus.name,
      color: editingStatus.color,
    });
    setEditingStatus(null);
  }, [editingStatus, updateStatus]);

  const handleDelete = useCallback(async () => {
    if (!deletingStatus || !moveToStatusId) return;
    await deleteStatus({
      id: deletingStatus._id,
      moveToStatusId: moveToStatusId as Id<"boardStatuses">,
    });
    setDeletingStatus(null);
    setMoveToStatusId("");
  }, [deletingStatus, deleteStatus, moveToStatusId]);

  if (!statuses) {
    return <div className="animate-pulse">Loading statuses...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Board Statuses</h3>
        <Button onClick={() => setIsCreating(true)} size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add Status
        </Button>
      </div>

      <div className="space-y-2">
        {statuses.map((status) => (
          <div
            className="flex items-center gap-3 rounded-lg border p-3"
            key={status._id}
          >
            <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: status.color }}
            />
            <span className="flex-1 font-medium">{status.name}</span>
            <Badge variant="secondary">{counts?.[status._id] ?? 0}</Badge>
            <Button
              onClick={() => setEditingStatus(status)}
              size="icon"
              variant="ghost"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              disabled={statuses.length <= 1}
              onClick={() => setDeletingStatus(status)}
              size="icon"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog onOpenChange={setIsCreating} open={isCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Status</DialogTitle>
            <DialogDescription>
              Add a new status column to your roadmap.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status-name">Name</Label>
              <Input
                id="status-name"
                onChange={(e) => setNewStatusName(e.target.value)}
                placeholder="e.g., In Review"
                value={newStatusName}
              />
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                      newStatusColor === color.value
                        ? "border-foreground"
                        : "border-transparent"
                    )}
                    key={color.value}
                    onClick={() => setNewStatusColor(color.value)}
                    style={{ backgroundColor: color.value }}
                    type="button"
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsCreating(false)} variant="outline">
              Cancel
            </Button>
            <Button disabled={!newStatusName.trim()} onClick={handleCreate}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setEditingStatus(null)}
        open={!!editingStatus}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Status</DialogTitle>
          </DialogHeader>
          {editingStatus && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  onChange={(e) =>
                    setEditingStatus({ ...editingStatus, name: e.target.value })
                  }
                  value={editingStatus.name}
                />
              </div>
              <div className="grid gap-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                        editingStatus.color === color.value
                          ? "border-foreground"
                          : "border-transparent"
                      )}
                      key={color.value}
                      onClick={() =>
                        setEditingStatus({ ...editingStatus, color: color.value })
                      }
                      style={{ backgroundColor: color.value }}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEditingStatus(null)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setDeletingStatus(null);
            setMoveToStatusId("");
          }
        }}
        open={!!deletingStatus}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Status</DialogTitle>
            <DialogDescription>
              Choose where to move the {counts?.[deletingStatus?._id ?? ""] ?? 0}{" "}
              feedback items in this status.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Move feedback to</Label>
            <Select onValueChange={setMoveToStatusId} value={moveToStatusId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {statuses
                  .filter((s) => s._id !== deletingStatus?._id)
                  .map((status) => (
                    <SelectItem key={status._id} value={status._id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setDeletingStatus(null);
                setMoveToStatusId("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!moveToStatusId}
              onClick={handleDelete}
              variant="destructive"
            >
              Delete Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/feedback/components/status-manager.tsx
git commit -m "feat(web): add StatusManager component for board settings

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update board detail page with view toggle

**Files:**
- Modify: `apps/web/app/dashboard/[orgSlug]/boards/[boardSlug]/page.tsx`

**Step 1: Refactor to use view toggle and both views**

Replace the entire file with the new implementation that includes:
- View toggle in header
- RoadmapKanban component for roadmap view
- FeedbackList component for feed view
- Local state for view preference (with URL param or localStorage)

**Step 2: Commit**

```bash
git add apps/web/app/dashboard/[orgSlug]/boards/[boardSlug]/page.tsx
git commit -m "feat(web): add view toggle to board detail page

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Create board settings page for status management

**Files:**
- Create: `apps/web/app/dashboard/[orgSlug]/boards/[boardSlug]/settings/page.tsx`

**Step 1: Create the settings page**

```typescript
"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusManager } from "@/features/feedback/components/status-manager";

export default function BoardSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; boardSlug: string }>;
}) {
  const { orgSlug, boardSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const board = useQuery(
    api.boards.getBySlug,
    org?._id
      ? { organizationId: org._id as Id<"organizations">, slug: boardSlug }
      : "skip"
  );
  const updateBoard = useMutation(api.boards.update);

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const handleDefaultViewChange = async (view: "roadmap" | "feed") => {
    await updateBoard({
      id: board._id as Id<"boards">,
      defaultView: view,
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          className="mb-4 inline-flex items-center text-muted-foreground text-sm hover:text-foreground"
          href={`/dashboard/${orgSlug}/boards/${boardSlug}`}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Board
        </Link>
        <h1 className="font-bold text-2xl">Board Settings</h1>
        <p className="text-muted-foreground">{board.name}</p>
      </div>

      <div className="space-y-6">
        {/* Default View */}
        <Card>
          <CardHeader>
            <CardTitle>Default View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Label>When users open this board, show</Label>
              <Select
                onValueChange={handleDefaultViewChange}
                value={board.defaultView ?? "feed"}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feed">Feed List</SelectItem>
                  <SelectItem value="roadmap">Roadmap</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Status Management */}
        <Card>
          <CardHeader>
            <CardTitle>Roadmap Statuses</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusManager boardId={board._id as Id<"boards">} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/app/dashboard/[orgSlug]/boards/[boardSlug]/settings/page.tsx
git commit -m "feat(web): add board settings page with status management

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Update public board page with both views

**Files:**
- Modify: `apps/web/app/[orgSlug]/page.tsx`

**Step 1: Add view toggle and roadmap view to public page**

Update the public page to:
- Add BoardViewToggle component
- Render RoadmapKanban when view is "roadmap"
- Render current feed list when view is "feed"
- Use board's defaultView as initial view
- Pass isMember=false to disable drag & drop

**Step 2: Commit**

```bash
git add apps/web/app/[orgSlug]/page.tsx
git commit -m "feat(web): add view toggle to public board page

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Initialize default statuses on board creation

**Files:**
- Modify: `packages/backend/convex/boards_actions.ts`

**Step 1: Call createDefaults after board creation**

Update the `create` mutation to call `board_statuses.createDefaults` after inserting the board.

**Step 2: Commit**

```bash
git add packages/backend/convex/boards_actions.ts
git commit -m "feat(backend): auto-create default statuses on board creation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Add inline status actions in roadmap

**Files:**
- Modify: `apps/web/src/features/feedback/components/roadmap-kanban.tsx`

**Step 1: Add column header dropdown menu**

Add DropdownMenu to column header with options:
- Edit status (opens inline edit)
- Add status after (creates new column)
- Delete status (with confirmation)

**Step 2: Commit**

```bash
git add apps/web/src/features/feedback/components/roadmap-kanban.tsx
git commit -m "feat(web): add inline status actions to roadmap columns

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Run linter and fix issues

**Step 1: Run ultracite check**

Run: `cd /Users/damienschneider/Documents/GitHub/reflet-v2 && bun x ultracite check`

**Step 2: Fix any issues**

Run: `bun x ultracite fix`

**Step 3: Commit fixes**

```bash
git add -A
git commit -m "style: fix linting issues

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Test the implementation

**Step 1: Start dev server**

Run: `cd /Users/damienschneider/Documents/GitHub/reflet-v2 && bun run dev`

**Step 2: Manual testing checklist**

- [ ] Create a new board and verify default statuses are created
- [ ] Open board and verify feed list view works
- [ ] Toggle to roadmap view and verify columns display
- [ ] Drag feedback between columns (as member)
- [ ] Verify drag & drop is disabled for non-members
- [ ] Open board settings and verify status management works
- [ ] Create a new status
- [ ] Edit an existing status
- [ ] Delete a status (verify feedback moves)
- [ ] Change default view in settings
- [ ] Verify public view matches dashboard view
- [ ] Test view toggle persists correctly

---

## Summary

This implementation adds:
1. **boardStatuses table** - Custom statuses per board with name, color, icon, order
2. **Backend mutations** - CRUD operations for statuses, update feedback status
3. **RoadmapKanban component** - Kanban view with smooth drag & drop (framer-motion)
4. **BoardViewToggle component** - Toggle between roadmap and feed views
5. **StatusManager component** - Full status management in board settings
6. **Board settings page** - Configure default view and manage statuses
7. **Updated board pages** - Both dashboard and public views support both modes
