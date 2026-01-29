"use client";

import {
  Image as ImageIcon,
  Spinner,
  Trash,
  Upload,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useImageUpload } from "@/components/ui/tiptap/use-image-upload";
import { Muted } from "@/components/ui/typography";

interface LogoUploaderProps {
  currentLogo?: string | null;
  onLogoChange: (url: string | null) => void;
  disabled?: boolean;
}

const MAX_SIZE_MB = 2;
const ACCEPTED_FORMATS = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
];

export function LogoUploader({
  currentLogo,
  onLogoChange,
  disabled = false,
}: LogoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { uploadImage, isUploading } = useImageUpload({
    onSuccess: (url) => {
      onLogoChange(url);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return "Please upload a PNG, JPG, SVG, or WebP image";
    }
    const maxSizeBytes = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `Image must be smaller than ${MAX_SIZE_MB}MB`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      await uploadImage(file);
    },
    [validateFile, uploadImage]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFileSelect(file);
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
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      if (disabled) {
        return;
      }
      const file = event.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [disabled, handleFileSelect]
  );

  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled]);

  const handleRemove = useCallback(() => {
    onLogoChange(null);
    setError(null);
  }, [onLogoChange]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if ((event.key === "Enter" || event.key === " ") && !disabled) {
        event.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled]
  );

  const getDropZoneClassName = () => {
    if (disabled) {
      return "cursor-not-allowed bg-muted/30 opacity-60";
    }
    if (isDragging) {
      return "border-primary bg-primary/5";
    }
    return "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50";
  };

  const renderContent = () => {
    if (isUploading) {
      return (
        <div className="flex flex-col items-center gap-2">
          <Spinner className="h-8 w-8 animate-spin text-muted-foreground" />
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
              className="object-contain"
              fill
              src={currentLogo}
            />
          </div>
          <Muted className="text-xs">Click or drag to replace</Muted>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-full bg-muted p-3">
          {isDragging ? (
            <Upload className="h-6 w-6 text-primary" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="text-center">
          <Muted className="font-medium">
            {isDragging ? "Drop to upload" : "Click or drag to upload"}
          </Muted>
          <Muted className="text-xs">
            PNG, JPG, SVG, WebP (max {MAX_SIZE_MB}MB)
          </Muted>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <button
        className={`relative flex min-h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${getDropZoneClassName()}`}
        disabled={disabled}
        onClick={handleClick}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        type="button"
      >
        <input
          accept={ACCEPTED_FORMATS.join(",")}
          aria-label="Logo file input"
          className="hidden"
          disabled={disabled}
          onChange={handleInputChange}
          ref={inputRef}
          type="file"
        />
        {renderContent()}
      </button>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {currentLogo && !isUploading && (
        <Button
          disabled={disabled}
          onClick={handleRemove}
          size="sm"
          type="button"
          variant="outline"
        >
          <Trash className="mr-2 h-4 w-4" />
          Remove logo
        </Button>
      )}
    </div>
  );
}
