import type { FeedbackWidgetLabels, RefletFeedbackProps } from "../../types";
import { CloseIcon, GripIcon } from "../icons";
import { Launcher } from "../launcher";
import { FeedbackPanel } from "../panel";
import { SelectionOutline } from "../selection-outline";
import type { WidgetState } from "../use-widget-state";
import { useFloatingPosition } from "./use-floating-position";
import { useFloatingWidgetKeyboard } from "./use-floating-widget-keyboard";
import type { WidgetLauncher } from "./use-widget-launcher";

interface FloatingWidgetProps {
  config: {
    hotkey: string | null;
    labels: FeedbackWidgetLabels;
    position: RefletFeedbackProps["position"];
  };
  launcher: WidgetLauncher & { custom: boolean };
  state: WidgetState;
}

export function FloatingWidget({
  config,
  launcher,
  state,
}: FloatingWidgetProps) {
  const { hotkey, position } = config;
  const showPanel = state.isOpen && !launcher.minimized;
  const floating = useFloatingPosition(position, showPanel);

  useFloatingWidgetKeyboard({
    anchorRef: floating.rootRef,
    hotkey,
    launcher,
    showPanel,
    state,
  });

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
      <FloatingComposer
        config={config}
        launcher={launcher}
        panel={{ floating, showPanel, state }}
      />
    </div>
  );
}

function FloatingComposer({
  config,
  launcher,
  panel,
}: {
  config: FloatingWidgetProps["config"];
  launcher: FloatingWidgetProps["launcher"];
  panel: {
    floating: ReturnType<typeof useFloatingPosition>;
    showPanel: boolean;
    state: WidgetState;
  };
}) {
  const { labels } = config;
  const { floating, showPanel, state } = panel;
  if (!showPanel) {
    return launcher.custom ? null : (
      <Launcher
        buttonRef={launcher.triggerProps.ref}
        isOpen={false}
        label={state.isOpen ? labels.resume : labels.trigger}
        onClick={launcher.triggerProps.onClick}
      />
    );
  }
  return (
    <>
      {state.step === "compose" &&
        state.screenshots.map(({ id, selectedNode }) =>
          selectedNode ? (
            <SelectionOutline key={id} node={selectedNode} />
          ) : null
        )}
      <FeedbackPanel
        floatingControls={
          <FloatingControls
            floating={floating}
            labels={labels}
            minimize={launcher.minimize}
          />
        }
        labels={labels}
        state={state}
      />
    </>
  );
}

function FloatingControls({
  labels,
  floating,
  minimize,
}: {
  labels: FeedbackWidgetLabels;
  floating: ReturnType<typeof useFloatingPosition>;
  minimize: () => void;
}) {
  return (
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
  );
}
