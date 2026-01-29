"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import { cn } from "@/lib/utils";

interface ReleaseFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    version: string;
    title: string;
    content: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  release?: {
    version: string;
    title: string;
    content: string;
  };
}

export function ReleaseFormDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  release,
}: ReleaseFormDialogProps) {
  const [formData, setFormData] = useState({
    version: "",
    title: "",
    content: "",
  });

  useEffect(() => {
    if (release) {
      setFormData({
        version: release.version,
        title: release.title,
        content: release.content,
      });
    } else {
      setFormData({
        version: "",
        title: "",
        content: "",
      });
    }
  }, [release]);

  const handleSubmit = async () => {
    if (!(formData.version.trim() && formData.title.trim())) {
      return;
    }
    await onSubmit(formData);
  };

  let buttonLabel = "Create";
  if (isSubmitting) {
    buttonLabel = "Saving...";
  } else if (release) {
    buttonLabel = "Save";
  }

  const dialogTitle = release ? "Edit release" : "Create release";

  return (
    <Dialog onOpenChange={(val) => !val && onClose()} open={open}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton
      >
        {/* Hidden accessible title and description */}
        <DialogTitle className="sr-only">{dialogTitle}</DialogTitle>
        <DialogDescription className="sr-only">
          {release
            ? "Update the release details."
            : "Create a new changelog release."}
        </DialogDescription>

        {/* Document-like content area */}
        <div className="flex min-h-[500px] flex-col">
          {/* Version badge */}
          <div className="flex items-center gap-2 px-6 pt-4">
            <Input
              className="h-7 w-28 text-xs"
              disabled={isSubmitting}
              onChange={(e) =>
                setFormData({ ...formData, version: e.target.value })
              }
              placeholder="v1.0.0"
              value={formData.version}
            />
          </div>

          {/* Title area */}
          <div className="px-6 pt-4 pb-2">
            <TiptapTitleEditor
              autoFocus
              disabled={isSubmitting}
              onChange={(value) => setFormData({ ...formData, title: value })}
              placeholder="Release title"
              value={formData.title}
            />
          </div>

          {/* Divider */}
          <div className="mx-6 border-border/50 border-b" />

          {/* Content area - takes up remaining space */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TiptapMarkdownEditor
              disabled={isSubmitting}
              minimal
              onChange={(value) => setFormData({ ...formData, content: value })}
              placeholder="Describe what's new in this release... Type '/' for commands, or drag and drop images/videos"
              value={formData.content}
            />
          </div>

          {/* Footer */}
          <div
            className={cn(
              "border-t bg-muted/30 px-6 py-4",
              "flex items-center justify-end gap-2"
            )}
          >
            <DialogClose
              render={
                <Button disabled={isSubmitting} size="sm" variant="ghost">
                  Cancel
                </Button>
              }
            />
            <Button
              disabled={
                isSubmitting ||
                !formData.title.trim() ||
                !formData.version.trim()
              }
              onClick={handleSubmit}
              size="sm"
            >
              {buttonLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
