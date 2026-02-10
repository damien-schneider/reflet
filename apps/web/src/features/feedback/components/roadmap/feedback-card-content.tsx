import { CaretUp, ChatCircle, DotsSixVertical } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FeedbackItem } from "../feed-feedback-view";
import type { DragHandleListeners } from "./roadmap-types";

interface FeedbackCardContentProps {
  item: FeedbackItem;
  isDragging?: boolean;
  isOverlay?: boolean;
  isAdmin?: boolean;
  dragHandleListeners?: DragHandleListeners;
  dragHandleAttributes?: React.HTMLAttributes<HTMLButtonElement>;
}

export function FeedbackCardContent({
  item,
  isDragging,
  isOverlay,
  isAdmin,
  dragHandleListeners,
  dragHandleAttributes,
}: FeedbackCardContentProps) {
  return (
    <Card
      className={cn(
        "relative p-3 transition-all duration-200",
        "hover:scale-[1.02] hover:bg-accent/50 hover:shadow-md",
        isDragging && "opacity-50 ring-2 ring-primary",
        isOverlay && "shadow-xl ring-2 ring-primary"
      )}
    >
      {isAdmin && dragHandleListeners && (
        <button
          {...dragHandleAttributes}
          {...dragHandleListeners}
          aria-label="Drag to reorder"
          className={cn(
            "absolute top-1/2 right-1 -translate-y-1/2",
            "hidden items-center justify-center md:flex",
            "h-6 w-6 rounded text-muted-foreground/50",
            "hover:bg-muted hover:text-muted-foreground",
            "cursor-grab active:cursor-grabbing",
            "pointer-events-auto touch-none"
          )}
          type="button"
        >
          <DotsSixVertical className="h-4 w-4" weight="bold" />
        </button>
      )}
      <h4 className="pr-6 font-medium text-sm">{item.title}</h4>
      {item.tags && item.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {item.tags.slice(0, 2).map(
            (tag) =>
              tag && (
                <Badge
                  className="font-normal text-[11px]"
                  color={tag.color}
                  key={tag._id}
                >
                  {tag.icon && <span>{tag.icon}</span>}
                  {tag.name}
                </Badge>
              )
          )}
        </div>
      )}
      {item.milestones && item.milestones.length > 0 && (
        <div className="mt-1 flex gap-1">
          {item.milestones.slice(0, 2).map((m) => (
            <span className="text-xs" key={m._id} title={m.name}>
              {m.emoji ?? "🏁"}
            </span>
          ))}
          {item.milestones.length > 2 && (
            <span className="text-[10px] text-muted-foreground">
              +{item.milestones.length - 2}
            </span>
          )}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
        <CaretUp className="h-3 w-3" />
        <span>{item.voteCount}</span>
        <ChatCircle className="ml-2 h-3 w-3" />
        <span>{item.commentCount}</span>
      </div>
    </Card>
  );
}
