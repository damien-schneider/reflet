import { useState } from "react";
import type { FeedbackWidgetLabels } from "../../types";
import { SDK_VERSION } from "../../types";
import { useDetailsPopover } from "../floating/use-details-popover";
import { CloseIcon, MoreIcon } from "../icons";
import type { WidgetState } from "../use-widget-state";

export function ComposerOptions({
  labels,
  state,
}: {
  labels: FeedbackWidgetLabels;
  state: WidgetState;
}) {
  const popover = useDetailsPopover();
  const [emailInvalid, setEmailInvalid] = useState(false);
  return (
    <details className="composer-options" {...popover.detailsProps}>
      <summary
        aria-label={labels.moreOptions}
        className="icon-btn"
        {...popover.summaryProps}
        title={labels.moreOptions}
      >
        <MoreIcon />
      </summary>
      <div className="options-popover glass">
        {state.isAnonymous && (
          <label className="email-field">
            {labels.emailLabel}
            <input
              aria-invalid={emailInvalid}
              aria-label={labels.emailLabel}
              autoComplete="email"
              disabled={state.isEditingDisabled}
              onChange={(event) => {
                setEmailInvalid(false);
                state.setEmail(event.target.value);
              }}
              onInvalid={(event) => {
                event.preventDefault();
                setEmailInvalid(true);
                popover.show();
                const input = event.currentTarget;
                requestAnimationFrame(() => input.focus());
              }}
              placeholder={labels.emailPlaceholder}
              type="email"
              value={state.email}
            />
            {emailInvalid && <span role="alert">{labels.emailInvalid}</span>}
          </label>
        )}
        <button
          className="ghost-btn"
          disabled={state.isSubmitting}
          onClick={state.close}
          type="button"
        >
          <CloseIcon />
          {labels.cancel}
        </button>
        {state.canDismiss && (
          <button
            className="dismiss-btn"
            disabled={state.isSubmitting}
            onClick={state.dismiss}
            type="button"
          >
            {labels.dismissForDays.replace(
              "{days}",
              String(state.dismissForDays)
            )}
          </button>
        )}
        <a
          className="version-info"
          href="https://reflet.app"
          rel="noopener noreferrer"
          target="_blank"
        >
          Reflet SDK {SDK_VERSION}
        </a>
      </div>
    </details>
  );
}
