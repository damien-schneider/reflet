"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dropzone,
  DropzoneArea,
  type DropzoneDropDetails,
  DropzoneInput,
  DropzoneTrigger,
  useDropzoneContext,
} from "@ctrl-ui/react/ui/dropzone";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Image as ImageIcon, Trash, Upload } from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";
import { useImageUpload } from "@/components/ui/tiptap/use-image-upload";
import { Muted } from "@/components/ui/typography";

interface LogoUploaderProps {
  currentLogo?: string | null;
  disabled?: boolean;
  onLogoChange: (url: string | null) => void;
}

const MAX_SIZE_MB = 2;

const LOGO_POLICY = {
  accept: {
    "image/jpeg": [],
    "image/png": [],
    "image/svg+xml": [],
    "image/webp": [],
  },
  maxFiles: 1,
  maxSize: MAX_SIZE_MB * 1024 * 1024,
  multiple: false,
  selectionMode: "replace",
} as const;

const REJECTION_MESSAGES: Record<string, string> = {
  "file-invalid-type": "Please upload a PNG, JPG, SVG, or WebP image",
  "file-too-large": `Image must be smaller than ${MAX_SIZE_MB}MB`,
};

function DropzoneBody({
  currentLogo,
  isUploading,
}: {
  currentLogo?: string | null;
  isUploading: boolean;
}) {
  const { isDragActive } = useDropzoneContext();

  if (isUploading) {
    return (
      <div className="flex flex-col items-center gap-2">
        <Spinner size="lg" />
        <Muted>Uploading...</Muted>
      </div>
    );
  }

  if (currentLogo) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-16 w-32">
          <Image
            alt="Organization logo"
            className="object-contain outline outline-1 outline-black/10 -outline-offset-1 dark:outline-white/10"
            fill
            src={currentLogo}
          />
        </div>
        <Muted className="text-caption">Click or drag to replace</Muted>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-full bg-muted p-3">
        {isDragActive ? (
          <Upload className="h-6 w-6 text-brand-text" />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="text-center">
        <Muted className="font-medium">
          {isDragActive ? "Drop to upload" : "Click or drag to upload"}
        </Muted>
        <Muted className="text-caption">
          PNG, JPG, SVG, WebP (max {MAX_SIZE_MB}MB)
        </Muted>
      </div>
    </div>
  );
}

export function LogoUploader({
  currentLogo,
  onLogoChange,
  disabled = false,
}: LogoUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const { uploadImage, isUploading } = useImageUpload({
    onError: (err) => {
      setError(err.message);
    },
    onSuccess: (url) => {
      onLogoChange(url);
      setError(null);
    },
  });

  const handleDrop = async (details: DropzoneDropDetails) => {
    const rejection = details.fileRejections[0]?.errors[0];
    setError(
      rejection
        ? (REJECTION_MESSAGES[rejection.code] ?? rejection.message)
        : null
    );
    const file = details.acceptedFiles[0];
    if (file) {
      await uploadImage(file);
    }
  };

  return (
    <div className="space-y-3">
      <Dropzone
        disabled={disabled}
        onDrop={handleDrop}
        onError={(err) => setError(err.message)}
        policy={LOGO_POLICY}
      >
        <DropzoneArea>
          <DropzoneInput aria-label="Logo file input" tabIndex={-1} />
          <DropzoneTrigger>
            <DropzoneBody currentLogo={currentLogo} isUploading={isUploading} />
          </DropzoneTrigger>
        </DropzoneArea>
      </Dropzone>

      {error && <p className="text-destructive-text text-sm">{error}</p>}

      {currentLogo && !isUploading && (
        <Button
          disabled={disabled}
          onClick={() => {
            onLogoChange(null);
            setError(null);
          }}
          size="xs"
          type="button"
          variant="surface"
        >
          <Trash className="mr-2 h-4 w-4" />
          Remove logo
        </Button>
      )}
    </div>
  );
}
