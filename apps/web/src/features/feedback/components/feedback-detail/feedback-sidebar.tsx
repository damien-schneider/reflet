"use client";

import {
  ArrowsClockwise,
  Bell,
  BellRinging,
  Calendar,
  CaretUp,
  Gauge,
  Sparkle,
  User,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useState } from "react";

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
    organizationStatusId?: Id<"organizationStatuses"> | null;
    createdAt: number;
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
  };
  organizationId?: Id<"organizations">;
  isAdmin: boolean;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Sidebar component with multiple admin-only sections
export function FeedbackSidebar({
  feedbackId,
  feedback,
  organizationId,
  isAdmin,
}: FeedbackSidebarProps) {
  // Query organization statuses
  const organizationStatuses = useQuery(
    api.organization_statuses.list,
    organizationId ? { organizationId } : "skip"
  );
  const isSubscribed = useQuery(api.feedback_subscriptions.isSubscribed, {
    feedbackId,
  });
  // Query members for assignee selector (admin only)
  const members = useQuery(
    api.members.list,
    isAdmin && organizationId ? { organizationId } : "skip"
  );
  // Query AI difficulty estimate (admin only)
  const difficultyEstimate = useQuery(
    api.feedback_clarification.getDifficultyEstimate,
    isAdmin ? { feedbackId } : "skip"
  );

  // Mutations
  const toggleVote = useMutation(api.votes.toggle);
  const updateFeedbackStatus = useMutation(
    api.feedback_actions.updateOrganizationStatus
  );
  const toggleSubscription = useMutation(api.feedback_subscriptions.toggle);
  const assignFeedback = useMutation(api.feedback_actions.assign);
  const initiateDifficultyEstimate = useMutation(
    api.feedback_clarification.initiateDifficultyEstimate
  );

  // Local state
  const [isGeneratingDifficulty, setIsGeneratingDifficulty] = useState(false);

  const currentStatus = organizationStatuses?.find(
    (s) => s._id === feedback.organizationStatusId
  );

  const handleVote = useCallback(async () => {
    await toggleVote({ feedbackId, voteType: "upvote" });
  }, [feedbackId, toggleVote]);

  const handleStatusChange = useCallback(
    async (statusId: Id<"organizationStatuses"> | null) => {
      if (!statusId) {
        return;
      }
      await updateFeedbackStatus({
        feedbackId,
        organizationStatusId: statusId,
      });
    },
    [feedbackId, updateFeedbackStatus]
  );

  const handleToggleSubscription = useCallback(async () => {
    await toggleSubscription({ feedbackId });
  }, [feedbackId, toggleSubscription]);

  const handleAssigneeChange = useCallback(
    async (assigneeId: string | null) => {
      await assignFeedback({
        feedbackId,
        assigneeId:
          !assigneeId || assigneeId === "unassigned" ? undefined : assigneeId,
      });
    },
    [feedbackId, assignFeedback]
  );

  const handleGenerateDifficulty = useCallback(async () => {
    setIsGeneratingDifficulty(true);
    try {
      await initiateDifficultyEstimate({ feedbackId });
    } finally {
      // Keep loading state until query updates with new data
      setTimeout(() => setIsGeneratingDifficulty(false), 2000);
    }
  }, [feedbackId, initiateDifficultyEstimate]);

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
          currentStatus={currentStatus}
          isAdmin={isAdmin}
          onStatusChange={handleStatusChange}
          organizationStatuses={organizationStatuses}
          statusId={feedback.organizationStatusId}
        />
      </div>

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

      {/* Assignee (admin only) */}
      {isAdmin && members && (
        <div>
          <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Assignee
          </h4>
          <Select
            onValueChange={handleAssigneeChange}
            value={feedback.assignee?.id ?? "unassigned"}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Unassigned">
                {feedback.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={feedback.assignee.image ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {feedback.assignee.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span>{feedback.assignee.name || "Unknown"}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Unassigned</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Unassigned</span>
                </div>
              </SelectItem>
              {members.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={member.user?.image ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {member.user?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span>
                      {member.user?.name || member.user?.email || "Unknown"}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* AI Difficulty Estimate (admin only) */}
      {isAdmin && (
        <div>
          <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            AI Difficulty Estimate
          </h4>
          {difficultyEstimate?.hasAiDifficulty &&
          difficultyEstimate.aiDifficultyScore ? (
            <div className="space-y-2">
              <DifficultyBadge score={difficultyEstimate.aiDifficultyScore} />
              {difficultyEstimate.aiDifficultyReasoning && (
                <p className="text-muted-foreground text-xs">
                  {difficultyEstimate.aiDifficultyReasoning}
                </p>
              )}
              <Button
                className="w-full"
                disabled={isGeneratingDifficulty}
                onClick={handleGenerateDifficulty}
                size="sm"
                variant="ghost"
              >
                {isGeneratingDifficulty ? (
                  <>
                    <ArrowsClockwise className="mr-2 h-3 w-3 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <ArrowsClockwise className="mr-2 h-3 w-3" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              disabled={isGeneratingDifficulty}
              onClick={handleGenerateDifficulty}
              variant="outline"
            >
              {isGeneratingDifficulty ? (
                <>
                  <ArrowsClockwise className="mr-2 h-4 w-4 animate-spin" />
                  Estimating...
                </>
              ) : (
                <>
                  <Sparkle className="mr-2 h-4 w-4" />
                  Estimate Difficulty
                </>
              )}
            </Button>
          )}
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
  organizationStatuses:
    | Array<{ _id: Id<"organizationStatuses">; name: string; color: string }>
    | undefined;
  currentStatus:
    | { _id: Id<"organizationStatuses">; name: string; color: string }
    | undefined;
  statusId?: Id<"organizationStatuses"> | null;
  onStatusChange: (statusId: Id<"organizationStatuses"> | null) => void;
}

function StatusSection({
  isAdmin,
  organizationStatuses,
  currentStatus,
  statusId,
  onStatusChange,
}: StatusSectionProps) {
  if (isAdmin && organizationStatuses) {
    return (
      <Select
        onValueChange={(val) =>
          onStatusChange(val as Id<"organizationStatuses">)
        }
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

const DIFFICULTY_CONFIG = {
  trivial: { label: "Trivial", color: "#22c55e", description: "< 1 hour" },
  easy: { label: "Easy", color: "#84cc16", description: "1-4 hours" },
  medium: { label: "Medium", color: "#eab308", description: "1-2 days" },
  hard: { label: "Hard", color: "#f97316", description: "3-5 days" },
  complex: { label: "Complex", color: "#ef4444", description: "1+ weeks" },
} as const;

interface DifficultyBadgeProps {
  score: "trivial" | "easy" | "medium" | "hard" | "complex";
}

function DifficultyBadge({ score }: DifficultyBadgeProps) {
  const config = DIFFICULTY_CONFIG[score];

  return (
    <div className="flex items-center gap-2">
      <Gauge className="h-4 w-4 text-muted-foreground" />
      <Badge
        className="px-3 py-1"
        style={{
          backgroundColor: `${config.color}20`,
          color: config.color,
          borderColor: config.color,
        }}
        variant="outline"
      >
        {config.label}
      </Badge>
      <span className="text-muted-foreground text-xs">
        {config.description}
      </span>
    </div>
  );
}
