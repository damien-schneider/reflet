"use client";

import { CheckCircle, PencilSimple, Trash } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ContextList,
  ContextListContent,
  ContextListItem,
  ContextListSeparator,
  ContextListTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { Input } from "@/components/ui/input";
import { NotionColorPicker } from "@/components/ui/notion-color-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TimeHorizon } from "@/lib/milestone-constants";
import { TIME_HORIZON_CONFIG, TIME_HORIZONS } from "@/lib/milestone-constants";
import { getDeadlineInfo } from "@/lib/milestone-deadline";
import type { TagColor } from "@/lib/tag-colors";
import { getTagColorValues } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

import { MilestoneDatePicker } from "./milestone-date-picker";

interface MilestoneSegmentProps {
  milestone: {
    _id: string;
    name: string;
    emoji?: string;
    color: string;
    timeHorizon: string;
    targetDate?: number;
    status: string;
    progress: {
      total: number;
      completed: number;
      inProgress: number;
      percentage: number;
    };
  };
  isActive: boolean;
  isAdmin?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
  className?: string;
}

const HATCH_PATTERN_ID = "milestone-hatch";

export function MilestoneSegment({
  milestone,
  isActive,
  isAdmin,
  onClick,
  style,
  className,
}: MilestoneSegmentProps) {
  const colorValues = getTagColorValues(milestone.color);
  const { percentage, completed, total } = milestone.progress;

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(milestone.name);
  const [editEmoji, setEditEmoji] = useState<string | undefined>(
    milestone.emoji
  );
  const [editColor, setEditColor] = useState<TagColor>(
    milestone.color as TagColor
  );
  const [editHorizon, setEditHorizon] = useState<TimeHorizon>(
    milestone.timeHorizon as TimeHorizon
  );
  const [editTargetDate, setEditTargetDate] = useState<number | undefined>(
    milestone.targetDate
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateMilestone = useMutation(api.milestones.update);
  const removeMilestone = useMutation(api.milestones.remove);

  const handleEditOpen = useCallback(() => {
    setEditName(milestone.name);
    setEditEmoji(milestone.emoji);
    setEditColor(milestone.color as TagColor);
    setEditHorizon(milestone.timeHorizon as TimeHorizon);
    setEditTargetDate(milestone.targetDate);
    setEditOpen(true);
  }, [
    milestone.name,
    milestone.emoji,
    milestone.color,
    milestone.timeHorizon,
    milestone.targetDate,
  ]);

  const handleEditSubmit = useCallback(async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      return;
    }

    setIsSubmitting(true);
    try {
      const dateCleared =
        milestone.targetDate !== undefined && editTargetDate === undefined;
      let dateUpdate: { clearTargetDate?: true; targetDate?: number } = {};
      if (dateCleared) {
        dateUpdate = { clearTargetDate: true };
      } else if (editTargetDate !== undefined) {
        dateUpdate = { targetDate: editTargetDate };
      }
      await updateMilestone({
        id: milestone._id as Id<"milestones">,
        name: trimmedName,
        emoji: editEmoji,
        color: editColor,
        timeHorizon: editHorizon,
        ...dateUpdate,
      });
      setEditOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    editName,
    editEmoji,
    editColor,
    editHorizon,
    editTargetDate,
    milestone._id,
    milestone.targetDate,
    updateMilestone,
  ]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleEditSubmit();
      }
    },
    [handleEditSubmit]
  );

  const handleComplete = useCallback(async () => {
    await updateMilestone({
      id: milestone._id as Id<"milestones">,
      status: "completed",
    });
  }, [milestone._id, updateMilestone]);

  const handleDelete = useCallback(async () => {
    await removeMilestone({ id: milestone._id as Id<"milestones"> });
  }, [milestone._id, removeMilestone]);

  const isCompleted = milestone.status === "completed";
  const deadlineInfo = getDeadlineInfo(milestone.targetDate, milestone.status);
  const isOverdue = deadlineInfo?.status === "overdue";

  const segment = (
    <div className={cn("group/seg relative", className)}>
      <motion.button
        aria-label={`${milestone.name}: ${percentage}% complete (${completed} of ${total})`}
        className={cn(
          "relative h-10 w-full overflow-hidden rounded-sm",
          "text-left font-medium text-white text-xs",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          "cursor-pointer select-none transition-shadow duration-200"
          // isActive && "ring-1 ring-white/40"
        )}
        onClick={onClick}
        style={{
          backgroundColor: colorValues.text,
          boxShadow: isActive ? `0 1px 8px ${colorValues.text}50` : undefined,
          ...style,
        }}
        type="button"
      >
        {/* Diagonal hatching overlay */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <defs>
            <pattern
              height="6"
              id={`${HATCH_PATTERN_ID}-${milestone._id}`}
              patternTransform="rotate(45)"
              patternUnits="userSpaceOnUse"
              width="6"
            >
              <line
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
                x1="0"
                x2="0"
                y1="0"
                y2="6"
              />
            </pattern>
          </defs>
          <rect
            fill={`url(#${HATCH_PATTERN_ID}-${milestone._id})`}
            height="100%"
            width="100%"
          />
        </svg>

        {/* Default state: emoji + name */}
        <span
          className={cn(
            "absolute inset-0 flex items-center gap-1.5 truncate px-2.5 leading-none",
            "transition-opacity duration-150",
            "group-hover/seg:opacity-0"
          )}
        >
          {milestone.emoji && (
            <span className="shrink-0 text-sm">{milestone.emoji}</span>
          )}
          <span className="truncate">{milestone.name}</span>
        </span>

        {/* Hover state: inline details */}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-between px-2.5 leading-none",
            "opacity-0 transition-opacity duration-150",
            "group-hover/seg:opacity-100"
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            {milestone.emoji && (
              <span className="shrink-0 text-sm">{milestone.emoji}</span>
            )}
            <span className="truncate">{milestone.name}</span>
          </span>
          <span className="ml-2 flex shrink-0 items-center gap-1.5">
            {deadlineInfo && (
              <span className="text-[10px] opacity-80">
                {deadlineInfo.relativeLabel}
              </span>
            )}
            <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
              {percentage}%
            </span>
          </span>
        </span>

        {/* Progress fill at the bottom */}
        <motion.div
          animate={{ width: `${percentage}%` }}
          className="absolute bottom-0 left-0 h-[2px] bg-white/30"
          initial={false}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
        />
      </motion.button>

      {/* Overdue dot indicator */}
      {isOverdue && (
        <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
      )}

      {/* Active state: subtle bottom highlight line */}
      {isActive && (
        <motion.div
          animate={{ width: "60%" }}
          className="absolute bottom-0.5 left-1/2 h-0.5 -translate-x-1/2 rounded-full"
          initial={{ width: 0 }}
          style={{ backgroundColor: colorValues.text }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />
      )}
    </div>
  );

  if (!isAdmin) {
    return segment;
  }

  return (
    <>
      <ContextList>
        <ContextListTrigger>{segment}</ContextListTrigger>
        <ContextListContent>
          <ContextListItem onClick={handleEditOpen}>
            <PencilSimple />
            Edit
          </ContextListItem>
          {!isCompleted && (
            <ContextListItem onClick={handleComplete}>
              <CheckCircle />
              Mark as Complete
            </ContextListItem>
          )}
          <ContextListSeparator />
          <ContextListItem onClick={handleDelete} variant="destructive">
            <Trash />
            Delete
          </ContextListItem>
        </ContextListContent>
      </ContextList>

      <Dialog onOpenChange={setEditOpen} open={editOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Edit Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <EmojiPicker onChange={setEditEmoji} value={editEmoji} />
              <Input
                autoFocus
                className="h-8 flex-1"
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleEditKeyDown}
                placeholder="Milestone name..."
                value={editName}
              />
            </div>

            <NotionColorPicker
              onChange={(c) => setEditColor(c)}
              value={editColor}
            />

            <Select
              onValueChange={(val) => setEditHorizon(val as TimeHorizon)}
              value={editHorizon}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_HORIZONS.map((h) => (
                  <SelectItem key={h} value={h}>
                    {TIME_HORIZON_CONFIG[h].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <MilestoneDatePicker
              milestoneStatus={milestone.status}
              onChange={setEditTargetDate}
              value={editTargetDate}
            />
          </div>
          <DialogFooter>
            <Button
              className="h-8 text-xs"
              onClick={() => setEditOpen(false)}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              className="h-8 text-xs"
              disabled={isSubmitting || !editName.trim()}
              onClick={handleEditSubmit}
              size="sm"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
