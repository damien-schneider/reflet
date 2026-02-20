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
// Organization Config Hook
// ============================================

/**
 * Hook to fetch organization configuration
 */
export function useOrganizationConfig(): UseQueryResult<OrganizationConfig> {
  const client = useRefletClient();
  const [data, setData] = useState<OrganizationConfig | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await client.getConfig();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch organization config")
      );
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// ============================================
// Feedback List Hook
// ============================================

export interface UseFeedbackListOptions extends FeedbackListParams {
  /** Auto-fetch on mount */
  enabled?: boolean;
}

/**
 * Hook to fetch feedback list with filtering
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useFeedbackList({ status: 'open', sortBy: 'votes' });
 * ```
 */
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

  // Create stable params reference
  const params = useMemo(
    () => ({ statusId, status, search, sortBy, limit, offset }),
    [statusId, status, search, sortBy, limit, offset]
  );

  const [data, setData] = useState<{
    items: FeedbackItem[];
    total: number;
    hasMore: boolean;
  }>();
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await client.list(params);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch feedback")
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, params]);

  useEffect(() => {
    if (enabled) {
      fetch();
    }
  }, [fetch, enabled]);

  return { data, isLoading, error, refetch: fetch };
}

// ============================================
// Single Feedback Hook
// ============================================

/**
 * Hook to fetch a single feedback item
 *
 * @example
 * ```tsx
 * const { data: feedback, isLoading } = useFeedback('feedback_id');
 * ```
 */
export function useFeedback(
  feedbackId: string | undefined
): UseQueryResult<FeedbackDetail> {
  const client = useRefletClient();
  const [data, setData] = useState<FeedbackDetail | undefined>();
  const [isLoading, setIsLoading] = useState(!!feedbackId);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!feedbackId) {
      setData(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await client.get(feedbackId);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch feedback")
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, feedbackId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// ============================================
// Comments Hook
// ============================================

/**
 * Hook to fetch comments for a feedback item
 */
export function useComments(
  feedbackId: string | undefined,
  sortBy: "newest" | "oldest" = "oldest"
): UseQueryResult<Comment[]> {
  const client = useRefletClient();
  const [data, setData] = useState<Comment[] | undefined>();
  const [isLoading, setIsLoading] = useState(!!feedbackId);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!feedbackId) {
      setData(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await client.getComments(feedbackId, sortBy);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch comments")
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, feedbackId, sortBy]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// ============================================
// Roadmap Hook
// ============================================

/**
 * Hook to fetch roadmap data
 */
export function useRoadmap(): UseQueryResult<Roadmap> {
  const client = useRefletClient();
  const [data, setData] = useState<Roadmap | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await client.getRoadmap();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch roadmap")
      );
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// ============================================
// Changelog Hook
// ============================================

/**
 * Hook to fetch changelog entries
 */
export function useChangelog(limit?: number): UseQueryResult<ChangelogEntry[]> {
  const client = useRefletClient();
  const [data, setData] = useState<ChangelogEntry[] | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await client.getChangelog(limit);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch changelog")
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}

// ============================================
// Unread Changelog Count Hook
// ============================================

const CHANGELOG_STORAGE_KEY_PREFIX = "reflet_changelog_seen_";

/**
 * Hook to track unread changelog entries based on localStorage
 *
 * @example
 * ```tsx
 * const { unreadCount, markAsRead } = useUnreadChangelogCount('fb_pub_xxx');
 *
 * return (
 *   <button onClick={markAsRead}>
 *     What's New {unreadCount > 0 && <span>({unreadCount})</span>}
 *   </button>
 * );
 * ```
 */
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
