"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";

type MediaType = "image" | "video";

export interface MediaUploadResult {
  type: MediaType;
  url: string;
}

interface UseMediaUploadOptions {
  maxImageSizeMB?: number;
  maxVideoSizeMB?: number;
  onError?: (error: Error) => void;
  onSuccess?: (result: MediaUploadResult) => void;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

function getMediaType(mimeType: string): MediaType | null {
  if (IMAGE_TYPES.some((t) => mimeType.startsWith(t.split("/")[0]))) {
    return "image";
  }
  if (VIDEO_TYPES.some((t) => mimeType.startsWith(t.split("/")[0]))) {
    return "video";
  }
  return null;
}

const ACCEPT_BY_TYPE = {
  both: "image/*,video/*",
  image: "image/*",
  video: "video/*",
};

function validateMediaFile(
  file: File,
  limits: { image: number; video: number }
): { error: Error } | { mediaType: MediaType } {
  const mediaType = getMediaType(file.type);
  if (!mediaType) {
    return {
      error: new Error(
        "Upload an image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, MOV)."
      ),
    };
  }
  const maxSizeMB = mediaType === "image" ? limits.image : limits.video;
  if (file.size > maxSizeMB * 1024 * 1024) {
    const noun = mediaType === "image" ? "Image" : "Video";
    return {
      error: new Error(`${noun} must be smaller than ${maxSizeMB} MB.`),
    };
  }
  return { mediaType };
}

interface StorageClient {
  generateUploadUrl: () => Promise<string>;
  getStorageUrl: (args: {
    storageId: Id<"_storage">;
  }) => Promise<string | null>;
}

async function uploadToStorage(
  file: File,
  storage: StorageClient
): Promise<string | null> {
  const uploadUrl = await storage.generateUploadUrl();
  const response = await fetch(uploadUrl, {
    body: file,
    headers: {
      "Content-Type": file.type,
    },
    method: "POST",
  });
  if (!response.ok) {
    return null;
  }
  const { storageId }: { storageId: Id<"_storage"> } = await response.json();
  return storage.getStorageUrl({ storageId });
}

export function useMediaUpload({
  onSuccess,
  onError,
  maxImageSizeMB = 5,
  maxVideoSizeMB = 50,
}: UseMediaUploadOptions = {}) {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const getStorageUrl = useMutation(api.storage.getStorageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const uploadMedia = async (file: File): Promise<MediaUploadResult | null> => {
    const validation = validateMediaFile(file, {
      image: maxImageSizeMB,
      video: maxVideoSizeMB,
    });
    if ("error" in validation) {
      onError?.(validation.error);
      return null;
    }
    const { mediaType } = validation;

    setIsUploading(true);
    setUploadProgress(`Uploading ${mediaType}…`);

    const fallbackError = new Error(
      `Unable to upload the ${mediaType}. Try again.`
    );
    let url: string | null = null;
    let uploadError: Error = fallbackError;
    try {
      url = await uploadToStorage(file, { generateUploadUrl, getStorageUrl });
    } catch (err) {
      uploadError = err instanceof Error ? err : fallbackError;
    }
    setIsUploading(false);
    setUploadProgress(null);

    if (!url) {
      onError?.(uploadError);
      return null;
    }
    const result: MediaUploadResult = { type: mediaType, url };
    onSuccess?.(result);
    return result;
  };

  const openFilePicker = (
    acceptType: "image" | "video" | "both" = "both"
  ): Promise<MediaUploadResult | null> =>
    new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ACCEPT_BY_TYPE[acceptType];
      input.onchange = async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) {
          resolve(null);
          return;
        }
        const file = target.files?.[0];
        resolve(file ? await uploadMedia(file) : null);
      };
      input.click();
    });

  return {
    isUploading,
    openFilePicker,
    uploadMedia,
    uploadProgress,
  };
}
