import { useCallback, useEffect, useRef, useState } from "react";
import { captureViewport, releaseCapture } from "../../core/capture";
import { collectPageContext } from "../../core/page-context";
import {
  type Annotation,
  type CapturedImage,
  type ScreenshotDraft,
  SDK_VERSION,
} from "../../types";

export interface CaptureRequest {
  id: string;
  source: ScreenshotDraft["source"];
}

export function useScreenshotDrafts(
  captureFailed: string,
  onError: (error: string | null) => void
) {
  const [screenshots, setScreenshots] = useState<ScreenshotDraft[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingCapture, setPendingCapture] = useState<CaptureRequest | null>(
    null
  );
  const ownedImages = useRef(new Map<string, CapturedImage>());
  const captureRequest = useRef<CaptureRequest | null>(null);

  useEffect(() => {
    const images = ownedImages.current;
    return () => {
      captureRequest.current = null;
      for (const image of images.values()) {
        releaseCapture(image);
      }
      images.clear();
    };
  }, []);

  const storeScreenshot = useCallback((screenshot: ScreenshotDraft) => {
    releaseCapture(ownedImages.current.get(screenshot.id));
    ownedImages.current.set(screenshot.id, screenshot.image);
    setScreenshots((previous) => {
      const replacing = previous.some(({ id }) => id === screenshot.id);
      return replacing
        ? previous.map((item) =>
            item.id === screenshot.id ? screenshot : item
          )
        : [...previous, screenshot];
    });
    setActiveId(screenshot.id);
  }, []);

  const cancelPendingCapture = useCallback(() => {
    captureRequest.current = null;
    setPendingCapture(null);
  }, []);

  const takeScreenshot = useCallback(
    async (request: CaptureRequest) => {
      captureRequest.current = request;
      setPendingCapture(request);
      onError(null);
      const context = collectPageContext({ sdkVersion: SDK_VERSION });
      const image = await captureViewport().catch(() => null);
      if (captureRequest.current !== request) {
        releaseCapture(image);
        return;
      }
      cancelPendingCapture();
      if (!image) {
        onError(captureFailed);
        return;
      }
      storeScreenshot({ ...request, annotations: [], context, image });
    },
    [cancelPendingCapture, captureFailed, onError, storeScreenshot]
  );

  const takeCapture = useCallback(() => {
    if (!captureRequest.current) {
      takeScreenshot({ id: crypto.randomUUID(), source: "manual" });
    }
  }, [takeScreenshot]);

  const refreshAutomatic = useCallback(() => {
    takeScreenshot({
      id:
        ownedImages.current.keys().next().value ??
        captureRequest.current?.id ??
        crypto.randomUUID(),
      source: "automatic",
    });
  }, [takeScreenshot]);

  const retakeCapture = useCallback(
    (id: string) => {
      if (!captureRequest.current && ownedImages.current.has(id)) {
        takeScreenshot({ id, source: "manual" });
      }
    },
    [takeScreenshot]
  );

  const removeCapture = useCallback(
    (id: string) => {
      if (captureRequest.current?.id === id) {
        cancelPendingCapture();
      }
      releaseCapture(ownedImages.current.get(id));
      ownedImages.current.delete(id);
      setScreenshots((previous) => previous.filter((item) => item.id !== id));
      setActiveId((current) => (current === id ? null : current));
    },
    [cancelPendingCapture]
  );

  const resetScreenshots = useCallback(() => {
    cancelPendingCapture();
    for (const image of ownedImages.current.values()) {
      releaseCapture(image);
    }
    ownedImages.current.clear();
    setScreenshots([]);
    setActiveId(null);
  }, [cancelPendingCapture]);

  const setAnnotations = useCallback(
    (annotations: Annotation[]) => {
      setScreenshots((previous) =>
        previous.map((item) =>
          item.id === activeId ? { ...item, annotations } : item
        )
      );
    },
    [activeId]
  );

  const clearSelectionAnnotations = useCallback(() => {
    setScreenshots((previous) =>
      previous.map((item) => ({
        ...item,
        annotations: item.annotations.filter(
          ({ id }) => !id.startsWith("selection-")
        ),
      }))
    );
  }, []);

  return {
    activeScreenshot:
      screenshots.find(({ id }) => id === activeId) ??
      screenshots.at(-1) ??
      null,
    cancelPendingCapture,
    clearSelectionAnnotations,
    pendingCapture,
    refreshAutomatic,
    removeCapture,
    resetScreenshots,
    retakeCapture,
    screenshots,
    selectScreenshot: setActiveId,
    setAnnotations,
    storeScreenshot,
    takeCapture,
  };
}
