"use client";

import type { RefObject } from "react";
import { useEffect, useEffectEvent } from "react";

import type { TriggerConfig, TriggerMenuItemData } from "../contracts";
import { caretRectInTextarea, detectTrigger } from "../lib/trigger-detect";
import { useTriggerMenu } from "./use-trigger-menu";

// Same `triggers` config as ProseMirror path, so primitive works with no editor installed.

function replaceRange(element: HTMLTextAreaElement, start: number, end: number, text: string) {
  element.focus();
  element.setSelectionRange(start, end);
  // execCommand keeps caret, joins native undo, and fires real `input` event React can hear
  const inserted = document.execCommand("insertText", false, text);
  if (inserted) return;
  const next = element.value.slice(0, start) + text + element.value.slice(end);
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(element, next);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  const caret = start + text.length;
  element.setSelectionRange(caret, caret);
}

export function useTextareaTriggerMenu<Item extends TriggerMenuItemData>(
  ref: RefObject<HTMLTextAreaElement | null>,
  options: { triggers: readonly TriggerConfig<Item>[] },
) {
  const controller = useTriggerMenu<Item>({
    triggers: options.triggers,
    onCommit: (item, trigger, match) => {
      const element = ref.current;
      if (!element) return;
      const mode = trigger.insert ?? "replace";
      const text = mode === "none" ? "" : (trigger.insertText?.(item) ?? `${trigger.char}${item.label} `);
      replaceRange(element, match.start, match.end, text);
      trigger.onSelect?.(item, { char: trigger.char, query: match.query });
    },
  });

  const syncTrigger = useEffectEvent(() => {
    const element = ref.current;
    if (!element) return;
    const caret = element.selectionStart ?? element.value.length;
    const chars = options.triggers.map((trigger) => trigger.char);
    const match = detectTrigger(element.value.slice(0, caret), chars);
    controller.report(match, match === null ? null : caretRectInTextarea(element, match.start));
  });

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (controller.open && controller.handleKeyDown(event.key)) event.preventDefault();
  });

  const closeAfterBlur = useEffectEvent(() => {
    controller.close();
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    function onKeyDown(event: KeyboardEvent) {
      handleKeyDown(event);
    }
    function onBlur() {
      window.setTimeout(closeAfterBlur, 120);
    }

    element.addEventListener("input", syncTrigger);
    element.addEventListener("keydown", onKeyDown);
    element.addEventListener("keyup", syncTrigger);
    element.addEventListener("click", syncTrigger);
    element.addEventListener("blur", onBlur);
    return () => {
      element.removeEventListener("input", syncTrigger);
      element.removeEventListener("keydown", onKeyDown);
      element.removeEventListener("keyup", syncTrigger);
      element.removeEventListener("click", syncTrigger);
      element.removeEventListener("blur", onBlur);
    };
  }, [ref]);

  return controller;
}
