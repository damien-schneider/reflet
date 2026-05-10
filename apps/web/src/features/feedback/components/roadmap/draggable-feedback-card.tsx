import { useDraggable } from "@dnd-kit/core";
import { m } from "motion/react";

import { FeedbackCardContent } from "./feedback-card-content";
import type { DraggableFeedbackCardProps } from "./roadmap-types";

export function DraggableFeedbackCard({
  item,
  isAdmin,
  onFeedbackClick,
}: DraggableFeedbackCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item._id,
    disabled: !isAdmin,
  });

  const handleFeedbackOpen = () => {
    if (!isDragging) {
      onFeedbackClick(item._id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onFeedbackClick(item._id);
    }
  };

  return (
    <m.div
      animate={{ opacity: isDragging ? 0.4 : 1, scale: isDragging ? 0.98 : 1 }}
      className="cursor-pointer"
      initial={false}
      layoutId={`feedback-card-${item._id}`}
      onClick={handleFeedbackOpen}
      onKeyDown={handleKeyDown}
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <div
        {...(isAdmin ? listeners : {})}
        className="md:pointer-events-none md:contents"
      >
        <FeedbackCardContent
          dragHandleAttributes={attributes}
          dragHandleListeners={listeners}
          isAdmin={isAdmin}
          isDragging={isDragging}
          item={item}
        />
      </div>
    </m.div>
  );
}
