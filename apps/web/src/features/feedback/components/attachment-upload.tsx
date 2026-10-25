"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dropzone,
  DropzoneArea,
  type DropzoneDropDetails,
  DropzoneErrorCode,
  DropzoneInput,
  DropzoneTrigger,
  useDropzoneContext,
} from "@ctrl-ui/react/ui/dropzone";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { Text } from "@ctrl-ui/react/ui/typography";
import { Image as ImageIcon, Paperclip, X } from "@phosphor-icons/react";
import NextImage from "next/image";
import { useState } from "react";
import { useImageUpload } from "@/components/ui/tiptap/use-image-upload";

interface AttachmentUploadProps {
  attachments: string[];
  disabled?: boolean;
  maxAttachments?: number;
  onAttachmentsChange: (attachments: string[]) => void;
}

const MAX_ATTACHMENTS_DEFAULT = 5;
const IMAGE_ACCEPT = {
  "image/gif": [".gif"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};
const REMOVE_BUTTON_KNOBS =
  "[--cui-button-height:calc(var(--spacing)*5)] [--cui-button-icon:calc(var(--spacing)*3)] [--cui-button-background:oklch(from_var(--foreground)_l_c_h/0.7)] [--cui-button-hover-background:var(--cui-button-background)] [--cui-button-foreground:var(--background)] [--cui-button-hover-foreground:var(--cui-button-foreground)]";

function DropzoneLabel({
  isUploading,
  attachmentsCount,
  maxAttachments,
}: {
  isUploading: boolean;
  attachmentsCount: number;
  maxAttachments: number;
}) {
  const { isDragActive } = useDropzoneContext();
  if (isUploading) {
    return (
      <>
        <Spinner />
        <span>Uploading…</span>
      </>
    );
  }

  if (isDragActive) {
    return (
      <>
        <ImageIcon aria-hidden />
        <span>Drop images to attach</span>
      </>
    );
  }

  return (
    <>
      <Paperclip aria-hidden />
      <span>Attach images</span>
      {attachmentsCount > 0 && (
        <Text numeric size="caption" tone="muted">
          {attachmentsCount}/{maxAttachments}
        </Text>
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
  const [error, setError] = useState<string | null>(null);

  const { uploadImage, isUploading } = useImageUpload({
    onError: (err) => {
      setError(err.message);
    },
  });

  const canAddMore = attachments.length < maxAttachments && !disabled;

  const handleFileSelect = async (files: readonly File[]) => {
    const uploaded = await Promise.all(files.map((file) => uploadImage(file)));
    const urls = uploaded.filter((url): url is string => url !== null);
    if (urls.length > 0) {
      onAttachmentsChange([...attachments, ...urls]);
      setError(null);
    }
  };

  const handleDrop = async ({
    acceptedFiles,
    fileRejections,
  }: DropzoneDropDetails) => {
    if (acceptedFiles.length > 0) {
      await handleFileSelect(acceptedFiles);
    }
    const rejection = fileRejections[0]?.errors[0];
    if (!rejection) {
      return;
    }
    setError(
      rejection.code === DropzoneErrorCode.TooManyFiles
        ? `You can attach up to ${maxAttachments} images. Remove one to add another.`
        : rejection.message
    );
  };

  const handleRemove = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
    setError(null);
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
              <div className="pointer-events-none pointer-coarse:pointer-events-auto absolute top-0.5 right-0.5 opacity-0 pointer-coarse:opacity-100 transition-opacity duration-(--duration-fast) group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
                <Tooltip>
                  <TooltipTrigger
                    aria-label={`Remove attachment ${index + 1}`}
                    render={
                      <Button
                        className={REMOVE_BUTTON_KNOBS}
                        disabled={disabled}
                        iconOnly
                        onClick={() => handleRemove(index)}
                        shape="circle"
                        size="xs"
                        variant="quiet"
                      />
                    }
                  >
                    <X aria-hidden weight="bold" />
                  </TooltipTrigger>
                  <TooltipContent>Remove attachment</TooltipContent>
                </Tooltip>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canAddMore && (
        <Dropzone
          disabled={disabled || isUploading}
          onDrop={handleDrop}
          policy={{
            accept: IMAGE_ACCEPT,
            maxFiles: maxAttachments - attachments.length,
          }}
          size="sm"
          value={[]}
        >
          <DropzoneInput aria-label="Attach images" />
          <DropzoneArea>
            <DropzoneTrigger aria-busy={isUploading || undefined}>
              <DropzoneLabel
                attachmentsCount={attachments.length}
                isUploading={isUploading}
                maxAttachments={maxAttachments}
              />
            </DropzoneTrigger>
          </DropzoneArea>
        </Dropzone>
      )}

      {error && (
        <p className="text-destructive-text text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
