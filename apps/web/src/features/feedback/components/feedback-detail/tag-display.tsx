import { cn } from "@ctrl-ui/react/lib/cn";
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
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {validTags.map((tag) => (
          <TagBadge className="max-w-full" color={tag.color} key={tag._id}>
            {tag.icon && <span>{tag.icon}</span>}
            <span className="truncate" title={tag.name}>
              {tag.name}
            </span>
            {tag.appliedByAi && (
              <>
                <Sparkle aria-hidden className="opacity-60" weight="fill" />
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
                <X aria-hidden className="size-2.5" />
              </TooltipTrigger>
              <TooltipContent>{`Remove ${tag.name}`}</TooltipContent>
            </Tooltip>
          </TagBadge>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Add tags"
            className="select-none"
            render={
              <TagBadge render={<button type="button" />} variant="outline" />
            }
          >
            <Tag aria-hidden />
            <span>Tags</span>
            <CaretDown aria-hidden />
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
                  <span
                    aria-hidden
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
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
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {validTags.map((tag) => (
          <TagBadge className="max-w-full" color={tag.color} key={tag._id}>
            {tag.icon && <span>{tag.icon}</span>}
            <span className="truncate" title={tag.name}>
              {tag.name}
            </span>
            {tag.appliedByAi && (
              <>
                <Sparkle aria-hidden className="opacity-60" weight="fill" />
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
