import type { ReactNode } from "react";
import { useFloatingPosition } from "../../feedback/ui/floating/use-floating-position";
import { GripIcon, TargetIcon } from "../../feedback/ui/icons";
import { MicIcon } from "../../sessions/ui/session-icons";
import { InboxIcon, NotesIcon } from "./devtools-icons";

const BAR_POSITION_KEY = "reflet-devtools-bar-position";
export const PICK_BUTTON_LABEL =
  "Pick an element: note it, copy it, or Shift+click to open its code";

export type SheetTab = "code" | "inbox" | "notes" | "sessions";

export function BarButton({
  children,
  label,
  onClick,
  pressed,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  pressed: boolean;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
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
        title="Drag to move · double-click to reset"
        type="button"
        {...floating.handleProps}
      >
        <GripIcon />
      </button>
      {children}
    </div>
  );
}

export function SessionsBarButton({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <BarButton label="Sessions" onClick={onToggle} pressed={isOpen}>
      <MicIcon />
    </BarButton>
  );
}

export function DevtoolsBarButtons({
  noteCount,
  onPick,
  onToggleSheet,
  openTab,
}: {
  noteCount: number;
  onPick: () => void;
  onToggleSheet: (tab: SheetTab) => void;
  openTab: SheetTab | null;
}) {
  return (
    <>
      <BarButton label={PICK_BUTTON_LABEL} onClick={onPick} pressed={false}>
        <TargetIcon />
      </BarButton>
      <BarButton
        label="Dev notes"
        onClick={() => onToggleSheet("notes")}
        pressed={openTab === "notes"}
      >
        <NotesIcon />
        {noteCount > 0 && <span className="dt-count">{noteCount}</span>}
      </BarButton>
      <SessionsBarButton
        isOpen={openTab === "sessions"}
        onToggle={() => onToggleSheet("sessions")}
      />
      <BarButton
        label="Board feedback"
        onClick={() => onToggleSheet("inbox")}
        pressed={openTab === "inbox"}
      >
        <InboxIcon />
      </BarButton>
    </>
  );
}
