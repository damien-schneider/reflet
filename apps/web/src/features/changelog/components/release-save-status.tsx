"use client";

import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Check } from "@phosphor-icons/react";

export function SaveStatus({
  isPublished,
  releaseId,
  saveStatus,
}: {
  isPublished: boolean;
  releaseId?: string | null;
  saveStatus: "saving" | "saved" | "idle";
}) {
  if (saveStatus === "saving") {
    return (
      <span className="flex items-center gap-1 text-muted-foreground text-sm">
        <Spinner size="sm" />
        Saving...
      </span>
    );
  }

  if (saveStatus === "saved") {
    return (
      <span className="flex items-center gap-1 text-sm text-success-text">
        <Check className="h-4 w-4" />
        Saved
      </span>
    );
  }

  if (releaseId && !isPublished) {
    return <span className="text-muted-foreground text-sm">Draft</span>;
  }

  return null;
}
