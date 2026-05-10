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

interface DeadlineBadgeStyles {
  bg: string;
  border: string;
  text: string;
}

const DUE_SOON_THRESHOLD_DAYS = 7;
const DEADLINE_BADGE_STYLES: Record<DeadlineStatus, DeadlineBadgeStyles> = {
  overdue: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-500",
  },
  due_today: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-500",
  },
  due_soon: {
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    text: "text-amber-400",
  },
  upcoming: {
    bg: "bg-muted",
    border: "border-border",
    text: "text-muted-foreground",
  },
  none: {
    bg: "bg-muted",
    border: "border-border",
    text: "text-muted-foreground",
  },
};

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
  return DEADLINE_BADGE_STYLES[status].text;
}

export function getDeadlineBadgeStyles(
  status: DeadlineStatus
): DeadlineBadgeStyles {
  return DEADLINE_BADGE_STYLES[status];
}
