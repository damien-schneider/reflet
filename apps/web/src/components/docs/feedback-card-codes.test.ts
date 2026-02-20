import { describe, expect, it } from "vitest";

import {
  EDITORIAL_FEED_CODE,
  MINIMAL_NOTCH_CODE,
  SWEEP_CORNER_CODE,
} from "./feedback-card-codes";

describe("feedback card code strings", () => {
  it("exports SWEEP_CORNER_CODE as a non-empty string", () => {
    expect(typeof SWEEP_CORNER_CODE).toBe("string");
    expect(SWEEP_CORNER_CODE.length).toBeGreaterThan(0);
  });

  it("exports MINIMAL_NOTCH_CODE as a non-empty string", () => {
    expect(typeof MINIMAL_NOTCH_CODE).toBe("string");
    expect(MINIMAL_NOTCH_CODE.length).toBeGreaterThan(0);
  });

  it("exports EDITORIAL_FEED_CODE as a non-empty string", () => {
    expect(typeof EDITORIAL_FEED_CODE).toBe("string");
    expect(EDITORIAL_FEED_CODE.length).toBeGreaterThan(0);
  });

  it("SWEEP_CORNER_CODE contains all sub-component names used in the preview", () => {
    expect(SWEEP_CORNER_CODE).toContain("SweepCorner");
    expect(SWEEP_CORNER_CODE).toContain("SweepCornerCard");
    expect(SWEEP_CORNER_CODE).toContain("SweepCornerContent");
    expect(SWEEP_CORNER_CODE).toContain("SweepCornerTitle");
    expect(SWEEP_CORNER_CODE).toContain("SweepCornerTags");
    expect(SWEEP_CORNER_CODE).toContain("SweepCornerTag");
    expect(SWEEP_CORNER_CODE).toContain("SweepCornerBadge");
    expect(SWEEP_CORNER_CODE).toContain("SweepCornerFooter");
  });

  it("MINIMAL_NOTCH_CODE contains all sub-component names used in the preview", () => {
    expect(MINIMAL_NOTCH_CODE).toContain("MinimalNotch");
    expect(MINIMAL_NOTCH_CODE).toContain("MinimalNotchCard");
    expect(MINIMAL_NOTCH_CODE).toContain("MinimalNotchTitle");
    expect(MINIMAL_NOTCH_CODE).toContain("MinimalNotchStatus");
    expect(MINIMAL_NOTCH_CODE).toContain("MinimalNotchTags");
    expect(MINIMAL_NOTCH_CODE).toContain("MinimalNotchTag");
    expect(MINIMAL_NOTCH_CODE).toContain("MinimalNotchMeta");
    expect(MINIMAL_NOTCH_CODE).toContain("MinimalNotchVote");
  });

  it("EDITORIAL_FEED_CODE contains all sub-component names used in the preview", () => {
    expect(EDITORIAL_FEED_CODE).toContain("EditorialFeed");
    expect(EDITORIAL_FEED_CODE).toContain("EditorialFeedItem");
    expect(EDITORIAL_FEED_CODE).toContain("EditorialFeedVote");
    expect(EDITORIAL_FEED_CODE).toContain("EditorialFeedRule");
    expect(EDITORIAL_FEED_CODE).toContain("EditorialFeedContent");
    expect(EDITORIAL_FEED_CODE).toContain("EditorialFeedTitle");
    expect(EDITORIAL_FEED_CODE).toContain("EditorialFeedMeta");
    expect(EDITORIAL_FEED_CODE).toContain("EditorialFeedStatus");
    expect(EDITORIAL_FEED_CODE).toContain("EditorialFeedTag");
    expect(EDITORIAL_FEED_CODE).toContain("EditorialFeedComments");
    expect(EDITORIAL_FEED_CODE).toContain("EditorialFeedTime");
  });

  it("EDITORIAL_FEED_CODE shows multiple feed items matching the preview", () => {
    const itemCount = (EDITORIAL_FEED_CODE.match(/<EditorialFeedItem/g) ?? [])
      .length;
    expect(itemCount).toBe(3);
  });

  it("code strings do not contain 'use client' directive", () => {
    expect(SWEEP_CORNER_CODE).not.toContain("use client");
    expect(MINIMAL_NOTCH_CODE).not.toContain("use client");
    expect(EDITORIAL_FEED_CODE).not.toContain("use client");
  });
});
