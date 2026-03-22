import type { CreateFeedbackResponse, RefletUser } from "./types";

export type FeedbackCategory = "feature" | "bug" | "question";

export interface FeedbackDialogLabels {
  cancel?: string;
  categoryBug?: string;
  categoryFeature?: string;
  categoryQuestion?: string;
  descriptionPlaceholder?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  required?: string;
  submit?: string;
  successMessage?: string;
  successTitle?: string;
  title?: string;
  titlePlaceholder?: string;
}

export interface FeedbackDialogProps {
  /** API base URL override */
  baseUrl?: string;
  /** Categories to show (default: all three) */
  categories?: FeedbackCategory[];
  /** Default selected category */
  defaultCategory?: FeedbackCategory;
  /** Custom labels / i18n */
  labels?: FeedbackDialogLabels;
  /** Called when dialog closes */
  onClose?: () => void;
  /** Called when dialog opens */
  onOpen?: () => void;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Called after successful submission */
  onSubmit?: (result: CreateFeedbackResponse) => void;
  /** Whether the dialog is open */
  open: boolean;
  /** Primary brand color (CSS value) */
  primaryColor?: string;
  /** Public API key (falls back to RefletProvider context) */
  publicKey?: string;
  /** Color theme */
  theme?: "light" | "dark" | "auto";
  /** User identification (falls back to RefletProvider context) */
  user?: RefletUser;
  /** Pre-signed user token */
  userToken?: string;
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
