import { Chat } from "@phosphor-icons/react";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { VoteButton } from "@/features/feedback/components/vote-button";
import { cn } from "@/lib/utils";

export interface RoadmapItemData {
  _id: Id<"feedback">;
  title: string;
  description: string;
  status: Doc<"feedback">["status"];
  voteCount: number;
  commentCount: number;
  organizationStatusId: Id<"organizationStatuses"> | null;
  roadmapOrder: number | null;
  hasVoted?: boolean;
  tags?: Array<{
    _id: Id<"tags">;
    name: string;
    color: string;
    icon?: string;
  }>;
}

interface RoadmapItemCardProps {
  item: RoadmapItemData;
  isDragging?: boolean;
  isAdmin?: boolean;
  onClick?: (feedbackId: string) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
}

export function RoadmapItemCard({
  item,
  isDragging = false,
  isAdmin = false,
  onClick,
  onDragStart,
  onDragEnd,
}: RoadmapItemCardProps) {
  const tags = item.tags ?? [];

  return (
    <div
      aria-label={item.title}
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm transition-all",
        isDragging && "opacity-50 ring-2 ring-primary",
        isAdmin && "cursor-grab active:cursor-grabbing"
      )}
      draggable={isAdmin}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
      role="option"
      tabIndex={isAdmin ? 0 : undefined}
    >
      {/* Header with vote button */}
      <div className="mb-2 flex items-start gap-3">
        <VoteButton
          feedbackId={item._id}
          hasVoted={item.hasVoted}
          size="sm"
          voteCount={item.voteCount}
        />

        <div className="min-w-0 flex-1">
          <button
            className="group text-left"
            onClick={() => onClick?.(item._id)}
            type="button"
          >
            <h4 className="line-clamp-2 font-medium text-sm transition-colors group-hover:text-olive-600">
              {item.title}
            </h4>
          </button>

          {/* Comment count */}
          <div className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
            <Chat className="h-3 w-3" />
            <span>{item.commentCount}</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <Badge
              className="font-normal text-xs"
              color={tag.color}
              key={tag._id}
            >
              {tag.icon && <span>{tag.icon}</span>}
              {tag.name}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge className="text-xs" variant="outline">
              +{tags.length - 3}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
