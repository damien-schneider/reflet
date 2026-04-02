import type { CommitData } from "./github_fetch";

const CONVENTIONAL_COMMIT_REGEX =
  /^(feat|fix|refactor|chore|docs|style|test|perf|ci|build|revert)(?:\(([^)]+)\))?[!:]?\s*/i;
const BRACKET_AREA_REGEX = /^\[([^\]]+)\]/;
const SLASH_AREA_REGEX = /^(\w+)\//;

export interface GroupMapValue {
  commits: CommitData[];
  dateFrom: number;
  dateTo: number;
}

export function getISOWeekKey(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function groupCommitsByWeek(
  commits: CommitData[]
): Map<string, CommitData[]> {
  const weekGroups = new Map<string, CommitData[]>();

  for (const commit of commits) {
    const date = new Date(commit.date);
    const weekKey = getISOWeekKey(date);

    const existing = weekGroups.get(weekKey) ?? [];
    existing.push(commit);
    weekGroups.set(weekKey, existing);
  }

  return weekGroups;
}

export function buildGroupMap(
  commitDocs: Array<{ commits: CommitData[]; groupId: string }>
): Map<string, GroupMapValue> {
  const groupMap = new Map<string, GroupMapValue>();

  for (const doc of commitDocs) {
    const existing = groupMap.get(doc.groupId);
    const dates = doc.commits.map((c) => new Date(c.date).getTime());
    const docDateFrom = Math.min(...dates);
    const docDateTo = Math.max(...dates);

    if (existing) {
      existing.commits.push(...doc.commits);
      existing.dateFrom = Math.min(existing.dateFrom, docDateFrom);
      existing.dateTo = Math.max(existing.dateTo, docDateTo);
    } else {
      groupMap.set(doc.groupId, {
        commits: [...doc.commits],
        dateFrom: docDateFrom,
        dateTo: docDateTo,
      });
    }
  }

  return groupMap;
}

/**
 * Group commits by tag boundaries. Each tag defines a release boundary.
 * Commits between two consecutive tags belong to the newer tag's group.
 * Commits after the newest tag go into an "unreleased" group.
 */
export function groupCommitsByTagBoundaries(
  commits: CommitData[],
  tags: Array<{ name: string; sha: string }>
): Map<string, GroupMapValue> {
  const result = new Map<string, GroupMapValue>();

  const shaToTag = new Map<string, string>();
  for (const tag of tags) {
    shaToTag.set(tag.sha, tag.name);
  }

  const sorted = [...commits].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let currentGroup = "unreleased";

  for (const commit of sorted) {
    const tagName = shaToTag.get(commit.sha);
    if (tagName) {
      currentGroup = tagName;
    }

    const ts = new Date(commit.date).getTime();
    const existing = result.get(currentGroup);
    if (existing) {
      existing.commits.push(commit);
      existing.dateFrom = Math.min(existing.dateFrom, ts);
      existing.dateTo = Math.max(existing.dateTo, ts);
    } else {
      result.set(currentGroup, { commits: [commit], dateFrom: ts, dateTo: ts });
    }
  }

  const unreleased = result.get("unreleased");
  if (unreleased && unreleased.commits.length === 0) {
    result.delete("unreleased");
  }

  return result;
}

/**
 * Fallback grouping when AI clustering is unavailable.
 * Groups by conventional commit scope/type, then by common path prefixes
 * extracted from commit messages. Falls back to weekly only as last resort.
 */
export function buildGroupMapFromFlat(
  commits: CommitData[]
): Map<string, GroupMapValue> {
  const groups = new Map<string, GroupMapValue>();

  for (const commit of commits) {
    const groupKey = inferGroupKey(commit);
    addCommitToGroup(groups, groupKey, commit);
  }

  return mergeSmallGroups(groups);
}

export function addCommitToGroup(
  groups: Map<string, GroupMapValue>,
  key: string,
  commit: CommitData
): void {
  const ts = new Date(commit.date).getTime();
  const existing = groups.get(key);
  if (existing) {
    existing.commits.push(commit);
    existing.dateFrom = Math.min(existing.dateFrom, ts);
    existing.dateTo = Math.max(existing.dateTo, ts);
  } else {
    groups.set(key, { commits: [commit], dateFrom: ts, dateTo: ts });
  }
}

export function mergeSmallGroups(
  groups: Map<string, GroupMapValue>
): Map<string, GroupMapValue> {
  const entries = Array.from(groups.entries());
  const largeEntries = entries.filter(([, d]) => d.commits.length >= 2);
  const smallEntries = entries.filter(([, d]) => d.commits.length < 2);

  const merged = new Map<string, GroupMapValue>();
  for (const [key, data] of largeEntries) {
    merged.set(key, data);
  }

  for (const [key, data] of smallEntries) {
    const bestKey = findNearestGroup(key, data, largeEntries);
    if (bestKey) {
      const target = merged.get(bestKey) ?? groups.get(bestKey);
      if (target) {
        target.commits.push(...data.commits);
        target.dateFrom = Math.min(target.dateFrom, data.dateFrom);
        target.dateTo = Math.max(target.dateTo, data.dateTo);
        merged.set(bestKey, target);
        continue;
      }
    }
    merged.set(key, data);
  }

  return merged;
}

export function findNearestGroup(
  excludeKey: string,
  data: GroupMapValue,
  candidates: [string, GroupMapValue][]
): string | undefined {
  let bestKey: string | undefined;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const [otherKey, otherData] of candidates) {
    if (otherKey === excludeKey) {
      continue;
    }
    const dist = Math.abs(data.dateTo - otherData.dateTo);
    if (dist < bestDist) {
      bestDist = dist;
      bestKey = otherKey;
    }
  }
  return bestKey;
}

export function inferGroupKey(commit: CommitData): string {
  const match = CONVENTIONAL_COMMIT_REGEX.exec(commit.message);
  if (match) {
    const type = (match[1] ?? "").toLowerCase();
    const scope = (match[2] ?? "").toLowerCase();
    return scope ? `${type}-${scope}` : type;
  }

  const bracketMatch = BRACKET_AREA_REGEX.exec(commit.message);
  if (bracketMatch) {
    return (bracketMatch[1] ?? "misc").toLowerCase();
  }

  const slashMatch = SLASH_AREA_REGEX.exec(commit.message);
  if (slashMatch) {
    return (slashMatch[1] ?? "misc").toLowerCase();
  }

  return `week-${getISOWeekKey(new Date(commit.date))}`;
}
