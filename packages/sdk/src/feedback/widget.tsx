import { lazy, Suspense, useContext, useSyncExternalStore } from "react";
import { DEFAULT_API_URL } from "../client";
import { RefletContext } from "../react-context";
import { hasTeamActivation } from "../sessions/team/team-activation";
import {
  DEFAULT_WIDGET_LABELS,
  DEFAULT_WIDGET_OFFSET,
  type FeedbackWidgetLabels,
  type RefletFeedbackProps,
} from "./types";
import { Annotator } from "./ui/annotator";
import { FloatingWidget } from "./ui/floating/floating-widget";
import {
  useWidgetLauncher,
  type WidgetLauncher,
} from "./ui/floating/use-widget-launcher";
import {
  useHasDevtoolsOnPage,
  useOwnsDevtools,
  useOwnsTeamTools,
} from "./ui/page-ownership";
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

const TeamLayer = lazy(() =>
  import("../sessions/team/team-layer").then((module) => ({
    default: module.TeamLayer,
  }))
);

const DEFAULT_APP_URL = "https://www.reflet.app";

const ignoreChanges = () => () => undefined;

/** Activation reads the URL and storage, which only exist in the browser: the server renders without team tools. */
function useTeamToolsKey(options: {
  hasWidget: boolean;
  props: RefletFeedbackProps;
  publicKey: string | null;
}): string | null {
  const { props, publicKey } = options;
  const hasDevtoolsOnPage = useHasDevtoolsOnPage();
  const isActivated = useSyncExternalStore(
    ignoreChanges,
    () =>
      props.teamTools !== false &&
      publicKey !== null &&
      hasTeamActivation(publicKey),
    () => false
  );
  const ownsTeamTools = useOwnsTeamTools(
    isActivated && !hasDevtoolsOnPage,
    options.hasWidget
  );
  return ownsTeamTools ? publicKey : null;
}

export function RefletFeedback(props: RefletFeedbackProps) {
  const state = useWidgetState(props);
  const launcher = useWidgetLauncher(state);
  const showsWidget = props.enabled !== false && !state.isDismissed;
  const ownsDevtools = useOwnsDevtools(
    props.devtools !== false && DevtoolsLayer !== null,
    showsWidget
  );
  const showsDevtools = ownsDevtools && DevtoolsLayer !== null;
  const teamToolsKey = useTeamToolsKey({
    hasWidget: showsWidget,
    props,
    publicKey: state.publicKey,
  });
  if (!(showsWidget || showsDevtools || teamToolsKey)) {
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
        {teamToolsKey && <TeamTools props={props} publicKey={teamToolsKey} />}
      </ShadowPortal>
    </>
  );
}

function TeamTools({
  props,
  publicKey,
}: {
  props: RefletFeedbackProps;
  publicKey: string;
}) {
  const context = useContext(RefletContext);
  return (
    <Suspense fallback={null}>
      <TeamLayer
        connection={{
          apiUrl: props.baseUrl ?? context?.baseUrl ?? DEFAULT_API_URL,
          appUrl: props.appUrl ?? DEFAULT_APP_URL,
          publicKey,
        }}
        position={props.position ?? "bottom-right"}
      />
    </Suspense>
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
