import { Button } from "@ctrl-ui/react/ui/button";
import { Card } from "@ctrl-ui/react/ui/card";
import {
  CaretUp,
  ChatCircle,
  DotsSixVertical,
  Sparkle,
} from "@phosphor-icons/react";
import { TagBadge } from "@/components/tag-badge";
import { cn } from "@/lib/utils";
import type { FeedbackItem } from "../feed-feedback-view";
import type { DragHandleListeners } from "./roadmap-types";

interface FeedbackCardContentProps {
  dragHandleAttributes?: React.HTMLAttributes<HTMLButtonElement>;
  dragHandleListeners?: DragHandleListeners;
  isAdmin?: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
  item: FeedbackItem;
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
        "relative p-3 transition-[transform,background-color,box-shadow] duration-200",
        "hover:scale-[1.02] hover:bg-accent/50 hover:shadow-md",
        isDragging && "opacity-50 ring-2 ring-primary",
        isOverlay && "shadow-xl ring-2 ring-primary"
      )}
    >
      {isAdmin && dragHandleListeners && (
        <Button
          {...dragHandleAttributes}
          {...dragHandleListeners}
          aria-label="Drag to reorder"
          className={cn(
            "absolute top-1/2 right-1 -translate-y-1/2",
            "hidden md:flex",
            "h-6 w-6 rounded text-muted-foreground/50",
            "hover:bg-muted hover:text-muted-foreground",
            "cursor-grab active:cursor-grabbing",
            "pointer-events-auto touch-none"
          )}
          variant="quiet"
        >
          <DotsSixVertical className="h-4 w-4" weight="bold" />
        </Button>
      )}
      <h4 className="pr-6 font-medium text-sm">{item.title}</h4>
      {item.tags && item.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {item.tags.slice(0, 2).map(
            (tag) =>
              tag && (
                <TagBadge
                  className="font-normal text-caption"
                  color={tag.color}
                  key={tag._id}
                >
                  {tag.icon && <span>{tag.icon}</span>}
                  {tag.name}
                  {tag.appliedByAi && (
                    <>
                      <Sparkle
                        className="h-2.5 w-2.5 opacity-60"
                        weight="fill"
                      />
                      <span className="sr-only">Applied by AI</span>
                    </>
                  )}
                </TagBadge>
              )
          )}
        </div>
      )}
      {item.milestones && item.milestones.length > 0 && (
        <div className="mt-1 flex gap-1">
          {item.milestones.slice(0, 2).map((m) => (
            <span
              aria-label={m.name}
              className="text-xs"
              key={m._id}
              role="img"
            >
              {m.emoji ?? "🏁"}
            </span>
          ))}
          {item.milestones.length > 2 && (
            <span className="text-micro text-muted-foreground">
              +{item.milestones.length - 2}
            </span>
          )}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
        <CaretUp className="h-3 w-3" />
        <span className="tabular-nums">{item.voteCount}</span>
        <ChatCircle className="ml-2 h-3 w-3" />
        <span className="tabular-nums">{item.commentCount}</span>
      </div>
    </Card>
  );
}
