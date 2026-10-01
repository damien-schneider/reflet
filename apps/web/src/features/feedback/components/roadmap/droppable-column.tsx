import { useDroppable } from "@dnd-kit/core";

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
    data: {
      statusId: status._id,
      type: "column",
    },
    id: status._id,
  });

  return (
    <section
      aria-label={status.name}
      className={cn(
        "group w-72 shrink-0 rounded-lg p-4 outline-2 outline-transparent -outline-offset-2 transition-[background-color,outline-color] duration-(--duration-fast) ease-(--ease-standard)",
        isOver ? "bg-accent outline-dashed outline-ring/50" : "bg-muted/30"
      )}
      ref={setNodeRef}
    >
      <RoadmapColumnHeader
        color={status.color}
        count={items.length}
        isAdmin={isAdmin}
        name={status.name}
        onDelete={onDeleteClick}
        semanticStatus={status.semanticStatus}
        statusId={status._id}
      />
      <div
        className="min-h-24 space-y-2"
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
              "flex min-h-24 items-center justify-center rounded-md border border-transparent border-dashed text-muted-foreground text-sm",
              isDragging && "border-border",
              isOver && "text-foreground"
            )}
          >
            {isDragging ? "Drop here" : "Nothing here yet"}
          </p>
        )}
      </div>
    </section>
  );
}
