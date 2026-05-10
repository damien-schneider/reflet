"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

const CHORD_TIMEOUT_MS = 800;
const TASK_ROW_SELECTOR = "[data-task-row]";

export interface UseTasksHotkeysNavigationTargets {
  inbox?: string | null;
  roadmap?: string | null;
  tasks?: string | null;
}

export interface UseTasksHotkeysOptions {
  enabled?: boolean;
  navigationTargets?: UseTasksHotkeysNavigationTargets;
  onClearSelection?: () => void;
  onOpenFocused?: (rowIndex: number) => void;
  onPaletteOpen?: () => void;
  onQuickCreate?: () => void;
  rowSelector?: string;
}

export interface UseTasksHotkeysResult {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  return false;
}

function getRowElements(selector: string): HTMLElement[] {
  if (typeof document === "undefined") {
    return [];
  }
  return Array.from(document.querySelectorAll<HTMLElement>(selector));
}

function focusRowByIndex(elements: HTMLElement[], index: number): void {
  const target = elements[index];
  if (!target) {
    return;
  }
  target.setAttribute("aria-selected", "true");
  if (typeof target.scrollIntoView === "function") {
    target.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  for (let i = 0; i < elements.length; i += 1) {
    if (i !== index) {
      elements[i]?.removeAttribute("aria-selected");
    }
  }
}

export function useTasksHotkeys(
  options: UseTasksHotkeysOptions = {}
): UseTasksHotkeysResult {
  const {
    enabled = true,
    navigationTargets,
    onClearSelection,
    onOpenFocused,
    onPaletteOpen,
    onQuickCreate,
    rowSelector = TASK_ROW_SELECTOR,
  } = options;
  const router = useRouter();
  const [focusedIndex, setFocusedIndexState] = useState(-1);
  const focusedIndexRef = useRef(focusedIndex);
  focusedIndexRef.current = focusedIndex;

  // `g <key>` chord state — true within CHORD_TIMEOUT_MS after pressing `g`.
  const chordPendingRef = useRef(false);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearChord = useCallback(() => {
    chordPendingRef.current = false;
    if (chordTimerRef.current) {
      clearTimeout(chordTimerRef.current);
      chordTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (chordTimerRef.current) {
        clearTimeout(chordTimerRef.current);
      }
    };
  }, []);

  const setFocusedIndex = useCallback(
    (index: number) => {
      setFocusedIndexState(index);
      if (typeof document !== "undefined") {
        const elements = getRowElements(rowSelector);
        if (index >= 0 && index < elements.length) {
          focusRowByIndex(elements, index);
        }
      }
    },
    [rowSelector]
  );

  const moveFocus = useCallback(
    (delta: number) => {
      const elements = getRowElements(rowSelector);
      if (elements.length === 0) {
        return;
      }
      const current = focusedIndexRef.current;
      const baseline = current < 0 ? -1 : current;
      const nextIndex = Math.min(
        Math.max(baseline + delta, 0),
        elements.length - 1
      );
      setFocusedIndexState(nextIndex);
      focusRowByIndex(elements, nextIndex);
    },
    [rowSelector]
  );

  // Memoize options to keep useHotkeys deps stable.
  const sharedOptions = useMemo(
    () => ({
      enabled,
      enableOnFormTags: false as const,
      enableOnContentEditable: false,
    }),
    [enabled]
  );

  useHotkeys(
    "c",
    (event) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      onQuickCreate?.();
    },
    sharedOptions,
    [onQuickCreate]
  );

  useHotkeys(
    "mod+k",
    (event) => {
      if (!onPaletteOpen) {
        return;
      }
      event.preventDefault();
      onPaletteOpen();
    },
    sharedOptions,
    [onPaletteOpen]
  );

  useHotkeys(
    "j",
    (event) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      moveFocus(1);
    },
    sharedOptions,
    [moveFocus]
  );

  useHotkeys(
    "k",
    (event) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      moveFocus(-1);
    },
    sharedOptions,
    [moveFocus]
  );

  useHotkeys(
    "enter",
    (event) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      const current = focusedIndexRef.current;
      if (current < 0) {
        return;
      }
      event.preventDefault();
      onOpenFocused?.(current);
    },
    sharedOptions,
    [onOpenFocused]
  );

  useHotkeys(
    "escape",
    () => {
      onClearSelection?.();
    },
    sharedOptions,
    [onClearSelection]
  );

  // Chord support: `g` arms, then `t`/`r`/`i` navigates within window.
  useHotkeys(
    "g",
    (event) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      chordPendingRef.current = true;
      if (chordTimerRef.current) {
        clearTimeout(chordTimerRef.current);
      }
      chordTimerRef.current = setTimeout(clearChord, CHORD_TIMEOUT_MS);
    },
    sharedOptions,
    [clearChord]
  );

  const navigateChord = useCallback(
    (target: string | null | undefined) => {
      if (!chordPendingRef.current) {
        return false;
      }
      clearChord();
      if (target) {
        router.push(target);
      }
      return true;
    },
    [clearChord, router]
  );

  useHotkeys(
    "t",
    (event) => {
      if (isTypingTarget(event.target) || !chordPendingRef.current) {
        return;
      }
      event.preventDefault();
      navigateChord(navigationTargets?.tasks);
    },
    sharedOptions,
    [navigationTargets?.tasks, navigateChord]
  );

  useHotkeys(
    "r",
    (event) => {
      if (isTypingTarget(event.target) || !chordPendingRef.current) {
        return;
      }
      event.preventDefault();
      navigateChord(navigationTargets?.roadmap);
    },
    sharedOptions,
    [navigationTargets?.roadmap, navigateChord]
  );

  useHotkeys(
    "i",
    (event) => {
      if (isTypingTarget(event.target) || !chordPendingRef.current) {
        return;
      }
      event.preventDefault();
      navigateChord(navigationTargets?.inbox);
    },
    sharedOptions,
    [navigationTargets?.inbox, navigateChord]
  );

  return { focusedIndex, setFocusedIndex };
}
