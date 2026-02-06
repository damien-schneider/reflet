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
  status: DeadlineStatus;
  label: string;
  relativeLabel: string;
  daysRemaining: number;
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
    return { status: "none", label, relativeLabel, daysRemaining };
  }

  if (isToday(target)) {
    return {
      status: "due_today",
      label,
      relativeLabel: "due today",
      daysRemaining: 0,
    };
  }

  if (isPast(target)) {
    return { status: "overdue", label, relativeLabel, daysRemaining };
  }

  if (daysRemaining <= DUE_SOON_THRESHOLD_DAYS) {
    return { status: "due_soon", label, relativeLabel, daysRemaining };
  }

  return { status: "upcoming", label, relativeLabel, daysRemaining };
}

export function getDeadlineColor(status: DeadlineStatus): string {
  switch (status) {
    case "overdue":
      return "text-red-500";
    case "due_today":
      return "text-amber-500";
    case "due_soon":
      return "text-amber-400";
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
        bg: "bg-red-500/10",
        text: "text-red-500",
        border: "border-red-500/20",
      };
    case "due_today":
      return {
        bg: "bg-amber-500/10",
        text: "text-amber-500",
        border: "border-amber-500/20",
      };
    case "due_soon":
      return {
        bg: "bg-amber-400/10",
        text: "text-amber-400",
        border: "border-amber-400/20",
      };
    default:
      return {
        bg: "bg-muted",
        text: "text-muted-foreground",
        border: "border-border",
      };
  }
}
