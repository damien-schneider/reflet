"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Clock, X } from "@phosphor-icons/react";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { GenerateFromCommits } from "./generate-from-commits";
import { SaveStatus } from "./release-save-status";
import { ScheduleCountdown } from "./schedule-countdown";
import { VersionPicker } from "./version-picker";

interface ReleaseEditorToolbarProps {
  handleCancelSchedule: () => void;
  handleCommitsFetched: Parameters<
    typeof GenerateFromCommits
  >[0]["onCommitsFetched"];
  handleStreamChunk: (content: string) => void;
  handleStreamComplete: (content: string) => void;
  handleStreamStart: () => void;
  handleTitleGenerated: (title: string) => void;
  isPublished: boolean;
  isScheduled: boolean;
  isStreaming: boolean;
  isSubmitting: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
  release?: Doc<"releases">;
  releaseId: Id<"releases"> | null;
  saveStatus: "saving" | "saved" | "idle";
  setVersion: (value: string) => void;
  version: string;
}

export function ReleaseEditorToolbar({
  handleCancelSchedule,
  handleCommitsFetched,
  handleStreamChunk,
  handleStreamComplete,
  handleStreamStart,
  handleTitleGenerated,
  isPublished,
  isScheduled,
  isStreaming,
  isSubmitting,
  organizationId,
  orgSlug,
  release,
  releaseId,
  saveStatus,
  setVersion,
  version,
}: ReleaseEditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-6 pt-4">
      <VersionPicker
        disabled={isSubmitting || isStreaming}
        excludeReleaseId={release?._id}
        onChange={setVersion}
        organizationId={organizationId}
        value={version}
      />
      <GenerateFromCommits
        disabled={isSubmitting}
        isStreaming={isStreaming}
        onCommitsFetched={handleCommitsFetched}
        onComplete={handleStreamComplete}
        onStreamChunk={handleStreamChunk}
        onStreamStart={handleStreamStart}
        onTitleGenerated={handleTitleGenerated}
        organizationId={organizationId}
        orgSlug={orgSlug}
        releaseId={releaseId}
        version={version}
      />
      {isPublished && (
        <span className="rounded-full bg-success-subtle px-2 py-0.5 text-success-text text-xs">
          Published
        </span>
      )}
      {isScheduled && !isPublished && release?.scheduledPublishAt && (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-warning-subtle px-2 py-0.5 text-warning-text text-xs">
            <Clock className="h-3 w-3" />
            Scheduled
          </span>
          <ScheduleCountdown scheduledAt={release.scheduledPublishAt} />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="Cancel schedule"
                  className="size-7"
                  disabled={isSubmitting}
                  iconOnly
                  onClick={handleCancelSchedule}
                  size="xs"
                  type="button"
                  variant="ghost"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <TooltipContent>Cancel schedule</TooltipContent>
          </Tooltip>
        </div>
      )}
      <div className="ml-auto">
        <SaveStatus
          isPublished={isPublished}
          releaseId={releaseId}
          saveStatus={saveStatus}
        />
      </div>
    </div>
  );
}
