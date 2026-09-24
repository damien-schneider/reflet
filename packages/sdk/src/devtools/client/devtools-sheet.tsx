import { type ReactNode, useEffect } from "react";
import { useFloatingPosition } from "../../feedback/ui/floating/use-floating-position";
import { CloseIcon, TargetIcon } from "../../feedback/ui/icons";
import { listenToKeydown } from "../../feedback/ui/widget-keys";
import type { SheetTab } from "./devtools-bar";
import { useSheetSize } from "./use-sheet-size";

const FULL_HEIGHT = "calc(100dvh - 24px)";

const TAB_LABELS: Record<SheetTab, string> = {
  code: "Code",
  inbox: "Board",
  notes: "Notes",
};

const SHEET_POSITION_KEY = "reflet-devtools-sheet-position";

export function DevtoolsSheet({
  children,
  onClose,
  onPick,
  onSelectTab,
  side,
  tab,
  tabs,
}: {
  children: ReactNode;
  onClose: () => void;
  onPick: () => void;
  onSelectTab: (tab: SheetTab) => void;
  side: "left" | "right";
  tab: SheetTab;
  tabs: SheetTab[];
}) {
  const { handleProps, size } = useSheetSize(side);
  const floating = useFloatingPosition<HTMLElement>(`top-${side}`, false, {
    anchorSelector: ".dt-sheet",
    persistKey: SHEET_POSITION_KEY,
  });
  const isMoved = floating.position !== null;
  const { rootRef } = floating;

  useEffect(
    () =>
      listenToKeydown(rootRef.current, (event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }),
    [onClose, rootRef]
  );

  return (
    <aside
      aria-label="Reflet devtools"
      className="dt-sheet glass"
      data-moved={isMoved}
      data-side={side}
      ref={rootRef}
      style={{
        height: size.height ?? (isMoved ? FULL_HEIGHT : undefined),
        width: size.width,
      }}
    >
      <style>
        {floating.styles}
        {isMoved
          ? ""
          : `.dt-bar[data-moved="false"][data-side="${side}"] { ${side}: ${size.width + 24}px; }`}
      </style>
      <button
        aria-label="Resize panel width (double-click to reset)"
        className="dt-resize"
        data-axis="width"
        type="button"
        {...handleProps("width")}
      />
      <button
        aria-label="Resize panel height (double-click for full height)"
        className="dt-resize"
        data-axis="height"
        type="button"
        {...handleProps("height")}
      />
      <button
        aria-label="Resize panel (double-click to reset)"
        className="dt-resize"
        data-axis="both"
        type="button"
        {...handleProps("both")}
      />
      <div className="dt-sheet-head">
        <button
          aria-label="Move panel (double-click to dock it back)"
          className="dt-sheet-drag"
          onDoubleClick={floating.resetPosition}
          title="Drag to move · double-click to dock"
          type="button"
          {...floating.handleProps}
        />
        <button
          aria-label="Pick an element: note it, or Shift+click to open its code"
          className="icon-btn"
          onClick={onPick}
          title="Pick an element"
          type="button"
        >
          <TargetIcon />
        </button>
        <div className="dt-tabs" role="tablist">
          {tabs.map((option) => (
            <button
              aria-selected={option === tab}
              className="dt-tab"
              key={option}
              onClick={() => onSelectTab(option)}
              role="tab"
              type="button"
            >
              {TAB_LABELS[option]}
            </button>
          ))}
        </div>
        <button
          aria-label="Close devtools panel"
          className="icon-btn"
          onClick={onClose}
          title="Close"
          type="button"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="dt-sheet-body" key={tab} role="tabpanel">
        {children}
      </div>
    </aside>
  );
}
