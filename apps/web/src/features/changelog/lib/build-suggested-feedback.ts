import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { FeedbackMatch } from "../hooks/use-feedback-matching";

export function buildSuggestedFeedback(
  matches: FeedbackMatch[],
  linkedIds: Set<Id<"feedback">>,
  availableFeedback:
    | Array<{
        _id: Id<"feedback">;
        title: string;
        status: string;
      }>
    | undefined
): Array<{
  _id: Id<"feedback">;
  title: string;
  status: string;
  match: FeedbackMatch;
}> {
  const results: Array<{
    _id: Id<"feedback">;
    title: string;
    status: string;
    match: FeedbackMatch;
  }> = [];
  const feedbackById = new Map<
    string,
    NonNullable<typeof availableFeedback>[number]
  >((availableFeedback ?? []).map((f) => [f._id, f]));
  for (const m of matches) {
    if (linkedIds.has(m.feedbackId as Id<"feedback">)) {
      continue;
    }
    const feedback = feedbackById.get(m.feedbackId);
    if (feedback) {
      results.push({ ...feedback, match: m });
    }
  }
  return results;
}
