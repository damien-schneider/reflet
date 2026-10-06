"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
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

async function postImage(
  file: File,
  generateUploadUrl: () => Promise<string>
): Promise<Id<"_storage">> {
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
  const { storageId }: { storageId: Id<"_storage"> } = await response.json();
  return storageId;
}

async function resolveStorageUrl(
  storageId: Id<"_storage">,
  getStorageUrl: (args: { storageId: Id<"_storage"> }) => Promise<string | null>
): Promise<string> {
  const url = await getStorageUrl({ storageId });
  if (!url) {
    throw new Error("Failed to get storage URL");
  }
  return url;
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
  const getStorageUrl = useMutation(api.storage.getStorageUrl);
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (file: File): Promise<string | null> => {
    const validationError = validateImageFile(file);
    if (validationError) {
      onError?.(validationError);
      return null;
    }

    setIsUploading(true);

    let url: string | null = null;
    try {
      const storageId = await postImage(file, generateUploadUrl);
      url = await resolveStorageUrl(storageId, getStorageUrl);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to upload image");
      onError?.(error);
    }
    setIsUploading(false);
    if (url) {
      onSuccess?.(url);
    }
    return url;
  };

  return { isUploading, uploadImage };
}
