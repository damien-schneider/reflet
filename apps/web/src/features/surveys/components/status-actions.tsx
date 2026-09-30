"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { toast } from "@ctrl-ui/react/ui/toast";
import { useState } from "react";
import type { SurveyStatus } from "@/store/surveys";

interface StatusActionsProps {
  hasQuestions: boolean;
  onStatusChange: (status: SurveyStatus) => Promise<void>;
  status: SurveyStatus;
}

interface StatusTransition {
  isPrimary: boolean;
  label: string;
  pendingLabel: string;
  target: SurveyStatus;
}

const STATUS_TRANSITIONS: Record<SurveyStatus, StatusTransition[]> = {
  active: [
    {
      isPrimary: false,
      label: "Pause",
      pendingLabel: "Pausing…",
      target: "paused",
    },
  ],
  closed: [
    {
      isPrimary: false,
      label: "Reopen as draft",
      pendingLabel: "Reopening…",
      target: "draft",
    },
  ],
  draft: [
    {
      isPrimary: true,
      label: "Activate",
      pendingLabel: "Activating…",
      target: "active",
    },
  ],
  paused: [
    {
      isPrimary: false,
      label: "Close",
      pendingLabel: "Closing…",
      target: "closed",
    },
    {
      isPrimary: true,
      label: "Resume",
      pendingLabel: "Resuming…",
      target: "active",
    },
  ],
};

export function StatusActions({
  status,
  hasQuestions,
  onStatusChange,
}: StatusActionsProps) {
  const [pendingStatus, setPendingStatus] = useState<SurveyStatus | null>(null);

  const change = async (next: SurveyStatus) => {
    setPendingStatus(next);
    try {
      await onStatusChange(next);
    } catch {
      toast.error("Couldn’t update the survey status. Try again.");
    }
    setPendingStatus(null);
  };

  const isDraft = status === "draft";
  const isBlocked = isDraft && !hasQuestions;

  return (
    <div
      className={
        isDraft ? "flex items-center gap-3" : "flex items-center gap-2"
      }
    >
      {isBlocked ? (
        <span className="text-muted-foreground text-sm" id="activate-hint">
          Add a question to activate
        </span>
      ) : null}
      {STATUS_TRANSITIONS[status].map((transition) => (
        <Button
          aria-describedby={isBlocked ? "activate-hint" : undefined}
          disabled={isBlocked || pendingStatus !== null}
          key={transition.target}
          onClick={() => change(transition.target)}
          tone={transition.isPrimary ? "primary" : undefined}
          variant={transition.isPrimary ? "solid" : "surface"}
        >
          {pendingStatus === transition.target
            ? transition.pendingLabel
            : transition.label}
        </Button>
      ))}
    </div>
  );
}
