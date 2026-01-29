import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import { cn } from "@/lib/utils";

interface ReleaseEditorProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
  release?: Doc<"releases">; // If provided, edit mode
  className?: string;
  onSuccess?: () => void;
}

export function ReleaseEditor({
  organizationId,
  orgSlug,
  release,
  className,
  onSuccess,
}: ReleaseEditorProps) {
  const router = useRouter();
  const createRelease = useMutation(api.changelog.create);
  const updateRelease = useMutation(api.changelog.update);
  const publishRelease = useMutation(api.changelog_actions.publish);
  const unpublishRelease = useMutation(api.changelog_actions.unpublish);

  const isEditing = !!release;
  const isPublished = release?.publishedAt !== undefined;

  const [title, setTitle] = useState(release?.title ?? "");
  const [version, setVersion] = useState(release?.version ?? "");
  const [description, setDescription] = useState(release?.description ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        router.push(`/${orgSlug}/changelog`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save release"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!release) {
      return;
    }

    try {
      await publishRelease({ id: release._id });
      toast.success("Release published!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish");
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
        {/* Version badge */}
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
          </div>

          <div className="flex gap-2">
            <Button
              disabled={isSubmitting}
              onClick={() => router.push(`/${orgSlug}/changelog`)}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
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
          </div>
        </div>
      </div>
    </form>
  );
}
