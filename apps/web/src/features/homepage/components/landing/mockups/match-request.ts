import { FEEDBACK_BOARD_DATA, STOP_WORDS } from "../landing-data";

const WORD_PATTERN = /[a-z]+/g;

function singular(word: string): string {
  return word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word;
}

function tokenize(value: string): string[] {
  return (value.toLowerCase().match(WORD_PATTERN) ?? [])
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .map(singular);
}

const TOPICS: Record<string, string> = {
  android: "Mobile",
  api: "API",
  changelog: "Changelog",
  csv: "Export",
  dark: "Design",
  download: "Export",
  email: "Notifications",
  embed: "Widget",
  export: "Export",
  integration: "Integration",
  ios: "Mobile",
  mobile: "Mobile",
  notification: "Notifications",
  notify: "Notifications",
  roadmap: "Roadmap",
  saml: "Security",
  slack: "Integration",
  sso: "Security",
  sync: "Integration",
  theme: "Design",
  webhook: "API",
  widget: "Widget",
  zapier: "Integration",
};

export const TRIAGE_TAG = "Needs triage";

export function topicTag(draft: string): string {
  for (const word of tokenize(draft)) {
    const topic = TOPICS[word];
    if (topic) {
      return topic;
    }
  }
  return TRIAGE_TAG;
}

const MIN_SHARED_WORDS = 2;

function overlap(
  words: Set<string>,
  item: (typeof FEEDBACK_BOARD_DATA)[number]
) {
  const haystack = new Set(
    tokenize(`${item.title} ${item.tags.map((tag) => tag.label).join(" ")}`)
  );
  let shared = 0;
  let topical = 0;
  for (const word of haystack) {
    if (!words.has(word)) {
      continue;
    }
    shared += 1;
    if (TOPICS[word]) {
      topical += 1;
    }
  }
  return { shared, topical };
}

export function matchRequest(draft: string): string | null {
  const words = new Set(tokenize(draft));
  if (words.size === 0) {
    return null;
  }

  let bestId: string | null = null;
  let bestScore = 0;

  for (const item of FEEDBACK_BOARD_DATA) {
    const { shared, topical } = overlap(words, item);
    const isDuplicate = topical > 0 || shared >= MIN_SHARED_WORDS;
    if (isDuplicate && shared > bestScore) {
      bestScore = shared;
      bestId = item.id;
    }
  }

  return bestId;
}
