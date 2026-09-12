import { useState } from "react";
import type { FeedbackWidgetLabels } from "../../types";
import { ArrowIcon } from "../icons";
import type { WidgetState } from "../use-widget-state";

export function MessageInput({
  labels,
  state,
}: {
  labels: FeedbackWidgetLabels;
  state: WidgetState;
}) {
  const [expanded, setExpanded] = useState(false);
  const submitLabel = state.hasPendingAttachments
    ? labels.retryAttachments
    : labels.submit;
  return (
    <div className="message-row glass" data-expanded={expanded}>
      <textarea
        aria-label={labels.descriptionPlaceholder}
        disabled={state.isEditingDisabled}
        maxLength={4000}
        onChange={(event) => state.setMessage(event.target.value)}
        onFocus={() => setExpanded(true)}
        placeholder={labels.descriptionPlaceholder}
        rows={expanded ? 3 : 1}
        value={state.message}
      />
      <button
        aria-busy={state.isSubmitting}
        aria-label={submitLabel}
        className="submit"
        disabled={
          state.isSubmitting || state.isCapturing || !state.message.trim()
        }
        title={submitLabel}
        type="submit"
      >
        {state.isSubmitting ? <span className="spinner" /> : <ArrowIcon />}
      </button>
    </div>
  );
}
