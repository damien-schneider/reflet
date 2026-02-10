import { useDroppable } from "@dnd-kit/core";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";

import { getTagDotColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";
import { DraggableFeedbackCard } from "./draggable-feedback-card";
import { RoadmapColumnHeader } from "./roadmap-column-header";
import type { DroppableColumnProps } from "./roadmap-types";

export function DroppableColumn({
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
        backgroundColor: `${getTagDotColor(status.color)}${bgOpacity}`,
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
