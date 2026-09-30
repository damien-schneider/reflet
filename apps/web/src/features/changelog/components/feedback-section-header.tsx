"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Check, Sparkle } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useId } from "react";
import { type FeedbackStatus, STATUS_CONFIG } from "@/lib/constants";

export type FeedbackLinkStatus = "keep" | FeedbackStatus;

const LINK_STATUS_ORDER = [
  "completed",
  "closed",
  "in_progress",
  "planned",
  "open",
] as const satisfies readonly FeedbackStatus[];

const LINK_STATUS_OPTIONS = [
  { label: "Keep current status", value: "keep" },
  ...LINK_STATUS_ORDER.map((value) => ({
    label: STATUS_CONFIG[value].label,
    value,
  })),
];

interface FeedbackSectionHeaderProps {
  availableFeedback: Array<{ _id: Id<"feedback"> }> | undefined;
  description: string;
  isMatching: boolean;
  linkedCount: number;
  linkStatus: FeedbackLinkStatus;
  onLinkStatusChange: (status: FeedbackLinkStatus) => void;
  onTriggerMatching: () => void;
  releaseId: Id<"releases"> | null;
}

export function FeedbackSectionHeader({
  linkedCount,
  releaseId,
  isMatching,
  description,
  availableFeedback,
  linkStatus,
  onLinkStatusChange,
  onTriggerMatching,
}: FeedbackSectionHeaderProps) {
  const linkStatusLabelId = useId();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-medium text-sm">
          <Check aria-hidden="true" className="size-4 text-muted-foreground" />
          Linked feedback
          {linkedCount > 0 && (
            <Badge className="tabular-nums" size="sm">
              {linkedCount}
            </Badge>
          )}
        </h3>

        {releaseId && (
          <Button
            disabled={
              isMatching ||
              !description.trim() ||
              !availableFeedback ||
              availableFeedback.length === 0
            }
            onClick={onTriggerMatching}
            size="xs"
            type="button"
            variant="surface"
          >
            {isMatching ? (
              <>
                <Spinner data-icon="inline-start" size="xs" />
                Finding…
              </>
            ) : (
              <>
                <Sparkle aria-hidden="true" className="size-3.5" />
                Find related
              </>
            )}
          </Button>
        )}
      </div>

      {releaseId && (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-muted-foreground text-xs"
            id={linkStatusLabelId}
          >
            Status after linking
          </span>
          <Select<FeedbackLinkStatus>
            onValueChange={onLinkStatusChange}
            value={linkStatus}
          >
            <SelectTrigger
              aria-labelledby={linkStatusLabelId}
              className="w-44"
              size="xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LINK_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
