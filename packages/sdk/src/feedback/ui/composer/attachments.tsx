import { ScrollArea } from "@base-ui/react/scroll-area";
import { useEffect, useRef } from "react";
import type { FeedbackWidgetLabels } from "../../types";
import { CameraIcon, CloseIcon, TargetIcon } from "../icons";
import type { WidgetState } from "../use-widget-state";
import { ScreenshotCard } from "./screenshot-card";

function SelectedElement({
  labels,
  state,
}: {
  labels: FeedbackWidgetLabels;
  state: WidgetState;
}) {
  if (!state.selection) {
    return null;
  }
  const component = state.selection.componentStack[0];
  return (
    <div className="selection-chip glass">
      <button
        aria-label={labels.pickElement}
        className="selection-label"
        disabled={state.isEditingDisabled || state.isCapturing}
        onClick={() => state.setStep("picking")}
        title={state.selection.sourceLocation ?? state.selection.selector}
        type="button"
      >
        {state.elementCapture ? (
          <img
            alt=""
            height={32}
            src={state.elementCapture.objectUrl}
            width={32}
          />
        ) : (
          <TargetIcon />
        )}
        <span className="truncate">
          {component ? `<${component}>` : state.selection.label}
        </span>
      </button>
      <button
        aria-label={labels.clearSelection}
        className="icon-btn"
        disabled={state.isEditingDisabled || state.isCapturing}
        onClick={state.clearSelection}
        type="button"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

export function Attachments({
  labels,
  state,
}: {
  labels: FeedbackWidgetLabels;
  state: WidgetState;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const count = state.screenshots.length;
  useEffect(() => {
    const strip = stripRef.current;
    if (strip && count > 0) {
      strip.scrollTo?.({ left: strip.scrollWidth });
    }
  }, [count]);
  const isAdding =
    state.pendingCapture &&
    !state.screenshots.some(({ id }) => id === state.pendingCapture?.id);
  return (
    <div className="attachments">
      <SelectedElement labels={labels} state={state} />
      <ScrollArea.Root className="screenshot-scroll-area">
        <ScrollArea.Viewport
          aria-label={labels.screenshot}
          className="screenshot-strip"
          ref={stripRef}
          role="region"
        >
          <ScrollArea.Content className="screenshot-strip-content">
            {state.screenshots.map((draft, index) => (
              <ScreenshotCard
                item={{ draft, multiple: count > 1, number: index + 1 }}
                key={draft.id}
                labels={labels}
                state={state}
              />
            ))}
            {isAdding && (
              <div
                aria-label={labels.capturing}
                className="attachment-skeleton glass"
                role="status"
              >
                <CameraIcon />
                <span>{labels.capturing}</span>
              </div>
            )}
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          className="screenshot-scrollbar"
          orientation="horizontal"
        >
          <ScrollArea.Thumb className="screenshot-scroll-thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
