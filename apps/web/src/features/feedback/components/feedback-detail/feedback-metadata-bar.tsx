"use client";

import { ArrowUp, Bell, BellSlash, Calendar } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useCallback } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  hasVoted: boolean;
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
  hasVoted,
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

  const handleVote = useCallback(async () => {
    if (!isAuthenticated) {
      authGuard(() => undefined);
      return;
    }
    await toggleVote({ feedbackId, voteType: "upvote" });
  }, [feedbackId, toggleVote, isAuthenticated, authGuard]);

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
      {/* Vote button */}
      <Button
        className={cn(
          "h-8 gap-1.5 rounded-full px-3",
          hasVoted && "border-primary bg-primary/10 text-primary"
        )}
        onClick={handleVote}
        size="sm"
        variant="outline"
      >
        <ArrowUp
          className={cn("h-3.5 w-3.5", hasVoted && "fill-current")}
          weight={hasVoted ? "fill" : "regular"}
        />
        <span className="font-semibold tabular-nums">{voteCount}</span>
      </Button>

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
        <TooltipTrigger>
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

// Extracted to avoid nested ternary
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
      <Select onValueChange={onStatusChange} value={statusId ?? undefined}>
        <SelectTrigger className="h-8 w-auto gap-2 rounded-full border-dashed px-3">
          <SelectValue placeholder="Set status">
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
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {organizationStatuses.map((status) => (
            <SelectItem key={status._id} value={status._id}>
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                {status.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
