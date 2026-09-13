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
  PushPin,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { TagBadge } from "@/components/tag-badge";
import { toId } from "@/lib/convex-helpers";
import { getTagDotColor } from "@/lib/tag-colors";

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
  isPinned: boolean;
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
  createdAt,
  commentCount,
  isAdmin,
  organizationStatuses,
  currentStatus,
  organizationStatusId,
  onStatusChange,
  onTogglePin,
}: PublicFeedbackHeaderProps) {
  return (
    <div className="flex items-start justify-between border-b p-6">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {isPinned && isAdmin && <PushPin className="h-4 w-4 text-primary" />}
          <h2 className="font-semibold text-xl">{title}</h2>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDistanceToNow(createdAt, {
              addSuffix: true,
            })}
          </span>
          <span className="flex items-center gap-1">
            <Chat className="h-3 w-3" />
            {commentCount} comments
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isAdmin && organizationStatuses && organizationStatuses.length > 0 ? (
          <Select
            onValueChange={(value) =>
              onStatusChange(toId("organizationStatuses", value))
            }
            value={organizationStatusId ?? ""}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {organizationStatuses.map((status) => (
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
              render={(props) => (
                <Button {...props} iconOnly variant="ghost">
                  <DotsThreeVertical className="h-4 w-4" />
                </Button>
              )}
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onTogglePin}>
                <PushPin className="mr-2 h-4 w-4" />
                {isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
