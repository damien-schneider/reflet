import { CaretDown, Sparkle, Tag, X } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getTagSwatchClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

import type { FeedbackTag } from "./feedback-metadata-types";

interface TagDisplayProps {
  isAdmin: boolean;
  validTags: FeedbackTag[];
  availableTags:
    | Array<{
        _id: Id<"tags">;
        name: string;
        color: string;
        icon?: string;
      }>
    | undefined;
  feedbackTagIds: Set<Id<"tags">>;
  onToggleTag: (tagId: Id<"tags">, isCurrentlyApplied: boolean) => void;
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
          <Badge
            className="h-8 gap-1 rounded-full px-3 font-normal text-xs"
            color={tag.color}
            key={tag._id}
          >
            {tag.icon && <span>{tag.icon}</span>}
            {tag.name}
            {tag.appliedByAi && (
              <span title="Applied by AI">
                <Sparkle className="h-3 w-3 opacity-60" weight="fill" />
              </span>
            )}
            <button
              className="ml-0.5 rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
              onClick={() => onToggleTag(tag._id, true)}
              title={`Remove ${tag.name}`}
              type="button"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex h-8 w-auto cursor-pointer select-none items-center gap-1.5 rounded-full border border-input border-dashed bg-transparent px-3 text-sm transition-colors"
            render={<button type="button" />}
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
          <Badge
            className="rounded-full px-2 py-0.5 font-normal text-xs"
            color={tag.color}
            key={tag._id}
          >
            {tag.icon && <span>{tag.icon}</span>}
            {tag.name}
            {tag.appliedByAi && (
              <span title="Applied by AI">
                <Sparkle className="h-3 w-3 opacity-60" weight="fill" />
              </span>
            )}
          </Badge>
        ))}
      </div>
    );
  }

  return null;
}
