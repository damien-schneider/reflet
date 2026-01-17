import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const navigate = useNavigate();
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
        navigate({
          to: "/$orgSlug/changelog",
          params: { orgSlug },
        });
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
    <form className={cn("space-y-6", className)} onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            disabled={isSubmitting}
            id="title"
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's New in v1.0"
            required
            value={title}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="version">Version (optional)</Label>
          <Input
            disabled={isSubmitting}
            id="version"
            onChange={(e) => setVersion(e.target.value)}
            placeholder="v1.0.0"
            value={version}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          disabled={isSubmitting}
          id="description"
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what's new in this release..."
          rows={10}
          value={description}
        />
        <p className="text-muted-foreground text-xs">
          You can use HTML for formatting.
        </p>
      </div>

      <div className="flex justify-between gap-2">
        <div>
          {isEditing && (
            <Button
              disabled={isSubmitting}
              onClick={isPublished ? handleUnpublish : handlePublish}
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
            onClick={() =>
              navigate({
                to: "/$orgSlug/changelog",
                params: { orgSlug },
              })
            }
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit">
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
    </form>
  );
}
