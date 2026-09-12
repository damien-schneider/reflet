import { useEffect, useRef, useState } from "react";
import type {
  FeedbackWidgetCategory,
  FeedbackWidgetLabels,
  RefletFeedbackProps,
} from "../../types";
import { GripIcon, MinusIcon } from "../icons";
import { Launcher } from "../launcher";
import { FeedbackPanel } from "../panel";
import type { WidgetState } from "../use-widget-state";
import { useFloatingPosition } from "./use-floating-position";

export function FloatingWidget({
  labels,
  options,
  state,
}: {
  labels: FeedbackWidgetLabels;
  options: {
    categories: FeedbackWidgetCategory[];
    position: RefletFeedbackProps["position"];
  };
  state: WidgetState;
}) {
  const [minimized, setMinimized] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const floating = useFloatingPosition(options.position);
  const showPanel = state.isOpen && !minimized;
  const minimize = () => {
    setMinimized(true);
    requestAnimationFrame(() => launcherRef.current?.focus());
  };

  useEffect(() => {
    if (state.step === "compose") {
      state.annotationTrigger?.focus({ preventScroll: true });
    }
  }, [state.step, state.annotationTrigger]);

  useEffect(() => {
    if (!showPanel || state.step !== "compose") {
      return;
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        setMinimized(true);
        requestAnimationFrame(() => launcherRef.current?.focus());
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showPanel, state.step]);

  return (
    <div
      className="root"
      data-editing={
        state.isOpen && (state.step === "picking" || state.step === "annotate")
      }
      data-moved={Boolean(floating.position)}
      data-position={options.position}
      ref={floating.rootRef}
    >
      <style>{floating.styles}</style>
      {showPanel ? (
        <FeedbackPanel
          labels={labels}
          options={{
            categories: options.categories,
            floatingControls: (
              <div className="floating-controls glass">
                <button
                  aria-label={labels.moveFeedback}
                  className="icon-btn drag-handle"
                  title={labels.moveFeedback}
                  type="button"
                  {...floating.handleProps}
                >
                  <GripIcon />
                </button>
                <button
                  aria-label={labels.minimize}
                  className="icon-btn"
                  onClick={minimize}
                  title={labels.minimize}
                  type="button"
                >
                  <MinusIcon />
                </button>
              </div>
            ),
          }}
          state={state}
        />
      ) : (
        <Launcher
          buttonRef={launcherRef}
          isOpen={false}
          label={state.isOpen ? labels.resume : labels.trigger}
          onClick={() => {
            setMinimized(false);
            if (!state.isOpen) {
              state.open();
            }
          }}
        />
      )}
    </div>
  );
}
