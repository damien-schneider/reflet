import type { KeyboardEvent } from "react";
import { matchesHotkey } from "../../feedback/ui/keyboard";

export function submitOnModEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (!matchesHotkey(event.nativeEvent, "mod+enter")) {
    return;
  }
  const submitter = event.currentTarget.form?.querySelector(
    "button[type='submit']"
  );
  if (submitter instanceof HTMLButtonElement && !submitter.disabled) {
    event.preventDefault();
    submitter.click();
  }
}
