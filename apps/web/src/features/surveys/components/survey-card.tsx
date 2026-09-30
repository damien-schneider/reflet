"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import {
  ArrowCounterClockwise,
  ChartBar,
  Clock,
  DotsThreeVertical,
  Pause,
  Play,
  Trash,
  XCircle,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { TagBadge } from "@/components/tag-badge";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  TRIGGER_LABELS,
} from "@/features/surveys/lib/constants";
import type { SurveyStatus, TriggerType } from "@/store/surveys";

interface SurveyCardProps {
  onDelete: (surveyId: Id<"surveys">) => void;
  onStatusChange: (surveyId: Id<"surveys">, status: SurveyStatus) => void;
  orgSlug: string;
  survey: {
    _id: Id<"surveys">;
    completionRate: number;
    createdAt: number;
    description?: string;
    questionCount: number;
    responseCount: number;
    status: SurveyStatus;
    title: string;
    triggerType: TriggerType;
  };
}

export function SurveyCard({
  survey,
  orgSlug,
  onStatusChange,
  onDelete,
}: SurveyCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="relative rounded-lg border bg-card p-4 hover:bg-accent/50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              className="truncate font-medium after:absolute after:inset-0 after:rounded-[inherit]"
              href={`/dashboard/${orgSlug}/surveys/${survey._id}`}
              title={survey.title}
            >
              {survey.title}
            </Link>
            <TagBadge color={STATUS_COLORS[survey.status]} size="sm">
              {STATUS_LABELS[survey.status]}
            </TagBadge>
          </div>
          {survey.description ? (
            <p className="mt-1 line-clamp-2 text-pretty text-muted-foreground text-sm">
              {survey.description}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs tabular-nums">
            <span className="flex items-center gap-1">
              <ChartBar aria-hidden className="size-3" />
              {survey.questionCount}{" "}
              {survey.questionCount === 1 ? "question" : "questions"}
            </span>
            <span>
              {survey.responseCount}{" "}
              {survey.responseCount === 1 ? "response" : "responses"}
            </span>
            {survey.responseCount > 0 ? (
              <span>{survey.completionRate}% completed</span>
            ) : null}
            <span className="flex items-center gap-1">
              <Clock aria-hidden className="size-3" />
              {TRIGGER_LABELS[survey.triggerType]}
            </span>
            <time
              dateTime={new Date(survey.createdAt).toISOString()}
              title={format(survey.createdAt, "PPPp")}
            >
              Created{" "}
              {formatDistanceToNow(survey.createdAt, { addSuffix: true })}
            </time>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${survey.title}`}
            className="relative"
            iconOnly
            variant="ghost"
          >
            <DotsThreeVertical aria-hidden className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <StatusMenuItems
              onStatusChange={(status) => onStatusChange(survey._id, status)}
              status={survey.status}
            />
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="menu-item-danger"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash aria-hidden className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DestructiveConfirmDialog
        confirmLabel="Delete survey"
        description="Its questions and all collected responses will be deleted. This can’t be undone."
        onConfirm={() => onDelete(survey._id)}
        onOpenChange={setConfirmDelete}
        open={confirmDelete}
        title={`Delete “${survey.title}”?`}
      />
    </div>
  );
}

function StatusMenuItems({
  status,
  onStatusChange,
}: {
  onStatusChange: (status: SurveyStatus) => void;
  status: SurveyStatus;
}) {
  if (status === "draft") {
    return (
      <DropdownMenuItem onClick={() => onStatusChange("active")}>
        <Play aria-hidden className="size-4" />
        Activate
      </DropdownMenuItem>
    );
  }
  if (status === "active") {
    return (
      <DropdownMenuItem onClick={() => onStatusChange("paused")}>
        <Pause aria-hidden className="size-4" />
        Pause
      </DropdownMenuItem>
    );
  }
  if (status === "paused") {
    return (
      <>
        <DropdownMenuItem onClick={() => onStatusChange("active")}>
          <Play aria-hidden className="size-4" />
          Resume
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStatusChange("closed")}>
          <XCircle aria-hidden className="size-4" />
          Close
        </DropdownMenuItem>
      </>
    );
  }
  return (
    <DropdownMenuItem onClick={() => onStatusChange("draft")}>
      <ArrowCounterClockwise aria-hidden className="size-4" />
      Reopen as draft
    </DropdownMenuItem>
  );
}
