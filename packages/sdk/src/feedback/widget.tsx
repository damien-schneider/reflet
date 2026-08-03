import { useEffect } from "react";
import {
  DEFAULT_WIDGET_LABELS,
  type FeedbackWidgetCategory,
  type RefletFeedbackProps,
} from "./types";
import { Annotator } from "./ui/annotator";
import { Launcher } from "./ui/launcher";
import { FeedbackPanel } from "./ui/panel";
import { ElementPicker } from "./ui/picker";
import { ShadowPortal } from "./ui/shadow-portal";
import { matchesHotkey, useWidgetState } from "./ui/use-widget-state";

const DEFAULT_CATEGORIES: FeedbackWidgetCategory[] = [
  "bug",
  "idea",
  "question",
];
const DEFAULT_OFFSET = 20;

/**
 * Floating feedback button with a screenshot, annotation and element picker
 * flow. Mount it once, anywhere below `RefletProvider` or with its own
 * `publicKey`.
 */
export function RefletFeedback(props: RefletFeedbackProps) {
  const {
    categories = DEFAULT_CATEGORIES,
    enabled = true,
    hotkey = null,
    offset = DEFAULT_OFFSET,
    position = "bottom-right",
    theme = "auto",
  } = props;

  const labels = { ...DEFAULT_WIDGET_LABELS, ...props.labels };
  const state = useWidgetState(props);
  const { close, isOpen, open } = state;

  useEffect(() => {
    if (!(hotkey && enabled)) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (matchesHotkey(event, hotkey)) {
        event.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, enabled, hotkey, isOpen, open]);

  useEffect(() => {
    if (!isOpen || state.step !== "compose") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, isOpen, state.step]);

  if (!enabled) {
    return null;
  }

  const showPanel =
    isOpen && state.step !== "picking" && state.step !== "annotate";

  return (
    <ShadowPortal
      offset={offset}
      primaryColor={props.primaryColor}
      theme={theme}
    >
      <div className="root" data-position={position}>
        <div className="stack">
          {showPanel && (
            <FeedbackPanel
              categories={categories}
              labels={labels}
              state={state}
            />
          )}
          <Launcher
            compact={isOpen}
            isOpen={isOpen}
            label={labels.trigger}
            onClick={isOpen ? close : open}
          />
        </div>
      </div>

      {isOpen && state.step === "annotate" && state.capture && (
        <Annotator
          annotations={state.annotations}
          capture={state.capture}
          labels={labels}
          onChange={state.setAnnotations}
          onDone={() => state.setStep("compose")}
        />
      )}

      {isOpen && state.step === "picking" && (
        <ElementPicker
          hint={labels.pickElementHint}
          onCancel={() => state.setStep("compose")}
          onPick={state.selectElement}
        />
      )}
    </ShadowPortal>
  );
}
