import type { RefletUser } from "../types";

/** Reported with every submission. Keep in sync with package.json on release. */
export const SDK_VERSION = "0.2.0";

const FEEDBACK_WIDGET_CATEGORIES = ["bug", "idea", "question"] as const;

export type FeedbackWidgetCategory =
  (typeof FEEDBACK_WIDGET_CATEGORIES)[number];

const ANNOTATION_TOOLS = [
  "pen",
  "arrow",
  "rectangle",
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

export interface FeedbackWidgetLabels {
  annotateHint: string;
  attachScreenshot: string;
  back: string;
  cancel: string;
  categoryBug: string;
  categoryIdea: string;
  categoryQuestion: string;
  clearAnnotations: string;
  descriptionPlaceholder: string;
  dismissForDays: string;
  done: string;
  emailLabel: string;
  emailPlaceholder: string;
  errorGeneric: string;
  errorTitleRequired: string;
  pickElement: string;
  pickElementHint: string;
  recapture: string;
  removeScreenshot: string;
  retakeHint: string;
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
  attachScreenshot: "Attach a screenshot",
  back: "Back",
  cancel: "Cancel",
  categoryBug: "Bug",
  categoryIdea: "Idea",
  categoryQuestion: "Question",
  clearAnnotations: "Clear drawing",
  descriptionPlaceholder: "What happened? What did you expect?",
  dismissForDays: "Hide for {days} days",
  done: "Done",
  emailLabel: "Email",
  emailPlaceholder: "you@company.com",
  errorGeneric: "Something went wrong. Please try again.",
  errorTitleRequired: "Tell us a bit about it first.",
  pickElement: "Point at an element",
  pickElementHint: "Click the element you are talking about — cancel with",
  recapture: "Retake",
  removeScreenshot: "Remove",
  retakeHint: "Screenshot of this page",
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
  categories?: FeedbackWidgetCategory[];
  defaultCategory?: FeedbackWidgetCategory;
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
