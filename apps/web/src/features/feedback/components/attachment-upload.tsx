"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Image as ImageIcon, Paperclip, X } from "@phosphor-icons/react";
import NextImage from "next/image";
import { useRef, useState } from "react";
import { useImageUpload } from "@/components/ui/tiptap/use-image-upload";

interface AttachmentUploadProps {
  attachments: string[];
  disabled?: boolean;
  maxAttachments?: number;
  onAttachmentsChange: (attachments: string[]) => void;
}

const MAX_ATTACHMENTS_DEFAULT = 5;
const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/gif,image/webp";

function DropzoneLabel({
  isUploading,
  isDragging,
  attachmentsCount,
  maxAttachments,
}: {
  isUploading: boolean;
  isDragging: boolean;
  attachmentsCount: number;
  maxAttachments: number;
}) {
  if (isUploading) {
    return (
      <>
        <Spinner />
        <span>Uploading…</span>
      </>
    );
  }

  if (isDragging) {
    return (
      <>
        <ImageIcon aria-hidden className="size-4" />
        <span>Drop images to attach</span>
      </>
    );
  }

  return (
    <>
      <Paperclip aria-hidden className="size-4" />
      <span>Attach images</span>
      {attachmentsCount > 0 && (
        <span className="text-muted-foreground text-xs tabular-nums">
          {attachmentsCount}/{maxAttachments}
        </span>
      )}
    </>
  );
}

export function AttachmentUpload({
  attachments,
  onAttachmentsChange,
  maxAttachments = MAX_ATTACHMENTS_DEFAULT,
  disabled = false,
}: AttachmentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { uploadImage, isUploading } = useImageUpload({
    onError: (err) => {
      setError(err.message);
    },
  });

  const canAddMore = attachments.length < maxAttachments && !disabled;

  const handleFileSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remaining = maxAttachments - attachments.length;
    const filesToUpload = fileArray.slice(0, remaining);

    const uploaded = await Promise.all(
      filesToUpload.map((file) => uploadImage(file))
    );
    const urls = uploaded.filter((url): url is string => url !== null);
    if (urls.length > 0) {
      onAttachmentsChange([...attachments, ...urls]);
      setError(null);
    }

    if (fileArray.length > remaining) {
      setError(
        `You can attach up to ${maxAttachments} images. Remove one to add another.`
      );
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleFileSelect(files);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (canAddMore) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    if (!canAddMore) {
      return;
    }

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleRemove = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
    setError(null);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      {attachments.length > 0 && (
        <ul aria-label="Attachments" className="flex flex-wrap gap-2">
          {attachments.map((url, index) => (
            <li
              className="group relative size-16 rounded-md bg-muted"
              key={url}
            >
              <NextImage
                alt={`Attachment ${index + 1}`}
                className="rounded-md object-cover outline outline-1 outline-black/10 -outline-offset-1 dark:outline-white/10"
                fill
                sizes="64px"
                src={url}
              />
              <Tooltip>
                <TooltipTrigger
                  aria-label={`Remove attachment ${index + 1}`}
                  render={
                    <button
                      className="pointer-events-none pointer-coarse:pointer-events-auto absolute top-0.5 right-0.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-foreground/70 text-background opacity-0 pointer-coarse:opacity-100 outline-none transition-opacity duration-(--duration-fast) before:absolute before:-inset-1.5 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:pointer-events-auto group-hover:opacity-100"
                      disabled={disabled}
                      onClick={() => handleRemove(index)}
                      type="button"
                    />
                  }
                >
                  <X aria-hidden className="size-3" weight="bold" />
                </TooltipTrigger>
                <TooltipContent>Remove attachment</TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}

      {canAddMore && (
        <>
          <input
            accept={ACCEPTED_IMAGE_TYPES}
            aria-hidden="true"
            className="hidden"
            multiple
            onChange={handleInputChange}
            ref={inputRef}
            tabIndex={-1}
            type="file"
          />
          <button
            aria-busy={isUploading || undefined}
            className={cn(
              "flex w-full cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-left text-muted-foreground text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
              isDragging
                ? "border-primary bg-primary/5 text-primary"
                : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50"
            )}
            disabled={disabled}
            onClick={handleClick}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            type="button"
          >
            <DropzoneLabel
              attachmentsCount={attachments.length}
              isDragging={isDragging}
              isUploading={isUploading}
              maxAttachments={maxAttachments}
            />
          </button>
        </>
      )}

      {error && (
        <p className="text-destructive-text text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
