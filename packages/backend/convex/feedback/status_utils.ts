import { statusGroup } from "../organizations/status_definitions";
import type { FeedbackStatusValue } from "../shared/validators";

export const isFinishedStatus = (status: FeedbackStatusValue): boolean => {
  const group = statusGroup(status);
  return group === "completed" || group === "closed";
};
