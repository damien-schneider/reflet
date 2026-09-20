"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import { Input } from "@ctrl-ui/react/ui/input";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import {
  Camera,
  DownloadSimple,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { useRef, useState } from "react";

type FeedbackId = Id<"feedback">;

export function ScreenshotGallery({ feedbackId }: { feedbackId: FeedbackId }) {
  const screenshots = useQuery(api.feedback.screenshots.getByFeedback, {
    feedbackId,
  });
  const generateUploadUrl = useMutation(
    api.feedback.screenshots.generateUploadUrl
  );
  const saveScreenshot = useMutation(api.feedback.screenshots.saveScreenshot);
  const deleteScreenshot = useMutation(
    api.feedback.screenshots.deleteScreenshot
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    try {
      const uploadUrl = await generateUploadUrl();

      const response = await fetch(uploadUrl, {
        body: file,
        headers: { "Content-Type": file.type },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };

      await saveScreenshot({
        captureSource: "upload",
        feedbackId,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        storageId,
      });

      toast.success("Screenshot uploaded");
    } catch {
      toast.error("Failed to upload screenshot");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDelete = async (screenshotId: Id<"feedbackScreenshots">) => {
    try {
      await deleteScreenshot({ screenshotId });
      toast.success("Screenshot deleted");
    } catch {
      toast.error("Failed to delete screenshot");
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    for (const item of e.clipboardData.items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          await handleUpload(
            new File([file], "pasted-screenshot.png", { type: file.type })
          );
        }
      }
    }
  };

  if (screenshots === undefined) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {["a", "b"].map((id) => (
          <Skeleton className="aspect-video" key={id} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3" onPaste={handlePaste}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Camera className="size-4 text-muted-foreground" />
          <span className="font-medium text-sm tabular-nums">
            Screenshots ({screenshots.length})
          </span>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          size="xs"
          variant="surface"
        >
          <UploadSimple className="mr-1 size-3.5" />
          Upload
        </Button>
        <Input
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
      </div>

      {screenshots.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No screenshots attached. Upload or paste an image.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {screenshots.map((screenshot) => {
            const displayUrl = screenshot.annotatedUrl ?? screenshot.url;
            return (
              <div
                className="group relative overflow-hidden rounded-md border"
                key={screenshot._id}
              >
                {displayUrl ? (
                  <Button
                    aria-label={`Preview ${screenshot.filename}`}
                    className="block h-auto w-full cursor-pointer p-0"
                    onClick={() => setPreviewUrl(displayUrl)}
                    variant="quiet"
                  >
                    <Image
                      alt={screenshot.filename}
                      className="aspect-video w-full object-cover outline outline-1 outline-black/10 -outline-offset-1 dark:outline-white/10"
                      height={180}
                      src={displayUrl}
                      unoptimized
                      width={320}
                    />
                  </Button>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted">
                    <Camera className="size-6 text-muted-foreground" />
                  </div>
                )}
                <div className="pointer-events-none pointer-coarse:pointer-events-auto absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-foreground/60 to-transparent p-2 opacity-0 pointer-coarse:opacity-100 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
                  <Badge className="text-xs">{screenshot.captureSource}</Badge>
                  <div className="flex gap-1">
                    {displayUrl && (
                      <Tooltip>
                        <TooltipTrigger
                          aria-label={`Download ${screenshot.filename}`}
                          render={
                            <ButtonLink
                              className="rounded p-1 text-background hover:bg-background/20"
                              download={screenshot.filename}
                              href={displayUrl}
                              iconOnly
                              variant="quiet"
                            />
                          }
                        >
                          <DownloadSimple className="size-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>Download</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger
                        aria-label={`Delete ${screenshot.filename}`}
                        render={
                          <Button
                            className="rounded p-1 text-background hover:bg-background/20"
                            iconOnly
                            onClick={() => handleDelete(screenshot._id)}
                            variant="quiet"
                          />
                        }
                      >
                        <Trash className="size-3.5" />
                      </TooltipTrigger>
                      <TooltipContent>Delete screenshot</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <p className="truncate px-2 py-1 text-muted-foreground text-xs">
                  {formatDistanceToNow(screenshot.createdAt, {
                    addSuffix: true,
                  })}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        onOpenChange={() => setPreviewUrl(null)}
        open={previewUrl !== null}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Screenshot Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <Image
              alt="Screenshot preview"
              className="w-full rounded-md outline outline-1 outline-black/10 -outline-offset-1 dark:outline-white/10"
              height={600}
              src={previewUrl}
              unoptimized
              width={1200}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
