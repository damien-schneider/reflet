"use client";

import { Check, Spinner } from "@phosphor-icons/react";

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
        <Spinner className="h-4 w-4 animate-spin" />
        Saving...
      </span>
    );
  }

  if (saveStatus === "saved") {
    return (
      <span className="flex items-center gap-1 text-green-600 text-sm dark:text-green-400">
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
