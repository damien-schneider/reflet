import { useEffect } from "react";
import type { InboxItem, InboxTab, SelectedIndexAction } from "./types";

interface InboxActionOptions {
  dispatchSelectedIndex: (action: SelectedIndexAction) => void;
  hasAnyModifier: boolean;
  items: InboxItem[];
  key: string;
  openDetail: (item: InboxItem) => void;
  selectedIndex: number;
}

type InboxAction = () => Promise<unknown>;

interface UseInboxKeyboardOptions {
  dispatchSelectedIndex: (action: SelectedIndexAction) => void;
  filteredItems: InboxItem[] | undefined;
  openDetail: (item: InboxItem) => void;
  selectedIndex: number;
}

export function getEmptyMessage(search: string, tab: InboxTab): string {
  if (search) {
    return "No matching items";
  }
  if (tab === "pending") {
    return "Inbox zero.";
  }
  return "No resolved items";
}

const EDITABLE_SHORTCUT_TARGET_SELECTOR =
  "input, textarea, select, [contenteditable='true'], [contenteditable='']";
const INTERACTIVE_SHORTCUT_TARGET_SELECTOR =
  "button, a, [role='button'], [role='link']";

function isShortcutTarget(
  target: EventTarget | null,
  selector: string
): boolean {
  return target instanceof Element && target.closest(selector) !== null;
}

function hasAnyKeyboardModifier(event: KeyboardEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

function getShortcutKey(event: KeyboardEvent): string {
  if (event.key.length === 1) {
    return event.key.toLowerCase();
  }
  return event.key;
}

function isNavigationShortcut(key: string, hasAnyModifier: boolean): boolean {
  return !hasAnyModifier && (key === "j" || key === "k");
}

function getInboxAction({
  dispatchSelectedIndex,
  hasAnyModifier,
  items,
  key,
  openDetail,
  selectedIndex,
}: InboxActionOptions): InboxAction | null {
  const item = items[selectedIndex];
  switch (key) {
    case "j": {
      if (hasAnyModifier) {
        return null;
      }
      return async () =>
        dispatchSelectedIndex({
          kind: "setSelectedIndex",
          update: (previous) => Math.min(previous + 1, items.length - 1),
        });
    }
    case "k": {
      if (hasAnyModifier) {
        return null;
      }
      return async () =>
        dispatchSelectedIndex({
          kind: "setSelectedIndex",
          update: (previous) => Math.max(previous - 1, 0),
        });
    }
    case "a": {
      return null;
    }
    case "y": {
      return null;
    }
    case "Enter": {
      if (hasAnyModifier || !item) {
        return null;
      }
      return async () => openDetail(item);
    }
    default: {
      return null;
    }
  }
}

export function useInboxKeyboard({
  dispatchSelectedIndex,
  filteredItems,
  openDetail,
  selectedIndex,
}: UseInboxKeyboardOptions) {
  useEffect(
    function bindKeyboardNavigation() {
      const handleKeyDown = async (event: KeyboardEvent) => {
        const key = getShortcutKey(event);
        const hasAnyModifier = hasAnyKeyboardModifier(event);
        if (
          isShortcutTarget(event.target, EDITABLE_SHORTCUT_TARGET_SELECTOR) ||
          !filteredItems ||
          filteredItems.length === 0
        ) {
          return;
        }
        if (
          isShortcutTarget(
            event.target,
            INTERACTIVE_SHORTCUT_TARGET_SELECTOR
          ) &&
          !isNavigationShortcut(key, hasAnyModifier)
        ) {
          return;
        }

        const action = getInboxAction({
          dispatchSelectedIndex,
          hasAnyModifier,
          items: filteredItems,
          key,
          openDetail,
          selectedIndex,
        });
        if (!action) {
          return;
        }
        event.preventDefault();
        await action();
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    },
    [dispatchSelectedIndex, filteredItems, openDetail, selectedIndex]
  );
}
