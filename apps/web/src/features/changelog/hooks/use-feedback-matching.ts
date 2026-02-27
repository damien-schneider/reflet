"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useCallback, useState } from "react";
import type { CommitInfo } from "../components/generate-from-commits";

interface FeedbackCandidate {
  _id: Id<"feedback">;
  title: string;
  description?: string;
  status: string;
  voteCount: number;
  tags: Array<{ _id: Id<"tags">; name: string }>;
}

export interface FeedbackMatch {
  feedbackId: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

interface UseFeedbackMatchingResult {
  matches: FeedbackMatch[];
  isMatching: boolean;
  matchError: string | null;
  matchFeedback: (
    releaseNotes: string,
    commits: CommitInfo[],
    feedbackItems: FeedbackCandidate[]
  ) => Promise<void>;
  clearMatches: () => void;
}

export function useFeedbackMatching(): UseFeedbackMatchingResult {
  const [matches, setMatches] = useState<FeedbackMatch[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const matchFeedback = useCallback(
    async (
      releaseNotes: string,
      commits: CommitInfo[],
      feedbackItems: FeedbackCandidate[]
    ) => {
      if (feedbackItems.length === 0) {
        setMatches([]);
        return;
      }

      setIsMatching(true);
      setMatchError(null);
      setMatches([]);

      try {
        const response = await fetch("/api/ai/match-release-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            releaseNotes,
            commits: commits.map((c) => ({
              sha: c.sha,
              message: c.message,
              fullMessage: c.fullMessage,
              author: c.author,
            })),
            feedbackItems: feedbackItems.map((f) => ({
              id: f._id,
              title: f.title,
              description: f.description,
              status: f.status,
              tags: f.tags.map((t) => t.name),
            })),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to match feedback");
        }

        const data: unknown = await response.json();
        if (
          data &&
          typeof data === "object" &&
          "matches" in data &&
          Array.isArray(data.matches)
        ) {
          setMatches(data.matches as FeedbackMatch[]);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to match feedback";
        setMatchError(message);
      } finally {
        setIsMatching(false);
      }
    },
    []
  );

  const clearMatches = useCallback(() => {
    setMatches([]);
    setMatchError(null);
  }, []);

  return { matches, isMatching, matchError, matchFeedback, clearMatches };
}
