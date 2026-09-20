import { useCallback, useEffect, useRef, useState } from "react";
import type { ElementSelection } from "../../types";
import { captureViewport, releaseCapture } from "../core/capture";
import {
  type ConsoleRecorder,
  startConsoleRecorder,
} from "../core/console-recorder";
import { captureElementCloseUp, highlightFor } from "../core/element-capture";
import {
  buildElementSelection,
  MAX_SELECTION_COMMENT_LENGTH,
} from "../core/element-selector";
import { collectPageContext } from "../core/page-context";
import {
  DEFAULT_WIDGET_LABELS,
  type RefletFeedbackProps,
  SDK_VERSION,
  type WidgetStep,
} from "../types";
import { useFeedbackSubmission } from "./state/use-feedback-submission";
import { useOwnedCapture } from "./state/use-owned-capture";
import { useScreenshotDrafts } from "./state/use-screenshot-drafts";
import { useWidgetConfig } from "./state/use-widget-config";
import { useCaptureSync } from "./use-capture-sync";

const SUCCESS_CLOSE_DELAY = 2400;
const IS_APPLE = /Mac|iPhone|iPad/;
const MILLISECONDS_PER_DAY = 86_400_000;

function readDismissedUntil(key: string): number {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const value = Number.parseInt(window.localStorage.getItem(key) ?? "", 10);
    if (Number.isFinite(value) && value > Date.now()) {
      return value;
    }
    window.localStorage.removeItem(key);
  } catch {
    return 0;
  }

  return 0;
}

function writeDismissedUntil(key: string, until: number): void {
  try {
    window.localStorage.setItem(key, String(until));
  } catch {
    // storage blocked (private mode, quota) — dismissal just does not persist
  }
}

export function matchesHotkey(
  event: Pick<
    KeyboardEvent,
    "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey"
  >,
  hotkey: string,
  platform = typeof navigator === "undefined" ? "" : navigator.platform
): boolean {
  const parts = hotkey
    .toLowerCase()
    .split("+")
    .map((part) => part.trim());
  const key = parts.at(-1);
  if (!key || event.key.toLowerCase() !== key) {
    return false;
  }

  const isApple = IS_APPLE.test(platform);
  const wantsMod = parts.includes("mod");
  const expected = {
    alt: parts.includes("alt") || parts.includes("option"),
    ctrl: parts.includes("ctrl") || (wantsMod && !isApple),
    meta:
      parts.includes("meta") || parts.includes("cmd") || (wantsMod && isApple),
    shift: parts.includes("shift"),
  };

  return (
    event.altKey === expected.alt &&
    event.ctrlKey === expected.ctrl &&
    event.metaKey === expected.meta &&
    event.shiftKey === expected.shift
  );
}

