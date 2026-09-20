"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import {
  Image as ImageIcon,
  Paperclip,
  Spinner,
  X,
} from "@phosphor-icons/react";
import NextImage from "next/image";
import { useRef, useState } from "react";

import { useImageUpload } from "@/components/ui/tiptap/use-image-upload";
import { cn } from "@/lib/utils";

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
        <span className="text-muted-foreground/60 text-xs tabular-nums">
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
    onError: (err) => {
      setError(err.message);
    },
    onSuccess: (url) => {
      onAttachmentsChange([...attachments, url]);
      setError(null);
    },
  });

  const canAddMore = attachments.length < maxAttachments && !disabled;

  const handleFileSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remaining = maxAttachments - attachments.length;
    const filesToUpload = fileArray.slice(0, remaining);

    for (const file of filesToUpload) {
      await uploadImage(file);
    }

    if (fileArray.length > remaining) {
      setError(`Maximum ${maxAttachments} attachments allowed`);
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
        <div className="flex flex-wrap gap-2">
          {attachments.map((url, index) => (
            <div
              className="group relative h-16 w-16 overflow-hidden rounded-md border bg-muted"
              key={url}
            >
              <NextImage
                alt={`Attachment ${index + 1}`}
                className="object-cover outline outline-1 outline-black/10 -outline-offset-1 dark:outline-white/10"
                fill
                sizes="64px"
                src={url}
              />
              <Tooltip>
                <TooltipTrigger
                  aria-label={`Remove attachment ${index + 1}`}
                  render={
                    <Button
                      className="pointer-events-none pointer-coarse:pointer-events-auto absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-foreground/70 p-0 text-background opacity-0 pointer-coarse:opacity-100 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
                      iconOnly
                      onClick={() => handleRemove(index)}
                      variant="quiet"
                    />
                  }
                >
                  <X className="h-3 w-3" weight="bold" />
                </TooltipTrigger>
                <TooltipContent>Remove attachment</TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <>
          <Input
            accept={ACCEPTED_IMAGE_TYPES}
            aria-label="Attach images"
            className="hidden"
            multiple
            onChange={handleInputChange}
            ref={inputRef}
            type="file"
          />
          <Button
            className={cn(
              "h-auto w-full justify-start gap-2 rounded-md border border-dashed px-3 py-2 text-muted-foreground text-sm transition-colors",
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
            variant="quiet"
          >
            <DropzoneLabel
              attachmentsCount={attachments.length}
              isDragging={isDragging}
              isUploading={isUploading}
              maxAttachments={maxAttachments}
            />
          </Button>
        </>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
