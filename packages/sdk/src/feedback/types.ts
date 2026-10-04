import type { ReactNode, RefObject } from "react";
import type { ElementSelection, FeedbackContext, RefletUser } from "../types";

export const SDK_VERSION = "0.6.1";
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
  // Image pixels; pen only.
  points?: Point[];
  start: Point;
  text?: string;
  tool: AnnotationTool;
}

export interface CapturedImage {
  blob: Blob;
  height: number;
  mimeType: string;
  // Caller revokes after capture is dropped.
  objectUrl: string;
  width: number;
}

export interface ScreenshotDraft {
  annotations: Annotation[];
  context: FeedbackContext;
  id: string;
  image: CapturedImage;
  selectedNode?: Element;
  selection?: ElementSelection;
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
  descriptionPlaceholder: string;
  dismissForDays: string;
  done: string;
  elementNote: string;
  elementNotePlaceholder: string;
  emailInvalid: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailPromptBody: string;
  emailPromptTitle: string;
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
  sendWithoutEmail: string;
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
  descriptionPlaceholder: "What would you like to share?",
  dismissForDays: "Hide for {days} days",
  done: "Done",
  elementNote: "Comment on the picked element",
  elementNotePlaceholder: "What is wrong with this?",
  emailInvalid: "Enter a valid email address.",
  emailLabel: "Email",
  emailPlaceholder: "you@company.com",
  emailPromptBody: "We only use it to follow up on this report.",
  emailPromptTitle: "Add your email?",
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
  sendWithoutEmail: "Send without email",
  submit: "Send feedback",
  successMessage: "We read every report. Thanks for taking the time.",
  successTitle: "Feedback sent",
  title: "Send feedback",
  titlePlaceholder: "Short summary",
  trigger: "Feedback",
  undo: "Undo",
};

export interface FeedbackTriggerProps {
  onClick: () => void;
  ref: RefObject<HTMLButtonElement | null>;
}

export interface RefletFeedbackProps {
  baseUrl?: string;
  captureConsole?: boolean;
  captureOnOpen?: boolean;
  devtools?: boolean;
  dismissForDays?: number;
  enabled?: boolean;
  hotkey?: string | null;
  labels?: Partial<FeedbackWidgetLabels>;
  metadata?: Record<string, string>;
  offset?: number;
  onClose?: () => void;
  onDismiss?: (result: { until: number }) => void;
  onOpen?: () => void;
  onSubmit?: (result: { feedbackId: string }) => void;
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  primaryColor?: string;
  publicKey?: string;
  renderTrigger?: (props: FeedbackTriggerProps) => ReactNode;
  theme?: "auto" | "dark" | "light";
  user?: RefletUser;
  userToken?: string;
}

export type WidgetStep =
  | "annotate"
  | "compose"
  | "email"
  | "picking"
  | "success";
