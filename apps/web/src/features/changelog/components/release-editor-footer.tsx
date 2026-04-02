import {
  Check,
  CloudArrowUp,
  Spinner,
  WarningCircle,
} from "@phosphor-icons/react";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buildGitHubInstallUrl } from "@/features/github/lib/github-install-url";
import { cn } from "@/lib/utils";

export function pushButtonLabel(status?: string): string {
  if (status === "pending") {
    return "Pushing…";
  }
  if (status === "failed") {
    return "Retry Push to GitHub";
  }
  return "Push to GitHub";
}

export interface ReleaseEditorFooterProps {
  canPushToGithub: boolean;
  isLinkedToGithub: boolean;
  isPermissionError: boolean;
  isPublished: boolean;
  isScheduled: boolean;
  isStreaming: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onCancelSchedule: () => void;
  onPublish: () => void;
  onPushToGithub: () => void;
  onUnpublish: () => void;
  organizationId: Id<"organizations">;
  orgSlug: string;
  release?: Doc<"releases">;
  titleEmpty: boolean;
  userId?: string;
}

export function ReleaseEditorFooter({
  isPublished,
  isScheduled,
  isSubmitting,
  isStreaming,
  titleEmpty,
  canPushToGithub,
  isLinkedToGithub,
  isPermissionError,
  release,
  organizationId,
  orgSlug,
  onPublish,
  onUnpublish,
  onCancelSchedule,
  onPushToGithub,
  onCancel,
  userId,
}: ReleaseEditorFooterProps) {
  const getPublishLabel = (): string => {
    if (isPublished) {
      return "Unpublish";
    }
    if (isScheduled) {
      return "Cancel Schedule";
    }
    return "Publish";
  };

  const getPrimaryAction = () => {
    if (isPublished) {
      return onUnpublish;
    }
    if (isScheduled) {
      return onCancelSchedule;
    }
    return onPublish;
  };

  const publishButtonLabel = getPublishLabel();

  const handlePrimaryAction = getPrimaryAction();
  return (
    <div
      className={cn("border-t bg-muted/30 px-6 py-4", "flex flex-col gap-3")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            disabled={isSubmitting || isStreaming || titleEmpty}
            onClick={handlePrimaryAction}
            size="sm"
            type="button"
            variant={isPublished || isScheduled ? "outline" : "default"}
          >
            {publishButtonLabel}
          </Button>

          {canPushToGithub && (
            <Button
              disabled={isSubmitting || release?.githubPushStatus === "pending"}
              onClick={onPushToGithub}
              size="sm"
              type="button"
              variant="outline"
            >
              {release?.githubPushStatus === "pending" ? (
                <Spinner className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CloudArrowUp className="mr-1.5 h-3.5 w-3.5" />
              )}
              {pushButtonLabel(release?.githubPushStatus)}
            </Button>
          )}

          {isLinkedToGithub && release?.githubHtmlUrl && (
            <a
              className="flex items-center gap-1.5 text-green-600 text-sm dark:text-green-400"
              href={release.githubHtmlUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Check className="h-3.5 w-3.5" />
              Linked to GitHub
            </a>
          )}
        </div>

        <Button
          disabled={isSubmitting || isStreaming}
          onClick={onCancel}
          size="sm"
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
      </div>

      {isPermissionError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-medium text-destructive">
              GitHub permissions insufficient
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Reconnect your GitHub App to grant the required permissions.
            </p>
            <Link
              className="mt-1 inline-block font-medium text-primary text-xs hover:underline"
              href={
                buildGitHubInstallUrl({
                  userId,
                  organizationId,
                  orgSlug,
                }) ?? "#"
              }
            >
              Reconnect GitHub
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
