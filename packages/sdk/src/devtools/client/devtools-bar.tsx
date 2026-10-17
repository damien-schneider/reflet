import type { ReactNode } from "react";
import { useFloatingPosition } from "../../feedback/ui/floating/use-floating-position";
import { GripIcon, TargetIcon } from "../../feedback/ui/icons";
import { MicIcon } from "../../sessions/ui/session-icons";
import { PanelIcon } from "./devtools-icons";

const BAR_POSITION_KEY = "reflet-devtools-bar-position";
const PICK_WITH_CODE_LABEL =
  "Pick an element: note it, copy it, or Shift+click to open its code";
const PICK_LABEL = "Pick an element: note it or copy it";

export const SHEET_TABS = ["inbox", "notes", "sessions", "code"] as const;
export type SheetTab = (typeof SHEET_TABS)[number];

export function BarButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="icon-btn"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

export function DevtoolsBar({
  children,
  edge,
  label = "Reflet devtools",
  side,
}: {
  children: ReactNode;
  edge: "bottom" | "top";
  label?: string;
  side: "left" | "right";
}) {
  const floating = useFloatingPosition(`${edge}-${side}`, false, {
    anchorSelector: ".dt-bar",
    persistKey: BAR_POSITION_KEY,
  });

  return (
    <div
      aria-label={label}
      className="dt-bar glass"
      data-edge={edge}
      data-moved={floating.position !== null}
      data-side={side}
      ref={floating.rootRef}
      role="toolbar"
    >
      <style>{floating.styles}</style>
      <button
        aria-label={`Move ${label} (double-click to reset)`}
        className="icon-btn drag-handle dt-grip"
        onDoubleClick={floating.resetPosition}
        title={`${label} · drag to move, double-click to reset`}
        type="button"
        {...floating.handleProps}
      >
        <GripIcon />
      </button>
      {children}
    </div>
  );
}

export function SessionsBarButton({ onOpen }: { onOpen: () => void }) {
  return (
    <BarButton label="Sessions" onClick={onOpen}>
      <MicIcon />
    </BarButton>
  );
}

function panelLabel(unsentNoteCount: number): string {
  if (unsentNoteCount === 0) {
    return "Open the Reflet panel";
  }
  const notes = unsentNoteCount === 1 ? "note" : "notes";
  return `Open the Reflet panel (${unsentNoteCount} ${notes} not on the board)`;
}

export function DevtoolsBarButtons({
  canOpenCode,
  onOpen,
  onPick,
  unsentNoteCount,
}: {
  canOpenCode: boolean;
  onOpen: (tab: SheetTab | null) => void;
  onPick: () => void;
  unsentNoteCount: number;
}) {
  return (
    <>
      <BarButton
        label={canOpenCode ? PICK_WITH_CODE_LABEL : PICK_LABEL}
        onClick={onPick}
      >
        <TargetIcon />
      </BarButton>
      <SessionsBarButton onOpen={() => onOpen("sessions")} />
      <BarButton
        label={panelLabel(unsentNoteCount)}
        onClick={() => onOpen(null)}
      >
        <PanelIcon />
        {unsentNoteCount > 0 && (
          <span className="dt-count">{unsentNoteCount}</span>
        )}
      </BarButton>
    </>
  );
}
