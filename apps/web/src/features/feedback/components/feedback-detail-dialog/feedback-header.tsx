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
        <button
          className={cn(
            "flex flex-col items-center rounded-lg border p-3 transition-colors hover:bg-accent",
            feedback?.hasVoted &&
              "border-olive-600 bg-olive-600/10 text-olive-600"
          )}
          onClick={onVote}
          type="button"
        >
          <CaretUp className="size-5" />
          <span className="font-bold text-lg">{feedback?.voteCount}</span>
        </button>

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
              <PushPin className="size-4 shrink-0 text-olive-600" />
            )}
          </div>

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

          <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {formatDistanceToNow(feedback?.createdAt || 0, {
                addSuffix: true,
              })}
            </span>
            <span className="flex items-center gap-1">
              <Chat className="size-3" />
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
                      className="size-2 rounded-full"
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
                      className="size-2 rounded-full"
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
          <DropdownList>
            <DropdownListTrigger>
              <Button size="icon" variant="ghost">
                <DotsThreeVertical className="size-4" />
              </Button>
            </DropdownListTrigger>
            <DropdownListContent align="end">
              {effectiveIsAdmin && (
                <DropdownListItem onClick={onTogglePin}>
                  <PushPin className="mr-2 size-4" />
                  {feedback?.isPinned ? "Unpin" : "Pin"} feedback
                </DropdownListItem>
              )}
              {effectiveIsAdmin && <DropdownListSeparator />}
              <DropdownListItem
                className="text-destructive"
                onClick={onDeleteClick}
              >
                <Trash className="mr-2 size-4" />
                Delete feedback
              </DropdownListItem>
            </DropdownListContent>
          </DropdownList>
        )}
      </div>
    </div>
  );
}
