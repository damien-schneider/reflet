"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { toast } from "@ctrl-ui/react/ui/toast";
import { CheckCircle, PencilSimple, Trash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";
import { useState } from "react";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import type { TimeHorizon } from "@/lib/milestone-constants";
import { getDeadlineInfo } from "@/lib/milestone-deadline";
import { getTagColorValues } from "@/lib/tag-colors";

import { MilestoneEditDialog } from "./milestone-edit-dialog";
import {
  type MilestoneAction,
  MilestoneActionsMenu,
  MilestoneContextMenu,
} from "./milestone-segment-menu";

interface MilestoneSegmentProps {
  className?: string;
  isActive: boolean;
  isAdmin?: boolean;
  milestone: {
    _id: Id<"milestones">;
    name: string;
    emoji?: string;
    color: string;
    timeHorizon: TimeHorizon;
    targetDate?: number;
    status: string;
    progress: {
      total: number;
      completed: number;
      inProgress: number;
      percentage: number;
    };
  };
  onClick: () => void;
  style?: React.CSSProperties;
}

const HATCH_PATTERN_ID = "milestone-hatch";
const HATCH_OPACITY = 0.08;
const INDICATOR_EASE = [0.2, 0, 0, 1] as const;

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
  const patternId = `${HATCH_PATTERN_ID}-${milestone._id}`;

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const updateMilestone = useMutation(api.organizations.milestones.update);
  const removeMilestone = useMutation(
    api.organizations.milestone_actions.remove
  );

  const isCompleted = milestone.status === "completed";
  const deadlineInfo = getDeadlineInfo(milestone.targetDate, milestone.status);

  const actions: MilestoneAction[] = [
    {
      icon: <PencilSimple />,
      label: "Edit",
      run: () => setEditOpen(true),
    },
    ...(isCompleted
      ? []
      : [
          {
            icon: <CheckCircle />,
            label: "Mark as complete",
            run: async () => {
              await updateMilestone({ id: milestone._id, status: "completed" });
            },
          },
        ]),
    {
      danger: true,
      icon: <Trash />,
      label: "Delete",
      run: () => setDeleteOpen(true),
    },
  ];

  const handleDelete = async () => {
    try {
      await removeMilestone({ id: milestone._id });
    } catch {
      toast.error("Couldn’t delete the milestone. Try again.");
    }
  };

  const indicatorTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: INDICATOR_EASE };

  const isOverdue = deadlineInfo?.status === "overdue";
  const overdueSuffix = isOverdue ? `, ${deadlineInfo.relativeLabel}` : "";

  const segment = (
    <div className={cn("group/seg relative", className)}>
      <button
        aria-expanded={isActive}
        aria-label={`${milestone.name}: ${percentage}% complete (${completed} of ${total})${overdueSuffix}`}
        className={cn(
          "relative h-10 w-full overflow-hidden rounded-sm bg-(--segment-fill)",
          "text-left font-medium text-band-foreground text-xs",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          "cursor-pointer select-none transition-shadow duration-200",
          isActive && "shadow-[0_1px_8px_var(--segment-glow)]"
        )}
        onClick={onClick}
        style={{
          "--segment-fill": colorValues.text,
          "--segment-glow":
            "color-mix(in oklab, var(--segment-fill) 31%, transparent)",
          ...style,
        }}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <defs>
            <pattern
              height="6"
              id={patternId}
              patternTransform="rotate(45)"
              patternUnits="userSpaceOnUse"
              width="6"
            >
              <line
                stroke="var(--band-foreground)"
                strokeOpacity={HATCH_OPACITY}
                strokeWidth="1"
                x1="0"
                x2="0"
                y1="0"
                y2="6"
              />
            </pattern>
          </defs>
          <rect fill={`url(#${patternId})`} height="100%" width="100%" />
        </svg>

        <span
          className={cn(
            "absolute inset-0 flex items-center justify-between gap-2 px-2.5 leading-none",
            isAdmin && "pr-8"
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5 truncate">
            {milestone.emoji && (
              <span className="shrink-0 text-sm">{milestone.emoji}</span>
            )}
            <span className="truncate">{milestone.name}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 opacity-0 pointer-coarse:opacity-100 transition-opacity duration-150 group-focus-within/seg:opacity-100 group-hover/seg:opacity-100">
            {deadlineInfo && (
              <span className="text-band-foreground/80 text-caption tabular-nums">
                {deadlineInfo.relativeLabel}
              </span>
            )}
            <span className="rounded bg-band-foreground/20 px-1.5 py-0.5 font-mono text-caption tabular-nums">
              {percentage}%
            </span>
          </span>
        </span>

        <m.div
          animate={{ scaleX: percentage / 100 }}
          className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-band-foreground/30"
          initial={false}
          transition={indicatorTransition}
        />
      </button>

      {isOverdue && (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-destructive"
        />
      )}

      {isActive && (
        <m.div
          animate={{ scaleX: 1 }}
          className="absolute bottom-0.5 left-[20%] h-0.5 w-[60%] rounded-full bg-(--segment-fill)"
          initial={{ scaleX: 0 }}
          style={{ "--segment-fill": colorValues.text }}
          transition={indicatorTransition}
        />
      )}

      {isAdmin && (
        <MilestoneActionsMenu
          actions={actions}
          milestoneName={milestone.name}
        />
      )}
    </div>
  );

  if (!isAdmin) {
    return <LazyMotion features={domAnimation}>{segment}</LazyMotion>;
  }

  return (
    <LazyMotion features={domAnimation}>
      <MilestoneContextMenu actions={actions}>{segment}</MilestoneContextMenu>
      <MilestoneEditDialog
        milestone={milestone}
        onOpenChange={setEditOpen}
        open={editOpen}
      />
      <DestructiveConfirmDialog
        confirmLabel="Delete milestone"
        description="Linked feedback stays on the board. This can’t be undone."
        onConfirm={handleDelete}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title={`Delete “${milestone.name}”?`}
      />
    </LazyMotion>
  );
}
