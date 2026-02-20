import { useCallback, useState } from "react";
import { useRefletClient } from "./react-context";
import type { UseMutationResult } from "./react-hooks-types";
import type { AddCommentParams, CreateFeedbackParams } from "./types";

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
