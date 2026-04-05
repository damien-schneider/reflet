import { Check, Clock, Spinner, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Streamdown } from "streamdown";
import { Button } from "@/components/ui/button";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useAutoSaveRelease } from "../hooks/use-auto-save-release";
import { useReleaseActions } from "../hooks/use-release-actions";
import { useReleaseAiStream } from "../hooks/use-release-ai-stream";
import { useReleaseCommits } from "../hooks/use-release-commits";
import type { FeedbackLinkStatus } from "./feedback-section-header";
import { GenerateFromCommits } from "./generate-from-commits";
import { PublishConfirmDialog } from "./publish-confirm-dialog";
import { ReleaseCommitsList } from "./release-commits-list";
import { ReleaseEditorFooter } from "./release-editor-footer";
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
  const { data: sessionData } = authClient.useSession();

  const [title, setTitle] = useState(release?.title ?? "");
  const [version, setVersion] = useState(release?.version ?? "");
  const [description, setDescription] = useState(release?.description ?? "");
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

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

  // AI streaming
  const {
    isStreaming,
    streamedContent,
    handleStreamStart,
    handleStreamChunk,
    handleStreamComplete,
    handleTitleGenerated,
  } = useReleaseAiStream(setDescription, setTitle, setShouldAutoMatchFeedback);

  // Get linked feedback count for the publish dialog
  const releaseData = useQuery(
    api.changelog.queries.get,
    releaseId ? { id: releaseId } : "skip"
  );
  const linkedFeedbackCount = releaseData?.feedbackItems?.length ?? 0;

  const navigateToChangelog = () => {
    router.push(`/dashboard/${orgSlug}/changelog`);
  };

  // Release actions (publish, schedule, unpublish, github push)
  const {
    isSubmitting,
    isPublished,
    isScheduled,
    canPushToGithub,
    isLinkedToGithub,
    isPermissionError,
    handlePublish,
    handleSchedule,
    handleCancelSchedule,
    handleUnpublish,
    handlePushToGithub,
  } = useReleaseActions({
    organizationId,
    orgSlug,
    release,
    releaseId,
    title,
    version,
    description,
    feedbackLinkStatus,
    onSuccess: navigateToChangelog,
    onPublishDialogClose: () => setShowPublishConfirm(false),
  });

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
            <div className="markdown-content max-w-none">
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
          userId={sessionData?.user?.id}
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
