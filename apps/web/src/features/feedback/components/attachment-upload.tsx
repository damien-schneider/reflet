"use client";

import {
  Image as ImageIcon,
  Paperclip,
  Spinner,
  X,
} from "@phosphor-icons/react";
import NextImage from "next/image";
import { useCallback, useRef, useState } from "react";

import { useImageUpload } from "@/components/ui/tiptap/use-image-upload";
import { cn } from "@/lib/utils";

interface AttachmentUploadProps {
  attachments: string[];
  onAttachmentsChange: (attachments: string[]) => void;
  maxAttachments?: number;
  disabled?: boolean;
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
        <Spinner className="h-4 w-4 animate-spin" />
        <span>Uploading...</span>
      </>
    );
  }

  if (isDragging) {
    return (
      <>
        <ImageIcon className="h-4 w-4" />
        <span>Drop images here</span>
      </>
    );
  }

  return (
    <>
      <Paperclip className="h-4 w-4" />
      <span>Attach images</span>
      {attachmentsCount > 0 && (
        <span className="text-muted-foreground/60 text-xs">
          ({attachmentsCount}/{maxAttachments})
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
    onSuccess: (url) => {
      onAttachmentsChange([...attachments, url]);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const canAddMore = attachments.length < maxAttachments && !disabled;

  const handleFileSelect = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = maxAttachments - attachments.length;
      const filesToUpload = fileArray.slice(0, remaining);

      for (const file of filesToUpload) {
        await uploadImage(file);
      }

      if (fileArray.length > remaining) {
        setError(`Maximum ${maxAttachments} attachments allowed`);
      }
    },
    [attachments.length, maxAttachments, uploadImage]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files) {
        handleFileSelect(files);
      }
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (canAddMore) {
        setIsDragging(true);
      }
    },
    [canAddMore]
  );

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      if (!canAddMore) {
        return;
      }

      const files = event.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files);
      }
    },
    [canAddMore, handleFileSelect]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const updated = attachments.filter((_, i) => i !== index);
      onAttachmentsChange(updated);
      setError(null);
    },
    [attachments, onAttachmentsChange]
  );

  const handleClick = useCallback(() => {
    if (canAddMore && inputRef.current) {
      inputRef.current.click();
    }
  }, [canAddMore]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if ((event.key === "Enter" || event.key === " ") && canAddMore) {
        event.preventDefault();
        inputRef.current?.click();
      }
    },
    [canAddMore]
  );

  return (
    <div className="space-y-2">
      {/* Thumbnail grid */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((url, index) => (
            <div
              className="group relative h-16 w-16 overflow-hidden rounded-md border bg-muted"
              key={url}
            >
              <NextImage
                alt={`Attachment ${index + 1}`}
                className="object-cover"
                fill
                sizes="64px"
                src={url}
              />
              <button
                aria-label={`Remove attachment ${index + 1}`}
                className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                onClick={() => handleRemove(index)}
                type="button"
              >
                <X className="h-3 w-3" weight="bold" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropzone / upload button */}
      {canAddMore && (
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-2 text-muted-foreground text-sm transition-colors",
            isDragging
              ? "border-primary bg-primary/5 text-primary"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50",
            disabled && "cursor-not-allowed opacity-60"
          )}
          disabled={disabled}
          onClick={handleClick}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onKeyDown={handleKeyDown}
          type="button"
        >
          <input
            accept={ACCEPTED_IMAGE_TYPES}
            aria-label="Attach images"
            className="hidden"
            disabled={disabled || !canAddMore}
            multiple
            onChange={handleInputChange}
            ref={inputRef}
            type="file"
          />
          <DropzoneLabel
            attachmentsCount={attachments.length}
            isDragging={isDragging}
            isUploading={isUploading}
            maxAttachments={maxAttachments}
          />
        </button>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
