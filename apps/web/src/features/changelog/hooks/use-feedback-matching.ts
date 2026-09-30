"use client";

import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import type { CommitInfo } from "../components/generate-from-commits";

interface FeedbackCandidate {
  _id: Id<"feedback">;
  description?: string;
  status: string;
  tags: Array<{ _id: Id<"tags">; name: string }>;
  title: string;
  voteCount: number;
}

export interface FeedbackMatch {
  confidence: "high" | "medium" | "low";
  feedbackId: string;
  reason: string;
}

interface UseFeedbackMatchingResult {
  clearMatches: () => void;
  isMatching: boolean;
  matchError: string | null;
  matches: FeedbackMatch[];
  matchFeedback: (
    releaseNotes: string,
    commits: CommitInfo[],
    feedbackItems: FeedbackCandidate[]
  ) => Promise<void>;
}

async function requestMatches(
  releaseNotes: string,
  commits: CommitInfo[],
  feedbackItems: FeedbackCandidate[]
): Promise<FeedbackMatch[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? ""}/api/ai/match-release-feedback`,
    {
      body: JSON.stringify({
        commits: commits.map((c) => ({
          author: c.author,
          fullMessage: c.fullMessage,
          message: c.message,
          sha: c.sha,
        })),
        feedbackItems: feedbackItems.map((f) => ({
          description: f.description,
          id: f._id,
          status: f.status,
          tags: f.tags.map((t) => t.name),
          title: f.title,
        })),
        releaseNotes,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }
  );
  if (!response.ok) {
    throw new Error("Failed to match feedback");
  }
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    !("matches" in data) ||
    !Array.isArray(data.matches)
  ) {
    throw new Error("Failed to match feedback");
  }
  return data.matches;
}

export function useFeedbackMatching(): UseFeedbackMatchingResult {
  const [matches, setMatches] = useState<FeedbackMatch[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const matchFeedback = async (
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

    let result: FeedbackMatch[] = [];
    let failure: unknown = null;
    try {
      result = await requestMatches(releaseNotes, commits, feedbackItems);
    } catch (error) {
      failure = error;
    }
    if (failure === null) {
      setMatches(result);
    } else {
      setMatchError(
        failure instanceof Error ? failure.message : "Failed to match feedback"
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
