"use client";

import { Clock, X } from "@phosphor-icons/react";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
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
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700 text-xs dark:bg-green-900/30 dark:text-green-400">
          Published
        </span>
      )}
      {isScheduled && !isPublished && release?.scheduledPublishAt && (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            Scheduled
          </span>
          <ScheduleCountdown scheduledAt={release.scheduledPublishAt} />
          <Button
            disabled={isSubmitting}
            onClick={handleCancelSchedule}
            size="icon"
            title="Cancel schedule"
            variant="ghost"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
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
