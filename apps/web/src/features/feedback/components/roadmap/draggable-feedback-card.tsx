import { useDraggable } from "@dnd-kit/core";
import { motion } from "motion/react";

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

  const handleClick = () => {
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
    <motion.div
      animate={{ opacity: isDragging ? 0.4 : 1, scale: isDragging ? 0.98 : 1 }}
      className="cursor-pointer"
      initial={false}
      layoutId={`feedback-card-${item._id}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      {/* On mobile, apply touch listeners to the whole card for long press */}
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
    </motion.div>
  );
}
