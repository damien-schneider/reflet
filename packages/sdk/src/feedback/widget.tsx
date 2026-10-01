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
import {
  useWidgetLauncher,
  type WidgetLauncher,
} from "./ui/floating/use-widget-launcher";
import { ElementPicker } from "./ui/picker";
import { ShadowPortal } from "./ui/shadow-portal";
import { useWidgetState, type WidgetState } from "./ui/use-widget-state";

// Bundlers replace NODE_ENV to exclude devtools from production.
const DevtoolsLayer =
  process.env.NODE_ENV === "development"
    ? lazy(() =>
        import("../devtools/client/devtools-layer").then((module) => ({
          default: module.DevtoolsLayer,
        }))
      )
    : null;

export function RefletFeedback(props: RefletFeedbackProps) {
  const state = useWidgetState(props);
  const launcher = useWidgetLauncher(state);
  const showsWidget = props.enabled !== false && !state.isDismissed;
  const ownsDevtools = useOwnsDevtools(
    props.devtools !== false && DevtoolsLayer !== null,
    showsWidget
  );
  const showsDevtools = ownsDevtools && DevtoolsLayer !== null;
  if (!(showsWidget || showsDevtools)) {
    return null;
  }
  return (
    <>
      {showsWidget && props.renderTrigger?.(launcher.triggerProps)}
      <ShadowPortal
        offset={props.offset ?? DEFAULT_WIDGET_OFFSET}
        primaryColor={props.primaryColor}
        theme={props.theme ?? "auto"}
      >
        {showsWidget && (
          <WidgetContents launcher={launcher} props={props} state={state} />
        )}
        {showsDevtools && (
          <Suspense fallback={null}>
            <DevtoolsLayer
              isWidgetOpen={showsWidget && state.isOpen}
              position={props.position ?? "bottom-right"}
              publicKey={state.publicKey}
            />
          </Suspense>
        )}
      </ShadowPortal>
    </>
  );
}

function WidgetContents({
  launcher,
  props,
  state,
}: {
  launcher: WidgetLauncher;
  props: RefletFeedbackProps;
  state: WidgetState;
}) {
  const labels = { ...DEFAULT_WIDGET_LABELS, ...props.labels };
  return (
    <>
      <div
        aria-hidden="true"
        className="capture-halo"
        data-active={state.isCapturing}
      />
      <FloatingWidget
        config={{
          hotkey: props.hotkey ?? null,
          labels,
          position: props.position ?? "bottom-right",
        }}
        launcher={{ ...launcher, custom: Boolean(props.renderTrigger) }}
        state={state}
      />
      <WidgetAnnotation labels={labels} state={state} />
      {state.isOpen && state.step === "picking" && (
        <ElementPicker
          labels={labels}
          onCancel={() => state.setStep("compose")}
          onPick={state.selectElement}
        />
      )}
    </>
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
