import { useFeedbackDialog } from "./react-feedback-dialog-hook";
import {
  CATEGORY_ICONS,
  type FeedbackDialogLabels,
  type FeedbackDialogProps,
} from "./react-feedback-dialog-types";

export type {
  FeedbackCategory,
  FeedbackDialogLabels,
  FeedbackDialogProps,
} from "./react-feedback-dialog-types";

export function FeedbackDialog({
  open,
  onOpenChange,
  publicKey,
  baseUrl,
  user,
  userToken,
  theme = "auto",
  primaryColor,
  defaultCategory = "feature",
  categories = ["feature", "bug", "question"],
  labels: labelsProp,
  onSubmit,
  onOpen,
  onClose,
}: FeedbackDialogProps) {
  const {
    labels,
    title,
    setTitle,
    description,
    setDescription,
    email,
    setEmail,
    category,
    setCategory,
    honeypot,
    setHoneypot,
    isSubmitting,
    isSuccess,
    error,
    setError,
    isClosing,
    isAnonymous,
    titleInputRef,
    dialogRef,
    handleClose,
    handleSubmit,
    handleTrapFocus,
  } = useFeedbackDialog({
    open,
    onOpenChange,
    publicKey,
    baseUrl,
    user,
    userToken,
    primaryColor,
    defaultCategory,
    labels: labelsProp,
    onSubmit,
    onOpen,
    onClose,
  });

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
