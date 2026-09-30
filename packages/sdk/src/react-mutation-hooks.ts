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

  return { data, error, isLoading, mutate, reset };
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
  const subscribeFn = useCallback(
    (feedbackId: string) => client.subscribe(feedbackId),
    [client]
  );
  const unsubscribeFn = useCallback(
    (feedbackId: string) => client.unsubscribe(feedbackId),
    [client]
  );
  const subscription = useRefletMutation(subscribeFn);
  const unsubscription = useRefletMutation(unsubscribeFn);
  const { mutate: runSubscribe, reset: resetSubscribe } = subscription;
  const { mutate: runUnsubscribe, reset: resetUnsubscribe } = unsubscription;

  const subscribe = useCallback(
    (feedbackId: string) => {
      resetUnsubscribe();
      return runSubscribe(feedbackId);
    },
    [resetUnsubscribe, runSubscribe]
  );

  const unsubscribe = useCallback(
    (feedbackId: string) => {
      resetSubscribe();
      return runUnsubscribe(feedbackId);
    },
    [resetSubscribe, runUnsubscribe]
  );

  return {
    error: subscription.error ?? unsubscription.error,
    isLoading: subscription.isLoading || unsubscription.isLoading,
    subscribe,
    unsubscribe,
  };
}
