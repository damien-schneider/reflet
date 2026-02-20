import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Reflet } from "./client";
import { RefletContext } from "./react-context";
import { injectFeedbackStyles } from "./react-feedback-styles";
import type { CreateFeedbackResponse, RefletUser } from "./types";

// ============================================
// Types
// ============================================

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

const DEFAULT_LABELS: Required<FeedbackDialogLabels> = {
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

const CATEGORY_ICONS: Record<FeedbackCategory, string> = {
  feature: "✨",
  bug: "🐛",
  question: "💬",
};

const AUTO_CLOSE_DELAY = 2500;

// ============================================
// Component
// ============================================

export function FeedbackDialog({
  open,
  onOpenChange,
  publicKey: publicKeyProp,
  baseUrl,
  user: userProp,
  userToken: userTokenProp,
  theme = "auto",
  primaryColor,
  defaultCategory = "feature",
  categories = ["feature", "bug", "question"],
  labels: labelsProp,
  onSubmit,
  onOpen,
  onClose,
}: FeedbackDialogProps) {
  const context = useContext(RefletContext);
  const publicKey = publicKeyProp ?? context?.publicKey;
  const user = userProp ?? context?.user;
  const userToken = userTokenProp ?? context?.userToken;

  const labels = { ...DEFAULT_LABELS, ...labelsProp };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>(defaultCategory);
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  const isAnonymous = !(user || userToken);

  // Inject styles on mount
  useEffect(() => {
    injectFeedbackStyles();
  }, []);

  // Apply primary color
  useEffect(() => {
    if (!(primaryColor && dialogRef.current)) {
      return;
    }
    const el = dialogRef.current.closest("[data-reflet-feedback]");
    if (el instanceof HTMLElement) {
      el.style.setProperty("--reflet-primary", primaryColor);
    }
  }, [primaryColor]);

  // Focus management
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement;
      onOpen?.();
      requestAnimationFrame(() => {
        titleInputRef.current?.focus();
      });
    }
  }, [open, onOpen]);

  // Escape key
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  // Lock body scroll
  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setEmail("");
    setCategory(defaultCategory);
    setHoneypot("");
    setError(null);
    setIsSuccess(false);
    setIsSubmitting(false);
  }, [defaultCategory]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onOpenChange(false);
      onClose?.();
      resetForm();
      // Restore focus
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    }, 200);
  }, [onOpenChange, onClose, resetForm]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Honeypot check (spam prevention)
      if (honeypot) {
        setIsSuccess(true);
        return;
      }

      if (!publicKey) {
        setError(
          "Missing publicKey. Provide it as a prop or via RefletProvider."
        );
        return;
      }

      if (!title.trim()) {
        setError(labels.required);
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const client = new Reflet({
          publicKey,
          baseUrl,
          user,
          userToken,
        });

        const categoryPrefix = `[${category.charAt(0).toUpperCase() + category.slice(1)}] `;
        const fullDescription = description.trim()
          ? description.trim()
          : "No additional details provided.";

        const result = await client.create({
          title: title.trim(),
          description: `${categoryPrefix}${fullDescription}${isAnonymous && email ? `\n\n---\nContact: ${email}` : ""}`,
        });

        setIsSuccess(true);
        onSubmit?.(result);

        setTimeout(() => {
          handleClose();
        }, AUTO_CLOSE_DELAY);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      honeypot,
      publicKey,
      title,
      description,
      email,
      category,
      baseUrl,
      user,
      userToken,
      isAnonymous,
      labels.required,
      onSubmit,
      handleClose,
    ]
  );

  const handleTrapFocus = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !dialogRef.current) {
      return;
    }

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, input, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    // biome-ignore lint/style/useAtIndex: NodeListOf doesn't support .at()
    const last = focusable[focusable.length - 1];

    if (!(first && last)) {
      return;
    }

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  if (!open) {
    return null;
  }

  return (
    <div data-reflet-feedback="" data-theme={theme}>
      {/* Overlay */}
      <button
        aria-label="Close feedback dialog"
        className="reflet-overlay"
        data-closing={isClosing ? "true" : undefined}
        onClick={handleClose}
        tabIndex={0}
        type="button"
      />

      {/* Dialog */}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: dialog role requires keyboard trap */}
      <div
        aria-label={labels.title}
        aria-modal="true"
        className="reflet-dialog"
        data-closing={isClosing ? "true" : undefined}
        onKeyDown={handleTrapFocus}
        ref={dialogRef}
        role="dialog"
      >
        {isSuccess ? (
          <div className="reflet-success">
            <div className="reflet-success-icon">
              <svg
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="reflet-success-title">{labels.successTitle}</h2>
            <p className="reflet-success-text">{labels.successMessage}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="reflet-header">
              <h2 className="reflet-title">{labels.title}</h2>
              <button
                aria-label="Close"
                className="reflet-close"
                onClick={handleClose}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <line x1="18" x2="6" y1="6" y2="18" />
                  <line x1="6" x2="18" y1="6" y2="18" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form className="reflet-form" onSubmit={handleSubmit}>
              {/* Category selector */}
              {categories.length > 1 && (
                <div className="reflet-categories">
                  {categories.map((cat) => (
                    <button
                      className="reflet-category"
                      data-selected={cat === category ? "true" : undefined}
                      key={cat}
                      onClick={() => setCategory(cat)}
                      type="button"
                    >
                      {CATEGORY_ICONS[cat]}{" "}
                      {
                        labels[
                          `category${cat.charAt(0).toUpperCase()}${cat.slice(1)}` as keyof FeedbackDialogLabels
                        ]
                      }
                    </button>
                  ))}
                </div>
              )}

              {/* Title */}
              <div className="reflet-field">
                <input
                  aria-label="Feedback title"
                  autoComplete="off"
                  className="reflet-input"
                  maxLength={100}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (error) {
                      setError(null);
                    }
                  }}
                  placeholder={labels.titlePlaceholder}
                  ref={titleInputRef}
                  required
                  type="text"
                  value={title}
                />
              </div>

              {/* Description */}
              <div className="reflet-field">
                <textarea
                  aria-label="Feedback description"
                  className="reflet-textarea"
                  maxLength={2000}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={labels.descriptionPlaceholder}
                  rows={3}
                  value={description}
                />
              </div>

              {/* Email (anonymous only) */}
              {isAnonymous && (
                <div className="reflet-field">
                  <label className="reflet-label" htmlFor="reflet-email">
                    {labels.emailLabel}
                  </label>
                  <input
                    aria-label="Email address"
                    autoComplete="email"
                    className="reflet-input"
                    id="reflet-email"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={labels.emailPlaceholder}
                    type="email"
                    value={email}
                  />
                </div>
              )}

              {/* Honeypot */}
              <div aria-hidden="true" className="reflet-hp">
                <input
                  autoComplete="off"
                  name="website"
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  type="text"
                  value={honeypot}
                />
              </div>

              {/* Error */}
              {error && <p className="reflet-error-msg">{error}</p>}

              {/* Footer */}
              <div className="reflet-footer">
                <button
                  className="reflet-btn reflet-btn-secondary"
                  onClick={handleClose}
                  type="button"
                >
                  {labels.cancel}
                </button>
                <button
                  className="reflet-btn reflet-btn-primary"
                  disabled={isSubmitting || !title.trim()}
                  type="submit"
                >
                  {isSubmitting ? (
                    <span className="reflet-spinner" />
                  ) : (
                    labels.submit
                  )}
                </button>
              </div>
            </form>

            {/* Powered by */}
            <div className="reflet-powered">
              Powered by{" "}
              <a
                href="https://reflet.app"
                rel="noopener noreferrer"
                target="_blank"
              >
                Reflet
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
