"use client";

import { Button } from "@/components/ui/button";
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
        size="sm"
      >
        Activate
      </Button>
    );
  }
  if (status === "active") {
    return (
      <Button
        onClick={() => onStatusChange("paused")}
        size="sm"
        variant="outline"
      >
        Pause
      </Button>
    );
  }
  if (status === "paused") {
    return (
      <div className="flex items-center gap-2">
        <Button onClick={() => onStatusChange("active")} size="sm">
          Resume
        </Button>
        <Button
          onClick={() => onStatusChange("closed")}
          size="sm"
          variant="outline"
        >
          Close
        </Button>
      </div>
    );
  }
  return (
    <Button onClick={() => onStatusChange("draft")} size="sm" variant="outline">
      Reopen as Draft
    </Button>
  );
}
