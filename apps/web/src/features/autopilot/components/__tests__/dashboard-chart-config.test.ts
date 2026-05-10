import { describe, expect, it } from "vitest";

import { formatShortDate } from "@/features/autopilot/components/dashboard-chart-config";

describe("dashboard chart config", () => {
  it("formats ISO date keys in UTC so labels do not shift by timezone", () => {
    expect(formatShortDate("2026-05-09")).toBe("May 9");
  });
});
