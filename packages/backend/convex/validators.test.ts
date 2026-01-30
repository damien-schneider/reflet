import { describe, it, expect } from "vitest";
import { validateInputLength } from "./validators";

describe("validateInputLength", () => {
  it("should not throw if input is under limit", () => {
    expect(() => validateInputLength("short", 10, "Test")).not.toThrow();
  });

  it("should throw if input exceeds limit", () => {
    expect(() => validateInputLength("very long string", 5, "Test")).toThrow(
      "Test must be 5 characters or less. Currently 16 characters."
    );
  });

  it("should not throw if input is undefined", () => {
    expect(() => validateInputLength(undefined, 10, "Test")).not.toThrow();
  });

  it("should not throw if input is null", () => {
    expect(() => validateInputLength(null, 10, "Test")).not.toThrow();
  });
});
