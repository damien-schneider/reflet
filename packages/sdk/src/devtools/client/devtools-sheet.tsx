import {
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { useFloatingPosition } from "../../feedback/ui/floating/use-floating-position";
import { CloseIcon } from "../../feedback/ui/icons";
import { listenToKeydown } from "../../feedback/ui/widget-events";
import { MicIcon } from "../../sessions/ui/session-icons";
import type { SheetTab } from "./devtools-bar";
import {
  ChevronLeftIcon,
  CodeIcon,
  InboxIcon,
  NotesIcon,
} from "./devtools-icons";
import { focusedElementAround } from "./focused-element";
import { useSheetSize } from "./use-sheet-size";

const FULL_HEIGHT = "calc(100dvh - 24px)";

const TABS: Record<SheetTab, { icon: ReactNode; label: string }> = {
  code: { icon: <CodeIcon />, label: "Code" },
  inbox: { icon: <InboxIcon />, label: "Board" },
  notes: { icon: <NotesIcon />, label: "Notes" },
  sessions: { icon: <MicIcon />, label: "Sessions" },
};

const SHEET_POSITION_KEY = "reflet-devtools-sheet-position";

/** A drilled-in view: the header trades its tabs for the way back. */
export interface SheetPlace {
  backLabel: string;
  id: string;
  onBack: () => void;
}

function useSheetFocus(rootRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    const opener = root ? focusedElementAround(root) : null;
    const isOpenerHidden =
      opener instanceof HTMLElement &&
      typeof opener.checkVisibility === "function" &&
      !opener.checkVisibility({ visibilityProperty: true });
    if (isOpenerHidden) {
      root
        ?.querySelector<HTMLElement>(
          '[role="tab"][aria-selected="true"], .dt-sheet-back, .dt-sheet-title'
        )
        ?.focus({ preventScroll: true });
    }
    return () => {
      // The bar stays hidden until the sheet is out of the DOM.
      queueMicrotask(() => {
        if (opener instanceof HTMLElement && opener.isConnected) {
          opener.focus({ preventScroll: true });
        }
      });
    };
  }, [rootRef]);
}

const ROOT_FOCUS_SELECTOR =
  '[role="tab"][aria-selected="true"], .dt-sheet-title';

function nestedViewStart(root: HTMLElement): HTMLElement | null {
  return (
    root.querySelector<HTMLElement>(".dt-sheet-body h2") ??
    root.querySelector<HTMLElement>(".dt-sheet-body")
  );
}

/** Lands keyboard users at the top of the view they moved to, never on a control that changed meaning. */
function useFocusOnNavigation(
  rootRef: RefObject<HTMLElement | null>,
  placeId: string | null
) {
  const shownPlaceId = useRef(placeId);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (shownPlaceId.current === placeId || !root) {
      return;
    }
    shownPlaceId.current = placeId;
    const body = root.querySelector<HTMLElement>(".dt-sheet-body");
    if (body) {
      body.scrollTop = 0;
    }
    const target =
      placeId === null
        ? root.querySelector<HTMLElement>(ROOT_FOCUS_SELECTOR)
        : nestedViewStart(root);
    target?.focus({ preventScroll: true });
  }, [placeId, rootRef]);
}

function SheetNavigation({
  onSelectTab,
  place,
  tab,
  tabs,
}: {
  onSelectTab: (tab: SheetTab) => void;
  place: SheetPlace | null;
  tab: SheetTab;
  tabs: SheetTab[];
}) {
  if (place) {
    return (
      <button
        aria-label={`Back to ${place.backLabel}`}
        className="dt-sheet-back"
        onClick={place.onBack}
        type="button"
      >
        <ChevronLeftIcon />
        {place.backLabel}
      </button>
    );
  }
  if (tabs.length === 1) {
    return (
      <h2 className="dt-sheet-title" tabIndex={-1}>
        {TABS[tab].icon}
        {TABS[tab].label}
      </h2>
    );
  }
  return (
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
          {TABS[option].icon}
          {TABS[option].label}
        </button>
      ))}
    </div>
  );
}

export function DevtoolsSheet({
  children,
  footer,
  label = "Reflet devtools",
  navigation,
  onClose,
  side,
}: {
  children: ReactNode;
  footer?: ReactNode;
  label?: string;
  navigation: {
    onSelectTab: (tab: SheetTab) => void;
    place: SheetPlace | null;
    tab: SheetTab;
    tabs: SheetTab[];
  };
  onClose: () => void;
  side: "left" | "right";
}) {
  const { handleProps, size } = useSheetSize(side);
  const floating = useFloatingPosition<HTMLElement>(`top-${side}`, false, {
    anchorSelector: ".dt-sheet",
    persistKey: SHEET_POSITION_KEY,
  });
  const isMoved = floating.position !== null;
  const { rootRef } = floating;
  useSheetFocus(rootRef);
  useFocusOnNavigation(rootRef, navigation.place?.id ?? null);

  useEffect(
    () =>
      listenToKeydown(rootRef.current, (event) => {
        if (event.key === "Escape" && !event.isComposing) {
          onClose();
        }
      }),
    [onClose, rootRef]
  );

  return (
    <aside
      aria-label={label}
      className="dt-sheet glass"
      data-moved={isMoved}
      data-side={side}
      ref={rootRef}
      style={{
        height: size.height ?? (isMoved ? FULL_HEIGHT : undefined),
        width: size.width,
      }}
    >
      <style>{floating.styles}</style>
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
        <SheetNavigation {...navigation} />
        <button
          aria-label={`Close ${label} panel`}
          className="icon-btn dt-sheet-close"
          onClick={onClose}
          title="Close"
          type="button"
        >
          <CloseIcon />
        </button>
      </div>
      <div
        className="dt-sheet-body"
        key={`${navigation.tab}:${navigation.place === null ? "root" : "nested"}`}
        role={
          navigation.place === null && navigation.tabs.length > 1
            ? "tabpanel"
            : undefined
        }
        tabIndex={navigation.place === null ? undefined : -1}
      >
        {children}
      </div>
      {footer}
    </aside>
  );
}
