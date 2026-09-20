import type { ReactNode } from "react";
import type { FeedbackWidgetLabels } from "../../types";
import { ArrowIcon } from "../icons";
import type { WidgetState } from "../use-widget-state";
import { ComposerOptions } from "./options";

export function MessageInput({
  floatingControls,
  labels,
  state,
}: {
  floatingControls: ReactNode;
  labels: FeedbackWidgetLabels;
  state: WidgetState;
}) {
  const submitLabel = state.hasPendingAttachments
    ? labels.retryAttachments
    : labels.submit;
  return (
    <div className="message-row glass">
      <textarea
        aria-label={labels.descriptionPlaceholder}
        disabled={state.isEditingDisabled}
        maxLength={4000}
        onChange={(event) => state.setMessage(event.target.value)}
        placeholder={labels.descriptionPlaceholder}
        rows={3}
        value={state.message}
      />
      <div className="message-actions">
        {floatingControls}
        <ComposerOptions labels={labels} state={state} />
        <button
          aria-busy={state.isSubmitting}
          aria-label={submitLabel}
          className="submit"
          disabled={state.isSubmitting || state.isCapturing || !state.canSubmit}
          title={submitLabel}
          type="submit"
        >
          {state.isSubmitting ? <span className="spinner" /> : <ArrowIcon />}
        </button>
      </div>
    </div>
  );
}
