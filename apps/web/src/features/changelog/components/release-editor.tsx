import {
  Check,
  Clock,
  CloudArrowUp,
  Spinner,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { Button } from "@/components/ui/button";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import { buildGitHubInstallUrl } from "@/features/github/lib/github-install-url";
import { capture } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useAutoSaveRelease } from "../hooks/use-auto-save-release";
import { useReleaseCommits } from "../hooks/use-release-commits";
import type { FeedbackLinkStatus } from "./feedback-section-header";
import { GenerateFromCommits } from "./generate-from-commits";
import { PublishConfirmDialog } from "./publish-confirm-dialog";
import { ReleaseCommitsList } from "./release-commits-list";
import { ReleaseFeedbackSection } from "./release-feedback-section";
import { ScheduleCountdown } from "./schedule-countdown";
import { VersionPicker } from "./version-picker";

interface ReleaseEditorProps {
  className?: string;
  organizationId: Id<"organizations">;
  orgSlug: string;
  release?: Doc<"releases">; // If provided, edit mode
}

export function ReleaseEditor({
  organizationId,
  orgSlug,
  release,
  className,
}: ReleaseEditorProps) {
  const router = useRouter();
  // biome-ignore lint/correctness/noUnusedVariables: used in JSX below
  const { data: session } = authClient.useSession();
  const updateRelease = useMutation(api.changelog.mutations.update);
  const createRelease = useMutation(api.changelog.mutations.create);
  const publishRelease = useMutation(
    api.changelog.actions.publish
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.changelog.queries.get, {
      id: args.id,
    });
    if (!current) {
      return;
    }
    localStore.setQuery(
      api.changelog.queries.get,
      { id: args.id },
      {
        ...current,
        publishedAt: Date.now(),
      }
    );
  });

  const unpublishRelease = useMutation(
    api.changelog.actions.unpublish
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.changelog.queries.get, {
      id: args.id,
    });
    if (!current) {
      return;
    }
    localStore.setQuery(
      api.changelog.queries.get,
      { id: args.id },
      {
        ...current,
        publishedAt: undefined,
      }
    );
  });

  const schedulePublish = useMutation(api.changelog.scheduling.schedulePublish);
  const cancelSchedule = useMutation(
    api.changelog.scheduling.cancelScheduledPublish
  );
  const pushToGithub = useMutation(api.changelog.actions.pushToGithub);
  const githubConnection = useQuery(
    api.integrations.github.queries.getConnection,
    {
      organizationId,
    }
  );

  const isPublished = release?.publishedAt !== undefined;
  const isScheduled = !!release?.scheduledPublishAt;
  const hasGithubConnection = !!githubConnection;
  const isLinkedToGithub = !!release?.githubReleaseId;
  const canPushToGithub =
    isPublished && hasGithubConnection && !isLinkedToGithub;
  const isPermissionError =
    release?.githubPushStatus === "failed" &&
    release?.githubPushErrorType === "permission_denied";

  const [title, setTitle] = useState(release?.title ?? "");
  const [version, setVersion] = useState(release?.version ?? "");
  const [description, setDescription] = useState(release?.description ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  // Streaming AI generation state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");

  // Feedback matching auto-trigger
  const [shouldAutoMatchFeedback, setShouldAutoMatchFeedback] = useState(false);
  const [feedbackLinkStatus, setFeedbackLinkStatus] =
    useState<FeedbackLinkStatus>("completed");

  // Auto-save with debounce
  const { releaseId, saveStatus } = useAutoSaveRelease({
    organizationId,
    initialReleaseId: release?._id ?? null,
    title,
    version,
    description,
  });

  // Commits management
  const { commits, files, previousTag, handleCommitsFetched } =
    useReleaseCommits(releaseId);

  // Get linked feedback count for the publish dialog
  const releaseData = useQuery(
    api.changelog.queries.get,
    releaseId ? { id: releaseId } : "skip"
  );
  const linkedFeedbackCount = releaseData?.feedbackItems?.length ?? 0;

  const navigateToChangelog = () => {
    router.push(`/dashboard/${orgSlug}/changelog`);
  };

  const handleStreamStart = useCallback(() => {
    setIsStreaming(true);
    setStreamedContent("");
  }, []);

  const handleStreamChunk = useCallback((content: string) => {
    setStreamedContent(content);
  }, []);

  const handleStreamComplete = useCallback((content: string) => {
    setIsStreaming(false);
    setStreamedContent("");
    if (content) {
      setDescription(content);
      // Auto-trigger feedback matching after AI generation completes
      setShouldAutoMatchFeedback(true);
    }
  }, []);

  const handleTitleGenerated = useCallback((generatedTitle: string) => {
    setTitle(generatedTitle);
  }, []);

  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error("Title is required to publish");
      return;
    }

    setIsSubmitting(true);
    try {
      let idToPublish = releaseId;

      if (idToPublish) {
        await updateRelease({
          id: idToPublish,
          title: title.trim() || "Untitled Release",
          version: version.trim() || undefined,
          description: description.trim() || undefined,
        });
      } else {
        idToPublish = await createRelease({
          organizationId,
          title: title.trim() || "Untitled Release",
          version: version.trim() || undefined,
          description: description.trim() || undefined,
        });
      }

      await publishRelease({
        id: idToPublish,
        feedbackStatus:
          feedbackLinkStatus === "keep" ? undefined : feedbackLinkStatus,
      });
      capture("release_published", {
        has_version: Boolean(version.trim()),
      });
      setShowPublishConfirm(false);
      toast.success("Release published!");
      navigateToChangelog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSchedule = async (scheduledAt: number) => {
    if (!title.trim()) {
      toast.error("Title is required to schedule");
      return;
    }

    setIsSubmitting(true);
    try {
      let idToSchedule = releaseId;

      if (idToSchedule) {
        await updateRelease({
          id: idToSchedule,
          title: title.trim() || "Untitled Release",
          version: version.trim() || undefined,
          description: description.trim() || undefined,
        });
      } else {
        idToSchedule = await createRelease({
          organizationId,
          title: title.trim() || "Untitled Release",
          version: version.trim() || undefined,
          description: description.trim() || undefined,
        });
      }

      await schedulePublish({
        id: idToSchedule,
        scheduledPublishAt: scheduledAt,
        feedbackStatus:
          feedbackLinkStatus === "keep" ? undefined : feedbackLinkStatus,
      });
      capture("release_scheduled", {
        has_version: Boolean(version.trim()),
      });
      setShowPublishConfirm(false);
      toast.success(
        `Release scheduled for ${format(scheduledAt, "MMM d, yyyy 'at' h:mm a")}`
      );
      navigateToChangelog();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to schedule"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSchedule = async () => {
    if (!releaseId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await cancelSchedule({ id: releaseId });
      toast.success("Schedule cancelled");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel schedule"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnpublish = async () => {
    if (!releaseId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await unpublishRelease({ id: releaseId });
      toast.success("Release unpublished");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to unpublish"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePushToGithub = async () => {
    if (!releaseId) {
      return;
    }
    try {
      await pushToGithub({ releaseId });
      toast.success("Push to GitHub scheduled");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to push to GitHub"
      );
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/${orgSlug}/changelog`);
  };

  const renderSaveStatus = () => {
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
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-background shadow-sm",
        className
      )}
    >
      {/* Document-like content area */}
      <div className="flex min-h-125 flex-col">
        {/* Version badge and status */}
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
          {isScheduled && !isPublished && release.scheduledPublishAt && (
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
          <div className="ml-auto">{renderSaveStatus()}</div>
        </div>

        {/* Title area */}
        <div className="px-6 pt-4 pb-2">
          <TiptapTitleEditor
            autoFocus
            disabled={isSubmitting || isStreaming}
            onChange={setTitle}
            placeholder="What's New in v1.0"
            value={title}
          />
        </div>

        {/* Divider */}
        <div className="mx-6 border-border/50 border-b" />

        {/* Description area - takes up remaining space */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isStreaming ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Streamdown caret="block" isAnimating mode="streaming">
                {streamedContent}
              </Streamdown>
            </div>
          ) : (
            <TiptapMarkdownEditor
              disabled={isSubmitting}
              minimal
              onChange={setDescription}
              placeholder="Describe what's new in this release... Type '/' for commands, or drag and drop images/videos"
              value={description}
            />
          )}
        </div>

        {/* Commits collapsible */}
        {commits.length > 0 && (
          <ReleaseCommitsList
            commits={commits}
            files={files}
            previousTag={previousTag}
          />
        )}

        {/* Feedback linking section */}
        <div className="border-t px-6 py-4">
          <ReleaseFeedbackSection
            autoTriggerMatching={shouldAutoMatchFeedback}
            commits={commits}
            description={description}
            onLinkStatusChange={setFeedbackLinkStatus}
            organizationId={organizationId}
            releaseId={releaseId}
          />
        </div>

        {/* Footer */}
        <ReleaseEditorFooter
          canPushToGithub={canPushToGithub}
          isLinkedToGithub={isLinkedToGithub}
          isPermissionError={isPermissionError}
          isPublished={isPublished}
          isScheduled={isScheduled}
          isStreaming={isStreaming}
          isSubmitting={isSubmitting}
          onCancel={handleCancel}
          onCancelSchedule={handleCancelSchedule}
          onPublish={() => setShowPublishConfirm(true)}
          onPushToGithub={handlePushToGithub}
          onUnpublish={handleUnpublish}
          organizationId={organizationId}
          orgSlug={orgSlug}
          release={release}
          titleEmpty={!title.trim()}
        />
      </div>

      <PublishConfirmDialog
        feedbackLinkStatus={feedbackLinkStatus}
        isSubmitting={isSubmitting}
        linkedFeedbackCount={linkedFeedbackCount}
        onConfirm={handlePublish}
        onOpenChange={setShowPublishConfirm}
        onSchedule={handleSchedule}
        open={showPublishConfirm}
        organizationId={organizationId}
        orgSlug={orgSlug}
        title={title}
        version={version}
      />
    </div>
  );
}

function pushButtonLabel(status?: string): string {
  if (status === "pending") {
    return "Pushing…";
  }
  if (status === "failed") {
    return "Retry Push to GitHub";
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
}

function ReleaseEditorFooter({
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
                  // biome-ignore lint/correctness/noUndeclaredVariables: session is declared above
                  userId: session?.user?.id,
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
