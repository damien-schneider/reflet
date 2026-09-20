import type { FeedbackContext, RefletUser } from "../types";

export const SDK_VERSION = "0.4.0";
export const DEFAULT_WIDGET_OFFSET = 20;

const ANNOTATION_TOOLS = [
  "pen",
  "arrow",
  "rectangle",
  "text",
  "spotlight",
  "highlight",
  "blur",
] as const;

export type AnnotationTool = (typeof ANNOTATION_TOOLS)[number];

export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  color: string;
  end: Point;
  id: string;
  /** Freehand path, in image pixels. Only set for the pen tool. */
  points?: Point[];
  start: Point;
  text?: string;
  tool: AnnotationTool;
}

export interface CapturedImage {
  blob: Blob;
  height: number;
  mimeType: string;
  /** Object URL owned by the caller — revoke it when the capture is dropped. */
  objectUrl: string;
  width: number;
}

export interface ScreenshotDraft {
  annotations: Annotation[];
  context: FeedbackContext;
  id: string;
  image: CapturedImage;
  source: "automatic" | "manual";
}

export interface FeedbackWidgetLabels {
  annotateHint: string;
  attachElement: string;
  attachmentUploadFailed: string;
  attachScreenshot: string;
  back: string;
  cancel: string;
  captureFailed: string;
  capturing: string;
  clearAnnotations: string;
  clearSelection: string;
  descriptionPlaceholder: string;
  dismissForDays: string;
  done: string;
  elementNote: string;
  elementNotePlaceholder: string;
  emailInvalid: string;
  emailLabel: string;
  emailPlaceholder: string;
  errorGeneric: string;
  errorTitleRequired: string;
  minimize: string;
  moreOptions: string;
  moveFeedback: string;
  pickAnother: string;
  pickElement: string;
  pickElementHint: string;
  recapture: string;
  removeScreenshot: string;
  resume: string;
  retakeHint: string;
  retryAttachments: string;
  screenshot: string;
  submit: string;
  successMessage: string;
  successTitle: string;
  title: string;
  titlePlaceholder: string;
  trigger: string;
  undo: string;
}

export const DEFAULT_WIDGET_LABELS: FeedbackWidgetLabels = {
  annotateHint: "Draw on the screenshot to point at the problem.",
  attachElement: "Attach this element",
  attachmentUploadFailed:
    "Your feedback was saved, but some screenshots are still pending. Retry to attach them.",
  attachScreenshot: "Attach a screenshot",
  back: "Back",
  cancel: "Cancel",
  captureFailed: "Screenshot unavailable. Try again or send without it.",
  capturing: "Taking screenshot…",
  clearAnnotations: "Clear drawing",
  clearSelection: "Remove selected element",
  descriptionPlaceholder: "What would you like to share?",
  dismissForDays: "Hide for {days} days",
  done: "Done",
  elementNote: "Comment on the picked element",
  elementNotePlaceholder: "What is wrong with this?",
  emailInvalid: "Enter a valid email address.",
  emailLabel: "Email",
  emailPlaceholder: "you@company.com",
  errorGeneric: "Something went wrong. Please try again.",
  errorTitleRequired: "Tell us a bit about it first.",
  minimize: "Minimize feedback",
  moreOptions: "More options",
  moveFeedback: "Move feedback",
  pickAnother: "Pick another",
  pickElement: "Point at an element",
  pickElementHint: "Pick the element you are talking about",
  recapture: "Retake",
  removeScreenshot: "Remove",
  resume: "Resume feedback",
  retakeHint: "Screenshot of this page",
  retryAttachments: "Retry attachments",
  screenshot: "Screenshot",
  submit: "Send feedback",
  successMessage: "We read every report. Thanks for taking the time.",
  successTitle: "Feedback sent",
  title: "Send feedback",
  titlePlaceholder: "Short summary",
  trigger: "Feedback",
  undo: "Undo",
};

export interface RefletFeedbackProps {
  /** API base URL override. Falls back to the RefletProvider value. */
  baseUrl?: string;
  /** Record console errors and warnings to attach to bug reports. */
  captureConsole?: boolean;
  /** Take a screenshot of the viewport as soon as the panel opens. */
  captureOnOpen?: boolean;
  /** Let reporters hide the launcher for this many days. */
  dismissForDays?: number;
  /** Render nothing when false — lets an app gate the widget per user. */
  enabled?: boolean;
  /** Keyboard shortcut opening the panel. Set to null to disable. */
  hotkey?: string | null;
  labels?: Partial<FeedbackWidgetLabels>;
  /** Extra fields merged into the reported context. */
  metadata?: Record<string, string>;
  /** Distance in px from the viewport edges. */
  offset?: number;
  onClose?: () => void;
  onDismiss?: (result: { until: number }) => void;
  onOpen?: () => void;
  onSubmit?: (result: { feedbackId: string }) => void;
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  primaryColor?: string;
  publicKey?: string;
  theme?: "auto" | "dark" | "light";
  user?: RefletUser;
  userToken?: string;
}

export type WidgetStep = "annotate" | "compose" | "picking" | "success";
