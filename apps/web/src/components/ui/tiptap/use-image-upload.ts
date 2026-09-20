"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

const MAX_IMAGE_SIZE_MB = 5;

function validateImageFile(file: File): Error | null {
  if (!file.type.startsWith("image/")) {
    return new Error("Please upload an image file");
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return new Error(`Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB`);
  }
  return null;
}

interface UseImageUploadOptions {
  onError?: (error: Error) => void;
  onSuccess?: (url: string) => void;
}

export function useImageUpload({
  onSuccess,
  onError,
}: UseImageUploadOptions = {}) {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const getStorageUrl = useMutation(api.storage.getStorageUrlMutation);
  const [isUploading, setIsUploading] = useState(false);
  const [lastStorageId, setLastStorageId] = useState<Id<"_storage"> | null>(
    null
  );

  const storageUrl = useQuery(
    api.storage.getStorageUrl,
    lastStorageId ? { storageId: lastStorageId } : "skip"
  );

  const uploadImage = async (file: File): Promise<string | null> => {
    const validationError = validateImageFile(file);
    if (validationError) {
      onError?.(validationError);
      return null;
    }

    setIsUploading(true);

    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        body: file,
        headers: {
          "Content-Type": file.type,
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const { storageId }: { storageId: Id<"_storage"> } =
        await response.json();
      setLastStorageId(storageId);

      const url = await getStorageUrl({ storageId });

      if (!url) {
        throw new Error("Failed to get storage URL");
      }

      onSuccess?.(url);
      return url;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to upload image");
      onError?.(error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaste = async (event: ClipboardEvent): Promise<string | null> => {
    const items = event.clipboardData?.items;
    if (!items) return null;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          return uploadImage(file);
        }
      }
    }

    return null;
  };

  const handleDrop = async (event: DragEvent): Promise<string | null> => {
    const files = event.dataTransfer?.files;
    if (!files?.length) return null;

    const file = files[0];
    if (file?.type.startsWith("image/")) {
      event.preventDefault();
      return uploadImage(file);
    }

    return null;
  };

  const openFilePicker = (): Promise<string | null> =>
    new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) {
          resolve(null);
          return;
        }
        const file = target.files?.[0];
        resolve(file ? await uploadImage(file) : null);
      };
      input.click();
    });

  return {
    handleDrop,
    handlePaste,
    isUploading,
    openFilePicker,
    storageUrl,
    uploadImage,
  };
}
