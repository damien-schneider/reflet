import { useEffect, useRef, useState } from "react";
import type { FeedbackWidgetLabels, RefletFeedbackProps } from "../../types";
import { CloseIcon, GripIcon } from "../icons";
import { Launcher } from "../launcher";
import { FeedbackPanel } from "../panel";
import { SelectionOutline } from "../selection-outline";
import { matchesHotkey, type WidgetState } from "../use-widget-state";
import { listenToKeydown } from "../widget-keys";
import { useFloatingPosition } from "./use-floating-position";

export function FloatingWidget({
  hotkey,
  labels,
  position,
  state,
}: {
  hotkey: string | null;
  labels: FeedbackWidgetLabels;
  position: RefletFeedbackProps["position"];
  state: WidgetState;
}) {
  const [minimized, setMinimized] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const showPanel = state.isOpen && !minimized;
  const floating = useFloatingPosition(position, showPanel);
  const minimize = () => {
    setMinimized(true);
    requestAnimationFrame(() => launcherRef.current?.focus());
  };

  useEffect(() => {
    if (state.step === "compose") {
      state.annotationTrigger?.button.focus({ preventScroll: true });
    }
  }, [state.step, state.annotationTrigger]);

  useEffect(() => {
    if (!showPanel || state.step !== "compose") {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        setMinimized(true);
        requestAnimationFrame(() => launcherRef.current?.focus());
      }
    };
    return listenToKeydown(floating.rootRef.current, onKeyDown);
  }, [floating.rootRef, showPanel, state.step]);

  const { close, isOpen, open } = state;
  useEffect(() => {
    if (!hotkey) {
      return;
    }
    const toggleOnHotkey = (event: KeyboardEvent) => {
      if (matchesHotkey(event, hotkey)) {
        event.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
    };
    return listenToKeydown(floating.rootRef.current, toggleOnHotkey, true);
  }, [close, floating.rootRef, hotkey, isOpen, open]);

  return (
    <div
      className="root"
      data-editing={
        state.isOpen && (state.step === "picking" || state.step === "annotate")
      }
      data-moved={Boolean(floating.position)}
      data-position={position}
      ref={floating.rootRef}
    >
      <style>{floating.styles}</style>
      {showPanel &&
        state.step === "compose" &&
        state.screenshots.map(({ id, selectedNode }) =>
          selectedNode ? (
            <SelectionOutline key={id} node={selectedNode} />
          ) : null
        )}
      {showPanel ? (
        <FeedbackPanel
          floatingControls={
            <div className="floating-controls">
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
                <CloseIcon />
              </button>
            </div>
          }
          labels={labels}
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
