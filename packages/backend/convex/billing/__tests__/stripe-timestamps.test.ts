import { describe, expect, it } from "vitest";
import { stripeTimestampToMs } from "../utils";

describe("stripeTimestampToMs", () => {
  it("converts Stripe seconds timestamp to milliseconds", () => {
    // Stripe returns current_period_end as Unix seconds
    // Oct 4, 2024 00:00:00 UTC = 1728000000 seconds
    const stripeSeconds = 1_728_000_000;

    const result = stripeTimestampToMs(stripeSeconds);

    // Should be in milliseconds for JavaScript Date
    expect(result).toBe(1_728_000_000_000);
    expect(new Date(result).getFullYear()).toBe(2024);
  });

  it("does not double-convert timestamps already in milliseconds", () => {
    // If a timestamp is already in milliseconds (13+ digits, year > 5000 in seconds)
    // it should be returned as-is
    const alreadyMs = 1_728_000_000_000;

    const result = stripeTimestampToMs(alreadyMs);

    expect(result).toBe(1_728_000_000_000);
    expect(new Date(result).getFullYear()).toBe(2024);
  });

  it("handles zero gracefully", () => {
    const result = stripeTimestampToMs(0);
    expect(result).toBe(0);
  });

  it("handles undefined gracefully", () => {
    const result = stripeTimestampToMs(undefined);
    expect(result).toBe(0);
  });
});
