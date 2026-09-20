import { useRef } from "react";
import { isSelectionAnnotation } from "../../core/element-capture";
import type { FeedbackWidgetLabels, ScreenshotDraft } from "../../types";
import { ScreenshotPreview } from "../annotation/screenshot-preview";
import { PencilIcon, TargetIcon, TrashIcon } from "../icons";
import type { WidgetState } from "../use-widget-state";

export function ScreenshotCard({
  item,
  labels,
  state,
}: {
  item: { draft: ScreenshotDraft; number: number };
  labels: FeedbackWidgetLabels;
  state: WidgetState;
}) {
  const { draft, number } = item;
  const previewRef = useRef<HTMLDivElement>(null);
  const isCapturing = state.pendingCapture?.id === draft.id;
  const disabled = state.isEditingDisabled || state.isCapturing;
  const drawings = draft.annotations.filter(
    (annotation) => !isSelectionAnnotation(annotation)
  );
  return (
    <fieldset
      aria-label={`${labels.screenshot} ${number}`}
      className="screenshot-attachment"
    >
      <div className="screenshot-preview glass" ref={previewRef}>
        <ScreenshotPreview
          annotations={draft.annotations}
          capture={draft.image}
        />
      </div>
      {draft.selection && (
        <span
          className="selection-badge glass"
          title={draft.selection.comment ?? draft.selection.label}
        >
          <TargetIcon />
        </span>
      )}
      {drawings.length > 0 && (
        <span className="annotation-count glass">{drawings.length}</span>
      )}
      {isCapturing ? (
        <div className="capture-progress glass" role="status">
          <span className="spinner" />
          {labels.capturing}
        </div>
      ) : (
        <div className="attachment-actions glass">
          <button
            aria-label={labels.annotateHint}
            className="icon-btn annotate-action"
            disabled={disabled}
            onClick={(event) => {
              if (previewRef.current) {
                state.annotateScreenshot(draft.id, {
                  button: event.currentTarget,
                  thumbnail: previewRef.current,
                });
              }
            }}
            title={labels.annotateHint}
            type="button"
          >
            <PencilIcon />
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
