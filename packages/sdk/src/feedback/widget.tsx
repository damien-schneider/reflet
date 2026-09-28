import { lazy, Suspense } from "react";
import {
  DEFAULT_WIDGET_LABELS,
  DEFAULT_WIDGET_OFFSET,
  type FeedbackWidgetLabels,
  type RefletFeedbackProps,
} from "./types";
import { Annotator } from "./ui/annotator";
import { useOwnsDevtools } from "./ui/devtools-owner";
import { FloatingWidget } from "./ui/floating/floating-widget";
import { ElementPicker } from "./ui/picker";
import { ShadowPortal } from "./ui/shadow-portal";
import { useWidgetState, type WidgetState } from "./ui/use-widget-state";

// Bundlers inline NODE_ENV, so production builds drop the branch and never ship the devtools chunk.
// No `typeof process` guard: Vite replaces only this exact expression and has no `process` in the browser.
const DevtoolsLayer =
  process.env.NODE_ENV === "development"
    ? lazy(() =>
        import("../devtools/client/devtools-layer").then((module) => ({
          default: module.DevtoolsLayer,
        }))
      )
    : null;

export function RefletFeedback(props: RefletFeedbackProps) {
  const {
    devtools = true,
    enabled = true,
    hotkey = null,
    offset = DEFAULT_WIDGET_OFFSET,
    position = "bottom-right",
    theme = "auto",
  } = props;

  const labels = { ...DEFAULT_WIDGET_LABELS, ...props.labels };
  const state = useWidgetState(props);
  const { isOpen } = state;
  const showsWidget = enabled && !state.isDismissed;
  const ownsDevtools = useOwnsDevtools(
    devtools && DevtoolsLayer !== null,
    showsWidget
  );
  const showsDevtools = ownsDevtools && DevtoolsLayer !== null;

  if (!(showsWidget || showsDevtools)) {
    return null;
  }

  return (
    <ShadowPortal
      offset={offset}
      primaryColor={props.primaryColor}
      theme={theme}
    >
      {showsWidget && (
        <>
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

          <WidgetAnnotation labels={labels} state={state} />

          {isOpen && state.step === "picking" && (
            <ElementPicker
              labels={labels}
              onCancel={() => state.setStep("compose")}
              onPick={state.selectElement}
            />
          )}
        </>
      )}
      {showsDevtools && (
        <Suspense fallback={null}>
          <DevtoolsLayer
            isWidgetOpen={showsWidget && isOpen}
            position={position}
            publicKey={state.publicKey}
          />
        </Suspense>
      )}
    </ShadowPortal>
  );
}

function WidgetAnnotation({
  labels,
  state,
}: {
  labels: FeedbackWidgetLabels;
  state: WidgetState;
}) {
  const screenshot = state.activeScreenshot;
  const annotating =
    state.isOpen && state.step === "annotate" && screenshot !== null;
  if (!(annotating && screenshot)) {
    return null;
  }
  const retake = () => {
    state.setStep("compose");
    state.retakeCapture(screenshot.id);
  };
  return (
    <Annotator
      capture={screenshot.image}
      editor={{
        annotations: state.annotations,
        onChange: state.setAnnotations,
        onDone: () => state.setStep("compose"),
        onRetake: screenshot.selection ? undefined : retake,
        trigger: state.annotationTrigger?.thumbnail,
      }}
      labels={labels}
      note={
        screenshot.selection && {
          comment: screenshot.selection.comment ?? "",
          onChange: (comment) =>
            state.setSelectionComment(screenshot.id, comment),
        }
      }
    />
  );
}
