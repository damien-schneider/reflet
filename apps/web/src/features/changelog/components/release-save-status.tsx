"use client";

import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Check, WarningCircle } from "@phosphor-icons/react";
import type { SaveStatus as SaveStatusValue } from "../hooks/use-auto-save-release";

function SaveStatusLabel({
  isPublished,
  releaseId,
  saveStatus,
}: {
  isPublished: boolean;
  releaseId?: string | null;
  saveStatus: SaveStatusValue;
}) {
  if (saveStatus === "saving") {
    return (
      <>
        <Spinner size="xs" />
        Saving…
      </>
    );
  }

  if (saveStatus === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-success-text">
        <Check aria-hidden="true" className="size-3.5" />
        Saved
      </span>
    );
  }

  if (saveStatus === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-destructive-text">
        <WarningCircle aria-hidden="true" className="size-3.5" />
        Not saved
      </span>
    );
  }

  if (releaseId && !isPublished) {
    return "Draft";
  }

  return null;
}

export function SaveStatus(props: {
  isPublished: boolean;
  releaseId?: string | null;
  saveStatus: SaveStatusValue;
}) {
  return (
    <span
      aria-live="polite"
      className="inline-flex min-w-20 items-center justify-end gap-1.5 text-muted-foreground text-sm"
      role="status"
    >
      <SaveStatusLabel {...props} />
    </span>
  );
}
