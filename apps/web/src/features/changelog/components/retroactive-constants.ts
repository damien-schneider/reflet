export type GroupingStrategy = "auto" | "tags" | "weekly";

export const ACTIVE_STATUSES = [
  "pending",
  "fetching_tags",
  "fetching_commits",
  "generating",
  "creating_releases",
] as const;

export const PHASE_STEPS = [
  { key: "fetching_tags", label: "Fetching tags" },
  { key: "fetching_commits", label: "Fetching commits" },
  { key: "generating", label: "Generating notes" },
  { key: "creating_releases", label: "Creating releases" },
] as const;

export const GROUPING_OPTIONS = [
  { value: "auto" as const, label: "Auto" },
  { value: "tags" as const, label: "Tags" },
  { value: "weekly" as const, label: "Weekly" },
];
