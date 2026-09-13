"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import {
  ChartBar,
  Clock,
  DotsThreeVertical,
  Pause,
  Play,
  Trash,
  XCircle,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { TagBadge } from "@/components/tag-badge";
import {
  STATUS_COLORS,
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
  return (
    <div className="group relative rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50">
      <div className="flex items-start justify-between gap-4">
        <Link
          className="flex-1"
          href={`/dashboard/${orgSlug}/surveys/${survey._id}`}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{survey.title}</span>
            <TagBadge color={STATUS_COLORS[survey.status]}>
              {survey.status}
            </TagBadge>
          </div>
          {survey.description ? (
            <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
              {survey.description}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <ChartBar className="size-3" />
              {survey.questionCount} questions
            </span>
            <span>{survey.responseCount} responses</span>
            <span>{survey.completionRate}% completion</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {TRIGGER_LABELS[survey.triggerType]}
            </span>
            <span>
              {formatDistanceToNow(survey.createdAt, { addSuffix: true })}
            </span>
          </div>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(props: React.ComponentProps<"button">) => (
              <Button
                {...props}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                iconOnly
                variant="ghost"
              >
                <DotsThreeVertical className="size-4" />
              </Button>
            )}
          />
          <DropdownMenuContent align="end">
            {survey.status === "draft" ? (
              <DropdownMenuItem
                onClick={() => onStatusChange(survey._id, "active")}
              >
                <Play className="mr-2 size-4" />
                Activate
              </DropdownMenuItem>
            ) : null}
            {survey.status === "active" ? (
              <DropdownMenuItem
                onClick={() => onStatusChange(survey._id, "paused")}
              >
                <Pause className="mr-2 size-4" />
                Pause
              </DropdownMenuItem>
            ) : null}
            {survey.status === "paused" ? (
              <>
                <DropdownMenuItem
                  onClick={() => onStatusChange(survey._id, "active")}
                >
                  <Play className="mr-2 size-4" />
                  Resume
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onStatusChange(survey._id, "closed")}
                >
                  <XCircle className="mr-2 size-4" />
                  Close
                </DropdownMenuItem>
              </>
            ) : null}
            {survey.status === "closed" ? (
              <DropdownMenuItem
                onClick={() => onStatusChange(survey._id, "draft")}
              >
                <Play className="mr-2 size-4" />
                Reopen as Draft
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(survey._id)}>
              <Trash className="mr-2 size-4 text-destructive" />
              <span className="text-destructive">Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
