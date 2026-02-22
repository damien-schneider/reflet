import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type DeadlineStatus,
  getDeadlineBadgeStyles,
  getDeadlineColor,
  getDeadlineInfo,
} from "./milestone-deadline";

// Freeze time for deterministic tests
const FIXED_NOW = new Date("2025-06-15T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const toTimestamp = (dateStr: string): number => new Date(dateStr).getTime();

describe("getDeadlineInfo", () => {
  it("returns null when targetDate is undefined", () => {
    expect(getDeadlineInfo(undefined, "active")).toBeNull();
  });

  it("returns null when targetDate is 0", () => {
    expect(getDeadlineInfo(0, "active")).toBeNull();
  });

  it("returns 'due_today' when target is today", () => {
    const today = toTimestamp("2025-06-15");
    const info = getDeadlineInfo(today, "active");

    expect(info).not.toBeNull();
    expect(info?.status).toBe("due_today");
    expect(info?.daysRemaining).toBe(0);
    expect(info?.relativeLabel).toBe("due today");
  });

  it("returns 'overdue' when target is in the past", () => {
    const past = toTimestamp("2025-06-10");
    const info = getDeadlineInfo(past, "active");

    expect(info).not.toBeNull();
    expect(info?.status).toBe("overdue");
    expect(info?.daysRemaining).toBeLessThan(0);
  });

  it("returns 'due_soon' when target is within 7 days", () => {
    const soon = toTimestamp("2025-06-20");
    const info = getDeadlineInfo(soon, "active");

    expect(info).not.toBeNull();
    expect(info?.status).toBe("due_soon");
    expect(info?.daysRemaining).toBe(5);
    expect(info?.daysRemaining).toBeLessThanOrEqual(7);
  });

  it("returns 'due_soon' at exact 7-day boundary", () => {
    const boundary = toTimestamp("2025-06-22");
    const info = getDeadlineInfo(boundary, "active");

    expect(info).not.toBeNull();
    expect(info?.status).toBe("due_soon");
    expect(info?.daysRemaining).toBe(7);
  });

  it("returns 'upcoming' when target is more than 7 days away", () => {
    const future = toTimestamp("2025-06-23");
    const info = getDeadlineInfo(future, "active");

    expect(info).not.toBeNull();
    expect(info?.status).toBe("upcoming");
    expect(info?.daysRemaining).toBeGreaterThan(7);
  });

  it("returns 'none' when milestone is completed regardless of date", () => {
    const past = toTimestamp("2025-06-01");
    const info = getDeadlineInfo(past, "completed");

    expect(info).not.toBeNull();
    expect(info?.status).toBe("none");
  });

  it("returns 'none' for completed milestone even if overdue", () => {
    const past = toTimestamp("2020-01-01");
    const info = getDeadlineInfo(past, "completed");

    expect(info?.status).toBe("none");
  });

  it("returns 'none' for completed milestone even if due today", () => {
    const today = toTimestamp("2025-06-15");
    const info = getDeadlineInfo(today, "completed");

    expect(info?.status).toBe("none");
  });

  it("label contains formatted date", () => {
    const date = toTimestamp("2025-06-20");
    const info = getDeadlineInfo(date, "active");

    expect(info?.label).toBe("Jun 20, 2025");
  });

  it("relativeLabel contains relative time for non-today dates", () => {
    const future = toTimestamp("2025-07-15");
    const info = getDeadlineInfo(future, "active");

    expect(info?.relativeLabel).toContain("in");
  });

  it("handles very far future dates", () => {
    const farFuture = toTimestamp("2030-12-31");
    const info = getDeadlineInfo(farFuture, "active");

    expect(info?.status).toBe("upcoming");
    expect(info?.daysRemaining).toBeGreaterThan(365);
  });

  it("handles yesterday as overdue", () => {
    const yesterday = toTimestamp("2025-06-14");
    const info = getDeadlineInfo(yesterday, "active");

    expect(info?.status).toBe("overdue");
    expect(info?.daysRemaining).toBe(-1);
  });

  it("handles tomorrow as due_soon", () => {
    const tomorrow = toTimestamp("2025-06-16");
    const info = getDeadlineInfo(tomorrow, "active");

    expect(info?.status).toBe("due_soon");
    expect(info?.daysRemaining).toBe(1);
  });
});

describe("getDeadlineColor", () => {
  it("returns red for overdue", () => {
    expect(getDeadlineColor("overdue")).toBe("text-red-500");
  });

  it("returns amber-500 for due_today", () => {
    expect(getDeadlineColor("due_today")).toBe("text-amber-500");
  });

  it("returns amber-400 for due_soon", () => {
    expect(getDeadlineColor("due_soon")).toBe("text-amber-400");
  });

  it("returns muted for upcoming", () => {
    expect(getDeadlineColor("upcoming")).toBe("text-muted-foreground");
  });

  it("returns muted for none", () => {
    expect(getDeadlineColor("none")).toBe("text-muted-foreground");
  });
});

describe("getDeadlineBadgeStyles", () => {
  it("returns correct styles for overdue", () => {
    const styles = getDeadlineBadgeStyles("overdue");
    expect(styles.bg).toContain("red");
    expect(styles.text).toContain("red");
    expect(styles.border).toContain("red");
  });

  it("returns correct styles for due_today", () => {
    const styles = getDeadlineBadgeStyles("due_today");
    expect(styles.bg).toContain("amber-500");
    expect(styles.text).toContain("amber-500");
    expect(styles.border).toContain("amber-500");
  });

  it("returns correct styles for due_soon", () => {
    const styles = getDeadlineBadgeStyles("due_soon");
    expect(styles.bg).toContain("amber-400");
    expect(styles.text).toContain("amber-400");
    expect(styles.border).toContain("amber-400");
  });

  it("returns muted styles for upcoming", () => {
    const styles = getDeadlineBadgeStyles("upcoming");
    expect(styles.bg).toBe("bg-muted");
    expect(styles.text).toBe("text-muted-foreground");
    expect(styles.border).toBe("border-border");
  });

  it("returns muted styles for none", () => {
    const styles = getDeadlineBadgeStyles("none");
    expect(styles.bg).toBe("bg-muted");
    expect(styles.text).toBe("text-muted-foreground");
    expect(styles.border).toBe("border-border");
  });

  it("all statuses return bg, text, and border properties", () => {
    const statuses: DeadlineStatus[] = [
      "overdue",
      "due_today",
      "due_soon",
      "upcoming",
      "none",
    ];

    for (const status of statuses) {
      const styles = getDeadlineBadgeStyles(status);
      expect(styles).toHaveProperty("bg");
      expect(styles).toHaveProperty("text");
      expect(styles).toHaveProperty("border");
    }
  });
});
