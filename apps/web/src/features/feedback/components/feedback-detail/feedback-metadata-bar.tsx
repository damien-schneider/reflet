"use client";

import {
  ArrowDown,
  ArrowUp,
  Bell,
  BellSlash,
  CalendarCheck,
  CaretDown,
  CaretUp,
  X,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { format, isPast, isToday } from "date-fns";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { cn } from "@/lib/utils";
import { AiAnalysisDisplay } from "./ai-analysis-display";
import { AssigneeDisplay } from "./assignee-display";
import { CopyForAgents } from "./copy-for-agents";
import type { FeedbackTag } from "./feedback-metadata-types";
import { StatusDisplay } from "./status-display";
import { TagDisplay } from "./tag-display";

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
  title: string;
  description: string | null;
  attachments?: string[];
  aiPriority?: "critical" | "high" | "medium" | "low" | "none" | null;
  aiPriorityReasoning?: string | null;
  aiComplexity?:
    | "trivial"
    | "simple"
    | "moderate"
    | "complex"
    | "very_complex"
    | null;
  aiComplexityReasoning?: string | null;
  aiTimeEstimate?: string | null;
  priority?: "critical" | "high" | "medium" | "low" | "none" | null;
  complexity?:
    | "trivial"
    | "simple"
    | "moderate"
    | "complex"
    | "very_complex"
    | null;
  timeEstimate?: string | null;
  deadline?: number | null;
}

export function FeedbackMetadataBar({
  feedbackId,
  organizationId,
  voteCount,
  userVoteType,
  organizationStatusId,
  assignee,
  isAdmin,
  tags: feedbackTags,
  title,
  description,
  attachments,
  aiPriority,
  aiPriorityReasoning,
  aiComplexity,
  aiComplexityReasoning,
  aiTimeEstimate,
  priority,
  complexity,
  timeEstimate,
  deadline,
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
  const updateAnalysis = useMutation(api.feedback_actions.updateAnalysis);
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

  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleDeadlineChange = useCallback(
    async (date: Date) => {
      await updateAnalysis({ feedbackId, deadline: date.getTime() });
      setDeadlineOpen(false);
    },
    [feedbackId, updateAnalysis]
  );

  const handleDeadlineClear = useCallback(async () => {
    await updateAnalysis({ feedbackId, clearDeadline: true });
    setDeadlineOpen(false);
  }, [feedbackId, updateAnalysis]);

  const handleToggleSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      authGuard(() => undefined);
      return;
    }
    await toggleSubscription({ feedbackId });
  }, [feedbackId, toggleSubscription, isAuthenticated, authGuard]);

  const hasDetailsContent =
    isAdmin ||
    aiPriority ||
    aiComplexity ||
    aiTimeEstimate ||
    priority ||
    complexity ||
    timeEstimate;

  return (
    <Collapsible onOpenChange={setDetailsOpen} open={detailsOpen}>
      {/* Primary row */}
      <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-6 py-3">
        <VoteButtons
          onVote={handleVote}
          userVoteType={userVoteType}
          voteCount={voteCount}
        />

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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Copy for agents (admin only) */}
        {isAdmin && (
          <CopyForAgents
            attachments={attachments}
            description={description}
            organizationId={organizationId}
            tags={feedbackTags}
            title={title}
          />
        )}

        <SubscribeButton
          isSubscribed={isSubscribed}
          onToggle={handleToggleSubscription}
        />

        {/* Details toggle */}
        {hasDetailsContent && (
          <CollapsibleTrigger
            render={
              <Button size="sm" variant="ghost">
                <span className="text-xs">Details</span>
                {detailsOpen ? (
                  <CaretUp className="h-3.5 w-3.5" />
                ) : (
                  <CaretDown className="h-3.5 w-3.5" />
                )}
              </Button>
            }
          />
        )}
      </div>

      {/* Collapsible details row */}
      <CollapsibleContent>
        <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-6 py-3">
          {/* AI Analysis (priority, complexity, time estimate) */}
          <AiAnalysisDisplay
            aiComplexity={aiComplexity}
            aiComplexityReasoning={aiComplexityReasoning}
            aiPriority={aiPriority}
            aiPriorityReasoning={aiPriorityReasoning}
            aiTimeEstimate={aiTimeEstimate}
            complexity={complexity}
            feedbackId={feedbackId}
            isAdmin={isAdmin}
            priority={priority}
            timeEstimate={timeEstimate}
          />

          {/* Deadline */}
          {isAdmin && (
            <DeadlineDisplay
              deadline={deadline}
              isOpen={deadlineOpen}
              onChange={handleDeadlineChange}
              onClear={handleDeadlineClear}
              onOpenChange={setDeadlineOpen}
            />
          )}

          {/* Assignee */}
          <AssigneeDisplay
            assignee={assignee}
            isAdmin={isAdmin}
            members={members}
            onAssigneeChange={handleAssigneeChange}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function VoteButtons({
  voteCount,
  userVoteType,
  onVote,
}: {
  voteCount: number;
  userVoteType: "upvote" | "downvote" | null;
  onVote: (voteType: "upvote" | "downvote") => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        className={cn(
          "h-8 gap-1.5 rounded-full px-3",
          userVoteType === "upvote" &&
            "border-primary bg-primary/10 text-primary"
        )}
        onClick={() => onVote("upvote")}
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
        onClick={() => onVote("downvote")}
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
  );
}

function SubscribeButton({
  isSubscribed,
  onToggle,
}: {
  isSubscribed: boolean | undefined;
  onToggle: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span />}>
        <Button
          className={cn("h-8 w-8", isSubscribed === true && "text-primary")}
          onClick={onToggle}
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
  );
}

function DeadlineDisplay({
  deadline,
  isOpen,
  onOpenChange,
  onChange,
  onClear,
}: {
  deadline?: number | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (date: Date) => void;
  onClear: () => void;
}) {
  const hasDeadline = deadline && deadline > 0;
  const deadlineDate = hasDeadline ? new Date(deadline) : null;
  const isOverdue = deadlineDate
    ? isPast(deadlineDate) && !isToday(deadlineDate)
    : false;

  return (
    <Popover onOpenChange={onOpenChange} open={isOpen}>
      {hasDeadline && deadlineDate ? (
        <PopoverTrigger
          className="flex cursor-pointer select-none items-center"
          render={<button type="button" />}
        >
          <Badge
            className={cn(
              "h-8 gap-1 rounded-full px-3 font-normal text-xs",
              isOverdue &&
                "border-destructive/30 bg-destructive/10 text-destructive"
            )}
            color={isOverdue ? "red" : "violet"}
          >
            <CalendarCheck className="h-3 w-3" />
            <span>{format(deadlineDate, "MMM d")}</span>
          </Badge>
        </PopoverTrigger>
      ) : (
        <PopoverTrigger
          className="flex h-8 cursor-pointer select-none items-center gap-1.5 rounded-full border border-input border-dashed bg-transparent px-3 text-xs transition-colors"
          render={<button type="button" />}
        >
          <CalendarCheck className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Deadline</span>
        </PopoverTrigger>
      )}
      <PopoverContent align="start" className="w-auto p-2" sideOffset={4}>
        <Calendar
          mode="single"
          onSelect={(date) => {
            if (date) {
              onChange(date);
            }
          }}
          selected={deadlineDate ?? undefined}
        />
        {hasDeadline && (
          <button
            className="flex w-full items-center justify-center gap-1 border-t pt-2 text-muted-foreground text-xs hover:text-foreground"
            onClick={onClear}
            type="button"
          >
            <X className="h-3 w-3" />
            Clear deadline
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
