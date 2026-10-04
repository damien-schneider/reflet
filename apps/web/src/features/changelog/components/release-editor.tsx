import { cn } from "@ctrl-ui/react/lib/cn";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useAutoSaveRelease } from "../hooks/use-auto-save-release";
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
  release?: Doc<"releases">;
}

export function ReleaseEditor({
  organizationId,
  orgSlug,
  release: initialRelease,
  className,
}: ReleaseEditorProps) {
  const router = useRouter();
  const { data: sessionData } = authClient.useSession();
  const githubConnection = useQuery(
    api.integrations.github.queries.getConnection,
    { organizationId }
  );
  const versionSuggestions = useQuery(api.changelog.queries.getNextVersion, {
    excludeReleaseId: initialRelease?._id,
    organizationId,
  });

  const {
    description,
    discardProseEdits,
    release,
    releaseId,
    saveRelease,
    saveStatus,
    setDescription,
    setTitle,
    setVersion,
    title,
    version,
  } = useAutoSaveRelease({
    initialRelease,
    organizationId,
    suggestedVersion: getSuggestedVersion(versionSuggestions),
  });

  const isPublished = release?.publishedAt !== undefined;
  const isScheduled = Boolean(release?.scheduledPublishAt);

  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [shouldAutoMatchFeedback, setShouldAutoMatchFeedback] = useState(false);
  const [feedbackLinkStatus, setFeedbackLinkStatus] =
    useState<FeedbackLinkStatus>("completed");

  const releaseDetails = useQuery(
    api.changelog.queries.get,
    releaseId ? { id: releaseId } : "skip"
  );
  const linkedFeedbackCount = releaseDetails?.feedbackItems.length ?? 0;

  const navigateToChangelog = () => {
    router.push(`/dashboard/${orgSlug}/changelog`);
  };

  const {
    handleCancelSchedule,
    handlePublish,
    handlePushToGithub,
    handleSchedule,
    handleUnpublish,
    isSubmitting,
  } = useReleasePublishing({
    feedbackLinkStatus,
    onDone: () => {
      setShowPublishConfirm(false);
      navigateToChangelog();
    },
    releaseId,
    saveRelease,
    title,
    version,
  });

  const isGenerating = generatedPreview !== null;

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
          isGenerating={isGenerating}
          isPublished={isPublished}
          isScheduled={isScheduled}
          isSubmitting={isSubmitting}
          onGenerationApplied={() => setShouldAutoMatchFeedback(true)}
          onPreviewChange={setGeneratedPreview}
          organizationId={organizationId}
          orgSlug={orgSlug}
          release={release}
          releaseId={releaseId}
          saveRelease={saveRelease}
          saveStatus={saveStatus}
          setVersion={setVersion}
          version={version}
          versionSuggestions={versionSuggestions}
        />
        <ReleaseEditorBody
          description={description}
          generatedPreview={generatedPreview}
          isSubmitting={isSubmitting}
          onApplyDraft={discardProseEdits}
          onDescriptionChange={setDescription}
          onFeedbackLinkStatusChange={setFeedbackLinkStatus}
          onTitleChange={setTitle}
          organizationId={organizationId}
          releaseId={releaseId}
          shouldAutoMatchFeedback={shouldAutoMatchFeedback}
          title={title}
        />

        <ReleaseEditorFooter
          hasGithubConnection={Boolean(githubConnection)}
          isGenerating={isGenerating}
          isPublished={isPublished}
          isScheduled={isScheduled}
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
