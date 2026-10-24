import { cn } from "@ctrl-ui/react/lib/cn";
import { Card, CardContent, CardLink } from "@ctrl-ui/react/ui/card";
import { CaretUp, ChatCircle, Sparkle } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { TagBadge } from "@/components/tag-badge";
import { FeedbackPropertiesPopover } from "@/features/feedback/components/properties/feedback-properties-popover";
import { FeedbackPropertySummary } from "@/features/feedback/components/properties/feedback-property-summary";
import type { FeedbackItem } from "../feed-feedback-view";

const MAX_VISIBLE_TAGS = 2;
const MAX_VISIBLE_MILESTONES = 2;

interface FeedbackCardContentProps {
  dragHandle?: ReactNode;
  isOverlay?: boolean;
  item: FeedbackItem;
  onOpen?: () => void;
}

function CardTitle({
  item,
  onOpen,
}: {
  item: FeedbackItem;
  onOpen?: () => void;
}) {
  const content = <>{item.title}</>;

  if (!onOpen) {
    return <h4 className="text-pretty font-medium text-sm">{content}</h4>;
  }

  return (
    <h4 className="text-pretty font-medium text-sm">
      <CardLink onClick={onOpen}>{content}</CardLink>
    </h4>
  );
}

function CardMilestones({
  milestones,
}: {
  milestones: NonNullable<FeedbackItem["milestones"]>;
}) {
  const hidden = milestones.length - MAX_VISIBLE_MILESTONES;
  return (
    <div className="flex gap-1">
      {milestones.slice(0, MAX_VISIBLE_MILESTONES).map((m) => (
        <span aria-label={m.name} className="text-xs" key={m._id} role="img">
          {m.emoji ?? "🏁"}
        </span>
      ))}
      {hidden > 0 && (
        <span className="text-micro text-muted-foreground tabular-nums">
          +{hidden}
        </span>
      )}
    </div>
  );
}

export function FeedbackCardContent({
  item,
  isOverlay,
  dragHandle,
  onOpen,
}: FeedbackCardContentProps) {
  const tags =
    item.tags?.filter((tag): tag is NonNullable<typeof tag> => tag !== null) ??
    [];

  return (
    <Card
      className={cn(
        "relative [--cui-card-padding-block:calc(var(--spacing)*3)] [--cui-card-padding-inline:calc(var(--spacing)*3)]",
        isOverlay && "[--cui-card-shadow:var(--reflet-popup-shadow)]"
      )}
    >
      {dragHandle}
      <CardContent className="flex flex-col gap-2">
        <div className={cn(dragHandle && "pr-6")}>
          <CardTitle item={item} onOpen={onOpen} />
        </div>
        <FeedbackPropertySummary feedback={item} />
        {item.isMember && <FeedbackPropertiesPopover feedbackId={item._id} />}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
              <TagBadge color={tag.color} key={tag._id} size="sm">
                {tag.icon && <span>{tag.icon}</span>}
                {tag.name}
                {tag.appliedByAi && (
                  <>
                    <Sparkle aria-hidden className="opacity-60" weight="fill" />
                    <span className="sr-only">Applied by AI</span>
                  </>
                )}
              </TagBadge>
            ))}
          </div>
        )}
        {item.milestones && item.milestones.length > 0 && (
          <CardMilestones milestones={item.milestones} />
        )}
        <div className="flex items-center gap-3 text-muted-foreground text-xs">
          <span className="flex items-center gap-1">
            <CaretUp aria-hidden className="size-3" />
            <span className="tabular-nums">{item.voteCount}</span>
            <span className="sr-only">votes</span>
          </span>
          <span className="flex items-center gap-1">
            <ChatCircle aria-hidden className="size-3" />
            <span className="tabular-nums">{item.commentCount}</span>
            <span className="sr-only">comments</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
