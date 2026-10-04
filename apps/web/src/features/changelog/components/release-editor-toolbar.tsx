"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Clock, X } from "@phosphor-icons/react";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import type { SaveStatus as SaveStatusValue } from "../hooks/use-auto-save-release";
import { GenerateFromCommits } from "./generate-from-commits";
import { SaveStatus } from "./release-save-status";
import { ScheduleCountdown } from "./schedule-countdown";
import { VersionPicker } from "./version-picker";
import type { VersionSuggestions } from "./version-suggestions";

interface ReleaseEditorToolbarProps {
  handleCancelSchedule: () => void;
  isGenerating: boolean;
  isPublished: boolean;
  isScheduled: boolean;
  isSubmitting: boolean;
  onGenerationApplied: () => void;
  onPreviewChange: (preview: string | null) => void;
  organizationId: Id<"organizations">;
  orgSlug: string;
  release?: Doc<"releases">;
  releaseId: Id<"releases"> | null;
  saveRelease: () => Promise<Id<"releases">>;
  saveStatus: SaveStatusValue;
  setVersion: (value: string) => void;
  version: string;
  versionSuggestions: VersionSuggestions;
}

export function ReleaseEditorToolbar({
  handleCancelSchedule,
  isGenerating,
  isPublished,
  isScheduled,
  isSubmitting,
  onGenerationApplied,
  onPreviewChange,
  organizationId,
  orgSlug,
  release,
  releaseId,
  saveRelease,
  saveStatus,
  setVersion,
  version,
  versionSuggestions,
}: ReleaseEditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-6 pt-4">
      <VersionPicker
        disabled={isSubmitting || isGenerating}
        onChange={setVersion}
        value={version}
        versionSuggestions={versionSuggestions}
      />
      <GenerateFromCommits
        disabled={isSubmitting}
        onApplied={onGenerationApplied}
        onPreviewChange={onPreviewChange}
        organizationId={organizationId}
        orgSlug={orgSlug}
        saveRelease={saveRelease}
        version={version}
      />
      {isPublished && (
        <Badge color="green" size="sm">
          Published
        </Badge>
      )}
      {isScheduled && !isPublished && release?.scheduledPublishAt && (
        <div className="flex items-center gap-2">
          <Badge color="yellow" size="sm">
            <Clock aria-hidden="true" className="size-3" />
            Scheduled
          </Badge>
          <ScheduleCountdown scheduledAt={release.scheduledPublishAt} />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="Cancel schedule"
                  disabled={isSubmitting}
                  iconOnly
                  onClick={handleCancelSchedule}
                  size="xs"
                  type="button"
                  variant="ghost"
                >
                  <X aria-hidden="true" className="size-3.5" />
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
