"use client";

import {
  ArrowDown,
  ArrowUp,
  Bell,
  BellSlash,
  Calendar,
  CaretDown,
  Tag,
  User,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useCallback } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { getTagSwatchClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

interface FeedbackTag {
  _id: Id<"tags">;
  name: string;
  color: string;
  icon?: string;
}

interface FeedbackMetadataBarProps {
  feedbackId: Id<"feedback">;
  organizationId: Id<"organizations">;
  voteCount: number;
  userVoteType: "upvote" | "downvote" | null;
  createdAt: number;
  organizationStatusId?: Id<"organizationStatuses"> | null;
  author?: {
    name?: string | null;
    email?: string;
    image?: string | null;
  } | null;
  assignee?: {
    id: string;
    name?: string | null;
    email?: string;
    image?: string | null;
  } | null;
  isAdmin: boolean;
  tags?: Array<FeedbackTag | null>;
}

export function FeedbackMetadataBar({
  feedbackId,
  organizationId,
  voteCount,
  userVoteType,
  createdAt,
  organizationStatusId,
  author,
  assignee,
  isAdmin,
  tags: feedbackTags,
}: FeedbackMetadataBarProps) {
  const { guard: authGuard, isAuthenticated } = useAuthGuard({
    message: "Sign in to vote on this feedback",
  });

  const organizationStatuses = useQuery(api.organization_statuses.list, {
    organizationId,
  });
  const members = useQuery(
    api.members.list,
    isAdmin ? { organizationId } : "skip"
  );
  const availableTags = useQuery(
    api.tags.list,
    isAdmin ? { organizationId } : "skip"
  );
  const isSubscribed = useQuery(api.feedback_subscriptions.isSubscribed, {
    feedbackId,
  });

  const toggleVote = useMutation(api.votes.toggle);
  const updateStatus = useMutation(
    api.feedback_actions.updateOrganizationStatus
  );
  const assignFeedback = useMutation(api.feedback_actions.assign);
  const toggleSubscription = useMutation(api.feedback_subscriptions.toggle);
  const addTagMutation = useMutation(api.tags.addToFeedback);
  const removeTagMutation = useMutation(api.tags.removeFromFeedback);

  const currentStatus = organizationStatuses?.find(
    (s) => s._id === organizationStatusId
  );

  const validTags = (feedbackTags ?? []).filter(
    (t): t is FeedbackTag => t !== null
  );
  const feedbackTagIds = new Set(validTags.map((t) => t._id));

  const handleVote = useCallback(
    async (voteType: "upvote" | "downvote") => {
      if (!isAuthenticated) {
        authGuard(() => undefined);
        return;
      }
      await toggleVote({ feedbackId, voteType });
    },
    [feedbackId, toggleVote, isAuthenticated, authGuard]
  );

  const handleStatusChange = useCallback(
    async (statusId: Id<"organizationStatuses"> | null) => {
      if (statusId) {
        await updateStatus({
          feedbackId,
          organizationStatusId: statusId,
        });
      }
    },
    [feedbackId, updateStatus]
  );

  const handleAssigneeChange = useCallback(
    async (assigneeId: string) => {
      await assignFeedback({
        feedbackId,
        assigneeId: assigneeId === "unassigned" ? undefined : assigneeId,
      });
    },
    [feedbackId, assignFeedback]
  );

  const handleToggleTag = useCallback(
    async (tagId: Id<"tags">, isCurrentlyApplied: boolean) => {
      if (isCurrentlyApplied) {
        await removeTagMutation({ feedbackId, tagId });
      } else {
        await addTagMutation({ feedbackId, tagId });
      }
    },
    [feedbackId, addTagMutation, removeTagMutation]
  );

  const handleToggleSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      authGuard(() => undefined);
      return;
    }
    await toggleSubscription({ feedbackId });
  }, [feedbackId, toggleSubscription, isAuthenticated, authGuard]);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-6 py-3">
      {/* Vote buttons */}
      <div className="flex items-center gap-1">
        <Button
          className={cn(
            "h-8 gap-1.5 rounded-full px-3",
            userVoteType === "upvote" &&
              "border-primary bg-primary/10 text-primary"
          )}
          onClick={() => handleVote("upvote")}
          size="sm"
          variant="outline"
        >
          <ArrowUp
            className={cn(
              "h-3.5 w-3.5",
              userVoteType === "upvote" && "fill-current"
            )}
            weight={userVoteType === "upvote" ? "fill" : "regular"}
          />
          <span className="font-semibold tabular-nums">{voteCount}</span>
        </Button>
        <Button
          className={cn(
            "h-8 rounded-full px-2.5",
            userVoteType === "downvote" &&
              "border-destructive bg-destructive/10 text-destructive"
          )}
          onClick={() => handleVote("downvote")}
          size="sm"
          variant="outline"
        >
          <ArrowDown
            className={cn(
              "h-3.5 w-3.5",
              userVoteType === "downvote" && "fill-current"
            )}
            weight={userVoteType === "downvote" ? "fill" : "regular"}
          />
        </Button>
      </div>

      {/* Status */}
      <StatusDisplay
        currentStatus={currentStatus}
        isAdmin={isAdmin}
        onStatusChange={handleStatusChange}
        organizationStatuses={organizationStatuses}
        statusId={organizationStatusId}
      />

      {/* Tags */}
      <TagDisplay
        availableTags={availableTags}
        feedbackTagIds={feedbackTagIds}
        isAdmin={isAdmin}
        onToggleTag={handleToggleTag}
        validTags={validTags}
      />

      {/* Assignee */}
      <AssigneeDisplay
        assignee={assignee}
        isAdmin={isAdmin}
        members={members}
        onAssigneeChange={handleAssigneeChange}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Author */}
      {author && (
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={author.image ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {author.name?.charAt(0) ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-muted-foreground text-xs">
                {author.name ?? "Anonymous"}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Posted by {author.name ?? "Anonymous"}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Date */}
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDistanceToNow(createdAt, { addSuffix: true })}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {new Date(createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </TooltipContent>
      </Tooltip>

      {/* Subscribe button */}
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <Button
            className={cn("h-8 w-8", isSubscribed === true && "text-primary")}
            onClick={handleToggleSubscription}
            size="icon-sm"
            variant="ghost"
          >
            {isSubscribed === true ? (
              <Bell className="h-4 w-4" weight="fill" />
            ) : (
              <BellSlash className="h-4 w-4" />
            )}
            <span className="sr-only">
              {isSubscribed === true ? "Unsubscribe" : "Subscribe"} to updates
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isSubscribed === true
            ? "Unsubscribe from updates"
            : "Subscribe to updates"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

interface TagDisplayProps {
  isAdmin: boolean;
  validTags: FeedbackTag[];
  availableTags:
    | Array<{
        _id: Id<"tags">;
        name: string;
        color: string;
        icon?: string;
      }>
    | undefined;
  feedbackTagIds: Set<Id<"tags">>;
  onToggleTag: (tagId: Id<"tags">, isCurrentlyApplied: boolean) => void;
}

function TagDisplay({
  isAdmin,
  validTags,
  availableTags,
  feedbackTagIds,
  onToggleTag,
}: TagDisplayProps) {
  if (isAdmin && availableTags) {
    return (
      <DropdownMenu>
        {validTags.length > 0 ? (
          <DropdownMenuTrigger
            className="flex cursor-pointer select-none items-center gap-1.5"
            render={<button type="button" />}
          >
            {validTags.map((tag, index) => (
              <Badge
                className="h-8 rounded-full px-3 font-normal text-xs"
                color={tag.color}
                key={tag._id}
              >
                {tag.icon && <span>{tag.icon}</span>}
                {tag.name}
                {index === validTags.length - 1 && (
                  <CaretDown className="h-3 w-3 opacity-70" />
                )}
              </Badge>
            ))}
          </DropdownMenuTrigger>
        ) : (
          <DropdownMenuTrigger
            className="flex h-8 w-auto cursor-pointer select-none items-center gap-1.5 rounded-full border border-input border-dashed bg-transparent px-3 text-sm transition-colors"
            render={<button type="button" />}
          >
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground text-xs">Tags</span>
            <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent align="start" className="w-48">
          {availableTags.map((tag) => {
            const isApplied = feedbackTagIds.has(tag._id);
            return (
              <DropdownMenuCheckboxItem
                checked={isApplied}
                key={tag._id}
                onCheckedChange={() => onToggleTag(tag._id, isApplied)}
              >
                <div
                  className={cn(
                    "h-3 w-3 shrink-0 rounded-sm border",
                    getTagSwatchClass(tag.color)
                  )}
                />
                {tag.icon && <span>{tag.icon}</span>}
                {tag.name}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (validTags.length > 0) {
    return (
      <div className="flex items-center gap-1.5">
        {validTags.map((tag) => (
          <Badge
            className="rounded-full px-2 py-0.5 font-normal text-xs"
            color={tag.color}
            key={tag._id}
          >
            {tag.icon && <span>{tag.icon}</span>}
            {tag.name}
          </Badge>
        ))}
      </div>
    );
  }

  return null;
}

interface StatusDisplayProps {
  isAdmin: boolean;
  organizationStatuses:
    | Array<{ _id: Id<"organizationStatuses">; name: string; color: string }>
    | undefined;
  currentStatus:
    | { _id: Id<"organizationStatuses">; name: string; color: string }
    | undefined;
  statusId?: Id<"organizationStatuses"> | null;
  onStatusChange: (statusId: Id<"organizationStatuses"> | null) => void;
}

function StatusDisplay({
  isAdmin,
  organizationStatuses,
  currentStatus,
  statusId,
  onStatusChange,
}: StatusDisplayProps) {
  if (isAdmin && organizationStatuses) {
    return (
      <DropdownMenu>
        {currentStatus ? (
          <DropdownMenuTrigger
            className="flex cursor-pointer select-none items-center"
            render={<button type="button" />}
          >
            <Badge
              className="h-8 rounded-full px-3 font-normal text-xs"
              color={currentStatus.color}
            >
              {currentStatus.name}
              <CaretDown className="h-3 w-3 opacity-70" />
            </Badge>
          </DropdownMenuTrigger>
        ) : (
          <DropdownMenuTrigger
            className="flex h-8 w-auto cursor-pointer select-none items-center gap-1.5 rounded-full border border-input border-dashed bg-transparent px-3 text-sm transition-colors"
            render={<button type="button" />}
          >
            <span className="text-muted-foreground text-xs">Status</span>
            <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuRadioGroup
            onValueChange={(value) =>
              onStatusChange(value as Id<"organizationStatuses">)
            }
            value={statusId ?? ""}
          >
            {organizationStatuses.map((status) => (
              <DropdownMenuRadioItem key={status._id} value={status._id}>
                <div
                  className={cn(
                    "h-3 w-3 shrink-0 rounded-full border",
                    getTagSwatchClass(status.color)
                  )}
                />
                {status.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (currentStatus) {
    return (
      <Badge
        className="rounded-full px-2 py-0.5 font-normal text-xs"
        color={currentStatus.color}
      >
        {currentStatus.name}
      </Badge>
    );
  }

  return null;
}

interface AssigneeDisplayProps {
  isAdmin: boolean;
  members:
    | Array<{
        userId: string;
        user?: {
          name?: string | null;
          email?: string | null;
          image?: string | null;
        } | null;
      }>
    | undefined;
  assignee?: {
    id: string;
    name?: string | null;
    email?: string;
    image?: string | null;
  } | null;
  onAssigneeChange: (assigneeId: string) => void;
}

function AssigneeDisplay({
  isAdmin,
  members,
  assignee,
  onAssigneeChange,
}: AssigneeDisplayProps) {
  if (!(isAdmin && members)) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 w-auto cursor-pointer select-none items-center gap-2 rounded-full border border-input border-dashed bg-transparent px-3 text-sm transition-colors"
        render={<button type="button" />}
      >
        {assignee ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-4 w-4">
              <AvatarImage src={assignee.image ?? undefined} />
              <AvatarFallback className="text-[8px]">
                {assignee.name?.charAt(0) ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs">
              {assignee.name ?? assignee.email ?? "Unknown"}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">Assignee</span>
        )}
        <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuRadioGroup
          onValueChange={onAssigneeChange}
          value={assignee?.id ?? "unassigned"}
        >
          <DropdownMenuRadioItem value="unassigned">
            <User className="h-4 w-4 text-muted-foreground" />
            Unassigned
          </DropdownMenuRadioItem>
          {members.map((member) => (
            <DropdownMenuRadioItem key={member.userId} value={member.userId}>
              <Avatar className="h-5 w-5">
                <AvatarImage src={member.user?.image ?? undefined} />
                <AvatarFallback className="text-[8px]">
                  {member.user?.name?.charAt(0) ?? "?"}
                </AvatarFallback>
              </Avatar>
              {member.user?.name ?? member.user?.email ?? "Unknown"}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
