import { expect, test } from "vitest";
import { publicationState, resolvePropertyValue } from "../property_values";

test("a human decision owns the effective value, even when equal to the AI proposal", () => {
  expect(resolvePropertyValue("high", "high")).toEqual({
    origin: "human",
    value: "high",
  });
  expect(resolvePropertyValue(undefined, "high")).toEqual({
    origin: "ai",
    value: "high",
  });
  expect(resolvePropertyValue(undefined, undefined)).toEqual({
    origin: "unset",
    value: undefined,
  });
});

test("a human removal survives later AI proposals", () => {
  expect(resolvePropertyValue(null, "high")).toEqual({
    origin: "human",
    value: null,
  });
});

test("publication approval never overrides an internal audience", () => {
  expect(publicationState({ isApproved: true, isInternal: true })).toBe(
    "internal"
  );
  expect(publicationState({ isApproved: false })).toBe("pending");
  expect(
    publicationState({ isApproved: false, publicationRejectedAt: 1 })
  ).toBe("rejected");
});
