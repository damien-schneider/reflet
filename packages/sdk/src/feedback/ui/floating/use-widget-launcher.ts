import { useRef, useState } from "react";
import type { WidgetState } from "../use-widget-state";

export function useWidgetLauncher(state: WidgetState) {
  const [minimized, setMinimized] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return {
    minimize: () => {
      setMinimized(true);
      requestAnimationFrame(() => triggerRef.current?.focus());
    },
    minimized,
    triggerProps: {
      onClick: () => {
        setMinimized(false);
        if (!state.isOpen) {
          state.open();
        }
      },
      ref: triggerRef,
    },
  };
}

export type WidgetLauncher = ReturnType<typeof useWidgetLauncher>;
