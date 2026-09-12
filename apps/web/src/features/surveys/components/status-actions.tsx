"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import type { SurveyStatus } from "@/store/surveys";

interface StatusActionsProps {
  hasQuestions: boolean;
  onStatusChange: (status: SurveyStatus) => void;
  status: SurveyStatus;
}

export function StatusActions({
  status,
  hasQuestions,
  onStatusChange,
}: StatusActionsProps) {
  if (status === "draft") {
    return (
      <Button
        disabled={!hasQuestions}
        onClick={() => onStatusChange("active")}
        size="xs"
        tone="primary"
        variant="solid"
      >
        Activate
      </Button>
    );
  }
  if (status === "active") {
    return (
      <Button
        onClick={() => onStatusChange("paused")}
        size="xs"
        variant="surface"
      >
        Pause
      </Button>
    );
  }
  if (status === "paused") {
    return (
      <div className="flex items-center gap-2">
        <Button
          onClick={() => onStatusChange("active")}
          size="xs"
          tone="primary"
          variant="solid"
        >
          Resume
        </Button>
        <Button
          onClick={() => onStatusChange("closed")}
          size="xs"
          variant="surface"
        >
          Close
        </Button>
      </div>
    );
  }
  return (
    <Button onClick={() => onStatusChange("draft")} size="xs" variant="surface">
      Reopen as Draft
    </Button>
  );
}
