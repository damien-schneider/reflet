import { describe, expect, it } from "vitest";
import { matchRequest } from "@/features/homepage/components/landing/mockups/match-request";

describe("matchRequest", () => {
  it("merges a real duplicate", () => {
    expect(matchRequest("dark mode")).not.toBeNull();
    expect(matchRequest("webhooks for status changes")).not.toBeNull();
    expect(matchRequest("we need SSO")).not.toBeNull();
  });

  it("does not merge on one generic shared word", () => {
    expect(matchRequest("Export the board to CSV")).toBeNull();
    expect(matchRequest("zqx unrelated telemetry pipeline")).toBeNull();
  });
});
