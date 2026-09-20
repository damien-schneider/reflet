import { AiMiniIndicator } from "./ai-mini-indicator";

const NEEDS_REVIEW_THRESHOLD = 0.75;

export const needsHumanReview = (probability?: number | null) =>
  typeof probability === "number" && probability >= NEEDS_REVIEW_THRESHOLD;

export function NeedsReviewBadge({
  probability,
}: {
  probability?: number | null;
}) {
  if (!needsHumanReview(probability)) {
    return null;
  }

  return <AiMiniIndicator label="Needs review" type="needs_review" />;
}
