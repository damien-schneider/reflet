import type { SubmitEvent } from "react";
import { useState } from "react";

import type { ChatComposerProps, ChatComposerSubmitPayload } from "../contracts";

function useControllableText({
  value,
  defaultValue = "",
  onValueChange,
}: Pick<ChatComposerProps, "value" | "defaultValue" | "onValueChange">) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  function setValue(nextValue: string) {
    if (!isControlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  return [currentValue, setValue] as const;
}

export function useChatComposer({
  value,
  defaultValue,
  onValueChange,
  onSubmit,
  state = "idle",
  density = "comfortable",
  disabled = false,
  trackSends = false,
}: Pick<ChatComposerProps, "value" | "defaultValue" | "onValueChange" | "onSubmit" | "state" | "density" | "disabled"> & {
  /** Count successful submits — only enabled when something reads counter (send-layer anchor), so idle apps pay no extra state update. */
  trackSends?: boolean;
}) {
  const [inputValue, setInputValue] = useControllableText({ value, defaultValue, onValueChange });
  const [sendCount, setSendCount] = useState(0);
  const normalizedValue = inputValue.trim();
  const isDisabled = disabled || state === "disabled" || state === "submitting";
  const canSubmit = normalizedValue.length > 0 && !isDisabled;
  const isCompact = density === "compact";

  function clear() {
    setInputValue("");
  }

  // shared path: plain textarea via handleSubmit, rich editor calls submit() directly with extras (mentions)
  function submit(extra?: Partial<ChatComposerSubmitPayload>) {
    if (!canSubmit) return;
    if (trackSends) setSendCount((count) => count + 1);
    // onSubmit may return Promise; surface rejected send without unhandled rejection
    Promise.resolve(onSubmit?.({ value: normalizedValue, clear, ...extra })).catch(reportError);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  return {
    value: inputValue,
    setValue: setInputValue,
    normalizedValue,
    state,
    density,
    isCompact,
    isDisabled,
    canSubmit,
    rows: isCompact ? 2 : 4,
    sendCount,
    clear,
    submit,
    handleSubmit,
  };
}
