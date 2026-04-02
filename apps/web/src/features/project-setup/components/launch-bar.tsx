import { Sparkle } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";
import type {
  ChangelogConfig,
  SuggestedKeyword,
  SuggestedMonitor,
  SuggestedTag,
} from "@/features/project-setup/components/review-types";

interface LaunchBarProps {
  changelogConfig?: ChangelogConfig;
  isApplying: boolean;
  keywords: SuggestedKeyword[];
  monitors: SuggestedMonitor[];
  onLaunch: () => void;
  tags: SuggestedTag[];
}

export function LaunchBar({
  changelogConfig,
  isApplying,
  monitors,
  keywords,
  tags,
  onLaunch,
}: LaunchBarProps) {
  const monitorsCount = monitors.filter((m) => m.accepted).length;
  const keywordsCount = keywords.filter((k) => k.accepted).length;
  const tagsCount = tags.filter((t) => t.accepted).length;

  const parts: string[] = [];
  if (monitorsCount > 0) {
    parts.push(`${monitorsCount} monitor${monitorsCount === 1 ? "" : "s"}`);
  }
  if (keywordsCount > 0) {
    parts.push(`${keywordsCount} keyword${keywordsCount === 1 ? "" : "s"}`);
  }
  if (tagsCount > 0) {
    parts.push(`${tagsCount} tag${tagsCount === 1 ? "" : "s"}`);
  }
  if (changelogConfig) {
    parts.push("changelog config");
  }

  const summary =
    parts.length > 0
      ? `This will create ${parts.join(", ")}`
      : "No items selected";

  return (
    <div className="sticky bottom-4 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <Muted className="text-xs">{summary}</Muted>
        <Button disabled={isApplying} onClick={onLaunch} size="lg">
          <Sparkle className="mr-2 size-4" />
          {isApplying ? "Launching..." : "Launch Project"}
        </Button>
      </div>
    </div>
  );
}
