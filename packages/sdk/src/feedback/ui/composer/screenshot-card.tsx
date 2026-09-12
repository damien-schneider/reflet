import type { FeedbackWidgetLabels, ScreenshotDraft } from "../../types";
import { ScreenshotPreview } from "../annotation/screenshot-preview";
import { CameraIcon, PencilIcon, TrashIcon } from "../icons";
import type { WidgetState } from "../use-widget-state";

export function ScreenshotCard({
  item,
  labels,
  state,
}: {
  item: { draft: ScreenshotDraft; number: number; multiple: boolean };
  labels: FeedbackWidgetLabels;
  state: WidgetState;
}) {
  const { draft, number, multiple } = item;
  const isCapturing = state.pendingCapture?.id === draft.id;
  const disabled = state.isEditingDisabled || state.isCapturing;
  return (
    <fieldset
      aria-label={`${labels.screenshot} ${number}`}
      className="screenshot-attachment glass"
    >
      <button
        aria-label={labels.annotateHint}
        className="screenshot-preview"
        disabled={disabled}
        onClick={(event) =>
          state.annotateScreenshot(draft.id, event.currentTarget)
        }
        type="button"
      >
        <ScreenshotPreview
          annotations={draft.annotations}
          capture={draft.image}
        />
        <span className="attachment-caption glass">
          <PencilIcon />
          <span className="attachment-caption-label">{labels.screenshot}</span>
          {multiple && <span>{number}</span>}
          {draft.annotations.length > 0 && (
            <span className="annotation-count">{draft.annotations.length}</span>
          )}
        </span>
      </button>
      {isCapturing ? (
        <div className="capture-progress glass" role="status">
          <span className="spinner" />
          {labels.capturing}
        </div>
      ) : (
        <div className="attachment-actions glass">
          <button
            aria-label={labels.recapture}
            className="icon-btn"
            disabled={disabled}
            onClick={() => state.retakeCapture(draft.id)}
            title={labels.recapture}
            type="button"
          >
            <CameraIcon />
          </button>
          <button
            aria-label={labels.removeScreenshot}
            className="icon-btn"
            disabled={disabled}
            onClick={() => state.removeCapture(draft.id)}
            title={labels.removeScreenshot}
            type="button"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </fieldset>
  );
}
