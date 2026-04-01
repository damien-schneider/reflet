import { useCallback, useState } from "react";
import { useRefletClient } from "./react-context";
import type { UseMutationResult } from "./react-hooks-types";
import type { AddCommentParams, CreateFeedbackParams } from "./types";

// ============================================
// Generic mutation hook — single source of truth
// ============================================

function useRefletMutation<TData, TVariables>(
  mutateFn: (variables: TVariables) => Promise<TData>
): UseMutationResult<TData, TVariables> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | undefined>();

  const mutate = useCallback(
    async (variables: TVariables) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await mutateFn(variables);
        setData(result);
        return result;
      } catch (err) {
        const wrapped =
          err instanceof Error ? err : new Error("Request failed");
        setError(wrapped);
        throw wrapped;
      } finally {
        setIsLoading(false);
      }
    },
    [mutateFn]
  );

  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
  }, []);

  return { mutate, isLoading, error, data, reset };
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
  const mutateFn = useCallback(
    (params: CreateFeedbackParams) => client.create(params),
    [client]
  );
  return useRefletMutation(mutateFn);
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
  const mutateFn = useCallback(
    ({
      feedbackId,
      type = "upvote",
    }: {
      feedbackId: string;
      type?: "upvote" | "downvote";
    }) => client.vote(feedbackId, type),
    [client]
  );
  return useRefletMutation(mutateFn);
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
  const mutateFn = useCallback(
    (params: AddCommentParams) => client.comment(params),
    [client]
  );
  return useRefletMutation(mutateFn);
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
        return await client.subscribe(feedbackId);
      } catch (err) {
        const wrapped =
          err instanceof Error ? err : new Error("Failed to subscribe");
        setError(wrapped);
        throw wrapped;
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
        return await client.unsubscribe(feedbackId);
      } catch (err) {
        const wrapped =
          err instanceof Error ? err : new Error("Failed to unsubscribe");
        setError(wrapped);
        throw wrapped;
      } finally {
        setIsLoading(false);
      }
    },
    [client]
  );

  return { subscribe, unsubscribe, isLoading, error };
}
