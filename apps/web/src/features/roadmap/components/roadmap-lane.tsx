import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RoadmapItemCard,
  type RoadmapItemData,
} from "@/features/roadmap/components/roadmap-item-card";
import { getColorBadgeStyles, getTagDotColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

export interface LaneConfig {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  isDoneStatus: boolean;
  laneOrder: number;
}

interface RoadmapLaneProps {
  lane: string;
  laneConfig: LaneConfig;
  items: RoadmapItemData[];
  isAdmin?: boolean;
  draggingItemId?: string | null;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragStart: (
    e: React.DragEvent<HTMLDivElement>,
    item: RoadmapItemData
  ) => void;
  onDragEnd: () => void;
  onAddItem?: (laneId: string) => void;
  onItemClick?: (feedbackId: string) => void;
}

export function RoadmapLaneColumn({
  lane,
  laneConfig,
  items,
  isAdmin = false,
  draggingItemId,
  onDrop,
  onDragStart,
  onDragEnd,
  onAddItem,
  onItemClick,
}: RoadmapLaneProps) {
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onDrop(e);
  };

  return (
    <div
      aria-label={`${laneConfig.label} lane`}
      className={cn(
        "flex min-h-[500px] min-w-[280px] flex-col rounded-lg border",
        laneConfig.bgColor
      )}
      onDragOver={isAdmin ? handleDragOver : undefined}
      onDrop={isAdmin ? handleDrop : undefined}
      role="listbox"
      tabIndex={isAdmin ? 0 : undefined}
    >
      {/* Lane header */}
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{
          borderColor: getColorBadgeStyles(laneConfig.color).borderColor,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{
              backgroundColor: getTagDotColor(laneConfig.color),
            }}
          />
          <h3 className="font-semibold text-sm">{laneConfig.label}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
            {items.length}
          </span>
        </div>

        {isAdmin && onAddItem && lane !== "backlog" && (
          <Button
            className="h-7 w-7 p-0"
            onClick={() => onAddItem(lane)}
            size="sm"
            variant="ghost"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Items */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {items.map((item) => (
            <RoadmapItemCard
              isAdmin={isAdmin}
              isDragging={draggingItemId === item._id}
              item={item}
              key={item._id}
              onClick={onItemClick}
              onDragEnd={onDragEnd}
              onDragStart={(e) => onDragStart(e, item)}
            />
          ))}

          {items.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {lane === "backlog" ? "No items in backlog" : "Drop items here"}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
