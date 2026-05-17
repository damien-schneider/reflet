"use client";

import {
  Calendar,
  Chat,
  DotsThreeVertical,
  PushPin,
} from "@phosphor-icons/react";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toId } from "@/lib/convex-helpers";
import { getTagDotColor } from "@/lib/tag-colors";

type OrganizationStatus = Pick<
  Doc<"organizationStatuses">,
  "_id" | "color" | "name"
>;

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
          {isPinned && isAdmin && <PushPin className="size-4 text-primary" />}
          <h2 className="font-semibold text-xl">{title}</h2>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {formatDistanceToNow(createdAt, {
              addSuffix: true,
            })}
          </span>
          <span className="flex items-center gap-1">
            <Chat className="size-3" />
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
                      className="size-2 rounded-full"
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
            <Badge color={currentStatus.color}>{currentStatus.name}</Badge>
          )
        )}

        {isAdmin && (
          <DropdownList>
            <DropdownListTrigger
              render={(props) => (
                <Button {...props} size="icon" variant="ghost">
                  <DotsThreeVertical className="size-4" />
                </Button>
              )}
            />
            <DropdownListContent align="end">
              <DropdownListItem onClick={onTogglePin}>
                <PushPin className="mr-2 size-4" />
                {isPinned ? "Unpin" : "Pin"}
              </DropdownListItem>
            </DropdownListContent>
          </DropdownList>
        )}
      </div>
    </div>
  );
}
