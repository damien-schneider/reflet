import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { FeedbackMatch } from "../hooks/use-feedback-matching";

/**
 * Determines which AI-matched feedback items should be auto-linked.
 * Filters out items already linked to the current release.
 */
export function getMatchesToAutoLink(
  matches: FeedbackMatch[],
  linkedIds: Set<Id<"feedback">>
): string[] {
  const result: string[] = [];
  for (const m of matches) {
    if (!linkedIds.has(m.feedbackId as Id<"feedback">)) {
      result.push(m.feedbackId);
    }
  }
  return result;
}
