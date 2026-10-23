import type {
  ContextOrigin,
  ElementRefValue,
  ResolvedContext,
  SegmentContextValue,
} from "./linking";
import type { SpokenRun } from "./speakers/attribution";

const SESSION_TAG = /<\s*\/?\s*session_(?:transcript|data)[^>]*>/gi;
const REMOVED_TAG = "[tag removed]";
const WHITESPACE_RUN = /\s+/g;
const SPEAKER_LABEL_PREFIX = /^S/;
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

const labelledRun = ({ speaker, text }: SpokenRun): string =>
  speaker === null
    ? text
    : `${speaker.replace(SPEAKER_LABEL_PREFIX, "Speaker ")}: ${text}`;

export const labelledText = (said: {
  speech: SpokenRun[] | null;
  text: string;
}): string =>
  said.speech ? said.speech.map(labelledRun).join(" ") : said.text;

export const spokenLine = (said: {
  speech: SpokenRun[] | null;
  text: string;
}): string => singleLine(labelledText(said));

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
  screenshot: "showed the screen",
  select: "pointed at",
};

export const AMBIGUOUS_CONTEXT_NOTE =
  "(several elements were close in time: unclear which one is meant)";

const CONTEXT_ORIGIN_NOTES: Record<ContextOrigin, string | null> = {
  auto: null,
  human: "(the author chose this context)",
  unknown:
    "(the author marked the context of this passage as unknown: nothing captured explains it)",
};

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

const evidenceTag = (item: SegmentContextValue<string>): string =>
  item.evidenceMatch === "approximate"
    ? `${item.evidenceId}, nearby screenshot, may show another state`
    : `${item.evidenceId}`;

export const contextLine = (item: SegmentContextValue<string>): string => {
  const target = item.element
    ? elementSummary(item.element)
    : `"${singleLine(item.label)}"`;
  const held =
    item.durationMs === null
      ? ""
      : ` for ${(item.durationMs / 1000).toFixed(1)} s`;
  const evidence = item.evidenceId ? ` (${evidenceTag(item)})` : "";
  return `${CONTEXT_VERBS[item.kind]} ${target}${held} at ${formatClock(item.atMs)}${onPage(item.url)}${evidence}`;
};

export const contextDescriptions = (
  resolved: ResolvedContext<string>,
  options: { withLocators: boolean }
): { items: string[]; notes: string[] } => {
  const originNote = CONTEXT_ORIGIN_NOTES[resolved.origin];
  return {
    items: resolved.context.map((item) => {
      const locators =
        options.withLocators && item.element
          ? ` (${elementLocators(item.element)})`
          : "";
      return `${contextLine(item)}${locators}`;
    }),
    notes: [
      ...(resolved.ambiguous ? [AMBIGUOUS_CONTEXT_NOTE] : []),
      ...(originNote ? [originNote] : []),
    ],
  };
};

export const contextLines = (
  resolved: ResolvedContext<string>,
  options: { withLocators: boolean }
): string[] => {
  const { items, notes } = contextDescriptions(resolved, options);
  return [
    ...items.map((item) => `  - ${item}`),
    ...notes.map((note) => `  ${note}`),
  ];
};

export const quotedPassage = (
  segment: { speech: SpokenRun[] | null; startMs: number; text: string },
  resolved: ResolvedContext<string>
): string[] => [
  `[${formatClock(segment.startMs)}] ${spokenLine(segment)}`,
  ...contextLines(resolved, { withLocators: true }),
];
