type FeedbackStatusEnum =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "closed";

const COMPLETED_STATUS_ENUMS = new Set<FeedbackStatusEnum>([
  "completed",
  "closed",
]);

const STATUS_NAME_MAP: Record<string, FeedbackStatusEnum> = {
  open: "open",
  underreview: "under_review",
  planned: "planned",
  inprogress: "in_progress",
  completed: "completed",
  done: "completed",
  closed: "closed",
  resolved: "closed",
  archived: "closed",
};

/**
 * Map custom status name to the corresponding enum value.
 * This ensures the status field stays in sync with organizationStatusId.
 */
export const mapStatusNameToEnum = (statusName: string): FeedbackStatusEnum => {
  const normalizedName = statusName.toLowerCase().replace(/[\s_-]/g, "");
  return STATUS_NAME_MAP[normalizedName] ?? "open";
};

/**
 * Check whether a status name maps to a "completed" or "closed" enum value.
 */
export const isCompletedStatusName = (statusName: string): boolean =>
  COMPLETED_STATUS_ENUMS.has(mapStatusNameToEnum(statusName));
