import { useEffect, useRef } from "react";

type ShortcutMap = Record<string, () => void>;

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isInputFocused(): boolean {
  const { activeElement } = document;
  if (!activeElement) {
    return false;
  }
  if (INPUT_TAGS.has(activeElement.tagName)) {
    return true;
  }
  if ((activeElement as HTMLElement).isContentEditable) {
    return true;
  }
  return false;
}

function parseShortcut(key: string): {
  modifiers: { meta: boolean; shift: boolean; alt: boolean };
  key: string;
  hasModifier: boolean;
} {
  const parts = key.toLowerCase().split("+");
  const mainKey = parts.pop() ?? "";
  const modifiers = {
    meta: parts.includes("meta"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
  };
  const hasModifier = modifiers.meta || modifiers.shift || modifiers.alt;
  return { modifiers, key: mainKey, hasModifier };
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutMap,
  options: UseKeyboardShortcutsOptions = {}
): void {
  const { enabled = true } = options;
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(
    function registerKeyboardShortcuts() {
      if (!enabled) {
        return;
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        for (const [shortcutKey, handler] of Object.entries(
          shortcutsRef.current
        )) {
          const parsed = parseShortcut(shortcutKey);

          const keyMatches = event.key.toLowerCase() === parsed.key;
          const metaMatches = parsed.modifiers.meta === event.metaKey;
          const shiftMatches = parsed.modifiers.shift === event.shiftKey;
          const altMatches = parsed.modifiers.alt === event.altKey;

          if (
            !parsed.hasModifier &&
            (event.metaKey || event.ctrlKey || event.altKey)
          ) {
            continue;
          }

          if (keyMatches && metaMatches && shiftMatches && altMatches) {
            if (!parsed.hasModifier && isInputFocused()) {
              continue;
            }

            event.preventDefault();
            handler();
            return;
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    },
    [enabled]
  );
}
