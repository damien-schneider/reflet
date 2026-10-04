import { type RefObject, useEffect } from "react";
import { matchesHotkey } from "../keyboard";
import type { WidgetState } from "../use-widget-state";
import { listenToKeydown } from "../widget-events";
import type { WidgetLauncher } from "./use-widget-launcher";

export function useFloatingWidgetKeyboard(options: {
  anchorRef: RefObject<HTMLDivElement | null>;
  hotkey: string | null;
  launcher: WidgetLauncher;
  showPanel: boolean;
  state: WidgetState;
}) {
  const { anchorRef, hotkey, launcher, showPanel, state } = options;
  useEffect(() => {
    if (state.step === "compose") {
      state.annotationTrigger?.button.focus({ preventScroll: true });
    }
  }, [state.step, state.annotationTrigger]);

  const minimize = launcher.minimize;
  useEffect(() => {
    if (!showPanel || state.step !== "compose") {
      return;
    }
    return listenToKeydown(anchorRef.current, (event) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        minimize();
      }
    });
  }, [anchorRef, minimize, showPanel, state.step]);

  useWidgetHotkey({ anchorRef, hotkey, launcher, state });
}

function useWidgetHotkey({
  anchorRef,
  hotkey,
  launcher,
  state,
}: Omit<Parameters<typeof useFloatingWidgetKeyboard>[0], "showPanel">) {
  const { close, isOpen } = state;
  const open = launcher.triggerProps.onClick;
  useEffect(() => {
    if (!hotkey) {
      return;
    }
    return listenToKeydown(
      anchorRef.current,
      (event) => {
        if (matchesHotkey(event, hotkey)) {
          event.preventDefault();
          if (isOpen) {
            close();
          } else {
            open();
          }
        }
      },
      true
    );
  }, [anchorRef, close, hotkey, isOpen, open]);
}
