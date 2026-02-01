import {
  Funnel,
  MagnifyingGlass,
  Plus,
  SortAscending,
  SortDescending,
  X,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useAtom } from "jotai";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortOption } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  feedbackMagnifyingGlassAtom,
  feedbackSortAtom,
  selectedStatusIdsAtom,
  selectedTagIdsAtom,
} from "@/store/feedback";

interface FeedbackFunnelsProps {
  organizationId: Id<"organizations">;
  className?: string;
  showSubmitButton?: boolean;
  tags?: Doc<"tags">[];
  onSubmitClick?: () => void;
}

/**
 * Feedback filter controls component.
 * Uses Jotai atoms internally for state management - no props drilling needed.
 */
export function FeedbackFunnels({
  organizationId,
  className,
  showSubmitButton = true,
  tags = [],
  onSubmitClick,
}: FeedbackFunnelsProps) {
  const [filterOpen, setFunnelOpen] = useState(false);

  const [search, setMagnifyingGlass] = useAtom(feedbackMagnifyingGlassAtom);
  const [sortBy, setSortBy] = useAtom(feedbackSortAtom);
  const [selectedStatusIds, setSelectedStatusIds] = useAtom(
    selectedStatusIdsAtom
  );
  const [selectedTagIds, setSelectedTagIds] = useAtom(selectedTagIdsAtom);

  // Get organization statuses for the filter options
  const organizationStatuses = useQuery(api.organization_statuses.list, {
    organizationId,
  });

  const hasFunnels = selectedStatusIds.length > 0 || selectedTagIds.length > 0;
  const filterCount = selectedStatusIds.length + selectedTagIds.length;

  const toggleStatus = (statusId: string) => {
    setSelectedStatusIds((prev: string[]) =>
      prev.includes(statusId)
        ? prev.filter((s: string) => s !== statusId)
        : [...prev, statusId]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev: string[]) =>
      prev.includes(tagId)
        ? prev.filter((t: string) => t !== tagId)
        : [...prev, tagId]
    );
  };

  const clearStatusAndTagFunnels = () => {
    setSelectedStatusIds([]);
    setSelectedTagIds([]);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* MagnifyingGlass and main controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* MagnifyingGlass */}
          <div className="relative max-w-sm flex-1">
            <MagnifyingGlass className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(e) => setMagnifyingGlass(e.target.value)}
              placeholder="MagnifyingGlass feedback..."
              type="search"
              value={search}
            />
          </div>

          {/* Funnel button */}
          <Popover onOpenChange={setFunnelOpen} open={filterOpen}>
            <PopoverTrigger>
              <Button className="gap-2" variant="outline">
                <Funnel className="h-4 w-4" />
                Funnel
                {filterCount > 0 && (
                  <Badge
                    className="ml-1 flex h-5 w-5 items-center justify-center p-0"
                    variant="secondary"
                  >
                    {filterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <div className="space-y-4">
                {/* Status filters - dynamic from organizationStatuses */}
                <div>
                  <h4 className="mb-2 font-medium text-sm">Status</h4>
                  <div className="flex flex-wrap gap-1">
                    {organizationStatuses?.map((status) => (
                      <Badge
                        className="cursor-pointer"
                        key={status._id}
                        onClick={() => toggleStatus(status._id)}
                        style={
                          selectedStatusIds.includes(status._id)
                            ? {
                                backgroundColor: status.color,
                                borderColor: status.color,
                              }
                            : {
                                borderColor: status.color,
                                color: status.color,
                              }
                        }
                        variant={
                          selectedStatusIds.includes(status._id)
                            ? "default"
                            : "outline"
                        }
                      >
                        {status.name}
                      </Badge>
                    ))}
                    {!organizationStatuses && (
                      <span className="text-muted-foreground text-sm">
                        Loading...
                      </span>
                    )}
                  </div>
                </div>

                {/* Tag filters */}
                {tags.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-medium text-sm">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <Badge
                          className="cursor-pointer"
                          key={tag._id}
                          onClick={() => toggleTag(tag._id)}
                          style={
                            selectedTagIds.includes(tag._id)
                              ? {
                                  backgroundColor: tag.color,
                                  borderColor: tag.color,
                                }
                              : {
                                  borderColor: tag.color,
                                  color: tag.color,
                                }
                          }
                          variant={
                            selectedTagIds.includes(tag._id)
                              ? "default"
                              : "outline"
                          }
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear button */}
                {hasFunnels && (
                  <Button
                    className="w-full"
                    onClick={clearStatusAndTagFunnels}
                    size="sm"
                    variant="ghost"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Sort */}
          <Select
            onValueChange={(v) => setSortBy(v as SortOption)}
            value={sortBy}
          >
            <SelectTrigger className="w-40">
              {sortBy === "newest" || sortBy === "oldest" ? (
                <SortDescending className="mr-2 h-4 w-4" />
              ) : (
                <SortAscending className="mr-2 h-4 w-4" />
              )}
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="most_votes">Most votes</SelectItem>
              <SelectItem value="most_comments">Most comments</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showSubmitButton && onSubmitClick && (
          <Button onClick={onSubmitClick}>
            <Plus className="mr-2 h-4 w-4" />
            Submit Feedback
          </Button>
        )}
      </div>

      {/* Active filter tags */}
      {hasFunnels && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Active filters:</span>
          {selectedStatusIds.map((statusId: string) => {
            const status = organizationStatuses?.find(
              (s) => s._id === statusId
            );
            if (!status) {
              return null;
            }
            return (
              <Badge
                className="cursor-pointer gap-1"
                key={statusId}
                onClick={() => toggleStatus(statusId)}
                style={{
                  backgroundColor: `${status.color}20`,
                  color: status.color,
                }}
                variant="secondary"
              >
                {status.name}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
          {selectedTagIds.map((tagId: string) => {
            const tag = tags.find((t) => t._id === tagId);
            if (!tag) {
              return null;
            }
            return (
              <Badge
                className="cursor-pointer gap-1"
                key={tagId}
                onClick={() => toggleTag(tagId)}
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                }}
                variant="secondary"
              >
                {tag.name}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
          <Button
            className="h-6 text-xs"
            onClick={clearStatusAndTagFunnels}
            size="sm"
            variant="ghost"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

export type { FeedbackFunnelsProps as FeedbackFiltersProps };
