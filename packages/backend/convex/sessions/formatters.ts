import type { ElementRefValue, SegmentContextValue } from "./linking";

const SESSION_TAG = /<\s*\/?\s*session_(?:transcript|data)[^>]*>/gi;
const REMOVED_TAG = "[tag removed]";
const WHITESPACE_RUN = /\s+/g;
const SECONDS_PER_MINUTE = 60;

export const formatClock = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export const pagePath = (url: string): string | null => {
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
};

export const singleLine = (text: string): string =>
  text.replace(SESSION_TAG, REMOVED_TAG).replace(WHITESPACE_RUN, " ").trim();

export const truncateText = (text: string, maxChars: number): string =>
  text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;

export const wrapUntrusted = (
  tag: "session_transcript" | "session_data",
  lines: string[]
): string =>
  [
    `<${tag}>`,
    ...lines.map((line) => line.replace(SESSION_TAG, REMOVED_TAG)),
    `</${tag}>`,
  ].join("\n");

export const onPage = (url: string | null | undefined): string => {
  const path = url ? pagePath(url) : null;
  return path ? ` on ${path}` : "";
};

export const CONTEXT_VERBS: Record<SegmentContextValue["kind"], string> = {
  click: "clicked",
  dwell: "hovered",
  mark: "marked the moment on",
  navigation: "opened",
  select: "pointed at",
};

export const AMBIGUOUS_CONTEXT_NOTE =
  "(several elements were close in time: unclear which one is meant)";

export const elementSummary = (element: ElementRefValue): string => {
  const component = element.component
    ? ` in <${singleLine(element.component)}>`
    : "";
  return `${singleLine(element.label)}${component}`;
};

export const elementLocators = (element: ElementRefValue): string => {
  const source = element.source
    ? `, source: ${singleLine(element.source)}`
    : "";
  return `selector: ${singleLine(element.selector)}${source}`;
};

export const contextLine = (item: SegmentContextValue<string>): string => {
  const target = item.element
    ? elementSummary(item.element)
    : `"${singleLine(item.label)}"`;
  const held =
    item.durationMs === null
      ? ""
      : ` for ${(item.durationMs / 1000).toFixed(1)} s`;
  const evidence = item.evidenceId ? ` (${item.evidenceId})` : "";
  return `${CONTEXT_VERBS[item.kind]} ${target}${held} at ${formatClock(item.atMs)}${onPage(item.url)}${evidence}`;
};
