"use client";

import {
  ArrowDown,
  ArrowUp,
  Bell,
  BellSlash,
  Calendar,
  CaretDown,
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
import { cn } from "@/lib/utils";

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
  isAdmin: boolean;
}

export function FeedbackMetadataBar({
  feedbackId,
  organizationId,
  voteCount,
  userVoteType,
  createdAt,
  organizationStatusId,
  author,
  isAdmin,
}: FeedbackMetadataBarProps) {
  const { guard: authGuard, isAuthenticated } = useAuthGuard({
    message: "Sign in to vote on this feedback",
  });

  const organizationStatuses = useQuery(api.organization_statuses.list, {
    organizationId,
  });
  const isSubscribed = useQuery(api.feedback_subscriptions.isSubscribed, {
    feedbackId,
  });

  const toggleVote = useMutation(api.votes.toggle);
  const updateStatus = useMutation(
    api.feedback_actions.updateOrganizationStatus
  );
  const toggleSubscription = useMutation(api.feedback_subscriptions.toggle);

  const currentStatus = organizationStatuses?.find(
    (s) => s._id === organizationStatusId
  );

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
        <DropdownMenuTrigger
          className="flex h-8 w-auto cursor-pointer select-none items-center gap-2 rounded-full border border-input border-dashed bg-transparent px-3 text-sm transition-colors"
          render={<button type="button" />}
        >
          {currentStatus ? (
            <div className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: currentStatus.color }}
              />
              <span className="text-xs">{currentStatus.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">Status</span>
          )}
          <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
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
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: status.color }}
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
        className="rounded-full px-2.5 py-0.5 font-normal text-xs"
        style={{
          backgroundColor: `${currentStatus.color}15`,
          color: currentStatus.color,
          borderColor: `${currentStatus.color}30`,
        }}
        variant="outline"
      >
        {currentStatus.name}
      </Badge>
    );
  }

  return null;
}
