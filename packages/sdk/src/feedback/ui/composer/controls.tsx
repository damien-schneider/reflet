import type { ReactNode } from "react";
import type { FeedbackWidgetCategory, FeedbackWidgetLabels } from "../../types";
import { CameraIcon, ChevronDownIcon, TargetIcon } from "../icons";
import type { WidgetState } from "../use-widget-state";
import { ComposerOptions } from "./options";

const CATEGORY_LABELS = {
  bug: "categoryBug",
  idea: "categoryIdea",
  question: "categoryQuestion",
} as const;

export interface ComposerControlOptions {
  categories: FeedbackWidgetCategory[];
  floatingControls: ReactNode;
}

export function ComposerControls({
  options,
  labels,
  state,
}: {
  options: ComposerControlOptions;
  labels: FeedbackWidgetLabels;
  state: WidgetState;
}) {
  return (
    <div className="composer-toolbar">
      {options.floatingControls}
      <div className="composer-controls glass">
        {options.categories.length > 1 && (
          <span className="select-control">
            <select
              aria-label={labels.categoryLabel}
              className="category-select"
              disabled={state.isEditingDisabled}
              onChange={(event) => {
                const category = options.categories.find(
                  (value) => value === event.target.value
                );
                if (category) {
                  state.setCategory(category);
                }
              }}
              value={state.category}
            >
              {options.categories.map((value) => (
                <option key={value} value={value}>
                  {labels[CATEGORY_LABELS[value]]}
                </option>
              ))}
            </select>
            <ChevronDownIcon />
          </span>
        )}
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
