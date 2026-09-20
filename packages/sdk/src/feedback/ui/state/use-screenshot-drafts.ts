import { useCallback, useEffect, useRef, useState } from "react";
import { captureViewport, releaseCapture } from "../../core/capture";
import { collectPageContext } from "../../core/page-context";
import {
  type Annotation,
  type ScreenshotDraft,
  SDK_VERSION,
} from "../../types";

export interface CaptureRequest {
  id: string;
  source: ScreenshotDraft["source"];
}

function releaseDraft(draft: ScreenshotDraft | undefined): void {
  releaseCapture(draft?.image);
  releaseCapture(draft?.closeUp);
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
  const ownedDrafts = useRef(new Map<string, ScreenshotDraft>());
  const captureRequest = useRef<CaptureRequest | null>(null);

  useEffect(() => {
    const drafts = ownedDrafts.current;
    return () => {
      captureRequest.current = null;
      for (const draft of drafts.values()) {
        releaseDraft(draft);
      }
      drafts.clear();
    };
  }, []);

  const storeScreenshot = useCallback((screenshot: ScreenshotDraft) => {
    releaseDraft(ownedDrafts.current.get(screenshot.id));
    ownedDrafts.current.set(screenshot.id, screenshot);
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
        ownedDrafts.current.keys().next().value ??
        captureRequest.current?.id ??
        crypto.randomUUID(),
      source: "automatic",
    });
  }, [takeScreenshot]);

  const retakeCapture = useCallback(
    (id: string) => {
      if (!captureRequest.current && ownedDrafts.current.has(id)) {
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
      releaseDraft(ownedDrafts.current.get(id));
      ownedDrafts.current.delete(id);
      setScreenshots((previous) => previous.filter((item) => item.id !== id));
      setActiveId((current) => (current === id ? null : current));
    },
    [cancelPendingCapture]
  );

  const resetScreenshots = useCallback(() => {
    cancelPendingCapture();
    for (const draft of ownedDrafts.current.values()) {
      releaseDraft(draft);
    }
    ownedDrafts.current.clear();
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

  const setSelectionComment = useCallback((id: string, comment: string) => {
    setScreenshots((previous) =>
      previous.map((item) =>
        item.id === id && item.selection
          ? { ...item, selection: { ...item.selection, comment } }
          : item
      )
    );
  }, []);

  return {
    activeScreenshot:
      screenshots.find(({ id }) => id === activeId) ??
      screenshots.at(-1) ??
      null,
    cancelPendingCapture,
    pendingCapture,
    refreshAutomatic,
    removeCapture,
    resetScreenshots,
    retakeCapture,
    screenshots,
    selectScreenshot: setActiveId,
    setAnnotations,
    setSelectionComment,
    storeScreenshot,
    takeCapture,
  };
}
