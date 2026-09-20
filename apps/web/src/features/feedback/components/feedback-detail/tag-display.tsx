import { Button } from "@ctrl-ui/react/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { CaretDown, Sparkle, Tag, X } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { TagBadge } from "@/components/tag-badge";
import { getTagSwatchClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

import type { FeedbackTag } from "./feedback-metadata-types";

interface TagDisplayProps {
  availableTags:
    | Array<{
        _id: Id<"tags">;
        name: string;
        color: string;
        icon?: string;
      }>
    | undefined;
  feedbackTagIds: Set<Id<"tags">>;
  isAdmin: boolean;
  onToggleTag: (tagId: Id<"tags">, isCurrentlyApplied: boolean) => void;
  validTags: FeedbackTag[];
}

export function TagDisplay({
  isAdmin,
  validTags,
  availableTags,
  feedbackTagIds,
  onToggleTag,
}: TagDisplayProps) {
  if (isAdmin && availableTags) {
    return (
      <div className="flex items-center gap-1.5">
        {validTags.map((tag) => (
          <TagBadge
            className="h-8 gap-1 rounded-full px-3 font-normal text-xs"
            color={tag.color}
            key={tag._id}
          >
            {tag.icon && <span>{tag.icon}</span>}
            {tag.name}
            {tag.appliedByAi && (
              <>
                <Sparkle className="h-3 w-3 opacity-60" weight="fill" />
                <span className="sr-only">Applied by AI</span>
              </>
            )}
            <Tooltip>
              <TooltipTrigger
                aria-label={`Remove ${tag.name}`}
                render={
                  <Button
                    className="ml-0.5 h-auto rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
                    onClick={() => onToggleTag(tag._id, true)}
                    variant="quiet"
                  />
                }
              >
                <X className="h-2.5 w-2.5" />
              </TooltipTrigger>
              <TooltipContent>{`Remove ${tag.name}`}</TooltipContent>
            </Tooltip>
          </TagBadge>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Add tags"
            render={
              <Button
                className="h-8 w-auto select-none gap-1.5 rounded-full border border-input border-dashed px-3 text-sm transition-colors"
                variant="quiet"
              />
            }
          >
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground text-xs">Tags</span>
            <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {availableTags.map((tag) => {
              const isApplied = feedbackTagIds.has(tag._id);
              return (
                <DropdownMenuCheckboxItem
                  checked={isApplied}
                  key={tag._id}
                  onCheckedChange={() => onToggleTag(tag._id, isApplied)}
                >
                  <div
                    className={cn(
                      "h-3 w-3 shrink-0 rounded-sm border",
                      getTagSwatchClass(tag.color)
                    )}
                  />
                  {tag.icon && <span>{tag.icon}</span>}
                  {tag.name}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  if (validTags.length > 0) {
    return (
      <div className="flex items-center gap-1.5">
        {validTags.map((tag) => (
          <TagBadge
            className="rounded-full px-2 py-0.5 font-normal text-xs"
            color={tag.color}
            key={tag._id}
          >
            {tag.icon && <span>{tag.icon}</span>}
            {tag.name}
            {tag.appliedByAi && (
              <>
                <Sparkle className="h-3 w-3 opacity-60" weight="fill" />
                <span className="sr-only">Applied by AI</span>
              </>
            )}
          </TagBadge>
        ))}
      </div>
    );
  }

  return null;
}
