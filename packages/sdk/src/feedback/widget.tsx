import {
  DEFAULT_WIDGET_LABELS,
  DEFAULT_WIDGET_OFFSET,
  type RefletFeedbackProps,
} from "./types";
import { Annotator } from "./ui/annotator";
import { FloatingWidget } from "./ui/floating/floating-widget";
import { ElementPicker } from "./ui/picker";
import { ShadowPortal } from "./ui/shadow-portal";
import { useWidgetState } from "./ui/use-widget-state";

export function RefletFeedback(props: RefletFeedbackProps) {
  const {
    enabled = true,
    hotkey = null,
    offset = DEFAULT_WIDGET_OFFSET,
    position = "bottom-right",
    theme = "auto",
  } = props;

  const labels = { ...DEFAULT_WIDGET_LABELS, ...props.labels };
  const state = useWidgetState(props);
  const { isOpen } = state;

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
        hotkey={hotkey}
        labels={labels}
        position={position}
        state={state}
      />

      {isOpen && state.step === "annotate" && state.activeScreenshot && (
        <Annotator
          capture={state.activeScreenshot.image}
          editor={{
            annotations: state.annotations,
            onChange: state.setAnnotations,
            onDone: () => state.setStep("compose"),
            onRetake: state.activeScreenshot.selection
              ? undefined
              : () => {
                  state.setStep("compose");
                  if (state.activeScreenshot) {
                    state.retakeCapture(state.activeScreenshot.id);
                  }
                },
            trigger: state.annotationTrigger?.thumbnail,
          }}
          labels={labels}
          note={
            state.activeScreenshot.selection && {
              comment: state.activeScreenshot.selection.comment ?? "",
              onChange: (comment) => {
                if (state.activeScreenshot) {
                  state.setSelectionComment(state.activeScreenshot.id, comment);
                }
              },
            }
          }
        />
      )}

      {isOpen && state.step === "picking" && (
        <ElementPicker
          labels={labels}
          onCancel={() => state.setStep("compose")}
          onPick={state.selectElement}
        />
      )}
    </ShadowPortal>
  );
}
