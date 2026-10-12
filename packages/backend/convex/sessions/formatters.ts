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
