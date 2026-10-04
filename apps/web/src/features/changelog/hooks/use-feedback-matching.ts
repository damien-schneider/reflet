"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";

export type FeedbackMatch = FunctionReturnType<
  typeof api.changelog.ai_actions.matchReleaseFeedback
>["matches"][number];

export function useFeedbackMatching(releaseId: Id<"releases"> | null) {
  const matchReleaseFeedback = useAction(
    api.changelog.ai_actions.matchReleaseFeedback
  );
  const [matches, setMatches] = useState<FeedbackMatch[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const matchFeedback = async (description: string) => {
    if (!releaseId) {
      return;
    }
    setIsMatching(true);
    setMatchError(null);
    setMatches([]);
    try {
      const result = await matchReleaseFeedback({ description, releaseId });
      setMatches(result.matches);
    } catch (error) {
      setMatchError(
        error instanceof Error ? error.message : "Failed to match feedback"
      );
    }
    setIsMatching(false);
  };

  const clearMatches = () => {
    setMatches([]);
    setMatchError(null);
  };

  return { clearMatches, isMatching, matchError, matches, matchFeedback };
}
