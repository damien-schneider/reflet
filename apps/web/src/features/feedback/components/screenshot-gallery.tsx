"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ctrl-ui/react/ui/alert-dialog";
import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
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
import { useId, useRef, useState } from "react";
import { z } from "zod";

type FeedbackId = Id<"feedback">;

const uploadResponseSchema = z.object({
  storageId: z.custom<Id<"_storage">>((value) => typeof value === "string"),
});

const UPLOAD_ERROR_MESSAGE = "Couldn’t upload the screenshot. Try again.";

interface Screenshot {
  _id: Id<"feedbackScreenshots">;
  annotatedUrl?: string | null;
  captureSource: string;
  createdAt: number;
  filename: string;
  url?: string | null;
}

interface PreviewTarget {
  filename: string;
  url: string;
}

const IMAGE_OUTLINE =
  "outline outline-1 outline-black/10 -outline-offset-1 dark:outline-white/10";

function ScreenshotTile({
  screenshot,
  onPreview,
  onDelete,
}: {
  screenshot: Screenshot;
  onPreview: (target: PreviewTarget) => void;
  onDelete: (screenshot: Screenshot) => void;
}) {
  const displayUrl = screenshot.annotatedUrl ?? screenshot.url;

  return (
    <li className="group relative overflow-hidden rounded-md border">
      {displayUrl ? (
        <button
          aria-label={`Preview ${screenshot.filename}`}
          className="block w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          onClick={() =>
            onPreview({ filename: screenshot.filename, url: displayUrl })
          }
          type="button"
        >
          <Image
            alt=""
            className={`aspect-video w-full object-cover ${IMAGE_OUTLINE}`}
            height={180}
            src={displayUrl}
            unoptimized
            width={320}
          />
        </button>
      ) : (
        <div className="flex aspect-video items-center justify-center bg-muted">
          <Camera aria-hidden className="size-6 text-muted-foreground" />
          <span className="sr-only">Image unavailable</span>
        </div>
      )}
      <div className="pointer-events-none pointer-coarse:pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-foreground/60 to-transparent p-2 opacity-0 pointer-coarse:opacity-100 transition-opacity duration-(--duration-fast) group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
        <Badge size="sm">{screenshot.captureSource}</Badge>
        <div className="flex gap-1">
          {displayUrl && (
            <Tooltip>
              <TooltipTrigger
                aria-label={`Download ${screenshot.filename}`}
                render={
                  <ButtonLink
                    className="text-background hover:bg-background/20"
                    download={screenshot.filename}
                    href={displayUrl}
                    iconOnly
                    size="xs"
                    variant="quiet"
                  />
                }
              >
                <DownloadSimple />
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger
              aria-label={`Delete ${screenshot.filename}`}
              render={
                <Button
                  className="text-background hover:bg-background/20"
                  iconOnly
                  onClick={() => onDelete(screenshot)}
                  size="xs"
                  variant="quiet"
                />
              }
            >
              <Trash />
            </TooltipTrigger>
            <TooltipContent>Delete screenshot</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <p className="truncate px-2 py-1 text-muted-foreground text-xs">
        {formatDistanceToNow(screenshot.createdAt, { addSuffix: true })}
      </p>
    </li>
  );
}

function DeleteScreenshotDialog({
  screenshot,
  onClose,
  onConfirm,
}: {
  screenshot: Screenshot | null;
  onClose: () => void;
  onConfirm: (screenshot: Screenshot) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!screenshot) {
      return;
    }
    setIsDeleting(true);
    try {
      await onConfirm(screenshot);
    } catch {
      toast.error("Couldn’t delete the screenshot. Try again.");
    }
    setIsDeleting(false);
    onClose();
  };

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!(open || isDeleting)) {
          onClose();
        }
      }}
      open={screenshot !== null}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-balance">
            Delete this screenshot?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-pretty">
            It’s removed from this feedback for everyone. This can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button disabled={isDeleting} onClick={onClose} variant="surface">
            Cancel
          </Button>
          <Button
            disabled={isDeleting}
            onClick={handleConfirm}
            tone="danger"
            variant="surface"
          >
            {isDeleting ? <Spinner data-icon="inline-start" size="xs" /> : null}
            Delete screenshot
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

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
  const headingId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Screenshot | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);

  const handleUpload = async (file: File) => {
    setUploadingCount((count) => count + 1);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        body: file,
        headers: { "Content-Type": file.type },
        method: "POST",
      });
      if (response.ok) {
        const { storageId } = uploadResponseSchema.parse(await response.json());
        await saveScreenshot({
          captureSource: "upload",
          feedbackId,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          storageId,
        });
      } else {
        toast.error(UPLOAD_ERROR_MESSAGE);
      }
    } catch {
      toast.error(UPLOAD_ERROR_MESSAGE);
    }
    setUploadingCount((count) => count - 1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    e.target.value = "";
  };

  const handleDelete = async (screenshot: Screenshot) => {
    await deleteScreenshot({ screenshotId: screenshot._id });
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    await Promise.all(
      files.map((file) =>
        handleUpload(
          new File([file], "pasted-screenshot.png", { type: file.type })
        )
      )
    );
  };

  if (screenshots === undefined) {
    return (
      <div aria-busy="true" className="space-y-3">
        <Skeleton className="h-7 w-36" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="aspect-video" />
          <Skeleton className="aspect-video" />
        </div>
      </div>
    );
  }

  const isUploading = uploadingCount > 0;

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-3"
      onPaste={handlePaste}
    >
      <div className="flex items-center justify-between">
        <h3
          className="flex items-center gap-1.5 font-medium text-sm"
          id={headingId}
        >
          <Camera aria-hidden className="size-4 text-muted-foreground" />
          Screenshots
          <span className="text-muted-foreground tabular-nums">
            {screenshots.length}
          </span>
        </h3>
        <Button
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          size="xs"
          variant="surface"
        >
          {isUploading ? (
            <Spinner data-icon="inline-start" size="xs" />
          ) : (
            <UploadSimple data-icon="inline-start" />
          )}
          {isUploading ? "Uploading…" : "Upload"}
        </Button>
        <input
          accept="image/*"
          aria-hidden="true"
          className="hidden"
          onChange={handleFileChange}
          ref={fileInputRef}
          tabIndex={-1}
          type="file"
        />
      </div>

      {screenshots.length === 0 && !isUploading ? (
        <p className="text-muted-foreground text-xs">
          No screenshots yet. Upload one, or paste an image here.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {screenshots.map((screenshot) => (
            <ScreenshotTile
              key={screenshot._id}
              onDelete={setPendingDelete}
              onPreview={setPreview}
              screenshot={screenshot}
            />
          ))}
          {isUploading && (
            <li>
              <Skeleton className="aspect-video rounded-md" />
            </li>
          )}
        </ul>
      )}

      <Dialog onOpenChange={() => setPreview(null)} open={preview !== null}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate">
              {preview?.filename ?? "Screenshot"}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <Image
              alt={preview.filename}
              className={`w-full rounded-md ${IMAGE_OUTLINE}`}
              height={600}
              src={preview.url}
              unoptimized
              width={1200}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteScreenshotDialog
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        screenshot={pendingDelete}
      />
    </section>
  );
}
