import { useRef, useState } from "react";

import type { TriggerConfig, TriggerMenuItemData } from "../contracts";
import type { TriggerMatch } from "../lib/trigger-detect";

// Never touches DOM or editor: binding feeds state through `report` and performs insertion through `onCommit`,
// which is what lets one popup serve plain <textarea> and ProseMirror editor unchanged.

export type UseTriggerMenuOptions<Item extends TriggerMenuItemData> = {
  triggers: readonly TriggerConfig<Item>[];
  // backend-specific mutation for chosen item — mention replace, slash-command, and so on
  onCommit: (item: Item, trigger: TriggerConfig<Item>, match: TriggerMatch) => void;
};

export type TriggerMenuController<Item extends TriggerMenuItemData> = {
  open: boolean;
  items: readonly Item[];
  activeIndex: number;
  anchorRect: DOMRect | null;
  activeChar: string | null;
  query: string;
  /** Binding → engine: publish current trigger match (or null) and caret rect to anchor to. */
  report: (match: TriggerMatch | null, anchorRect: DOMRect | null) => void;
  /** Binding → engine: route keydown while open. Returns true when engine consumed key. */
  handleKeyDown: (key: string) => boolean;
  /** View → engine. */
  setActiveIndex: (index: number) => void;
  select: (item: Item) => void;
  close: () => void;
  setOpen: (open: boolean) => void;
};

type MenuState = { open: boolean; char: string | null; query: string; anchorRect: DOMRect | null; activeIndex: number };

const CLOSED: MenuState = { open: false, char: null, query: "", anchorRect: null, activeIndex: 0 };

function matchesQuery(item: TriggerMenuItemData, query: string): boolean {
  if (query === "") return true;
  const needle = query.toLowerCase();
  if (item.label.toLowerCase().includes(needle)) return true;
  return (item.keywords ?? []).some((keyword) => keyword.toLowerCase().includes(needle));
}

function resolveItems<Item extends TriggerMenuItemData>(trigger: TriggerConfig<Item>, query: string): readonly Item[] {
  if (typeof trigger.items === "function") return trigger.items(query);
  const filter = trigger.filter ?? matchesQuery;
  return trigger.items.filter((item) => filter(item, query));
}

export function useTriggerMenu<Item extends TriggerMenuItemData>({
  triggers,
  onCommit,
}: UseTriggerMenuOptions<Item>): TriggerMenuController<Item> {
  const [state, setState] = useState<MenuState>(CLOSED);
  const lastMatch = useRef<TriggerMatch | null>(null);

  const activeTrigger = state.char === null ? null : (triggers.find((trigger) => trigger.char === state.char) ?? null);
  const items = activeTrigger === null ? [] : resolveItems(activeTrigger, state.query);

  function close() {
    lastMatch.current = null;
    setState(CLOSED);
  }

  function select(item: Item) {
    const match = lastMatch.current;
    if (activeTrigger !== null && match !== null) onCommit(item, activeTrigger, match);
    close();
  }

  function report(match: TriggerMatch | null, anchorRect: DOMRect | null) {
    lastMatch.current = match;
    const open = match !== null && triggers.some((trigger) => trigger.char === match.char);
    setState((current) => {
      if (!open || match === null) return CLOSED;
      const activeIndex = current.char === match.char && current.query === match.query ? current.activeIndex : 0;
      return { open: true, char: match.char, query: match.query, anchorRect, activeIndex };
    });
  }

  function handleKeyDown(key: string): boolean {
    if (!state.open) return false;
    if (key === "ArrowDown") {
      setState((current) => ({
        ...current,
        activeIndex: items.length === 0 ? 0 : (current.activeIndex + 1) % items.length,
      }));
      return true;
    }
    if (key === "ArrowUp") {
      setState((current) => ({
        ...current,
        activeIndex: items.length === 0 ? 0 : (current.activeIndex - 1 + items.length) % items.length,
      }));
      return true;
    }
    if (key === "Enter" || key === "Tab") {
      const item = items[state.activeIndex];
      if (item && !item.disabled) select(item);
      // Swallow Enter/Tab even on empty list so editor doesn't newline/blur while menu is up.
      return true;
    }
    if (key === "Escape") {
      close();
      return true;
    }
    return false;
  }

  function setOpen(open: boolean) {
    if (!open) close();
  }

  function setActiveIndex(activeIndex: number) {
    setState((current) => ({ ...current, activeIndex }));
  }

  return {
    open: state.open,
    items,
    activeIndex: state.activeIndex,
    anchorRect: state.anchorRect,
    activeChar: state.char,
    query: state.query,
    report,
    handleKeyDown,
    setActiveIndex,
    select,
    close,
    setOpen,
  };
}
