import type { Doc } from "../../_generated/dataModel";

// Surveys created before completedCount existed only stored the rounded rate.
export const completedSoFar = (survey: Doc<"surveys">): number =>
  survey.completedCount ??
  Math.round((survey.completionRate * survey.responseCount) / 100);
