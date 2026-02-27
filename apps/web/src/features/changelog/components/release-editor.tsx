import { Check, Spinner } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { Button } from "@/components/ui/button";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import { capture } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { useAutoSaveRelease } from "../hooks/use-auto-save-release";
import { useReleaseCommits } from "../hooks/use-release-commits";
import type { FeedbackLinkStatus } from "./feedback-section-header";
import { GenerateFromCommits } from "./generate-from-commits";
import { PublishConfirmDialog } from "./publish-confirm-dialog";
import { ReleaseCommitsList } from "./release-commits-list";
import { ReleaseFeedbackSection } from "./release-feedback-section";
import { VersionPicker } from "./version-picker";

interface ReleaseEditorProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
  release?: Doc<"releases">; // If provided, edit mode
  className?: string;
}

export function ReleaseEditor({
  organizationId,
  orgSlug,
  release,
  className,
}: ReleaseEditorProps) {
  const router = useRouter();
  const updateRelease = useMutation(api.changelog.update);
  const createRelease = useMutation(api.changelog.create);
  const publishRelease = useMutation(
    api.changelog_actions.publish
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.changelog.get, { id: args.id });
    if (!current) {
      return;
    }
    localStore.setQuery(
      api.changelog.get,
      { id: args.id },
      {
        ...current,
        publishedAt: Date.now(),
      }
    );
  });

  const unpublishRelease = useMutation(
    api.changelog_actions.unpublish
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.changelog.get, { id: args.id });
    if (!current) {
      return;
    }
    localStore.setQuery(
      api.changelog.get,
      { id: args.id },
      {
        ...current,
        publishedAt: undefined,
      }
    );
  });

  const isPublished = release?.publishedAt !== undefined;

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
    api.changelog.get,
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
          feedbackLinkStatus !== "keep" ? feedbackLinkStatus : undefined,
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
        <div
          className={cn(
            "border-t bg-muted/30 px-6 py-4",
            "flex items-center justify-between gap-2"
          )}
        >
          <Button
            disabled={isSubmitting || isStreaming || !title.trim()}
            onClick={
              isPublished ? handleUnpublish : () => setShowPublishConfirm(true)
            }
            size="sm"
            type="button"
            variant={isPublished ? "outline" : "default"}
          >
            {isPublished ? "Unpublish" : "Publish"}
          </Button>

          <Button
            disabled={isSubmitting || isStreaming}
            onClick={handleCancel}
            size="sm"
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </div>

      <PublishConfirmDialog
        feedbackLinkStatus={feedbackLinkStatus}
        isSubmitting={isSubmitting}
        linkedFeedbackCount={linkedFeedbackCount}
        onConfirm={handlePublish}
        onOpenChange={setShowPublishConfirm}
        open={showPublishConfirm}
        organizationId={organizationId}
        orgSlug={orgSlug}
        title={title}
        version={version}
      />
    </div>
  );
}
