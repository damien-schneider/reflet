import { DEFAULT_RECONTACT_DAYS } from "./defaults";
import type { SurveyDisplay } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PERCENT = 100;
const FNV_OFFSET_BASIS = 0x81_1c_9d_c5;
const FNV_PRIME = 0x01_00_01_93;
const PATTERN_SEPARATOR = /[,\n]/;
const REGEX_SPECIAL_CHARS = /[.+?^${}()|[\]\\]/g;
const WILDCARD = /\*/g;
const TRAILING_SLASHES = /\/+$/;

const stripTrailingSlash = (path: string): string =>
  path.replace(TRAILING_SLASHES, "") || "/";

const patternToRegex = (pattern: string): RegExp => {
  const escaped = stripTrailingSlash(pattern)
    .replace(REGEX_SPECIAL_CHARS, "\\$&")
    .replace(WILDCARD, ".*");
  return new RegExp(`^${escaped}/?$`, "i");
};

const HASH_ROUTE_PREFIX = "#/";
const HASH_ROUTE_QUERY = /\?.*$/;

const hashRoutePathOf = (url: URL): string[] =>
  url.hash.startsWith(HASH_ROUTE_PREFIX)
    ? [stripTrailingSlash(url.hash.slice(1).replace(HASH_ROUTE_QUERY, ""))]
    : [];

/**
 * Comma- or newline-separated patterns with `*` wildcards. A pattern starting
 * with `/` matches the path (or a `#/` hash route); one with a scheme matches
 * the full URL; anything else matches host and path. Empty matches every page.
 */
export const matchesPageUrl = (
  patterns: string | undefined,
  href: string
): boolean => {
  const list = (patterns ?? "")
    .split(PATTERN_SEPARATOR)
    .map((pattern) => pattern.trim())
    .filter(Boolean);
  if (list.length === 0) {
    return true;
  }
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return false;
  }
  const path = stripTrailingSlash(url.pathname);
  const paths = [path, ...hashRoutePathOf(url)];
  const candidatesFor = (pattern: string): string[] => {
    if (pattern.startsWith("/")) {
      return paths;
    }
    return pattern.includes("://")
      ? [`${url.origin}${path}`]
      : [`${url.host}${path}`];
  };
  return list.some((pattern) => {
    const regex = patternToRegex(pattern);
    return candidatesFor(pattern).some((candidate) => regex.test(candidate));
  });
};

/** Stable 0–99 bucket so one respondent is always in or out of a sample. */
export const sampleBucket = (key: string): number => {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < key.length; index++) {
    // biome-ignore lint/suspicious/noBitwiseOperators: FNV-1a hashing is bitwise by definition
    hash ^= key.charCodeAt(index);
    // biome-ignore lint/suspicious/noBitwiseOperators: keeps the hash an unsigned 32-bit integer
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash % PERCENT;
};

/** Without a respondent key sampling can't be stable, so the respondent is let in. */
export const isSampledIn = (
  sampleRate: number | undefined,
  surveyId: string,
  respondentKey: string | undefined
): boolean => {
  if (sampleRate === undefined || sampleRate >= PERCENT) {
    return true;
  }
  if (sampleRate <= 0) {
    return false;
  }
  if (!respondentKey) {
    return true;
  }
  return sampleBucket(`${surveyId}:${respondentKey}`) < sampleRate;
};

export const isWithinSchedule = (
  schedule: { endsAt?: number; startsAt?: number },
  now: number
): boolean =>
  !(
    (schedule.startsAt !== undefined && now < schedule.startsAt) ||
    (schedule.endsAt !== undefined && now > schedule.endsAt)
  );

export interface RespondentHistory {
  hasCompleted: boolean;
  lastShownAt?: number;
}

/** Whether the display frequency allows showing the survey to someone with this history. */
export const frequencyAllows = (
  display: SurveyDisplay,
  history: RespondentHistory,
  now: number
): boolean => {
  if (history.lastShownAt === undefined) {
    return true;
  }
  const recontactWaitMs =
    (display.recontactDays ?? DEFAULT_RECONTACT_DAYS) * MS_PER_DAY;
  const waitedLongEnough = now - history.lastShownAt >= recontactWaitMs;
  switch (display.frequency) {
    case "once":
      return false;
    case "until_completed":
      return !history.hasCompleted && waitedLongEnough;
    case "recurring":
      return waitedLongEnough;
    default:
      return false;
  }
};

export const NPS_PROMOTER_MIN = 9;
export const NPS_DETRACTOR_MAX = 6;

export interface NpsBreakdown {
  detractors: number;
  passives: number;
  promoters: number;
  /** −100 to 100, or null without any scores. */
  score: number | null;
  total: number;
}

export const npsBreakdown = (scores: readonly number[]): NpsBreakdown => {
  const promoters = scores.filter((s) => s >= NPS_PROMOTER_MIN).length;
  const detractors = scores.filter((s) => s <= NPS_DETRACTOR_MAX).length;
  const total = scores.length;
  return {
    detractors,
    passives: total - promoters - detractors,
    promoters,
    score:
      total === 0
        ? null
        : Math.round(((promoters - detractors) / total) * PERCENT),
    total,
  };
};
