import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type DeadlineStatus,
  getDeadlineBadgeStyles,
  getDeadlineButtonClass,
  getDeadlineInfo,
} from "./milestone-deadline";

// deadlines are local calendar days, so "now" and every target are local times
const FIXED_NOW = new Date("2025-06-15T12:00:00");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const toTimestamp = (dateStr: string): number =>
  new Date(`${dateStr}T00:00:00`).getTime();

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

  it("label contains formatted date", () => {
    const date = toTimestamp("2025-06-20");
    const info = getDeadlineInfo(date, "active");

    expect(info?.label).toBe("Jun 20, 2025");
  });

  it("handles yesterday as overdue", () => {
    const yesterday = toTimestamp("2025-06-14");
    const info = getDeadlineInfo(yesterday, "active");

    expect(info?.status).toBe("overdue");
    expect(info?.daysRemaining).toBe(-1);
  });
});

const URGENT_STATUSES: DeadlineStatus[] = ["overdue", "due_today", "due_soon"];
const CALM_STATUSES: DeadlineStatus[] = ["upcoming", "none"];

describe("deadline styling", () => {
  it("draws attention to urgent deadlines and stays quiet otherwise", () => {
    const quiet = getDeadlineButtonClass("none");
    for (const status of URGENT_STATUSES) {
      expect(getDeadlineButtonClass(status)).not.toBe(quiet);
    }
    for (const status of CALM_STATUSES) {
      expect(getDeadlineButtonClass(status)).toBe(quiet);
    }
  });

  it("escalates overdue beyond the merely due", () => {
    const overdue = getDeadlineBadgeStyles("overdue");
    const dueToday = getDeadlineBadgeStyles("due_today");
    const dueSoon = getDeadlineBadgeStyles("due_soon");

    expect(overdue.text).not.toBe(dueToday.text);
    expect(dueToday.bg).not.toBe(dueSoon.bg);
  });
});
