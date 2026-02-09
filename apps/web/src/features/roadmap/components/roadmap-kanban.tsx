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
import { NotionColorPicker } from "@/components/ui/notion-color-picker";
import { Switch } from "@/components/ui/switch";
import type { RoadmapItemData } from "@/features/roadmap/components/roadmap-item-card";
import {
  type LaneConfig,
  RoadmapLaneColumn,
} from "@/features/roadmap/components/roadmap-lane";
import type { RoadmapLaneWithBacklog } from "@/lib/constants";
import type { TagColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

interface RoadmapKanbanProps {
  organizationId: Id<"organizations">;
  isAdmin?: boolean;
  onAddItem?: (laneId: string) => void;
  onItemClick?: (feedbackId: string) => void;
}

export function RoadmapKanban({
  organizationId,
  isAdmin = false,
  onAddItem,
  onItemClick,
}: RoadmapKanbanProps) {
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

  // Modal state for adding columns
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnColor, setNewColumnColor] = useState<TagColor>("blue");
  const [newColumnIsDone, setNewColumnIsDone] = useState(false);
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);

  // Fetch organization statuses (the single source of truth for columns)
  const organizationStatuses = useQuery(api.organization_statuses.list, {
    organizationId,
  });

  // Fetch roadmap data (feedback items)
  const roadmapData = useQuery(api.feedback_list.listForRoadmapByOrganization, {
    organizationId,
  });

  // Mutations
  const updateFeedbackStatus = useMutation(
    api.feedback_actions.updateOrganizationStatus
  );
  const createStatus = useMutation(api.organization_statuses.create);

  // Build lane configuration from organization statuses
  const laneConfigs = useMemo((): LaneConfig[] => {
    if (!organizationStatuses || organizationStatuses.length === 0) {
      return [];
    }

    return organizationStatuses.map((status) => ({
      id: status._id,
      label: status.name,
      color: status.color,
      bgColor: `bg-[${status.color}]/10`,
      isDoneStatus: status.name.toLowerCase() === "completed",
      laneOrder: status.order,
    }));
  }, [organizationStatuses]);

  // Transform data for display - group by organizationStatusId
  const itemsByLane = useMemo(() => {
    if (!roadmapData) {
      return { backlog: [] as RoadmapItemData[] };
    }

    const grouped: Record<string, RoadmapItemData[]> = {
      backlog: [],
    };

    // Initialize lanes from organization statuses
    for (const lane of laneConfigs) {
      grouped[lane.id] = [];
    }

    // Group feedback by organizationStatusId
    for (const item of roadmapData) {
      const feedbackItem = item as unknown as RoadmapItemData;
      if (item.organizationStatusId && grouped[item.organizationStatusId]) {
        grouped[item.organizationStatusId].push(feedbackItem);
      } else {
        // Items without organizationStatusId go to backlog
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
          organizationStatusId: undefined,
        });
        return;
      }

      // Update feedback with new statusId
      await updateFeedbackStatus({
        feedbackId: draggedItemId as Id<"feedback">,
        organizationStatusId: targetLane as Id<"organizationStatuses">,
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
        organizationId,
        name: newColumnName.trim(),
        color: newColumnColor,
        icon: newColumnIsDone ? "check-circle" : undefined,
      });

      setNewColumnName("");
      setNewColumnColor("blue");
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
              <NotionColorPicker
                onChange={setNewColumnColor}
                value={newColumnColor}
              />
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
