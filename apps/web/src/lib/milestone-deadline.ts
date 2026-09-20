import {
  differenceInCalendarDays,
  format,
  formatDistanceToNow,
  isPast,
  isToday,
  startOfDay,
} from "date-fns";

export type DeadlineStatus =
  | "overdue"
  | "due_today"
  | "due_soon"
  | "upcoming"
  | "none";

export interface DeadlineInfo {
  daysRemaining: number;
  label: string;
  relativeLabel: string;
  status: DeadlineStatus;
}

const DUE_SOON_THRESHOLD_DAYS = 7;

export function getDeadlineInfo(
  targetDate: number | undefined,
  milestoneStatus: string
): DeadlineInfo | null {
  if (!targetDate) {
    return null;
  }

  const target = startOfDay(new Date(targetDate));
  const today = startOfDay(new Date());
  const daysRemaining = differenceInCalendarDays(target, today);
  const label = format(target, "MMM d, yyyy");
  const relativeLabel = formatDistanceToNow(target, { addSuffix: true });

  if (milestoneStatus === "completed") {
    return { daysRemaining, label, relativeLabel, status: "none" };
  }

  if (isToday(target)) {
    return {
      daysRemaining: 0,
      label,
      relativeLabel: "due today",
      status: "due_today",
    };
  }

  if (isPast(target)) {
    return { daysRemaining, label, relativeLabel, status: "overdue" };
  }

  if (daysRemaining <= DUE_SOON_THRESHOLD_DAYS) {
    return { daysRemaining, label, relativeLabel, status: "due_soon" };
  }

  return { daysRemaining, label, relativeLabel, status: "upcoming" };
}

export function getDeadlineColor(status: DeadlineStatus): string {
  switch (status) {
    case "overdue":
      return "text-destructive-text";
    case "due_today":
    case "due_soon":
      return "text-warning-text";
    default:
      return "text-muted-foreground";
  }
}

export function getDeadlineBadgeStyles(status: DeadlineStatus): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case "overdue":
      return {
        bg: "bg-destructive/10",
        border: "border-destructive/20",
        text: "text-destructive-text",
      };
    case "due_today":
      return {
        bg: "bg-warning/15",
        border: "border-warning/25",
        text: "text-warning-text",
      };
    case "due_soon":
      return {
        bg: "bg-warning/10",
        border: "border-warning/20",
        text: "text-warning-text",
      };
    default:
      return {
        bg: "bg-muted",
        border: "border-border",
        text: "text-muted-foreground",
      };
  }
}
