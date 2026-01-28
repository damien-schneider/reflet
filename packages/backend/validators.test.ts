import { describe, expect, test } from "vitest";
import { validateInputLength } from "./convex/validators";

describe("Input Validation", () => {
  test("validateInputLength should pass for valid input", () => {
    expect(() => validateInputLength("valid", 10, "Field")).not.toThrow();
  });

  test("validateInputLength should throw for invalid input", () => {
    expect(() => validateInputLength("invalid input", 5, "Field")).toThrow(
      "Field must be 5 characters or less"
    );
  });

  test("validateInputLength should pass for undefined/null", () => {
    expect(() => validateInputLength(undefined, 10, "Field")).not.toThrow();
    expect(() => validateInputLength(null, 10, "Field")).not.toThrow();
  });
});
