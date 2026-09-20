import { useFeedbackDialog } from "./react-feedback-dialog-hook";
import type { FeedbackDialogProps } from "./react-feedback-dialog-types";

export type {
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
  } = useFeedbackDialog({
    baseUrl,
    labels: labelsProp,
    onClose,
    onOpen,
    onOpenChange,
    onSubmit,
    open,
    primaryColor,
    publicKey,
    user,
    userToken,
  });

  if (!open) {
    return null;
  }

  return (
    <div data-reflet-feedback="" data-theme={theme}>
      <dialog
        aria-label={labels.title}
        className="reflet-dialog"
        data-closing={isClosing ? "true" : undefined}
        onCancel={(event) => {
          event.preventDefault();
          handleClose();
        }}
        ref={dialogRef}
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
            <div className="reflet-header">
              <h2 className="reflet-title">{labels.title}</h2>
              <button
                aria-label={labels.close}
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

            <form className="reflet-form" onSubmit={handleSubmit}>
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

              {isAnonymous && (
                <div className="reflet-field">
                  <label className="reflet-label" htmlFor="reflet-email">
                    {labels.emailLabel}
                  </label>
                  <input
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

              {error && <p className="reflet-error-msg">{error}</p>}

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
      </dialog>
    </div>
  );
}
