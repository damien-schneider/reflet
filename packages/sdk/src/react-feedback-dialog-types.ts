import type { CreateFeedbackResponse, RefletUser } from "./types";

export type FeedbackCategory = "feature" | "bug" | "question";

export interface FeedbackDialogLabels {
  title?: string;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
  emailPlaceholder?: string;
  emailLabel?: string;
  submit?: string;
  cancel?: string;
  successTitle?: string;
  successMessage?: string;
  categoryFeature?: string;
  categoryBug?: string;
  categoryQuestion?: string;
  required?: string;
}

export interface FeedbackDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Public API key (falls back to RefletProvider context) */
  publicKey?: string;
  /** API base URL override */
  baseUrl?: string;
  /** User identification (falls back to RefletProvider context) */
  user?: RefletUser;
  /** Pre-signed user token */
  userToken?: string;
  /** Color theme */
  theme?: "light" | "dark" | "auto";
  /** Primary brand color (CSS value) */
  primaryColor?: string;
  /** Default selected category */
  defaultCategory?: FeedbackCategory;
  /** Categories to show (default: all three) */
  categories?: FeedbackCategory[];
  /** Custom labels / i18n */
  labels?: FeedbackDialogLabels;
  /** Called after successful submission */
  onSubmit?: (result: CreateFeedbackResponse) => void;
  /** Called when dialog opens */
  onOpen?: () => void;
  /** Called when dialog closes */
  onClose?: () => void;
}

export const DEFAULT_LABELS: Required<FeedbackDialogLabels> = {
  title: "Send Feedback",
  titlePlaceholder: "What's on your mind?",
  descriptionPlaceholder: "Tell us more... (optional)",
  emailPlaceholder: "your@email.com (optional)",
  emailLabel: "Email",
  submit: "Send Feedback",
  cancel: "Cancel",
  successTitle: "Thank you!",
  successMessage: "Your feedback has been received. We appreciate your input.",
  categoryFeature: "Feature",
  categoryBug: "Bug",
  categoryQuestion: "Question",
  required: "Required",
};

export const CATEGORY_ICONS: Record<FeedbackCategory, string> = {
  feature: "✨",
  bug: "🐛",
  question: "💬",
};

export const AUTO_CLOSE_DELAY = 2500;
