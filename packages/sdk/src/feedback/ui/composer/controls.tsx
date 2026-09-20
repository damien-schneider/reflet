import type { ReactNode } from "react";
import type { FeedbackWidgetLabels } from "../../types";
import { CameraIcon, TargetIcon } from "../icons";
import type { WidgetState } from "../use-widget-state";
import { ComposerOptions } from "./options";

export function ComposerControls({
  floatingControls,
  labels,
  state,
}: {
  floatingControls: ReactNode;
  labels: FeedbackWidgetLabels;
  state: WidgetState;
}) {
  return (
    <div className="composer-toolbar">
      {floatingControls}
      <div className="composer-controls glass">
        <button
          aria-label={labels.attachScreenshot}
          className="icon-btn"
          disabled={state.isCapturing || state.isEditingDisabled}
          onClick={state.takeCapture}
          title={labels.attachScreenshot}
          type="button"
        >
          <CameraIcon />
        </button>
        <button
          aria-label={labels.pickElement}
          className="icon-btn"
          disabled={state.isEditingDisabled || state.isCapturing}
          onClick={() => state.setStep("picking")}
          title={labels.pickElement}
          type="button"
        >
          <TargetIcon />
        </button>
        <ComposerOptions labels={labels} state={state} />
      </div>
    </div>
  );
}
