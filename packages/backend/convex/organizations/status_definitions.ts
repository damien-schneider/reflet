import type { FeedbackStatusValue } from "../shared/validators";

export const STATUS_DEFINITIONS = {
  closed: { color: "gray", group: "closed", icon: "x-circle", name: "Closed" },
  completed: {
    color: "green",
    group: "completed",
    icon: "check-circle",
    name: "Done",
  },
  in_progress: {
    color: "purple",
    group: "in_progress",
    icon: "spinner",
    name: "In Progress",
  },
  open: { color: "gray", group: "not_started", icon: "clock", name: "Backlog" },
  planned: {
    color: "blue",
    group: "not_started",
    icon: "calendar",
    name: "Planned",
  },
  under_review: {
    color: "yellow",
    group: "not_started",
    icon: "magnifying-glass",
    name: "Under Review",
  },
} as const;

export const DEFAULT_STATUSES = (
  ["open", "planned", "in_progress", "completed"] as const
).map((semanticStatus, order) => ({
  color: STATUS_DEFINITIONS[semanticStatus].color,
  icon: STATUS_DEFINITIONS[semanticStatus].icon,
  name: STATUS_DEFINITIONS[semanticStatus].name,
  order,
  semanticStatus,
}));

export const statusGroup = (status: FeedbackStatusValue) =>
  STATUS_DEFINITIONS[status].group;
