import { ScrollArea } from "@base-ui/react/scroll-area";
import { useEffect, useRef } from "react";
import type { FeedbackWidgetLabels } from "../../types";
import { CameraIcon } from "../icons";
import type { WidgetState } from "../use-widget-state";
import { CaptureSlot } from "./capture-slot";
import { ScreenshotCard } from "./screenshot-card";

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
      <div className="attachment-row">
        <CaptureSlot labels={labels} state={state} />
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
                  item={{ draft, number: index + 1 }}
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
    </div>
  );
}
