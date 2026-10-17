import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { FeedbackMatch } from "../hooks/use-feedback-matching";

export function getMatchesToAutoLink(
  matches: FeedbackMatch[],
  linkedIds: Set<Id<"feedback">>
): Id<"feedback">[] {
  const result: Id<"feedback">[] = [];
  for (const match of matches) {
    if (!linkedIds.has(match.feedbackId)) {
      result.push(match.feedbackId);
    }
  }
  return result;
}
