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

export type FeedbackLinkStatus =
  | "keep"
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "closed";

const LINK_STATUS_OPTIONS = [
  { label: "Keep current status", value: "keep" },
  { label: "Completed", value: "completed" },
  { label: "Closed", value: "closed" },
  { label: "In Progress", value: "in_progress" },
  { label: "Planned", value: "planned" },
  { label: "Open", value: "open" },
] as const;

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
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-medium text-sm">
          <Check className="h-4 w-4 text-muted-foreground" />
          Linked Feedback
          {linkedCount > 0 && (
            <Badge className="text-xs tabular-nums">{linkedCount}</Badge>
          )}
        </h3>

        {releaseId && (
          <Button
            className="h-7 gap-1 text-xs"
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
                <Spinner size="xs" />
                Finding...
              </>
            ) : (
              <>
                <Sparkle className="h-3 w-3" />
                Find related
              </>
            )}
          </Button>
        )}
      </div>

      {releaseId && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            Set status on link:
          </span>
          <Select<FeedbackLinkStatus>
            onValueChange={onLinkStatusChange}
            value={linkStatus}
          >
            <SelectTrigger
              aria-label="Set status on link"
              className="h-7 w-44 text-xs"
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
