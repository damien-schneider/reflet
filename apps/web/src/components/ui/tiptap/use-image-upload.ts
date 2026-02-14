"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";

interface UseImageUploadOptions {
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
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

  // Query the URL when we have a storageId (for reactive updates)
  const storageUrl = useQuery(
    api.storage.getStorageUrl,
    lastStorageId ? { storageId: lastStorageId } : "skip"
  );

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      if (!file.type.startsWith("image/")) {
        const error = new Error("Please upload an image file");
        onError?.(error);
        return null;
      }

      const maxSizeInMB = 5;
      const maxSizeBytes = maxSizeInMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        const error = new Error(`Image must be smaller than ${maxSizeInMB}MB`);
        onError?.(error);
        return null;
      }

      setIsUploading(true);

      try {
        // Step 1: Generate upload URL
        const uploadUrl = await generateUploadUrl();

        // Step 2: Upload file to the URL
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!response.ok) {
          throw new Error("Failed to upload image");
        }

        // Step 3: Get the storageId from response
        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };
        setLastStorageId(storageId);

        // Step 4: Get the public URL from Convex
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
    },
    [generateUploadUrl, getStorageUrl, onSuccess, onError]
  );

  const handlePaste = useCallback(
    async (event: ClipboardEvent): Promise<string | null> => {
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
    },
    [uploadImage]
  );

  const handleDrop = useCallback(
    async (event: DragEvent): Promise<string | null> => {
      const files = event.dataTransfer?.files;
      if (!files?.length) return null;

      const file = files[0];
      if (file?.type.startsWith("image/")) {
        event.preventDefault();
        return uploadImage(file);
      }

      return null;
    },
    [uploadImage]
  );

  const openFilePicker = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
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
        if (file) {
          const url = await uploadImage(file);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }, [uploadImage]);

  return {
    uploadImage,
    handlePaste,
    handleDrop,
    openFilePicker,
    isUploading,
    storageUrl,
  };
}
