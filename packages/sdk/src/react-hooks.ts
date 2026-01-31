import { useCallback, useEffect, useState } from "react";
import { useRefletClient } from "./react-context";
import type {
  AddCommentParams,
  ChangelogEntry,
  Comment,
  CreateFeedbackParams,
  FeedbackDetail,
  FeedbackItem,
  FeedbackListParams,
  OrganizationConfig,
  Roadmap,
} from "./types";

// ============================================
// Types
// ============================================

interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  error: Error | null;
  data: TData | undefined;
  reset: () => void;
}

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

/**
 * @deprecated Use useOrganizationConfig instead
 */
export const useBoardConfig = useOrganizationConfig;

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
  const { enabled = true, ...params } = options;

  // Create stable reference using individual params
  const { statusId, status, search, sortBy, limit, offset } = params;

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
      const result = await client.list({
        statusId,
        status,
        search,
        sortBy,
        limit,
        offset,
      });
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch feedback")
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, statusId, status, search, sortBy, limit, offset]);

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
// Create Feedback Mutation Hook
// ============================================

/**
 * Hook to create new feedback
 *
 * @example
 * ```tsx
 * const { mutate: createFeedback, isLoading } = useCreateFeedback();
 *
 * const handleSubmit = async (data) => {
 *   const result = await createFeedback(data);
 *   console.log('Created:', result.feedbackId);
 * };
 * ```
 */
export function useCreateFeedback(): UseMutationResult<
  { feedbackId: string; isApproved: boolean },
  CreateFeedbackParams
> {
  const client = useRefletClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<{
    feedbackId: string;
    isApproved: boolean;
  }>();

  const mutate = useCallback(
    async (params: CreateFeedbackParams) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.create(params);
        setData(result);
        return result;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to create feedback");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
  }, []);

  return { mutate, isLoading, error, data, reset };
}

// ============================================
// Vote Mutation Hook
// ============================================

/**
 * Hook to vote on feedback
 *
 * @example
 * ```tsx
 * const { mutate: vote } = useVote();
 *
 * <button onClick={() => vote({ feedbackId: 'xxx' })}>
 *   Vote
 * </button>
 * ```
 */
export function useVote(): UseMutationResult<
  { voted: boolean; voteCount: number },
  { feedbackId: string; type?: "upvote" | "downvote" }
> {
  const client = useRefletClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<{ voted: boolean; voteCount: number }>();

  const mutate = useCallback(
    async ({
      feedbackId,
      type = "upvote",
    }: {
      feedbackId: string;
      type?: "upvote" | "downvote";
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.vote(feedbackId, type);
        setData(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to vote");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
  }, []);

  return { mutate, isLoading, error, data, reset };
}

// ============================================
// Comment Mutation Hook
// ============================================

/**
 * Hook to add a comment
 */
export function useAddComment(): UseMutationResult<
  { commentId: string },
  AddCommentParams
> {
  const client = useRefletClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<{ commentId: string }>();

  const mutate = useCallback(
    async (params: AddCommentParams) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.comment(params);
        setData(result);
        return result;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to add comment");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
  }, []);

  return { mutate, isLoading, error, data, reset };
}

// ============================================
// Subscribe Mutation Hook
// ============================================

/**
 * Hook to subscribe/unsubscribe to feedback
 */
export function useSubscription(): {
  subscribe: (feedbackId: string) => Promise<{ subscribed: boolean }>;
  unsubscribe: (feedbackId: string) => Promise<{ unsubscribed: boolean }>;
  isLoading: boolean;
  error: Error | null;
} {
  const client = useRefletClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const subscribe = useCallback(
    async (feedbackId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.subscribe(feedbackId);
        return result;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to subscribe");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  const unsubscribe = useCallback(
    async (feedbackId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await client.unsubscribe(feedbackId);
        return result;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to unsubscribe");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  return { subscribe, unsubscribe, isLoading, error };
}
