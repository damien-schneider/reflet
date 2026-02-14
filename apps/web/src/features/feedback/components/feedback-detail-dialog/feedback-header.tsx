"use client";

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

import { Button } from "@/components/ui/button";
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListSeparator,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import { getTagDotColor } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

interface StatusData {
  _id: Id<"organizationStatuses">;
  name: string;
  color: string;
}

interface FeedbackHeaderProps {
  feedback: {
    hasVoted?: boolean;
    voteCount?: number;
    isPinned?: boolean;
    organizationStatusId?: Id<"organizationStatuses"> | null;
    commentCount?: number;
    createdAt: number;
  };
  canEdit: boolean;
  effectiveIsAdmin: boolean;
  hasUnsavedChanges: boolean;
  editedTitle: string;
  effectiveStatuses: StatusData[];
  currentStatus: StatusData | undefined;
  onTitleChange: (title: string) => void;
  onSaveChanges: () => void;
  onCancelChanges: () => void;
  onVote: () => void;
  onStatusChange: (statusId: Id<"organizationStatuses"> | null) => void;
  onTogglePin: () => void;
  onDeleteClick: () => void;
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
        {/* Vote button */}
        <button
          className={cn(
            "flex flex-col items-center rounded-lg border p-3 transition-colors hover:bg-accent",
            feedback?.hasVoted &&
              "border-olive-600 bg-olive-600/10 text-olive-600"
          )}
          onClick={onVote}
          type="button"
        >
          <CaretUp className="h-5 w-5" />
          <span className="font-bold text-lg">{feedback?.voteCount}</span>
        </button>

        <div className="flex-1">
          {/* Title */}
          <div className="flex items-center gap-2">
            <TiptapTitleEditor
              className="font-semibold text-xl"
              disabled={!canEdit}
              onChange={onTitleChange}
              placeholder="Untitled"
              value={editedTitle}
            />
            {feedback?.isPinned && (
              <PushPin className="h-4 w-4 shrink-0 text-olive-600" />
            )}
          </div>

          {/* Save/Cancel buttons for unsaved changes */}
          {hasUnsavedChanges && canEdit && (
            <div className="mt-2 flex items-center gap-2">
              <Button onClick={onSaveChanges} size="sm">
                Save
              </Button>
              <Button onClick={onCancelChanges} size="sm" variant="ghost">
                Cancel
              </Button>
            </div>
          )}

          {/* Meta info */}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(feedback?.createdAt || 0, {
                addSuffix: true,
              })}
            </span>
            <span className="flex items-center gap-1">
              <Chat className="h-3 w-3" />
              {feedback?.commentCount} comments
            </span>
          </div>
        </div>
      </div>

      {/* Status & Actions */}
      <div className="flex items-center gap-2">
        {/* Status selector (admin only) */}
        {effectiveIsAdmin && effectiveStatuses.length > 0 && (
          <Select
            onValueChange={(val) =>
              onStatusChange(val as Id<"organizationStatuses">)
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

        {/* Actions menu */}
        {canEdit && (
          <DropdownList>
            <DropdownListTrigger>
              <Button size="icon" variant="ghost">
                <DotsThreeVertical className="h-4 w-4" />
              </Button>
            </DropdownListTrigger>
            <DropdownListContent align="end">
              {effectiveIsAdmin && (
                <DropdownListItem onClick={onTogglePin}>
                  <PushPin className="mr-2 h-4 w-4" />
                  {feedback?.isPinned ? "Unpin" : "Pin"} feedback
                </DropdownListItem>
              )}
              {effectiveIsAdmin && <DropdownListSeparator />}
              <DropdownListItem
                className="text-destructive"
                onClick={onDeleteClick}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete feedback
              </DropdownListItem>
            </DropdownListContent>
          </DropdownList>
        )}
      </div>
    </div>
  );
}
