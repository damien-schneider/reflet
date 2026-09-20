"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import {
  Calendar,
  CaretUp,
  Chat,
  DotsThreeVertical,
  PushPin,
  Trash,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import { toId } from "@/lib/convex-helpers";
import { getTagDotColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

interface StatusData {
  _id: Id<"organizationStatuses">;
  color: string;
  name: string;
}

interface FeedbackHeaderProps {
  canEdit: boolean;
  currentStatus: StatusData | undefined;
  editedTitle: string;
  effectiveIsAdmin: boolean;
  effectiveStatuses: StatusData[];
  feedback: {
    hasVoted?: boolean;
    voteCount?: number;
    isPinned?: boolean;
    organizationStatusId?: Id<"organizationStatuses"> | null;
    commentCount?: number;
    createdAt: number;
  };
  hasUnsavedChanges: boolean;
  onCancelChanges: () => void;
  onDeleteClick: () => void;
  onSaveChanges: () => void;
  onStatusChange: (statusId: Id<"organizationStatuses"> | null) => void;
  onTitleChange: (title: string) => void;
  onTogglePin: () => void;
  onVote: () => void;
}

export function FeedbackHeader({
  feedback,
  canEdit,
  effectiveIsAdmin,
  hasUnsavedChanges,
  editedTitle,
  effectiveStatuses,
  currentStatus,
  onTitleChange,
  onSaveChanges,
  onCancelChanges,
  onVote,
  onStatusChange,
  onTogglePin,
  onDeleteClick,
}: FeedbackHeaderProps) {
  return (
    <div className="flex items-start justify-between border-b p-6">
      <div className="flex items-start gap-4">
        <Button
          aria-label={feedback?.hasVoted ? "Remove vote" : "Upvote"}
          aria-pressed={feedback?.hasVoted}
          className={cn(
            "h-auto flex-col rounded-lg border p-3 transition-colors hover:bg-accent",
            feedback?.hasVoted && "border-brand bg-brand-subtle text-brand-text"
          )}
          onClick={onVote}
          variant="quiet"
        >
          <CaretUp className="h-5 w-5" />
          <span className="font-bold text-lg tabular-nums">
            {feedback?.voteCount}
          </span>
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <TiptapTitleEditor
              className="font-semibold text-xl"
              disabled={!canEdit}
              onChange={onTitleChange}
              placeholder="Untitled"
              value={editedTitle}
            />
            {feedback?.isPinned && (
              <PushPin className="h-4 w-4 shrink-0 text-brand-text" />
            )}
          </div>

          {hasUnsavedChanges && canEdit && (
            <div className="mt-2 flex items-center gap-2">
              <Button
                onClick={onSaveChanges}
                size="xs"
                tone="primary"
                variant="solid"
              >
                Save
              </Button>
              <Button onClick={onCancelChanges} size="xs" variant="ghost">
                Cancel
              </Button>
            </div>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(feedback?.createdAt || 0, {
                addSuffix: true,
              })}
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <Chat className="h-3 w-3" />
              {feedback?.commentCount} comments
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {effectiveIsAdmin && effectiveStatuses.length > 0 && (
          <Select
            onValueChange={(val) =>
              onStatusChange(toId("organizationStatuses", val))
            }
            value={feedback?.organizationStatusId ?? undefined}
          >
            <SelectTrigger className="w-35">
              <SelectValue placeholder="Set status">
                {currentStatus && (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: getTagDotColor(currentStatus.color),
                      }}
                    />
                    {currentStatus.name}
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {effectiveStatuses.map((status) => (
                <SelectItem key={status._id} value={status._id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: getTagDotColor(status.color) }}
                    />
                    {status.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Feedback actions"
              iconOnly
              variant="ghost"
            >
              <DotsThreeVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {effectiveIsAdmin && (
                <DropdownMenuItem onClick={onTogglePin}>
                  <PushPin className="mr-2 h-4 w-4" />
                  {feedback?.isPinned ? "Unpin" : "Pin"} feedback
                </DropdownMenuItem>
              )}
              {effectiveIsAdmin && <DropdownMenuSeparator />}
              <DropdownMenuItem
                className="menu-item-danger"
                onClick={onDeleteClick}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete feedback
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