export function useWidgetState(props: RefletFeedbackProps) {
  const { client, dismissalKey, dismissForDays, isAnonymous } =
    useWidgetConfig(props);

  const [isOpen, setIsOpen] = useState(false);
  const [annotationTrigger, setAnnotationTrigger] =
    useState<HTMLButtonElement | null>(null);
  const [step, setStep] = useState<WidgetStep>("compose");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [elementCapture, replaceElementCapture] = useOwnedCapture();
  const [selection, setSelection] = useState<ElementSelection | null>(null);
  const [selectedNode, setSelectedNode] = useState<Element | null>(null);
  const [isElementCapturing, setIsElementCapturing] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissedUntil, setDismissedUntil] = useState(() =>
    readDismissedUntil(dismissalKey)
  );

  const pickRef = useRef(0);
  useEffect(
    () => () => {
      pickRef.current++;
      if (successTimer.current) {
        clearTimeout(successTimer.current);
      }
    },
    []
  );
  const consoleRef = useRef<ConsoleRecorder | null>(null);

  useEffect(() => {
    setDismissedUntil(readDismissedUntil(dismissalKey));
  }, [dismissalKey]);

  useEffect(() => {
    if (props.captureConsole === false) {
      return;
    }
    const recorder = startConsoleRecorder();
    consoleRef.current = recorder;
    return () => {
      consoleRef.current = null;
      recorder.stop();
    };
  }, [props.captureConsole]);

  const captureFailed =
    props.labels?.captureFailed ?? DEFAULT_WIDGET_LABELS.captureFailed;
  const gallery = useScreenshotDrafts(captureFailed, setError);
  const {
    activeScreenshot,
    cancelPendingCapture,
    clearSelectionAnnotations,
    refreshAutomatic,
    resetScreenshots,
    storeScreenshot,
  } = gallery;
  const capture = activeScreenshot?.image ?? null;
  const annotations = activeScreenshot?.annotations ?? [];
  const isCapturing = gallery.pendingCapture !== null || isElementCapturing;
  const submission = useFeedbackSubmission({
    client,
    onError: setError,
    onSubmitted: (feedbackId) => {
      setStep("success");
      props.onSubmit?.({ feedbackId });
      successTimer.current = setTimeout(close, SUCCESS_CLOSE_DELAY);
    },
    partialUploadMessage:
      props.labels?.attachmentUploadFailed ??
      DEFAULT_WIDGET_LABELS.attachmentUploadFailed,
  });
  const { resetSubmission } = submission;
  const firstCapture = gallery.pendingCapture ?? gallery.screenshots[0];
  const canRefreshAutomatically =
    gallery.screenshots.length <= 1 && firstCapture?.source === "automatic";

  useCaptureSync(
    isOpen &&
      !submission.isEditingDisabled &&
      step === "compose" &&
      canRefreshAutomatically &&
      annotations.length === 0 &&
      !selection &&
      props.captureOnOpen !== false,
    refreshAutomatic
  );

  const reset = useCallback(() => {
    if (successTimer.current) {
      clearTimeout(successTimer.current);
    }
    setAnnotationTrigger(null);
    resetSubmission();
    pickRef.current++;
    setIsElementCapturing(false);
    resetScreenshots();
    replaceElementCapture(null);
    setSelection(null);
    setSelectedNode(null);
    setMessage("");
    setEmail("");
    setHoneypot("");
    setError(null);
    setStep("compose");
  }, [resetSubmission, resetScreenshots, replaceElementCapture]);

  const close = useCallback(() => {
    setIsOpen(false);
    reset();
    props.onClose?.();
  }, [reset, props.onClose]);
  const dismiss = useCallback(() => {
    if (dismissForDays === null) {
      return;
    }

    const until = Date.now() + dismissForDays * MILLISECONDS_PER_DAY;
    writeDismissedUntil(dismissalKey, until);
    setIsOpen(false);
    reset();
    setDismissedUntil(until);
    props.onDismiss?.({ until });
  }, [dismissForDays, dismissalKey, props.onDismiss, reset]);

  const open = useCallback(() => {
    setIsOpen(true);
    setStep("compose");
    props.onOpen?.();
    if (props.captureOnOpen !== false) {
      refreshAutomatic();
    }
  }, [props.captureOnOpen, props.onOpen, refreshAutomatic]);

  const selectElement = useCallback(
    async (element: Element, note = "") => {
      cancelPendingCapture();
      setIsElementCapturing(true);
      const picked: ElementSelection = note
        ? {
            ...buildElementSelection(element),
            comment: note.slice(0, MAX_SELECTION_COMMENT_LENGTH),
          }
        : buildElementSelection(element);
      setSelection(picked);
      setSelectedNode(element);
      setStep("compose");

      const pick = ++pickRef.current;
      const context = collectPageContext({ sdkVersion: SDK_VERSION });
      const [fresh, closeUp] = await Promise.all([
        captureViewport().catch(() => null),
        captureElementCloseUp(element).catch(() => null),
      ]);

      if (pickRef.current !== pick) {
        releaseCapture(fresh);
        releaseCapture(closeUp);
        return;
      }

      setIsElementCapturing(false);
      if (fresh) {
        storeScreenshot({
          annotations: [highlightFor(picked, fresh)],
          context,
          id: crypto.randomUUID(),
          image: fresh,
          source: "manual",
        });
      } else {
        setError(captureFailed);
      }
      replaceElementCapture(closeUp);
    },
    [
      cancelPendingCapture,
      captureFailed,
      storeScreenshot,
      replaceElementCapture,
    ]
  );

  const clearSelection = useCallback(() => {
    pickRef.current++;
    replaceElementCapture(null);
    setSelection(null);
    setSelectedNode(null);
    setIsElementCapturing(false);
    clearSelectionAnnotations();
  }, [clearSelectionAnnotations, replaceElementCapture]);

  // A note written on the element is a complete report on its own.
  const reportedMessage = message.trim() || selection?.comment || "";
  const submit = () => {
    if (honeypot) {
      setStep("success");
      return;
    }
    return submission.submit({
      context: {
        ...(activeScreenshot?.context ??
          collectPageContext({ sdkVersion: SDK_VERSION })),
        consoleEvents: consoleRef.current?.events(),
        metadata: props.metadata,
        selection: selection ?? undefined,
      },
      element: elementCapture,
      email,
      isAnonymous,
      message: reportedMessage,
      screenshots: gallery.screenshots,
    });
  };

  return {
    activeScreenshot,
    annotateScreenshot: (id: string, trigger: HTMLButtonElement) => {
      setAnnotationTrigger(trigger);
      gallery.selectScreenshot(id);
      setStep("annotate");
    },
    annotations,
    annotationTrigger,
    canDismiss: dismissForDays !== null,
    canSubmit: reportedMessage.length > 0,
    capture,
    clearSelection,
    close,
    dismiss,
    dismissForDays,
    elementCapture,
    email,
    error,
    hasPendingAttachments: submission.hasPendingAttachments,
    honeypot,
    isAnonymous,
    isCapturing,
    isDismissed: dismissedUntil > Date.now(),
    isEditingDisabled: submission.isEditingDisabled,
    isOpen,
    isSubmitting: submission.isSubmitting,
    message,
    open,
    pendingCapture: gallery.pendingCapture,
    removeCapture: gallery.removeCapture,
    retakeCapture: gallery.retakeCapture,
    screenshots: gallery.screenshots,
    selectElement,
    selectedNode,
    selection,
    setAnnotations: gallery.setAnnotations,
    setEmail,
    setHoneypot,
    setMessage,
    setStep,
    step,
    submit,
    takeCapture: gallery.takeCapture,
  };
}

export type WidgetState = ReturnType<typeof useWidgetState>;
