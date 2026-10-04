type HotkeyEvent = Pick<
  KeyboardEvent,
  "altKey" | "code" | "ctrlKey" | "key" | "metaKey" | "shiftKey"
>;

const APPLE_PLATFORM = /Mac|iPhone|iPad/;
const LATIN_LETTER_OR_DIGIT = /^[a-z0-9]$/i;
const LETTER = /^[a-z]$/;
const DIGIT = /^\d$/;
const IME_PROCESSING_KEY_CODE = 229;

export function isApplePlatform(
  platform = typeof navigator === "undefined" ? "" : navigator.platform
): boolean {
  return APPLE_PLATFORM.test(platform);
}

function physicalCodeFor(key: string): string | null {
  if (LETTER.test(key)) {
    return `Key${key.toUpperCase()}`;
  }
  return DIGIT.test(key) ? `Digit${key}` : null;
}

/**
 * ⌥F types "ƒ" on macOS and Ctrl+C types "с" on a Cyrillic layout: when the
 * layout produced no Latin character, the physical key is what was meant.
 */
function pressesKey(event: HotkeyEvent, key: string): boolean {
  if (event.key.toLowerCase() === key) {
    return true;
  }
  return (
    !LATIN_LETTER_OR_DIGIT.test(event.key) &&
    event.code !== "" &&
    event.code === physicalCodeFor(key)
  );
}

export function matchesHotkey(
  event: HotkeyEvent,
  hotkey: string,
  platform?: string
): boolean {
  const parts = hotkey
    .toLowerCase()
    .split("+")
    .map((part) => part.trim());
  const key = parts.at(-1);
  if (!(key && pressesKey(event, key))) {
    return false;
  }

  const isApple = isApplePlatform(platform);
  const wantsMod = parts.includes("mod");
  const expected = {
    alt: parts.includes("alt") || parts.includes("option"),
    ctrl: parts.includes("ctrl") || (wantsMod && !isApple),
    meta:
      parts.includes("meta") || parts.includes("cmd") || (wantsMod && isApple),
    shift: parts.includes("shift"),
  };

  return (
    event.altKey === expected.alt &&
    event.ctrlKey === expected.ctrl &&
    event.metaKey === expected.meta &&
    event.shiftKey === expected.shift
  );
}

/** Enter that sends, not the Enter that confirms an IME composition (Japanese, Chinese, Korean input). */
export function isSubmitEnter(
  event: Pick<KeyboardEvent, "isComposing" | "key" | "keyCode" | "shiftKey">
): boolean {
  return (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.isComposing &&
    event.keyCode !== IME_PROCESSING_KEY_CODE
  );
}
