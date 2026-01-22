"use client";

import {
  Bell,
  BellRinging,
  Calendar,
  CaretUp,
  Kanban,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface FeedbackSidebarProps {
  feedbackId: Id<"feedback">;
  feedback: {
    hasVoted: boolean;
    voteCount: number;
    statusId?: Id<"boardStatuses"> | null;
    boardId: Id<"boards">;
    board?: { name: string } | null;
    createdAt: number;
    author?: {
      name?: string | null;
      email?: string;
      image?: string | null;
    } | null;
  };
  isAdmin: boolean;
}

export function FeedbackSidebar({
  feedbackId,
  feedback,
  isAdmin,
}: FeedbackSidebarProps) {
  // Queries
  const boardStatuses = useQuery(api.board_statuses.list, {
    boardId: feedback.boardId,
  });
  const isSubscribed = useQuery(api.feedback_subscriptions.isSubscribed, {
    feedbackId,
  });

  // Mutations
  const toggleVote = useMutation(api.votes.toggle);
  const updateFeedbackStatus = useMutation(api.feedback_actions.updateStatus);
  const toggleSubscription = useMutation(api.feedback_subscriptions.toggle);

  const currentStatus = boardStatuses?.find((s) => s._id === feedback.statusId);

  const handleVote = useCallback(async () => {
    await toggleVote({ feedbackId, voteType: "upvote" });
  }, [feedbackId, toggleVote]);

  const handleStatusChange = useCallback(
    async (statusId: Id<"boardStatuses"> | null) => {
      if (!statusId) {
        return;
      }
      await updateFeedbackStatus({ feedbackId, statusId });
    },
    [feedbackId, updateFeedbackStatus]
  );

  const handleToggleSubscription = useCallback(async () => {
    await toggleSubscription({ feedbackId });
  }, [feedbackId, toggleSubscription]);

  return (
    <div className="flex w-full flex-col gap-6 border-t p-6 md:w-80 md:border-t-0 md:border-l">
      {/* Upvoters */}
      <div>
        <Button
          className={cn(
            "w-full justify-start gap-3",
            feedback.hasVoted &&
              "border-olive-600 bg-olive-600/10 text-olive-600"
          )}
          onClick={handleVote}
          variant="outline"
        >
          <CaretUp className="h-5 w-5" />
          <span className="font-bold">{feedback.voteCount}</span>
          <span className="text-muted-foreground">Upvoters</span>
        </Button>
      </div>

      <Separator />

      {/* Status */}
      <div>
        <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Status
        </h4>
        <StatusSection
          boardStatuses={boardStatuses}
          currentStatus={currentStatus}
          isAdmin={isAdmin}
          onStatusChange={handleStatusChange}
          statusId={feedback.statusId}
        />
      </div>

      {/* Board */}
      {feedback.board && (
        <div>
          <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Board
          </h4>
          <div className="flex items-center gap-2">
            <Kanban className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{feedback.board.name}</span>
          </div>
        </div>
      )}

      {/* Date */}
      <div>
        <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Date
        </h4>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {formatDistanceToNow(feedback.createdAt, { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Author */}
      {feedback.author && (
        <div>
          <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Author
          </h4>
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={feedback.author.image ?? undefined} />
              <AvatarFallback className="text-xs">
                {feedback.author.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">
              {feedback.author.name || "Anonymous"}
            </span>
          </div>
        </div>
      )}

      <Separator />

      {/* Subscribe */}
      <div>
        <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Subscribe to post
        </h4>
        <p className="mb-3 text-muted-foreground text-xs">
          Be notified about new comments and status updates
        </p>
        <Button
          className="w-full"
          onClick={handleToggleSubscription}
          variant={isSubscribed ? "default" : "outline"}
        >
          {isSubscribed ? (
            <>
              <BellRinging className="mr-2 h-4 w-4" />
              Subscribed
            </>
          ) : (
            <>
              <Bell className="mr-2 h-4 w-4" />
              Subscribe
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface StatusSectionProps {
  isAdmin: boolean;
  boardStatuses:
    | Array<{ _id: Id<"boardStatuses">; name: string; color: string }>
    | undefined;
  currentStatus:
    | { _id: Id<"boardStatuses">; name: string; color: string }
    | undefined;
  statusId?: Id<"boardStatuses"> | null;
  onStatusChange: (statusId: Id<"boardStatuses"> | null) => void;
}

function StatusSection({
  isAdmin,
  boardStatuses,
  currentStatus,
  statusId,
  onStatusChange,
}: StatusSectionProps) {
  if (isAdmin && boardStatuses) {
    return (
      <Select
        onValueChange={(val) => onStatusChange(val as Id<"boardStatuses">)}
        value={statusId || undefined}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Set status">
            {currentStatus && (
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: currentStatus.color }}
                />
                {currentStatus.name}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {boardStatuses.map((status) => (
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
        className="px-3 py-1"
        style={{
          backgroundColor: `${currentStatus.color}20`,
          color: currentStatus.color,
          borderColor: currentStatus.color,
        }}
        variant="outline"
      >
        {currentStatus.name}
      </Badge>
    );
  }

  return <span className="text-muted-foreground text-sm">No status</span>;
}
