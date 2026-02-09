import { X } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTagSwatchClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

interface FeedbackDetailSidebarProps {
  feedback: {
    voteCount: number;
    _creationTime: number;
  };
  commentsCount: number;
  feedbackTags: Array<{
    _id: string;
    name: string;
    color: string;
    icon?: string;
  } | null>;
  isAdmin: boolean;
  availableTags:
    | Array<{
        _id: string;
        name: string;
        color: string;
      }>
    | undefined;
  handleAddTag: (tagId: string | null) => void;
  handleRemoveTag: (tagId: string) => void;
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
      {/* Tags */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Tags</h3>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {feedbackTags.map((tag) =>
              tag ? (
                <Badge className="group" color={tag.color} key={tag._id}>
                  {tag.icon && <span>{tag.icon}</span>}
                  {tag.name}
                  {isAdmin && (
                    <button
                      className="ml-1 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => handleRemoveTag(tag._id)}
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
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

      {/* Status info */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Status</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Votes</span>
              <span className="font-medium">{feedback.voteCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Comments</span>
              <span className="font-medium">{commentsCount}</span>
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
