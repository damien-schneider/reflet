import { cn } from "@ctrl-ui/react/lib/cn";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useAutoSaveRelease } from "../hooks/use-auto-save-release";
import { useReleaseCommits } from "../hooks/use-release-commits";
import { useReleasePublishing } from "../hooks/use-release-publishing";
import type { FeedbackLinkStatus } from "./feedback-section-header";
import { PublishConfirmDialog } from "./publish-confirm-dialog";
import { ReleaseEditorBody } from "./release-editor-body";
import { ReleaseEditorFooter } from "./release-editor-footer";
import { ReleaseEditorToolbar } from "./release-editor-toolbar";
import { getSuggestedVersion } from "./version-suggestions";

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
  const [userVersion, setVersion] = useState<string | null>(
    release?.version || null
  );
  const versionSuggestions = useQuery(api.changelog.queries.getNextVersion, {
    excludeReleaseId: release?._id,
    organizationId,
  });
  const version = userVersion ?? getSuggestedVersion(versionSuggestions);
  const [description, setDescription] = useState(release?.description ?? "");
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");

  const [shouldAutoMatchFeedback, setShouldAutoMatchFeedback] = useState(false);
  const [feedbackLinkStatus, setFeedbackLinkStatus] =
    useState<FeedbackLinkStatus>("completed");

  const { releaseId, saveStatus } = useAutoSaveRelease({
    description,
    initialReleaseId: release?._id ?? null,
    organizationId,
    title,
    userVersion,
    version,
  });

  const { commits, files, previousTag, handleCommitsFetched } =
    useReleaseCommits(releaseId);

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
      setShouldAutoMatchFeedback(true);
    }
  };

  const handleTitleGenerated = (generatedTitle: string) => {
    setTitle(generatedTitle);
  };

  const {
    handleCancelSchedule,
    handlePublish,
    handlePushToGithub,
    handleSchedule,
    handleUnpublish,
    isSubmitting,
  } = useReleasePublishing({
    draft: { description, title, version },
    feedbackLinkStatus,
    onDone: () => {
      setShowPublishConfirm(false);
      navigateToChangelog();
    },
    organizationId,
    releaseId,
  });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-background shadow-sm",
        className
      )}
    >
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
          versionSuggestions={versionSuggestions}
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

        <ReleaseEditorFooter
          canPushToGithub={canPushToGithub}
          isLinkedToGithub={isLinkedToGithub}
          isPermissionError={isPermissionError}
          isPublished={isPublished}
          isScheduled={isScheduled}
          isStreaming={isStreaming}
          isSubmitting={isSubmitting}
          onCancel={navigateToChangelog}
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
