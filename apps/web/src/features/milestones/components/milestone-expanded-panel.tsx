"use client";

import { CalendarBlank, MagnifyingGlass, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getDeadlineBadgeStyles,
  getDeadlineInfo,
} from "@/lib/milestone-deadline";
import { cn } from "@/lib/utils";

import { MilestoneProgressRing } from "./milestone-progress-ring";

interface MilestoneExpandedPanelProps {
  milestoneId: Id<"milestones">;
  organizationId: Id<"organizations">;
  isAdmin: boolean;
  onFeedbackClick?: (feedbackId: string) => void;
}

export function MilestoneExpandedPanel({
  milestoneId,
  organizationId,
  isAdmin,
  onFeedbackClick,
}: MilestoneExpandedPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const milestone = useQuery(api.milestones.get, { id: milestoneId });

  const allFeedback = useQuery(api.feedback_list.listByOrganization, {
    organizationId,
    search: searchQuery.trim() || undefined,
    sortBy: "votes",
    limit: 20,
  });

  const addFeedback = useMutation(api.milestones.addFeedback);
  const removeFeedbackMutation = useMutation(api.milestones.removeFeedback);

  const handleAddFeedback = useCallback(
    async (feedbackId: Id<"feedback">) => {
      await addFeedback({
        milestoneId,
        feedbackId,
      });
      setSearchQuery("");
    },
    [milestoneId, addFeedback]
  );

  const handleRemoveFeedback = useCallback(
    async (feedbackId: Id<"feedback">) => {
      await removeFeedbackMutation({
        milestoneId,
        feedbackId,
      });
    },
    [milestoneId, removeFeedbackMutation]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  if (!milestone) {
    return null;
  }

  const linkedFeedback =
    milestone.feedback?.filter(
      (fb): fb is NonNullable<typeof fb> => fb !== null && fb !== undefined
    ) ?? [];

  const linkedFeedbackIds = new Set(linkedFeedback.map((f) => f._id));
  const unlinkedFeedback =
    allFeedback?.filter((f) => !linkedFeedbackIds.has(f._id)) ?? [];

  const deadlineInfo = getDeadlineInfo(
    milestone.targetDate,
    milestone.status ?? "active"
  );
  const deadlineBadgeStyles = deadlineInfo
    ? getDeadlineBadgeStyles(deadlineInfo.status)
    : null;

  return (
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="relative p-4"
        exit={{ opacity: 0, y: -8 }}
        initial={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="flex items-start gap-6">
          {/* Left side: description */}
          {milestone.description && (
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-sm">
                {milestone.description}
              </p>
            </div>
          )}

          {/* Center: progress ring + stats */}
          <div className="flex shrink-0 flex-col items-center gap-1">
            <MilestoneProgressRing progress={milestone.progress} size={48} />
            <p className="text-muted-foreground text-xs">
              {milestone.progress.completed}/{milestone.progress.total} done
            </p>
            {milestone.progress.inProgress > 0 && (
              <p className="text-muted-foreground text-xs">
                {milestone.progress.inProgress} in progress
              </p>
            )}
            {deadlineInfo && deadlineBadgeStyles && (
              <div
                className={cn(
                  "mt-1 flex flex-col items-center gap-0.5 rounded-md border px-2 py-1",
                  deadlineBadgeStyles.bg,
                  deadlineBadgeStyles.border
                )}
              >
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs",
                    deadlineBadgeStyles.text
                  )}
                >
                  <CalendarBlank className="h-3 w-3" />
                  {deadlineInfo.label}
                </span>
                <span className={cn("text-[10px]", deadlineBadgeStyles.text)}>
                  {deadlineInfo.relativeLabel}
                </span>
              </div>
            )}
          </div>

          {/* Right side: linked feedback + admin controls */}
          {isAdmin && (
            <div className="min-w-0 flex-1">
              <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Linked Feedback ({linkedFeedback.length})
              </h4>

              {/* Linked feedback list */}
              <div className="mb-3 max-h-40 space-y-1 overflow-y-auto">
                {linkedFeedback.map((fb) => (
                  <div
                    className="group flex items-center gap-2 rounded-md p-1.5 hover:bg-accent/50"
                    key={fb._id}
                  >
                    <button
                      className="min-w-0 flex-1 text-left text-sm"
                      onClick={() => onFeedbackClick?.(fb._id)}
                      type="button"
                    >
                      <span className="line-clamp-1">{fb.title}</span>
                      <span className="flex items-center gap-2 text-muted-foreground text-xs">
                        {fb.organizationStatus && (
                          <Badge
                            className="font-normal text-[10px]"
                            color={fb.organizationStatus.color}
                          >
                            {fb.organizationStatus.name}
                          </Badge>
                        )}
                        <span>{fb.voteCount} votes</span>
                      </span>
                    </button>
                    <Button
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => handleRemoveFeedback(fb._id)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {linkedFeedback.length === 0 && (
                  <p className="py-2 text-center text-muted-foreground text-xs">
                    No feedback linked yet
                  </p>
                )}
              </div>

              {/* Search to add feedback */}
              <div className="relative mb-1">
                <MagnifyingGlass className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={handleSearchChange}
                  placeholder="Search feedback to link..."
                  value={searchQuery}
                />
              </div>
              {searchQuery && (
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-1">
                  {unlinkedFeedback.map((fb) => (
                    <button
                      className={cn(
                        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm",
                        "transition-colors hover:bg-accent/50"
                      )}
                      key={fb._id}
                      onClick={() => handleAddFeedback(fb._id)}
                      type="button"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {fb.title}
                      </span>
                      <span className="shrink-0 text-muted-foreground text-xs">
                        {fb.voteCount} votes
                      </span>
                    </button>
                  ))}
                  {unlinkedFeedback.length === 0 && (
                    <p className="py-2 text-center text-muted-foreground text-xs">
                      No matching feedback found
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Non-admin: show linked feedback as read-only */}
          {!isAdmin && linkedFeedback.length > 0 && (
            <div className="min-w-0 flex-1">
              <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Linked Feedback ({linkedFeedback.length})
              </h4>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {linkedFeedback.map((fb) => (
                  <button
                    className="flex w-full items-center gap-2 rounded-md p-1.5 text-left hover:bg-accent/50"
                    key={fb._id}
                    onClick={() => onFeedbackClick?.(fb._id)}
                    type="button"
                  >
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="line-clamp-1">{fb.title}</span>
                      <span className="flex items-center gap-2 text-muted-foreground text-xs">
                        {fb.organizationStatus && (
                          <Badge
                            className="font-normal text-[10px]"
                            color={fb.organizationStatus.color}
                          >
                            {fb.organizationStatus.name}
                          </Badge>
                        )}
                        <span>{fb.voteCount} votes</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
