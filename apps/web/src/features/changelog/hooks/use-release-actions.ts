import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { capture } from "@/lib/analytics";
import type { FeedbackLinkStatus } from "../components/feedback-section-header";

interface UseReleaseActionsOptions {
  description: string;
  feedbackLinkStatus: FeedbackLinkStatus;
  onPublishDialogClose: () => void;
  onSuccess: () => void;
  organizationId: Id<"organizations">;
  orgSlug: string;
  release?: Doc<"releases">;
  releaseId: Id<"releases"> | null;
  title: string;
  version: string;
}

export function useReleaseActions({
  organizationId,
  release,
  releaseId,
  title,
  version,
  description,
  feedbackLinkStatus,
  onSuccess,
  onPublishDialogClose,
}: UseReleaseActionsOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateRelease = useMutation(api.changelog.mutations.update);
  const createRelease = useMutation(api.changelog.mutations.create);
  const publishRelease = useMutation(
    api.changelog.release_lifecycle.publish
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
    api.changelog.release_lifecycle.unpublish
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
  const pushToGithubMutation = useMutation(
    api.changelog.release_lifecycle.pushToGithub
  );
  const githubConnection = useQuery(
    api.integrations.github.queries.getConnection,
    { organizationId }
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

  const ensureRelease = async (): Promise<Id<"releases">> => {
    if (releaseId) {
      await updateRelease({
        id: releaseId,
        title: title.trim() || "Untitled Release",
        version: version.trim() || undefined,
        description: description.trim() || undefined,
      });
      return releaseId;
    }
    return createRelease({
      organizationId,
      title: title.trim() || "Untitled Release",
      version: version.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error("Title is required to publish");
      return;
    }

    setIsSubmitting(true);
    try {
      const id = await ensureRelease();
      await publishRelease({
        id,
        feedbackStatus:
          feedbackLinkStatus === "keep" ? undefined : feedbackLinkStatus,
      });
      capture("release_published", {
        has_version: Boolean(version.trim()),
      });
      onPublishDialogClose();
      toast.success("Release published!");
      onSuccess();
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
      const id = await ensureRelease();
      await schedulePublish({
        id,
        scheduledPublishAt: scheduledAt,
        feedbackStatus:
          feedbackLinkStatus === "keep" ? undefined : feedbackLinkStatus,
      });
      capture("release_scheduled", {
        has_version: Boolean(version.trim()),
      });
      onPublishDialogClose();
      toast.success(
        `Release scheduled for ${format(scheduledAt, "MMM d, yyyy 'at' h:mm a")}`
      );
      onSuccess();
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
      await pushToGithubMutation({ releaseId });
      toast.success("Push to GitHub scheduled");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to push to GitHub"
      );
    }
  };

  return {
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
  };
}
