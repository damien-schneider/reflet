import type { ReactNode } from "react";
import { useFloatingPosition } from "../../feedback/ui/floating/use-floating-position";
import { GripIcon, TargetIcon } from "../../feedback/ui/icons";
import { InboxIcon, NotesIcon } from "./devtools-icons";

const BAR_POSITION_KEY = "reflet-devtools-bar-position";

export type SheetTab = "code" | "inbox" | "notes";

function BarButton({
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
  edge,
  noteCount,
  onPick,
  onToggleSheet,
  openTab,
  side,
}: {
  edge: "bottom" | "top";
  noteCount: number;
  onPick: () => void;
  onToggleSheet: (tab: SheetTab) => void;
  openTab: SheetTab | null;
  side: "left" | "right";
}) {
  const floating = useFloatingPosition(`${edge}-${side}`, false, {
    anchorSelector: ".dt-bar",
    persistKey: BAR_POSITION_KEY,
  });

  return (
    <div
      aria-label="Reflet devtools"
      className="dt-bar glass"
      data-edge={edge}
      data-moved={floating.position !== null}
      data-side={side}
      ref={floating.rootRef}
      role="toolbar"
    >
      <style>{floating.styles}</style>
      <button
        aria-label="Move devtools (double-click to reset)"
        className="icon-btn drag-handle dt-grip"
        onDoubleClick={floating.resetPosition}
        title="Drag to move · double-click to reset"
        type="button"
        {...floating.handleProps}
      >
        <GripIcon />
      </button>
      <BarButton
        label="Pick an element: note it, or Shift+click to open its code"
        onClick={onPick}
        pressed={false}
      >
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
      <BarButton
        label="Board feedback on this page"
        onClick={() => onToggleSheet("inbox")}
        pressed={openTab === "inbox"}
      >
        <InboxIcon />
      </BarButton>
    </div>
  );
}
