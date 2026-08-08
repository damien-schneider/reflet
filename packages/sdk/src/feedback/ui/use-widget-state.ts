import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Reflet } from "../../client";
import { RefletContext } from "../../react-context";
import type { ElementSelection } from "../../types";
import { renderAnnotatedImage } from "../core/annotation-renderer";
import { captureViewport, releaseCapture } from "../core/capture";
import {
  type ConsoleRecorder,
  startConsoleRecorder,
} from "../core/console-recorder";
import { buildElementSelection } from "../core/element-selector";
import { collectPageContext } from "../core/page-context";
import { createFeedbackTransport, submitWidgetFeedback } from "../core/submit";
import {
  type Annotation,
  type CapturedImage,
  type FeedbackWidgetCategory,
  type RefletFeedbackProps,
  SDK_VERSION,
  type WidgetStep,
} from "../types";

const SUCCESS_CLOSE_DELAY = 2400;
const ELEMENT_CAPTURE_MAX_WIDTH = 1200;
const IS_APPLE = /Mac|iPhone|iPad/;
const MILLISECONDS_PER_DAY = 86_400_000;
const DISMISSAL_STORAGE_PREFIX = "reflet-feedback-dismissed";

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

/**
 * Matches shortcuts written as `alt+f` or `mod+shift+k`, where `mod` is the
 * platform's command key.
 */
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

function highlightFor(
  selection: ElementSelection,
  capture: CapturedImage
): Annotation {
  const scale = capture.width / window.innerWidth;
  const { rect } = selection;

  return {
    color: "#4f46e5",
    end: {
      x: (rect.x + rect.width) * scale,
      y: (rect.y + rect.height) * scale,
    },
    id: `selection-${rect.x}-${rect.y}`,
    start: { x: rect.x * scale, y: rect.y * scale },
    tool: "rectangle",
  };
}

/**
 * A capture whose object URL is revoked the moment it is replaced or dropped —
 * holding one without this leaks the blob for the lifetime of the page.
 */
function useOwnedCapture() {
  const [image, setImage] = useState<CapturedImage | null>(null);
  const ref = useRef<CapturedImage | null>(null);

  useEffect(() => {
    ref.current = image;
  }, [image]);
  useEffect(() => () => releaseCapture(ref.current), []);

  const replace = useCallback((next: CapturedImage | null) => {
    releaseCapture(ref.current);
    setImage(next);
  }, []);

  return [image, replace] as const;
}

