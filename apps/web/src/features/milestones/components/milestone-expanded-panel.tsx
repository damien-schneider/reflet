"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { toast } from "@ctrl-ui/react/ui/toast";
import { CalendarBlank, MagnifyingGlass, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { type ComponentProps, useState } from "react";
import { TagBadge } from "@/components/tag-badge";
import {
  getDeadlineBadgeStyles,
  getDeadlineInfo,
} from "@/lib/milestone-deadline";

import { MilestoneProgressRing } from "./milestone-progress-ring";

interface MilestoneExpandedPanelProps {
  isAdmin: boolean;
  milestoneId: Id<"milestones">;
  onFeedbackClick?: (feedbackId: string) => void;
  organizationId: Id<"organizations">;
}

interface LinkedFeedback {
  _id: Id<"feedback">;
  organizationStatus?: { color: string; name: string } | null;
  title: string;
  voteCount: number;
}

function formatVotes(count: number) {
  return `${count} ${count === 1 ? "vote" : "votes"}`;
}

function LinkedFeedbackRow({
  feedback,
  onOpen,
  onRemove,
}: {
  feedback: LinkedFeedback;
  onOpen?: () => void;
  onRemove?: () => void;
}) {
  return (
    <li className="group flex items-center gap-2 rounded-md p-1.5 hover:bg-accent/50">
      <button
        className="min-w-0 flex-1 text-left text-sm"
        onClick={onOpen}
        type="button"
      >
        <span className="line-clamp-1">{feedback.title}</span>
        <span className="flex items-center gap-2 text-muted-foreground text-xs">
          {feedback.organizationStatus && (
            <TagBadge color={feedback.organizationStatus.color} size="sm">
              {feedback.organizationStatus.name}
            </TagBadge>
          )}
          <span className="tabular-nums">
            {formatVotes(feedback.voteCount)}
          </span>
        </span>
      </button>
      {onRemove && (
        <Button
          aria-label={`Unlink ${feedback.title}`}
          className="pointer-fine:opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
          iconOnly
          onClick={onRemove}
          size="xs"
          variant="ghost"
        >
          <X aria-hidden />
        </Button>
      )}
    </li>
  );
}

function MilestoneStats({
  progress,
  targetDate,
  status,
}: {
  progress: ComponentProps<typeof MilestoneProgressRing>["progress"];
  status: string;
  targetDate?: number;
}) {
  const deadlineInfo = getDeadlineInfo(targetDate, status);
  const deadlineBadgeStyles = deadlineInfo
    ? getDeadlineBadgeStyles(deadlineInfo.status)
    : null;

  return (
    <div className="flex shrink-0 flex-col items-center gap-1 text-muted-foreground text-xs tabular-nums">
      <MilestoneProgressRing progress={progress} size={48} />
      <p>
        {progress.completed}/{progress.total} done
      </p>
      {progress.inProgress > 0 && <p>{progress.inProgress} in progress</p>}
      {deadlineInfo && deadlineBadgeStyles && (
        <div
          className={cn(
            "mt-1 flex flex-col items-center gap-0.5 rounded-md border px-2 py-1",
            deadlineBadgeStyles.bg,
            deadlineBadgeStyles.border,
            deadlineBadgeStyles.text
          )}
        >
          <span className="flex items-center gap-1">
            <CalendarBlank aria-hidden className="size-3" />
            {deadlineInfo.label}
          </span>
          <span className="text-caption">{deadlineInfo.relativeLabel}</span>
        </div>
      )}
    </div>
  );
}

function LinkCandidateList({
  candidates,
  onLink,
}: {
  candidates: LinkedFeedback[];
  onLink: (feedbackId: Id<"feedback">) => void;
}) {
  return (
    <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-1">
      {candidates.map((fb) => (
        <button
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/50"
          key={fb._id}
          onClick={() => onLink(fb._id)}
          type="button"
        >
          <span className="min-w-0 flex-1 truncate">{fb.title}</span>
          <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
            {formatVotes(fb.voteCount)}
          </span>
        </button>
      ))}
      {candidates.length === 0 && (
        <p className="py-2 text-center text-muted-foreground text-xs">
          No matching feedback
        </p>
      )}
    </div>
  );
}

function FeedbackLinkSearch({
  milestoneId,
  organizationId,
  linkedFeedbackIds,
}: {
  linkedFeedbackIds: Set<Id<"feedback">>;
  milestoneId: Id<"milestones">;
  organizationId: Id<"organizations">;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const allFeedback = useQuery(api.feedback.list.listByOrganization, {
    limit: 20,
    organizationId,
    search: searchQuery.trim() || undefined,
    sortBy: "votes",
  });
  const addFeedback = useMutation(
    api.organizations.milestone_actions.addFeedback
  );

  const handleAddFeedback = async (feedbackId: Id<"feedback">) => {
    try {
      await addFeedback({ feedbackId, milestoneId });
      setSearchQuery("");
    } catch {
      toast.error("Couldn’t link that feedback. Try again.");
    }
  };

  return (
    <>
      <div className="relative mb-1">
        <MagnifyingGlass
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label="Search feedback to link"
          className="pl-9"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search feedback to link…"
          type="search"
          value={searchQuery}
        />
      </div>
      {searchQuery && (
        <LinkCandidateList
          candidates={
            allFeedback?.filter((f) => !linkedFeedbackIds.has(f._id)) ?? []
          }
          onLink={handleAddFeedback}
        />
      )}
    </>
  );
}

function LinkedFeedbackSection({
  linkedFeedback,
  milestoneId,
  organizationId,
  isAdmin,
  onFeedbackClick,
}: MilestoneExpandedPanelProps & { linkedFeedback: LinkedFeedback[] }) {
  const removeFeedback = useMutation(
    api.organizations.milestone_actions.removeFeedback
  );

  const handleRemoveFeedback = async (feedbackId: Id<"feedback">) => {
    try {
      await removeFeedback({ feedbackId, milestoneId });
    } catch {
      toast.error("Couldn’t unlink that feedback. Try again.");
    }
  };

  return (
    <div className="min-w-0 flex-1">
      <h4 className="mb-2 font-medium text-muted-foreground text-xs tabular-nums">
        Linked feedback ({linkedFeedback.length})
      </h4>

      <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto">
        {linkedFeedback.map((fb) => (
          <LinkedFeedbackRow
            feedback={fb}
            key={fb._id}
            onOpen={() => onFeedbackClick?.(fb._id)}
            onRemove={isAdmin ? () => handleRemoveFeedback(fb._id) : undefined}
          />
        ))}
      </ul>
      {isAdmin && linkedFeedback.length === 0 && (
        <p className="mb-3 py-2 text-center text-muted-foreground text-xs">
          No feedback linked yet
        </p>
      )}

      {isAdmin && (
        <FeedbackLinkSearch
          linkedFeedbackIds={new Set(linkedFeedback.map((f) => f._id))}
          milestoneId={milestoneId}
          organizationId={organizationId}
        />
      )}
    </div>
  );
}

export function MilestoneExpandedPanel(props: MilestoneExpandedPanelProps) {
  const milestone = useQuery(api.organizations.milestones.get, {
    id: props.milestoneId,
  });

  if (!milestone) {
    return null;
  }

  const linkedFeedback =
    milestone.feedback?.filter(
      (fb): fb is NonNullable<typeof fb> => fb !== null && fb !== undefined
    ) ?? [];

  return (
    <div className="flex items-start gap-6 p-4">
      {milestone.description && (
        <p className="min-w-0 flex-1 text-pretty text-muted-foreground text-sm">
          {milestone.description}
        </p>
      )}

      <MilestoneStats
        progress={milestone.progress}
        status={milestone.status ?? "active"}
        targetDate={milestone.targetDate}
      />

      {(props.isAdmin || linkedFeedback.length > 0) && (
        <LinkedFeedbackSection {...props} linkedFeedback={linkedFeedback} />
      )}
    </div>
  );
}
