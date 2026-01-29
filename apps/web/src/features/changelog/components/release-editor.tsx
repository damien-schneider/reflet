import { Check, Spinner } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved";

const AUTO_SAVE_DEBOUNCE_MS = 500;

interface ReleaseEditorProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
  release?: Doc<"releases">; // If provided, edit mode
  className?: string;
  onSuccess?: () => void;
  mode?: "create" | "edit"; // create = auto-save as draft, edit = manual save
}

export function ReleaseEditor({
  organizationId,
  orgSlug,
  release,
  className,
  onSuccess,
  mode = "edit",
}: ReleaseEditorProps) {
  const router = useRouter();
  const createRelease = useMutation(api.changelog.create);
  const updateRelease = useMutation(api.changelog.update);
  const publishRelease = useMutation(api.changelog_actions.publish);
  const unpublishRelease = useMutation(api.changelog_actions.unpublish);

  const isEditing = !!release;
  const isPublished = release?.publishedAt !== undefined;
  const isAutoSaveMode = mode === "create";

  const [title, setTitle] = useState(release?.title ?? "");
  const [version, setVersion] = useState(release?.version ?? "");
  const [description, setDescription] = useState(release?.description ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-save state
  const [draftId, setDraftId] = useState<Id<"releases"> | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstEditRef = useRef(true);

  // Track if content has changed for auto-save
  const hasContent = title.trim() || version.trim() || description.trim();

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (!(isAutoSaveMode && hasContent)) {
      return;
    }

    setSaveStatus("saving");

    try {
      if (draftId) {
        // Update existing draft
        await updateRelease({
          id: draftId,
          title: title.trim() || "Untitled Release",
          version: version.trim() || undefined,
          description: description.trim() || undefined,
        });
      } else {
        // Create new draft on first edit
        const newId = await createRelease({
          organizationId,
          title: title.trim() || "Untitled Release",
          version: version.trim() || undefined,
          description: description.trim() || undefined,
        });
        setDraftId(newId);
      }
      setSaveStatus("saved");
      // Reset to idle after showing "Saved" briefly
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      setSaveStatus("idle");
      toast.error(
        error instanceof Error ? error.message : "Failed to save draft"
      );
    }
  }, [
    isAutoSaveMode,
    hasContent,
    draftId,
    title,
    version,
    description,
    organizationId,
    createRelease,
    updateRelease,
  ]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!isAutoSaveMode) {
      return;
    }

    // Skip auto-save on initial mount
    if (isFirstEditRef.current) {
      isFirstEditRef.current = false;
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only auto-save if there's content
    if (hasContent) {
      debounceTimerRef.current = setTimeout(() => {
        autoSave();
      }, AUTO_SAVE_DEBOUNCE_MS);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isAutoSaveMode, hasContent, autoSave]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && release) {
        await updateRelease({
          id: release._id,
          title: title.trim(),
          version: version.trim() || undefined,
          description: description.trim() || undefined,
        });
        toast.success("Release updated successfully!");
      } else if (draftId) {
        // In create mode, update the existing draft
        await updateRelease({
          id: draftId,
          title: title.trim(),
          version: version.trim() || undefined,
          description: description.trim() || undefined,
        });
        toast.success("Release saved!");
      } else {
        await createRelease({
          organizationId,
          title: title.trim(),
          version: version.trim() || undefined,
          description: description.trim() || undefined,
        });
        toast.success("Release created successfully!");
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/dashboard/${orgSlug}/changelog`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save release"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReleaseData = () => ({
    title: title.trim(),
    version: version.trim() || undefined,
    description: description.trim() || undefined,
  });

  const navigateToChangelog = () => {
    router.push(`/dashboard/${orgSlug}/changelog`);
  };

  const handlePublishNewDraft = async () => {
    setIsSubmitting(true);
    try {
      const data = getReleaseData();
      const newId = await createRelease({ organizationId, ...data });
      setDraftId(newId);
      await publishRelease({ id: newId });
      toast.success("Release published!");
      navigateToChangelog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishExistingDraft = async (releaseId: Id<"releases">) => {
    setIsSubmitting(true);
    try {
      if (draftId) {
        await updateRelease({ id: draftId, ...getReleaseData() });
      }
      await publishRelease({ id: releaseId });
      toast.success("Release published!");
      if (isAutoSaveMode) {
        navigateToChangelog();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error("Title is required to publish");
      return;
    }

    if (isAutoSaveMode && !draftId) {
      await handlePublishNewDraft();
      return;
    }

    const releaseId = release?._id ?? draftId;
    if (releaseId) {
      await handlePublishExistingDraft(releaseId);
    }
  };

  const handleUnpublish = async () => {
    if (!release) {
      return;
    }

    try {
      await unpublishRelease({ id: release._id });
      toast.success("Release unpublished");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to unpublish"
      );
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/${orgSlug}/changelog`);
  };

  const renderSaveStatus = () => {
    if (!isAutoSaveMode) {
      return null;
    }

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

    if (draftId) {
      return <span className="text-muted-foreground text-sm">Draft</span>;
    }

    return null;
  };

  return (
    <form
      className={cn(
        "overflow-hidden rounded-xl border bg-background shadow-sm",
        className
      )}
      onSubmit={handleSubmit}
    >
      {/* Document-like content area */}
      <div className="flex min-h-[500px] flex-col">
        {/* Version badge and status */}
        <div className="flex items-center gap-2 px-6 pt-4">
          <Input
            className="h-7 w-28 text-xs"
            disabled={isSubmitting}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="v1.0.0"
            value={version}
          />
          {isEditing && isPublished && (
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
            disabled={isSubmitting}
            onChange={setTitle}
            placeholder="What's New in v1.0"
            value={title}
          />
        </div>

        {/* Divider */}
        <div className="mx-6 border-border/50 border-b" />

        {/* Description area - takes up remaining space */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <TiptapMarkdownEditor
            disabled={isSubmitting}
            minimal
            onChange={setDescription}
            placeholder="Describe what's new in this release... Type '/' for commands, or drag and drop images/videos"
            value={description}
          />
        </div>

        {/* Footer */}
        <div
          className={cn(
            "border-t bg-muted/30 px-6 py-4",
            "flex items-center justify-between gap-2"
          )}
        >
          <div>
            {isEditing && (
              <Button
                disabled={isSubmitting}
                onClick={isPublished ? handleUnpublish : handlePublish}
                size="sm"
                type="button"
                variant={isPublished ? "outline" : "default"}
              >
                {isPublished ? "Unpublish" : "Publish"}
              </Button>
            )}
            {isAutoSaveMode && (
              <Button
                disabled={isSubmitting || !title.trim()}
                onClick={handlePublish}
                size="sm"
                type="button"
              >
                Publish
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              disabled={isSubmitting}
              onClick={handleCancel}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            {!isAutoSaveMode && (
              <Button disabled={isSubmitting} size="sm" type="submit">
                {(() => {
                  if (isSubmitting) {
                    return "Saving...";
                  }

                  if (isEditing) {
                    return "Update Release";
                  }

                  return "Create Release";
                })()}
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
