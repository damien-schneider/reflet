import { useEffect } from "react";
import {
  DEFAULT_WIDGET_LABELS,
  DEFAULT_WIDGET_OFFSET,
  type FeedbackWidgetCategory,
  type RefletFeedbackProps,
} from "./types";
import { Annotator } from "./ui/annotator";
import { FloatingWidget } from "./ui/floating/floating-widget";
import { ElementPicker } from "./ui/picker";
import { ShadowPortal } from "./ui/shadow-portal";
import { matchesHotkey, useWidgetState } from "./ui/use-widget-state";

const DEFAULT_CATEGORIES: FeedbackWidgetCategory[] = [
  "bug",
  "idea",
  "question",
];

export function RefletFeedback(props: RefletFeedbackProps) {
  const {
    categories = DEFAULT_CATEGORIES,
    enabled = true,
    hotkey = null,
    offset = DEFAULT_WIDGET_OFFSET,
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

  if (!enabled || state.isDismissed) {
    return null;
  }

  return (
    <ShadowPortal
      offset={offset}
      primaryColor={props.primaryColor}
      theme={theme}
    >
      <div
        aria-hidden="true"
        className="capture-halo"
        data-active={state.isCapturing}
      />
      <FloatingWidget
        labels={labels}
        options={{ categories, position }}
        state={state}
      />

      {isOpen && state.step === "annotate" && state.activeScreenshot && (
        <Annotator
          capture={state.activeScreenshot.image}
          editor={{
            annotations: state.annotations,
            onChange: state.setAnnotations,
            onDone: () => state.setStep("compose"),
            onRetake: () => {
              state.setStep("compose");
              if (state.activeScreenshot) {
                state.retakeCapture(state.activeScreenshot.id);
              }
            },
            trigger: state.annotationTrigger,
          }}
          labels={labels}
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
