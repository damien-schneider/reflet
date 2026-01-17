import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useAtom } from "jotai";
import { Filter, Plus, Search, SortAsc, SortDesc, X } from "lucide-react";
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
import { type SortOption, STATUS_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  feedbackSearchAtom,
  feedbackSortAtom,
  selectedStatusesAtom,
  selectedTagIdsAtom,
} from "@/store/feedback";

interface FeedbackFiltersProps {
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
export function FeedbackFilters({
  className,
  showSubmitButton = true,
  tags = [],
  onSubmitClick,
}: FeedbackFiltersProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  const [search, setSearch] = useAtom(feedbackSearchAtom);
  const [sortBy, setSortBy] = useAtom(feedbackSortAtom);
  const [selectedStatuses, setSelectedStatuses] = useAtom(selectedStatusesAtom);
  const [selectedTagIds, setSelectedTagIds] = useAtom(selectedTagIdsAtom);

  const hasFilters = selectedStatuses.length > 0 || selectedTagIds.length > 0;
  const filterCount = selectedStatuses.length + selectedTagIds.length;

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev: string[]) =>
      prev.includes(status)
        ? prev.filter((s: string) => s !== status)
        : [...prev, status]
    );
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev: string[]) =>
      prev.includes(tagId)
        ? prev.filter((t: string) => t !== tagId)
        : [...prev, tagId]
    );
  };

  const clearStatusAndTagFilters = () => {
    setSelectedStatuses([]);
    setSelectedTagIds([]);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search and main controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative max-w-sm flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search feedback..."
              type="search"
              value={search}
            />
          </div>

          {/* Filter button */}
          <Popover onOpenChange={setFilterOpen} open={filterOpen}>
            <PopoverTrigger>
              <Button className="gap-2" variant="outline">
                <Filter className="h-4 w-4" />
                Filter
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
                {/* Status filters */}
                <div>
                  <h4 className="mb-2 font-medium text-sm">Status</h4>
                  <div className="flex flex-wrap gap-1">
                    {STATUS_OPTIONS.map((option) => (
                      <Badge
                        className="cursor-pointer"
                        key={option.value}
                        onClick={() => toggleStatus(option.value)}
                        variant={
                          selectedStatuses.includes(option.value)
                            ? "default"
                            : "outline"
                        }
                      >
                        {option.label}
                      </Badge>
                    ))}
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
                {hasFilters && (
                  <Button
                    className="w-full"
                    onClick={clearStatusAndTagFilters}
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
                <SortDesc className="mr-2 h-4 w-4" />
              ) : (
                <SortAsc className="mr-2 h-4 w-4" />
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
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Active filters:</span>
          {selectedStatuses.map((status: string) => {
            const option = STATUS_OPTIONS.find((o) => o.value === status);
            return (
              <Badge
                className="cursor-pointer gap-1"
                key={status}
                onClick={() => toggleStatus(status)}
                variant="secondary"
              >
                {option?.label ?? status}
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
            onClick={clearStatusAndTagFilters}
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
