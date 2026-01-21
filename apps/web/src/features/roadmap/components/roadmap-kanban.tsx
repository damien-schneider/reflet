import { Plus } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import type { RoadmapItemData } from "@/features/roadmap/components/roadmap-item-card";
import {
  type LaneConfig,
  RoadmapLaneColumn,
} from "@/features/roadmap/components/roadmap-lane";
import { COLOR_PALETTE, type RoadmapLaneWithBacklog } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface RoadmapKanbanProps {
  boardId: Id<"boards">;
  isAdmin?: boolean;
  onAddItem?: (laneId: string) => void;
  onItemClick?: (feedbackId: string) => void;
}

export function RoadmapKanban({
  boardId,
  isAdmin = false,
  onAddItem,
  onItemClick,
}: RoadmapKanbanProps) {
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

  // Modal state for adding columns
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState<
    (typeof COLOR_PALETTE)[number]
  >(COLOR_PALETTE[0]);
  const [newColumnIsDone, setNewColumnIsDone] = useState(false);
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);

  // Fetch board statuses (the single source of truth for columns)
  const boardStatuses = useQuery(api.board_statuses.list, { boardId });

  // Fetch roadmap data (feedback items)
  const roadmapData = useQuery(api.feedback_list.listForRoadmap, { boardId });

  // Mutations
  const updateFeedbackStatus = useMutation(api.feedback_actions.updateStatus);
  const createStatus = useMutation(api.board_statuses.create);

  // Build lane configuration from board statuses
  const laneConfigs = useMemo((): LaneConfig[] => {
    if (!boardStatuses || boardStatuses.length === 0) {
      return [];
    }

    return boardStatuses.map((status) => ({
      id: status._id,
      label: status.name,
      color: status.color,
      bgColor: `bg-[${status.color}]/10`,
      isDoneStatus: status.name.toLowerCase() === "completed",
      laneOrder: status.order,
    }));
  }, [boardStatuses]);

  // Transform data for display - group by statusId
  const itemsByLane = useMemo(() => {
    if (!roadmapData) {
      return { backlog: [] as RoadmapItemData[] };
    }

    const grouped: Record<string, RoadmapItemData[]> = {
      backlog: [],
    };

    // Initialize lanes from board statuses
    for (const lane of laneConfigs) {
      grouped[lane.id] = [];
    }

    // Group feedback by statusId
    for (const item of roadmapData) {
      const feedbackItem = item as unknown as RoadmapItemData;
      if (item.statusId && grouped[item.statusId]) {
        grouped[item.statusId].push(feedbackItem);
      } else {
        // Items without statusId go to backlog
        grouped.backlog.push(feedbackItem);
      }
    }

    return grouped;
  }, [roadmapData, laneConfigs]);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, item: RoadmapItemData) => {
      setDraggingItemId(item._id);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({ itemId: item._id })
      );
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDraggingItemId(null);
  }, []);

  const getDraggedItemId = useCallback(
    (e: React.DragEvent<HTMLDivElement>): string | null => {
      try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        return data.itemId;
      } catch {
        return e.dataTransfer.getData("text/plain");
      }
    },
    []
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>, targetLane: string) => {
      e.preventDefault();
      setDraggingItemId(null);

      if (!isAdmin) {
        return;
      }

      const draggedItemId = getDraggedItemId(e);
      if (!draggedItemId) {
        return;
      }

      // If dropping into backlog, remove statusId
      if (targetLane === "backlog") {
        await updateFeedbackStatus({
          feedbackId: draggedItemId as Id<"feedback">,
          statusId: undefined,
        });
        return;
      }

      // Update feedback with new statusId
      await updateFeedbackStatus({
        feedbackId: draggedItemId as Id<"feedback">,
        statusId: targetLane as Id<"boardStatuses">,
      });
    },
    [isAdmin, getDraggedItemId, updateFeedbackStatus]
  );

  // Handle creating a new column (board status)
  const handleCreateColumn = async () => {
    if (!newColumnName.trim()) {
      return;
    }

    setIsCreatingColumn(true);

    try {
      await createStatus({
        boardId,
        name: newColumnName.trim(),
        color: newColumnColor,
        icon: newColumnIsDone ? "check-circle" : undefined,
      });

      setNewColumnName("");
      setNewColumnColor(COLOR_PALETTE[0]);
      setNewColumnIsDone(false);
      setShowAddColumnModal(false);
    } finally {
      setIsCreatingColumn(false);
    }
  };

  // Build lane display config including backlog
  const allLaneConfigs = useMemo(() => {
    const backlogConfig: LaneConfig = {
      id: "backlog",
      label: "Backlog",
      color: "#f59e0b",
      bgColor: "bg-amber-50 dark:bg-amber-950",
      isDoneStatus: false,
      laneOrder: -1,
    };
    return isAdmin ? [backlogConfig, ...laneConfigs] : laneConfigs;
  }, [isAdmin, laneConfigs]);

  // Calculate grid columns
  const gridColumns = isAdmin
    ? allLaneConfigs.length + 1
    : allLaneConfigs.length;

  if (!roadmapData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Loading roadmap...</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto pb-2" style={{ contain: "inline-size" }}>
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${gridColumns}, 280px)`,
          }}
        >
          {allLaneConfigs.map((laneConfig) => (
            <RoadmapLaneColumn
              draggingItemId={draggingItemId}
              isAdmin={isAdmin}
              items={itemsByLane[laneConfig.id] ?? []}
              key={laneConfig.id}
              lane={laneConfig.id as RoadmapLaneWithBacklog}
              laneConfig={laneConfig}
              onAddItem={onAddItem}
              onDragEnd={handleDragEnd}
              onDragStart={handleDragStart}
              onDrop={(e) => handleDrop(e, laneConfig.id)}
              onItemClick={onItemClick}
            />
          ))}

          {/* Add Column Button (admin only) */}
          {isAdmin && (
            <button
              className={cn(
                "flex min-h-100 min-w-70 flex-col items-center justify-center gap-2 rounded-lg border-2 border-muted-foreground/30 border-dashed bg-muted/10 text-muted-foreground transition-all hover:border-primary/50 hover:bg-muted/30 hover:text-foreground"
              )}
              onClick={() => setShowAddColumnModal(true)}
              type="button"
            >
              <Plus className="h-8 w-8" />
              <span className="font-medium text-sm">Add Column</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Column Modal */}
      <Dialog onOpenChange={setShowAddColumnModal} open={showAddColumnModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Roadmap Column</DialogTitle>
            <DialogDescription>
              Create a new column (status) for your roadmap. This will also
              create a tag that can be used to categorize feedback.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="columnName">Name</Label>
              <Input
                id="columnName"
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="e.g., In Progress, Under Review, Shipped"
                value={newColumnName}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    className={cn(
                      "h-8 w-8 rounded-full transition-all",
                      newColumnColor === c &&
                        "ring-2 ring-primary ring-offset-2"
                    )}
                    key={c}
                    onClick={() => setNewColumnColor(c)}
                    style={{ backgroundColor: c }}
                    type="button"
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-normal text-sm" htmlFor="isDoneStatus">
                  Mark as "Done" Status
                </Label>
                <p className="text-muted-foreground text-xs">
                  Items moved here will be marked as completed for the changelog
                </p>
              </div>
              <Switch
                checked={newColumnIsDone}
                id="isDoneStatus"
                onCheckedChange={setNewColumnIsDone}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowAddColumnModal(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isCreatingColumn || !newColumnName.trim()}
              onClick={handleCreateColumn}
            >
              {isCreatingColumn ? "Creating..." : "Create Column"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
