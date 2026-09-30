"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Sparkle } from "@phosphor-icons/react";
import { Muted } from "@/components/ui/typography";
import type {
  ChangelogConfig,
  SuggestedKeyword,
  SuggestedMonitor,
  SuggestedTag,
} from "./setup-types";

function countLabel(count: number, noun: string): string | null {
  if (count === 0) {
    return null;
  }
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function LaunchBar({
  changelogConfig,
  error,
  isApplying,
  monitors,
  keywords,
  tags,
  onLaunch,
}: {
  changelogConfig?: ChangelogConfig;
  error: string | null;
  isApplying: boolean;
  monitors: SuggestedMonitor[];
  keywords: SuggestedKeyword[];
  tags: SuggestedTag[];
  onLaunch: () => void;
}) {
  const parts = [
    countLabel(monitors.filter((m) => m.accepted).length, "monitor"),
    countLabel(keywords.filter((k) => k.accepted).length, "keyword"),
    countLabel(tags.filter((t) => t.accepted).length, "tag"),
    changelogConfig ? "changelog settings" : null,
  ].filter((part) => part !== null);

  const summary =
    parts.length > 0
      ? `Adds ${parts.join(", ")}.`
      : "Nothing selected. Select at least one suggestion, or launch an empty project.";

  return (
    <div className="sticky bottom-4 rounded-xl border bg-background p-4 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Muted aria-live="polite" className="text-pretty text-sm">
            {summary}
          </Muted>
          {error && (
            <p className="text-destructive-text text-sm" role="alert">
              {error}
            </p>
          )}
        </div>
        <Button
          className="shrink-0"
          disabled={isApplying}
          onClick={onLaunch}
          size="md"
          tone="primary"
          variant="solid"
        >
          {isApplying ? (
            <Spinner data-icon="inline-start" size="xs" />
          ) : (
            <Sparkle aria-hidden data-icon="inline-start" />
          )}
          {isApplying ? "Launching…" : "Launch project"}
        </Button>
      </div>
    </div>
  );
}
