"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

  const title = release ? "Edit release" : "Create release";
  const subtitle = release
    ? "Update the release details."
    : "Create a new changelog release.";

  return (
    <Dialog onOpenChange={(val) => !val && onClose()} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                onChange={(e) =>
                  setFormData({ ...formData, version: e.target.value })
                }
                placeholder="v1.0.0"
                value={formData.version}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Major feature release"
                value={formData.title}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Describe the changes in this release..."
              rows={10}
              value={formData.content}
            />
            <p className="text-muted-foreground text-xs">
              You can use HTML formatting in the content.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={handleSubmit}>
            {buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
