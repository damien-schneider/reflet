import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { OptimisticLocalStore } from "convex/browser";
import { useMutation } from "convex/react";
import { format } from "date-fns";
import { useState } from "react";
import { UNTITLED_RELEASE_TITLE } from "@/features/changelog/hooks/use-auto-save-release";
import { capture } from "@/lib/analytics";
import type { FeedbackLinkStatus } from "../components/feedback-section-header";

interface ReleaseDraft {
  description: string;
  title: string;
  version: string;
}

interface UseReleasePublishingOptions {
  draft: ReleaseDraft;
  feedbackLinkStatus: FeedbackLinkStatus;
  onDone: () => void;
  organizationId: Id<"organizations">;
  releaseId: Id<"releases"> | null;
}

function setPublishedAt(
  localStore: OptimisticLocalStore,
  id: Id<"releases">,
  publishedAt: number | undefined
) {
  const current = localStore.getQuery(api.changelog.queries.get, { id });
  if (!current) {
    return;
  }
  localStore.setQuery(
    api.changelog.queries.get,
    { id },
    {
      ...current,
      publishedAt,
    }
  );
}

function markPublishedNow(
  localStore: OptimisticLocalStore,
  args: { id: Id<"releases"> }
) {
  setPublishedAt(localStore, args.id, Date.now());
}

function markUnpublished(
  localStore: OptimisticLocalStore,
  args: { id: Id<"releases"> }
) {
  setPublishedAt(localStore, args.id, undefined);
}

export function useReleasePublishing({
  draft,
  feedbackLinkStatus,
  onDone,
  organizationId,
  releaseId,
}: UseReleasePublishingOptions) {
  const updateRelease = useMutation(api.changelog.mutations.update);
  const createRelease = useMutation(api.changelog.mutations.create);
  const publishRelease = useMutation(
    api.changelog.actions.publish
  ).withOptimisticUpdate(markPublishedNow);
  const unpublishRelease = useMutation(
    api.changelog.actions.unpublish
  ).withOptimisticUpdate(markUnpublished);
  const schedulePublish = useMutation(api.changelog.scheduling.schedulePublish);
  const cancelSchedule = useMutation(
    api.changelog.scheduling.cancelScheduledPublish
  );
  const pushToGithub = useMutation(api.changelog.actions.pushToGithub);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedbackStatus =
    feedbackLinkStatus === "keep" ? undefined : feedbackLinkStatus;
  const hasVersion = Boolean(draft.version.trim());

  const saveDraft = async (): Promise<Id<"releases">> => {
    const fields = {
      description: draft.description.trim() || undefined,
      title: draft.title.trim() || UNTITLED_RELEASE_TITLE,
      version: draft.version.trim() || undefined,
    };
    if (releaseId) {
      await updateRelease({ ...fields, id: releaseId });
      return releaseId;
    }
    return await createRelease({ ...fields, organizationId });
  };

  const trackSubmission = async (
    task: Promise<unknown>,
    fallback: string
  ): Promise<void> => {
    setIsSubmitting(true);
    try {
      await task;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : fallback);
    }
    setIsSubmitting(false);
  };

  const publishDraft = async () => {
    const id = await saveDraft();
    await publishRelease({ feedbackStatus, id });
    capture("release_published", { has_version: hasVersion });
    toast.success("Release published");
    onDone();
  };

  const scheduleDraft = async (scheduledAt: number) => {
    const id = await saveDraft();
    await schedulePublish({
      feedbackStatus,
      id,
      scheduledPublishAt: scheduledAt,
    });
    capture("release_scheduled", { has_version: hasVersion });
    toast.success(
      `Release scheduled for ${format(scheduledAt, "MMM d, yyyy 'at' h:mm a")}`
    );
    onDone();
  };

  const handlePublish = async () => {
    if (!draft.title.trim()) {
      toast.error("Add a title before publishing");
      return;
    }
    await trackSubmission(publishDraft(), "Unable to publish. Try again.");
  };

  const handleSchedule = async (scheduledAt: number) => {
    if (!draft.title.trim()) {
      toast.error("Add a title before scheduling");
      return;
    }
    await trackSubmission(
      scheduleDraft(scheduledAt),
      "Unable to schedule. Try again."
    );
  };

  const handleCancelSchedule = async () => {
    if (!releaseId) {
      return;
    }
    await trackSubmission(
      cancelSchedule({ id: releaseId }),
      "Unable to cancel the schedule. Try again."
    );
  };

  const handleUnpublish = async () => {
    if (!releaseId) {
      return;
    }
    await trackSubmission(
      unpublishRelease({ id: releaseId }),
      "Unable to unpublish. Try again."
    );
  };

  const handlePushToGithub = async () => {
    if (!releaseId) {
      return;
    }
    try {
      await pushToGithub({ releaseId });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to push to GitHub. Try again."
      );
    }
  };

  return {
    handleCancelSchedule,
    handlePublish,
    handlePushToGithub,
    handleSchedule,
    handleUnpublish,
    isSubmitting,
  };
}
