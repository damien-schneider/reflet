import { Button } from "@ctrl-ui/react/ui/button";
import { Card, CardContent, CardHeader } from "@ctrl-ui/react/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { X } from "@phosphor-icons/react";
import { TagBadge } from "@/components/tag-badge";
import { getTagSwatchClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

interface FeedbackDetailSidebarProps {
  availableTags:
    | Array<{
        _id: string;
        name: string;
        color: string;
      }>
    | undefined;
  commentsCount: number;
  feedback: {
    voteCount: number;
    _creationTime: number;
  };
  feedbackTags: Array<{
    _id: string;
    name: string;
    color: string;
    icon?: string;
  } | null>;
  handleAddTag: (tagId: string | null) => void;
  handleRemoveTag: (tagId: string) => void;
  isAdmin: boolean;
}

export function FeedbackDetailSidebar({
  feedback,
  commentsCount,
  feedbackTags,
  isAdmin,
  availableTags,
  handleAddTag,
  handleRemoveTag,
}: FeedbackDetailSidebarProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Tags</h3>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {feedbackTags.map((tag) =>
              tag ? (
                <TagBadge className="group" color={tag.color} key={tag._id}>
                  {tag.icon && <span>{tag.icon}</span>}
                  {tag.name}
                  {isAdmin && (
                    <Tooltip>
                      <TooltipTrigger
                        aria-label={`Remove ${tag.name} tag`}
                        render={
                          <Button
                            className="pointer-fine:pointer-events-none ml-1 h-auto p-0 pointer-fine:opacity-0 transition-opacity focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
                            onClick={() => handleRemoveTag(tag._id)}
                            variant="quiet"
                          />
                        }
                      >
                        <X className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>Remove tag</TooltipContent>
                    </Tooltip>
                  )}
                </TagBadge>
              ) : null
            )}
            {feedbackTags.length === 0 && (
              <p className="text-muted-foreground text-sm">No tags</p>
            )}
          </div>
          {isAdmin && availableTags && availableTags.length > 0 && (
            <div className="mt-4">
              <Select onValueChange={handleAddTag}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTags.map((tag) => (
                    <SelectItem key={tag._id} value={tag._id}>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-3 w-3 shrink-0 rounded-sm border",
                            getTagSwatchClass(tag.color)
                          )}
                        />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold">Status</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Votes</span>
              <span className="font-medium tabular-nums">
                {feedback.voteCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Comments</span>
              <span className="font-medium tabular-nums">{commentsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">
                {new Date(feedback._creationTime).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