export function useWidgetState(props: RefletFeedbackProps) {
  const context = useContext(RefletContext);
  const publicKey = props.publicKey ?? context?.publicKey;
  const baseUrl = props.baseUrl ?? context?.baseUrl;
  const user = props.user ?? context?.user;
  const userToken = props.userToken ?? context?.userToken;
  const isAnonymous = !(user || userToken);
  const dismissForDays =
    props.dismissForDays !== undefined &&
    Number.isFinite(props.dismissForDays) &&
    props.dismissForDays > 0
      ? props.dismissForDays
      : null;
  const dismissalKey = `${DISMISSAL_STORAGE_PREFIX}:${publicKey ?? "default"}:${user?.id ?? "anonymous"}`;

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<WidgetStep>("compose");
  const [category, setCategory] = useState<FeedbackWidgetCategory>(
    props.defaultCategory ?? "bug"
  );
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [capture, replaceCapture] = useOwnedCapture();
  const [elementCapture, replaceElementCapture] = useOwnedCapture();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selection, setSelection] = useState<ElementSelection | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedUntil, setDismissedUntil] = useState(() =>
    readDismissedUntil(dismissalKey)
  );

  const captureRef = useRef<CapturedImage | null>(null);
  const pickRef = useRef(0);
  const consoleRef = useRef<ConsoleRecorder | null>(null);

  useEffect(() => {
    captureRef.current = capture;
  }, [capture]);
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

  const takeCapture = useCallback(
    (element?: Element): void => {
      setIsCapturing(true);
      captureViewport({ element })
        .catch(() => null)
        .then((image) => {
          setIsCapturing(false);
          replaceCapture(image);
        });
    },
    [replaceCapture]
  );

  const reset = useCallback(() => {
    pickRef.current++;
    replaceCapture(null);
    replaceElementCapture(null);
    setAnnotations([]);
    setSelection(null);
    setMessage("");
    setEmail("");
    setHoneypot("");
    setError(null);
    setStep("compose");
    setCategory(props.defaultCategory ?? "bug");
  }, [props.defaultCategory, replaceCapture, replaceElementCapture]);

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
      takeCapture();
    }
  }, [props.captureOnOpen, props.onOpen, takeCapture]);

  const selectElement = useCallback(
    (element: Element) => {
      const picked = buildElementSelection(element);
      setSelection(picked);
      setStep("compose");

      const current = captureRef.current;
      if (current) {
        setAnnotations((previous) => [
          ...previous.filter((item) => !item.id.startsWith("selection-")),
          highlightFor(picked, current),
        ]);
      }

      const pick = ++pickRef.current;
      captureViewport({ element, maxWidth: ELEMENT_CAPTURE_MAX_WIDTH })
        .catch(() => null)
        .then((image) => {
          if (pickRef.current === pick) {
            replaceElementCapture(image);
          } else {
            releaseCapture(image);
          }
        });
    },
    [replaceElementCapture]
  );

  const clearSelection = useCallback(() => {
    pickRef.current++;
    replaceElementCapture(null);
    setSelection(null);
    setAnnotations((previous) =>
      previous.filter((item) => !item.id.startsWith("selection-"))
    );
  }, [replaceElementCapture]);

  const removeCapture = useCallback(() => {
    replaceCapture(null);
    setAnnotations([]);
  }, [replaceCapture]);

  const client = useMemo(
    () =>
      publicKey ? new Reflet({ baseUrl, publicKey, user, userToken }) : null,
    [baseUrl, publicKey, user, userToken]
  );

  const submit = useCallback(async () => {
    if (honeypot) {
      setStep("success");
      return;
    }
    if (!client) {
      setError(
        "Reflet is missing a publicKey. Pass one to RefletFeedback or RefletProvider."
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let annotated: CapturedImage | null = null;

    try {
      annotated = capture
        ? await renderAnnotatedImage(capture, annotations)
        : null;

      const result = await submitWidgetFeedback(
        createFeedbackTransport(client),
        {
          annotated,
          annotations,
          category,
          context: {
            ...collectPageContext({ sdkVersion: SDK_VERSION }),
            consoleEvents: consoleRef.current?.events(),
            metadata: props.metadata,
            selection: selection ?? undefined,
          },
          element: elementCapture,
          email,
          isAnonymous,
          message,
          screenshot: capture,
        }
      );

      setStep("success");
      props.onSubmit?.({ feedbackId: result.feedbackId });
      setTimeout(close, SUCCESS_CLOSE_DELAY);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again."
      );
    } finally {
      releaseCapture(annotated);
      setIsSubmitting(false);
    }
  }, [
    annotations,
    capture,
    category,
    client,
    close,
    elementCapture,
    email,
    honeypot,
    isAnonymous,
    message,
    props.metadata,
    props.onSubmit,
    selection,
  ]);

  return {
    annotations,
    canDismiss: dismissForDays !== null,
    capture,
    category,
    clearSelection,
    close,
    dismiss,
    dismissForDays,
    elementCapture,
    email,
    error,
    honeypot,
    isAnonymous,
    isCapturing,
    isDismissed: dismissedUntil > Date.now(),
    isOpen,
    isSubmitting,
    message,
    open,
    removeCapture,
    selectElement,
    selection,
    setAnnotations,
    setCategory,
    setEmail,
    setHoneypot,
    setMessage,
    setStep,
    step,
    submit,
    takeCapture,
  };
}

export type WidgetState = ReturnType<typeof useWidgetState>;
