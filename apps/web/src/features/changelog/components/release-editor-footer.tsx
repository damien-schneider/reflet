import { Alert, AlertDescription, AlertTitle } from "@ctrl-ui/react/ui/alert";
import { Button } from "@ctrl-ui/react/ui/button";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Check, CloudArrowUp, WarningCircle } from "@phosphor-icons/react";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import Link from "next/link";
import { buildGitHubInstallUrl } from "@/features/github/lib/github-install-url";

function pushButtonLabel(status?: string): string {
  if (status === "pending") {
    return "Pushing…";
  }
  if (status === "failed") {
    return "Retry push to GitHub";
  }
  return "Push to GitHub";
}

interface ReleaseEditorFooterProps {
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
  const githubHtmlUrl = isLinkedToGithub ? release?.githubHtmlUrl : undefined;

  return (
    <div className="flex flex-col gap-3 border-t bg-muted/30 px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PrimaryPublishButton
            disabled={isSubmitting || isStreaming || titleEmpty}
            isPublished={isPublished}
            isScheduled={isScheduled}
            isSubmitting={isSubmitting}
            onCancelSchedule={onCancelSchedule}
            onPublish={onPublish}
            onUnpublish={onUnpublish}
          />

          {canPushToGithub && (
            <PushToGithubButton
              isSubmitting={isSubmitting}
              onPushToGithub={onPushToGithub}
              pushStatus={release?.githubPushStatus}
            />
          )}

          {githubHtmlUrl && <ViewOnGithubLink href={githubHtmlUrl} />}
        </div>

        <Button
          disabled={isSubmitting || isStreaming}
          onClick={onCancel}
          size="sm"
          type="button"
          variant="ghost"
        >
          Done
        </Button>
      </div>

      {isPermissionError && (
        <GithubPermissionAlert
          reconnectUrl={buildGitHubInstallUrl({
            organizationId,
            orgSlug,
            userId,
          })}
        />
      )}
    </div>
  );
}

interface PrimaryPublishButtonProps {
  disabled: boolean;
  isPublished: boolean;
  isScheduled: boolean;
  isSubmitting: boolean;
  onCancelSchedule: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
}

function PrimaryPublishButton({
  disabled,
  isPublished,
  isScheduled,
  isSubmitting,
  onCancelSchedule,
  onPublish,
  onUnpublish,
}: PrimaryPublishButtonProps) {
  const isLive = isPublished || isScheduled;
  let label = "Publish";
  let handleClick = onPublish;
  if (isPublished) {
    label = "Unpublish";
    handleClick = onUnpublish;
  } else if (isScheduled) {
    label = "Cancel schedule";
    handleClick = onCancelSchedule;
  }

  return (
    <Button
      disabled={disabled}
      onClick={handleClick}
      size="sm"
      tone={isLive ? "neutral" : "primary"}
      type="button"
      variant={isLive ? "surface" : "solid"}
    >
      {isSubmitting ? <Spinner data-icon="inline-start" size="xs" /> : null}
      {label}
    </Button>
  );
}

function PushToGithubButton({
  isSubmitting,
  onPushToGithub,
  pushStatus,
}: {
  isSubmitting: boolean;
  onPushToGithub: () => void;
  pushStatus?: string;
}) {
  const isPushPending = pushStatus === "pending";

  return (
    <Button
      disabled={isSubmitting || isPushPending}
      onClick={onPushToGithub}
      size="sm"
      type="button"
      variant="surface"
    >
      {isPushPending ? (
        <Spinner data-icon="inline-start" size="xs" />
      ) : (
        <CloudArrowUp aria-hidden="true" className="size-4" />
      )}
      {pushButtonLabel(pushStatus)}
    </Button>
  );
}

function ViewOnGithubLink({ href }: { href: string }) {
  return (
    <a
      className="flex items-center gap-1.5 text-sm text-success-text underline-offset-4 hover:underline"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <Check aria-hidden="true" className="size-3.5" />
      View on GitHub
    </a>
  );
}

function GithubPermissionAlert({
  reconnectUrl,
}: {
  reconnectUrl: string | undefined;
}) {
  return (
    <Alert variant="destructive">
      <WarningCircle aria-hidden="true" />
      <AlertTitle>GitHub can’t accept this release</AlertTitle>
      <AlertDescription>
        The Reflet GitHub App is missing permissions.{" "}
        {reconnectUrl ? (
          <Link
            className="font-medium underline underline-offset-4"
            href={reconnectUrl}
          >
            Reconnect GitHub
          </Link>
        ) : (
          "Reconnect it from project settings to push releases."
        )}
      </AlertDescription>
    </Alert>
  );
}
