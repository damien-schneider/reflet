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
  const previewRef = useRef<HTMLButtonElement>(null);
  const isCapturing = state.pendingCapture?.id === draft.id;
  const disabled = state.isEditingDisabled || state.isCapturing;
  const drawings = draft.annotations.filter(
    (annotation) => !isSelectionAnnotation(annotation)
  );
  const openScreenshot = (button: HTMLButtonElement) => {
    if (previewRef.current) {
      state.annotateScreenshot(draft.id, {
        button,
        thumbnail: previewRef.current,
      });
    }
  };
  return (
    <fieldset
      aria-label={`${labels.screenshot} ${number}`}
      className="screenshot-attachment"
    >
      <button
        aria-label={`${labels.openScreenshot} ${number}`}
        className="screenshot-preview glass"
        disabled={disabled}
        onClick={(event) => openScreenshot(event.currentTarget)}
        ref={previewRef}
        type="button"
      >
        <ScreenshotPreview
          annotations={draft.annotations}
          capture={draft.image}
        />
      </button>
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
            onClick={(event) => openScreenshot(event.currentTarget)}
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
