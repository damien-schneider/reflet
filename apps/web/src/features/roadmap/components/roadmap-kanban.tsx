import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
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
import {
  COLOR_PALETTE,
  LANE_CONFIG,
  ROADMAP_LANES,
  type RoadmapLaneWithBacklog,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

interface RoadmapKanbanProps {
  boardId: Id<"boards">;
  organizationId: Id<"organizations">;
  isAdmin?: boolean;
  onAddItem?: (laneId: string) => void;
  onItemClick?: (feedbackId: string) => void;
}

export function RoadmapKanban({
  boardId,
  organizationId,
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

  // Fetch roadmap data
  const roadmapData = useQuery(api.feedback_roadmap.getRoadmap, {
    boardId,
    includeBacklog: isAdmin,
  });

  // Fetch tags for custom lanes (using organizationId, not boardId)
  const tags = useQuery(api.tag_manager.list, { organizationId });

  // Mutations
  const moveToLane = useMutation(api.feedback_roadmap.roadmapMoveToLane);
  const createTag = useMutation(api.tag_manager_actions.create);

  // Build lane configuration from custom lanes or use defaults
  const laneConfigs = useMemo((): LaneConfig[] => {
    const roadmapLaneTags = tags?.filter((t) => t.isRoadmapLane) ?? [];

    if (roadmapLaneTags.length > 0) {
      return roadmapLaneTags
        .sort((a, b) => (a.laneOrder ?? 0) - (b.laneOrder ?? 0))
        .map((t) => ({
          id: t._id,
          label: t.name,
          color: t.color,
          bgColor: `bg-[${t.color}]/10`,
          isDoneStatus: t.isDoneStatus,
          laneOrder: t.laneOrder ?? 0,
        }));
    }

    // Use default lanes
    return ROADMAP_LANES.map((lane) => ({
      id: lane,
      label: LANE_CONFIG[lane].label,
      color: LANE_CONFIG[lane].color,
      bgColor: LANE_CONFIG[lane].bgColor,
      isDoneStatus: false,
      laneOrder: ROADMAP_LANES.indexOf(lane),
    }));
  }, [tags]);

  // Transform data for display
  const itemsByLane = useMemo(() => {
    if (!roadmapData) {
      return { backlog: [] as RoadmapItemData[] };
    }

    const grouped: Record<string, RoadmapItemData[]> = {
      backlog: [],
    };

    // Initialize lanes
    for (const lane of laneConfigs) {
      grouped[lane.id] = [];
    }

    // Add backlog items
    for (const item of roadmapData.backlog ?? []) {
      grouped.backlog.push(item as unknown as RoadmapItemData);
    }

    // Add roadmap items to their lanes
    for (const { lane, items } of roadmapData.lanes ?? []) {
      if (lane && grouped[lane._id]) {
        grouped[lane._id] = items as unknown as RoadmapItemData[];
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

  const calculateNewSortOrder = useCallback(
    (targetLane: string, draggedItemId: string): number => {
      const laneItems = (itemsByLane[targetLane] ?? []).filter(
        (i) => i._id !== draggedItemId
      );
      return laneItems.length === 0
        ? 1000
        : (laneItems.at(-1)?.roadmapOrder ?? 0) + 1000;
    },
    [itemsByLane]
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

      // If dropping into backlog, remove from roadmap
      if (targetLane === "backlog") {
        await moveToLane({
          feedbackId: draggedItemId as Id<"feedback">,
          laneId: undefined,
          order: 0,
        });
        return;
      }

      const newSortOrder = calculateNewSortOrder(targetLane, draggedItemId);

      await moveToLane({
        feedbackId: draggedItemId as Id<"feedback">,
        laneId: targetLane,
        order: newSortOrder,
      });
    },
    [isAdmin, getDraggedItemId, calculateNewSortOrder, moveToLane]
  );

  // Handle creating a new column
  const handleCreateColumn = async () => {
    if (!newColumnName.trim()) {
      return;
    }

    setIsCreatingColumn(true);

    try {
      await createTag({
        organizationId,
        name: newColumnName.trim(),
        color: newColumnColor,
        isDoneStatus: newColumnIsDone,
        isRoadmapLane: true,
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
                "flex min-h-[400px] min-w-[280px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-muted-foreground/30 border-dashed bg-muted/10 text-muted-foreground transition-all hover:border-primary/50 hover:bg-muted/30 hover:text-foreground"
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
