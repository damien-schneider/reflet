import type { FeedbackWidgetLabels } from "../../types";
import { CameraIcon, TargetIcon } from "../icons";
import type { WidgetState } from "../use-widget-state";

export function CaptureSlot({
  labels,
  state,
}: {
  labels: FeedbackWidgetLabels;
  state: WidgetState;
}) {
  const disabled = state.isCapturing || state.isEditingDisabled;
  return (
    <div className="capture-slot glass">
      <button
        aria-label={labels.attachScreenshot}
        className="capture-action"
        disabled={disabled}
        onClick={state.takeCapture}
        title={labels.attachScreenshot}
        type="button"
      >
        <CameraIcon />
      </button>
      <button
        aria-label={labels.pickElement}
        className="capture-action"
        disabled={disabled}
        onClick={() => state.setStep("picking")}
        title={labels.pickElement}
        type="button"
      >
        <TargetIcon />
      </button>
    </div>
  );
}
