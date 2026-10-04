import { describe, expect, it } from "vitest";
import {
  frequencyAllows,
  isSampledIn,
  isWithinSchedule,
  matchesPageUrl,
  npsBreakdown,
} from "../targeting";

const DAY = 24 * 60 * 60 * 1000;

describe("matchesPageUrl", () => {
  const href = "https://app.acme.com/checkout/step-2/?coupon=1#top";

  it("matches paths with wildcards, ignoring query, hash and trailing slash", () => {
    expect(matchesPageUrl("/checkout/*", href)).toBe(true);
    expect(matchesPageUrl("/checkout/step-2", href)).toBe(true);
    expect(matchesPageUrl("/checkout", href)).toBe(false);
    expect(matchesPageUrl("/CHECKOUT/*", href)).toBe(true);
  });

  it("accepts any of several patterns and full URLs", () => {
    expect(matchesPageUrl("/pricing, /checkout/*", href)).toBe(true);
    expect(matchesPageUrl("https://app.acme.com/*", href)).toBe(true);
    expect(matchesPageUrl("https://acme.com/*", href)).toBe(false);
  });

  it("matches every page when empty and treats dots literally", () => {
    expect(matchesPageUrl(undefined, href)).toBe(true);
    expect(matchesPageUrl(" , ", href)).toBe(true);
    expect(
      matchesPageUrl("https://appxacme.com/*", "https://app.acme.com/x")
    ).toBe(false);
  });

  it("matches domain patterns typed without a scheme", () => {
    expect(matchesPageUrl("app.acme.com/checkout/*", href)).toBe(true);
    expect(matchesPageUrl("*.acme.com/*", href)).toBe(true);
    expect(matchesPageUrl("acme.com/*", href)).toBe(false);
  });

  it("matches path patterns against hash-router routes", () => {
    const hashRouted = "https://app.acme.com/#/settings/billing";
    expect(matchesPageUrl("/settings/*", hashRouted)).toBe(true);
    expect(matchesPageUrl("/settings", hashRouted)).toBe(false);
    expect(matchesPageUrl("/top", href)).toBe(false);
    expect(
      matchesPageUrl("/settings", "https://app.acme.com/#/settings?tab=billing")
    ).toBe(true);
  });
});

describe("isSampledIn", () => {
  it("keeps each respondent's decision stable and roughly hits the rate", () => {
    const keys = Array.from({ length: 2000 }, (_, index) => `visitor-${index}`);
    const sampled = keys.filter((key) => isSampledIn(25, "survey-1", key));
    expect(sampled.length).toBeGreaterThan(400);
    expect(sampled.length).toBeLessThan(600);
    expect(keys.filter((key) => isSampledIn(25, "survey-1", key))).toEqual(
      sampled
    );
  });

  it("samples independently per survey and honours 0 and 100", () => {
    const keys = Array.from({ length: 200 }, (_, index) => `v${index}`);
    const first = keys.filter((key) => isSampledIn(50, "a", key));
    const second = keys.filter((key) => isSampledIn(50, "b", key));
    expect(first).not.toEqual(second);
    expect(isSampledIn(0, "a", "v1")).toBe(false);
    expect(isSampledIn(100, "a", "v1")).toBe(true);
  });
});

describe("frequencyAllows", () => {
  const now = 100 * DAY;

  it("shows a survey once only to people who never saw it", () => {
    const once = { frequency: "once" as const };
    expect(frequencyAllows(once, { hasCompleted: false }, now)).toBe(true);
    expect(
      frequencyAllows(
        once,
        { hasCompleted: false, lastShownAt: now - 90 * DAY },
        now
      )
    ).toBe(false);
  });

  it("re-asks people who didn't finish, but only after the recontact wait", () => {
    const untilCompleted = {
      frequency: "until_completed" as const,
      recontactDays: 3,
    };
    expect(
      frequencyAllows(
        untilCompleted,
        { hasCompleted: false, lastShownAt: now - 2 * DAY },
        now
      )
    ).toBe(false);
    expect(
      frequencyAllows(
        untilCompleted,
        { hasCompleted: false, lastShownAt: now - 3 * DAY },
        now
      )
    ).toBe(true);
    expect(
      frequencyAllows(
        untilCompleted,
        { hasCompleted: true, lastShownAt: now - 30 * DAY },
        now
      )
    ).toBe(false);
  });

  it("repeats recurring surveys after the default seven days", () => {
    const recurring = { frequency: "recurring" as const };
    expect(
      frequencyAllows(
        recurring,
        { hasCompleted: true, lastShownAt: now - 6 * DAY },
        now
      )
    ).toBe(false);
    expect(
      frequencyAllows(
        recurring,
        { hasCompleted: true, lastShownAt: now - 7 * DAY },
        now
      )
    ).toBe(true);
  });
});

describe("isWithinSchedule", () => {
  it("includes both bounds", () => {
    expect(isWithinSchedule({ endsAt: 20, startsAt: 10 }, 10)).toBe(true);
    expect(isWithinSchedule({ endsAt: 20, startsAt: 10 }, 20)).toBe(true);
    expect(isWithinSchedule({ endsAt: 20, startsAt: 10 }, 21)).toBe(false);
    expect(isWithinSchedule({ startsAt: 10 }, 9)).toBe(false);
  });
});

describe("npsBreakdown", () => {
  it("scores promoters minus detractors as a percentage", () => {
    expect(npsBreakdown([10, 9, 8, 7, 6, 0])).toEqual({
      detractors: 2,
      passives: 2,
      promoters: 2,
      score: 0,
      total: 6,
    });
    expect(npsBreakdown([10, 10, 3]).score).toBe(33);
    expect(npsBreakdown([]).score).toBeNull();
  });
});
