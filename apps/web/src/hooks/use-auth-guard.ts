"use client";

import { useSetAtom } from "jotai";
import { useCallback } from "react";
import { authClient } from "@/lib/auth-client";
import { openAuthDialogAtom } from "@/store/auth";

interface AuthGuardOptions {
  /** Custom message to show in the auth dialog */
  message?: string;
}

/**
 * Hook to guard actions that require authentication.
 *
 * Returns a function that wraps your action. If the user is authenticated,
 * the action runs immediately. Otherwise, the auth dialog opens with an
 * optional message explaining why sign-in is required.
 *
 * @example
 * ```tsx
 * const guardedVote = useAuthGuard({
 *   message: "Connectez-vous pour voter sur ce feedback"
 * });
 *
 * const handleVote = () => {
 *   guardedVote(() => {
 *     // This only runs if user is authenticated
 *     toggleVoteMutation({ feedbackId, voteType: "upvote" });
 *   });
 * };
 * ```
 */
export function useAuthGuard(options: AuthGuardOptions = {}) {
  const { data: session } = authClient.useSession();
  const openAuthDialog = useSetAtom(openAuthDialogAtom);

  const isAuthenticated = Boolean(session?.user?.id);

  const guard = useCallback(
    <T>(action: () => T | Promise<T>): T | Promise<T> | undefined => {
      if (isAuthenticated) {
        return action();
      }

      openAuthDialog({
        message:
          options.message ?? "Connectez-vous pour effectuer cette action",
      });
      return undefined;
    },
    [isAuthenticated, openAuthDialog, options.message]
  );

  return {
    /** Whether the current user is authenticated */
    isAuthenticated,
    /** The current user's ID, or undefined if not authenticated */
    userId: session?.user?.id,
    /** Wrap an action to require authentication before executing */
    guard,
  };
}
