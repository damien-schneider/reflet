import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { capture } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useAutoSaveRelease } from "../hooks/use-auto-save-release";
import { useReleaseCommits } from "../hooks/use-release-commits";
import type { FeedbackLinkStatus } from "./feedback-section-header";
import { PublishConfirmDialog } from "./publish-confirm-dialog";
import { ReleaseEditorBody } from "./release-editor-body";
import { ReleaseEditorFooter } from "./release-editor-footer";
import { ReleaseEditorToolbar } from "./release-editor-toolbar";

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
    description,
    initialReleaseId: release?._id ?? null,
    organizationId,
    title,
    version,
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

  const handleStreamStart = () => {
    setIsStreaming(true);
    setStreamedContent("");
  };

  const handleStreamChunk = (content: string) => {
    setStreamedContent(content);
  };

  const handleStreamComplete = (content: string) => {
    setIsStreaming(false);
    setStreamedContent("");
    if (content) {
      setDescription(content);
      // Auto-trigger feedback matching after AI generation completes
      setShouldAutoMatchFeedback(true);
    }
  };

  const handleTitleGenerated = (generatedTitle: string) => {
    setTitle(generatedTitle);
  };

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
          description: description.trim() || undefined,
          id: idToPublish,
          title: title.trim() || "Untitled Release",
          version: version.trim() || undefined,
        });
      } else {
        idToPublish = await createRelease({
          description: description.trim() || undefined,
          organizationId,
          title: title.trim() || "Untitled Release",
          version: version.trim() || undefined,
        });
      }

      await publishRelease({
        feedbackStatus:
          feedbackLinkStatus === "keep" ? undefined : feedbackLinkStatus,
        id: idToPublish,
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
          description: description.trim() || undefined,
          id: idToSchedule,
          title: title.trim() || "Untitled Release",
          version: version.trim() || undefined,
        });
      } else {
        idToSchedule = await createRelease({
          description: description.trim() || undefined,
          organizationId,
          title: title.trim() || "Untitled Release",
          version: version.trim() || undefined,
        });
      }

      await schedulePublish({
        feedbackStatus:
          feedbackLinkStatus === "keep" ? undefined : feedbackLinkStatus,
        id: idToSchedule,
        scheduledPublishAt: scheduledAt,
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

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-background shadow-sm",
        className
      )}
    >
      {/* Document-like content area */}
      <div className="flex min-h-125 flex-col">
        <ReleaseEditorToolbar
          handleCancelSchedule={handleCancelSchedule}
          handleCommitsFetched={handleCommitsFetched}
          handleStreamChunk={handleStreamChunk}
          handleStreamComplete={handleStreamComplete}
          handleStreamStart={handleStreamStart}
          handleTitleGenerated={handleTitleGenerated}
          isPublished={isPublished}
          isScheduled={isScheduled}
          isStreaming={isStreaming}
          isSubmitting={isSubmitting}
          organizationId={organizationId}
          orgSlug={orgSlug}
          release={release}
          releaseId={releaseId}
          saveStatus={saveStatus}
          setVersion={setVersion}
          version={version}
        />
        <ReleaseEditorBody
          commits={commits}
          description={description}
          files={files}
          isStreaming={isStreaming}
          isSubmitting={isSubmitting}
          onDescriptionChange={setDescription}
          onTitleChange={setTitle}
          organizationId={organizationId}
          previousTag={previousTag}
          releaseId={releaseId}
          setFeedbackLinkStatus={setFeedbackLinkStatus}
          shouldAutoMatchFeedback={shouldAutoMatchFeedback}
          streamedContent={streamedContent}
          title={title}
        />

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
