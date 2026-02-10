"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useState } from "react";

type MediaType = "image" | "video";

export interface MediaUploadResult {
  url: string;
  type: MediaType;
}

interface UseMediaUploadOptions {
  onSuccess?: (result: MediaUploadResult) => void;
  onError?: (error: Error) => void;
  maxImageSizeMB?: number;
  maxVideoSizeMB?: number;
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

export function useMediaUpload({
  onSuccess,
  onError,
  maxImageSizeMB = 5,
  maxVideoSizeMB = 50,
}: UseMediaUploadOptions = {}) {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const getStorageUrl = useMutation(api.storage.getStorageUrlMutation);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const uploadMedia = useCallback(
    async (file: File): Promise<MediaUploadResult | null> => {
      const mediaType = getMediaType(file.type);

      if (!mediaType) {
        const error = new Error(
          "Please upload an image (JPEG, PNG, GIF, WebP) or video (MP4, WebM, MOV)"
        );
        onError?.(error);
        return null;
      }

      const maxSizeMB = mediaType === "image" ? maxImageSizeMB : maxVideoSizeMB;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      if (file.size > maxSizeBytes) {
        const error = new Error(
          `${mediaType === "image" ? "Image" : "Video"} must be smaller than ${maxSizeMB}MB`
        );
        onError?.(error);
        return null;
      }

      setIsUploading(true);
      setUploadProgress(
        `Uploading ${mediaType === "image" ? "image" : "video"}...`
      );

      try {
        const uploadUrl = await generateUploadUrl();

        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${mediaType}`);
        }

        const { storageId } = (await response.json()) as {
          storageId: Id<"_storage">;
        };

        // Get the public URL from Convex
        const url = await getStorageUrl({ storageId });

        if (!url) {
          throw new Error("Failed to get storage URL");
        }

        const result: MediaUploadResult = { url, type: mediaType };
        onSuccess?.(result);
        return result;
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error(`Failed to upload ${mediaType}`);
        onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    },
    [
      generateUploadUrl,
      getStorageUrl,
      onSuccess,
      onError,
      maxImageSizeMB,
      maxVideoSizeMB,
    ]
  );

  const openFilePicker = useCallback(
    (
      acceptType: "image" | "video" | "both" = "both"
    ): Promise<MediaUploadResult | null> => {
      return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";

        if (acceptType === "image") {
          input.accept = "image/*";
        } else if (acceptType === "video") {
          input.accept = "video/*";
        } else {
          input.accept = "image/*,video/*";
        }

        input.onchange = async (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (file) {
            const result = await uploadMedia(file);
            resolve(result);
          } else {
            resolve(null);
          }
        };
        input.click();
      });
    },
    [uploadMedia]
  );

  return {
    uploadMedia,
    openFilePicker,
    isUploading,
    uploadProgress,
  };
}
