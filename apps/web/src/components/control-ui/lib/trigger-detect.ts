export type TriggerMatch = {
  /** trigger character that opened menu (e.g. "/" or "@"). */
  char: string;
  /** Text typed after trigger char, up to caret (never contains whitespace). */
  query: string;
  /** Offset of trigger char in scanned text; token spans [start, end). */
  start: number;
  /** Offset of caret in scanned text (exclusive end of trigger token). */
  end: number;
};

const WHITESPACE = new Set([" ", "\n", "\t", " "]);

// only fires when char sits at start or after whitespace, so `path/to` never triggers on "/"
export function detectTrigger(textBeforeCaret: string, triggerChars: readonly string[]): TriggerMatch | null {
  const triggerSet = new Set(triggerChars);
  for (let i = textBeforeCaret.length - 1; i >= 0; i -= 1) {
    const char = textBeforeCaret[i];
    if (WHITESPACE.has(char)) return null;
    if (triggerSet.has(char)) {
      const preceding = i === 0 ? "" : textBeforeCaret[i - 1];
      if (preceding === "" || WHITESPACE.has(preceding)) {
        return { char, query: textBeforeCaret.slice(i + 1), start: i, end: textBeforeCaret.length };
      }
      return null;
    }
  }
  return null;
}

// layout-affecting properties mirrored onto measuring div so its caret column matches textarea's
const MIRROR_PROPERTIES = [
  "box-sizing",
  "width",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "font-variant",
  "letter-spacing",
  "text-transform",
  "text-indent",
  "line-height",
  "tab-size",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
];

// textarea exposes no caret geometry, so text is mirrored into off-screen div and marker's box is read at offset
export function caretRectInTextarea(element: HTMLTextAreaElement, offset: number): DOMRect {
  const doc = element.ownerDocument;
  const computed = doc.defaultView?.getComputedStyle(element);
  const mirror = doc.createElement("div");
  const style = mirror.style;
  style.position = "absolute";
  style.visibility = "hidden";
  style.whiteSpace = "pre-wrap";
  style.overflowWrap = "break-word";
  style.top = "0";
  style.left = "-9999px";
  if (computed) {
    for (const property of MIRROR_PROPERTIES) style.setProperty(property, computed.getPropertyValue(property));
  }

  mirror.textContent = element.value.slice(0, offset);
  const marker = doc.createElement("span");
  // must stay non-empty or it has no box at very end of text
  marker.textContent = element.value.slice(offset) || ".";
  mirror.appendChild(marker);
  doc.body.appendChild(mirror);

  const elementRect = element.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();
  const lineHeight = computed ? Number.parseFloat(computed.lineHeight) : 0;
  const height = markerRect.height || (Number.isFinite(lineHeight) ? lineHeight : 16);
  const x = elementRect.left + (markerRect.left - mirrorRect.left) - element.scrollLeft;
  const y = elementRect.top + (markerRect.top - mirrorRect.top) - element.scrollTop;

  doc.body.removeChild(mirror);
  return new DOMRect(x, y, 1, height);
}
