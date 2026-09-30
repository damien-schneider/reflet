import { Button } from "@ctrl-ui/react/ui/button";
import { useDraggable } from "@dnd-kit/core";
import { DotsSixVertical } from "@phosphor-icons/react";
import { m, useReducedMotion } from "motion/react";

import { FeedbackCardContent } from "./feedback-card-content";
import type { DraggableFeedbackCardProps } from "./roadmap-types";

export function DraggableFeedbackCard({
  item,
  isAdmin,
  onFeedbackClick,
}: DraggableFeedbackCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useDraggable({
      disabled: !isAdmin,
      id: item._id,
    });
  const shouldReduceMotion = useReducedMotion();

  const dragHandle = isAdmin ? (
    <Button
      {...attributes}
      aria-label={`Move ${item.title}`}
      className="absolute top-2 right-2 z-10 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      iconOnly
      ref={setActivatorNodeRef}
      size="xs"
      variant="ghost"
    >
      <DotsSixVertical aria-hidden weight="bold" />
    </Button>
  ) : undefined;

  return (
    <m.div
      {...(isAdmin ? listeners : {})}
      layoutId={shouldReduceMotion ? undefined : `feedback-card-${item._id}`}
      ref={setNodeRef}
      transition={{ bounce: 0, duration: 0.25, type: "spring" }}
    >
      <FeedbackCardContent
        dragHandle={dragHandle}
        isDragging={isDragging}
        item={item}
        onOpen={() => {
          if (!isDragging) {
            onFeedbackClick(item._id);
          }
        }}
      />
    </m.div>
  );
}
