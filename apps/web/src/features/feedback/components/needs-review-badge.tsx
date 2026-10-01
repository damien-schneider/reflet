import { NEEDS_CLARIFICATION_THRESHOLD } from "@reflet/backend/convex/feedback/property_values";
import { AiMiniIndicator } from "./ai-mini-indicator";

const needsHumanReview = (probability?: number | null) =>
  typeof probability === "number" &&
  probability >= NEEDS_CLARIFICATION_THRESHOLD;

export function NeedsReviewBadge({
  probability,
}: {
  probability?: number | null;
}) {
  if (!needsHumanReview(probability)) {
    return null;
  }

  return <AiMiniIndicator label="Needs clarification" type="needs_review" />;
}
