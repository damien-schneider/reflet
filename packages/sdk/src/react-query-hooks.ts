import { useCallback, useEffect, useMemo, useState } from "react";
import { useRefletClient } from "./react-context";
import type { UseQueryResult } from "./react-hooks-types";
import type {
  ChangelogEntry,
  Comment,
  FeedbackDetail,
  FeedbackItem,
  FeedbackListParams,
  OrganizationConfig,
  Roadmap,
} from "./types";

// ============================================
// Generic query hook — single source of truth
// ============================================

function useRefletQuery<T>(
  fetchFn: () => Promise<T>,
  enabled = true
): UseQueryResult<T> {
  const [data, setData] = useState<T | undefined>();
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Request failed"));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (enabled) {
      refetch();
    }
  }, [refetch, enabled]);

  return { data, isLoading, error, refetch };
}

// ============================================
// Organization Config Hook
// ============================================

export function useOrganizationConfig(): UseQueryResult<OrganizationConfig> {
  const client = useRefletClient();
  const fetchFn = useCallback(() => client.getConfig(), [client]);
  return useRefletQuery(fetchFn);
}

// ============================================
// Feedback List Hook
// ============================================

export interface UseFeedbackListOptions extends FeedbackListParams {
  enabled?: boolean;
}

export function useFeedbackList(
  options: UseFeedbackListOptions = {}
): UseQueryResult<{ items: FeedbackItem[]; total: number; hasMore: boolean }> {
  const client = useRefletClient();
  const {
    enabled = true,
    statusId,
    status,
    search,
    sortBy,
    limit,
    offset,
  } = options;

  const params = useMemo(
    () => ({ statusId, status, search, sortBy, limit, offset }),
    [statusId, status, search, sortBy, limit, offset]
  );

  const fetchFn = useCallback(() => client.list(params), [client, params]);
  return useRefletQuery(fetchFn, enabled);
}

// ============================================
// Single Feedback Hook
// ============================================

export function useFeedback(
  feedbackId: string | undefined
): UseQueryResult<FeedbackDetail> {
  const client = useRefletClient();

  const fetchFn = useCallback(() => {
    if (!feedbackId) {
      return Promise.resolve(undefined as unknown as FeedbackDetail);
    }
    return client.get(feedbackId);
  }, [client, feedbackId]);

  return useRefletQuery(fetchFn, !!feedbackId);
}

// ============================================
// Comments Hook
// ============================================

export function useComments(
  feedbackId: string | undefined,
  sortBy: "newest" | "oldest" = "oldest"
): UseQueryResult<Comment[]> {
  const client = useRefletClient();

  const fetchFn = useCallback(() => {
    if (!feedbackId) {
      return Promise.resolve(undefined as unknown as Comment[]);
    }
    return client.getComments(feedbackId, sortBy);
  }, [client, feedbackId, sortBy]);

  return useRefletQuery(fetchFn, !!feedbackId);
}

// ============================================
// Roadmap Hook
// ============================================

export function useRoadmap(): UseQueryResult<Roadmap> {
  const client = useRefletClient();
  const fetchFn = useCallback(() => client.getRoadmap(), [client]);
  return useRefletQuery(fetchFn);
}

// ============================================
// Changelog Hook
// ============================================

export function useChangelog(limit?: number): UseQueryResult<ChangelogEntry[]> {
  const client = useRefletClient();
  const fetchFn = useCallback(
    () => client.getChangelog(limit),
    [client, limit]
  );
  return useRefletQuery(fetchFn);
}

// ============================================
// Unread Changelog Count Hook
// ============================================

const CHANGELOG_STORAGE_KEY_PREFIX = "reflet_changelog_seen_";

export function useUnreadChangelogCount(publicKey: string): {
  unreadCount: number;
  markAsRead: () => void;
} {
  const { data: entries } = useChangelog();
  const [unreadCount, setUnreadCount] = useState(0);

  const storageKey = `${CHANGELOG_STORAGE_KEY_PREFIX}${publicKey}`;

  useEffect(() => {
    if (!entries || entries.length === 0) {
      setUnreadCount(0);
      return;
    }

    let lastSeen = 0;
    try {
      const stored = localStorage.getItem(storageKey);
      lastSeen = stored ? Number(stored) : 0;
    } catch {
      // localStorage unavailable
    }

    let count = 0;
    for (const entry of entries) {
      if (entry.publishedAt && entry.publishedAt > lastSeen) {
        count++;
      }
    }
    setUnreadCount(count);
  }, [entries, storageKey]);

  const markAsRead = useCallback(() => {
    if (!entries || entries.length === 0) {
      return;
    }

    let latestTimestamp = 0;
    for (const entry of entries) {
      if (entry.publishedAt && entry.publishedAt > latestTimestamp) {
        latestTimestamp = entry.publishedAt;
      }
    }

    if (latestTimestamp > 0) {
      try {
        localStorage.setItem(storageKey, String(latestTimestamp));
      } catch {
        // localStorage unavailable
      }
      setUnreadCount(0);
    }
  }, [entries, storageKey]);

  return { unreadCount, markAsRead };
}
