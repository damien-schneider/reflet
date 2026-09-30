"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Chat,
  DotsThreeVertical,
  Globe,
  PushPin,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { TagBadge } from "@/components/tag-badge";
import { toId } from "@/lib/convex-helpers";
import { getTagDotColor } from "@/lib/tag-colors";
import { CommentTimestamp } from "../feedback-detail/comment-meta";
import { InternalBadge } from "../internal-badge";

interface OrganizationStatus {
  _id: Id<"organizationStatuses">;
  color: string;
  name: string;
}

interface PublicFeedbackHeaderProps {
  commentCount: number;
  createdAt: number;
  currentStatus: OrganizationStatus | undefined;
  hasVoted: boolean;
  isAdmin: boolean;
  isInternal: boolean;
  isPinned: boolean;
  onMakePublic: () => void;
  onStatusChange: (statusId: Id<"organizationStatuses"> | null) => void;
  onTogglePin: () => void;
  onVote: () => void;
  organizationStatuses: OrganizationStatus[] | undefined;
  organizationStatusId: Id<"organizationStatuses"> | null;
  primaryColor: string;
  title: string;
  voteCount: number;
}

export function PublicFeedbackHeader({
  title,
  isPinned,
  isInternal,
  createdAt,
  commentCount,
  isAdmin,
  organizationStatuses,
  currentStatus,
  organizationStatusId,
  onStatusChange,
  onMakePublic,
  onTogglePin,
}: PublicFeedbackHeaderProps) {
  return (
    <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isPinned && isAdmin && (
            <PushPin
              aria-label="Pinned"
              className="size-4 shrink-0 text-primary"
            />
          )}
          <h2 className="text-balance font-semibold text-xl">{title}</h2>
          {isInternal && <InternalBadge />}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
          <span className="flex items-center gap-1">
            <Calendar aria-hidden className="size-3.5" />
            <CommentTimestamp createdAt={createdAt} />
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <Chat aria-hidden className="size-3.5" />
            {commentCount} {commentCount === 1 ? "comment" : "comments"}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isAdmin && organizationStatuses && organizationStatuses.length > 0 ? (
          <Select
            onValueChange={(value) =>
              onStatusChange(toId("organizationStatuses", value))
            }
            value={organizationStatusId ?? ""}
          >
            <SelectTrigger aria-label="Status" className="w-40" size="sm">
              <SelectValue placeholder="Set status" />
            </SelectTrigger>
            <SelectContent>
              {organizationStatuses.map((status) => (
                <SelectItem key={status._id} value={status._id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: getTagDotColor(status.color) }}
                    />
                    {status.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          currentStatus && (
            <TagBadge color={currentStatus.color}>
              {currentStatus.name}
            </TagBadge>
          )
        )}

        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Feedback actions"
              render={(props) => (
                <Button {...props} iconOnly size="sm" variant="ghost">
                  <DotsThreeVertical className="h-4 w-4" />
                </Button>
              )}
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onTogglePin}>
                <PushPin className="mr-2 h-4 w-4" />
                {isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              {isInternal && (
                <DropdownMenuItem onClick={onMakePublic}>
                  <Globe className="mr-2 h-4 w-4" />
                  Make public
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
